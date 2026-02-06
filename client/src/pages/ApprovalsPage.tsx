import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    CheckCircle, XCircle, Clock, Calendar, DollarSign, Briefcase,
    AlertCircle, MessageSquare, User,
    AlertTriangle, History, Eye, X,
    FileText, Zap, RotateCcw
} from 'lucide-react';

interface PendingApproval {
    instance: {
        id: string;
        flow: { name: string; steps?: any[] };
        target_type: string;
        target_id: string;
        current_step_order: number;
        is_urgent: boolean;
        created_at: string;
        requester?: {
            id: string;
            full_name: string;
            first_name: string;
        };
    };
    targetType: string;
    targetId: string;
    stepName: string;
    requesterName: string;
    createdAt: string;
    isUrgent: boolean;
}

interface ApprovalStats {
    pending: number;
    approvedToday: number;
    rejectedToday: number;
    avgApprovalTimeHours: number;
}

export const ApprovalsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'all'>('pending');
    const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
    const [actionModal, setActionModal] = useState<{ approval: PendingApproval; action: 'approve' | 'reject' } | null>(null);
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Queries
    const { data: pendingApprovals, isLoading } = useQuery<PendingApproval[]>({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            const response = await api.get('/approvals/pending');
            return response.data;
        },
    });

    const { data: mySubmissions } = useQuery({
        queryKey: ['my-submissions'],
        queryFn: async () => {
            const response = await api.get('/approvals/my-submissions');
            return response.data;
        },
    });

    const { data: stats } = useQuery<ApprovalStats>({
        queryKey: ['approval-stats'],
        queryFn: async () => {
            const response = await api.get('/approvals/stats');
            return response.data;
        },
    });

    // Approval detail query
    const { data: approvalDetail } = useQuery({
        queryKey: ['approval-detail', selectedApproval],
        queryFn: async () => {
            if (!selectedApproval) return null;
            const response = await api.get(`/approvals/instances/${selectedApproval}`);
            return response.data;
        },
        enabled: !!selectedApproval,
    });

    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Mutations
    const approveMutation = useMutation({
        mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
            return api.post(`/approvals/instances/${id}/approve`, { comment });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
            queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
            setActionModal(null);
            showToast('Request approved successfully!');
        },
        onError: () => {
            showToast('Failed to approve request', 'error');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
            return api.post(`/approvals/instances/${id}/reject`, { comment });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
            queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
            setActionModal(null);
            showToast('Request rejected');
        },
        onError: () => {
            showToast('Failed to reject request', 'error');
        },
    });

    const getTypeIcon = (type: string, size = 20) => {
        switch (type) {
            case 'leave': return <Calendar className="text-blue-500" size={size} />;
            case 'claim': return <DollarSign className="text-green-500" size={size} />;
            case 'staff_loan': return <Briefcase className="text-orange-500" size={size} />;
            default: return <AlertCircle className="text-slate-500" size={size} />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'leave': return 'Leave Request';
            case 'claim': return 'Expense Claim';
            case 'staff_loan': return 'Staff Loan';
            default: return type;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'leave': return 'from-blue-400 to-blue-600';
            case 'claim': return 'from-emerald-400 to-green-600';
            case 'staff_loan': return 'from-orange-400 to-orange-600';
            default: return 'from-slate-400 to-slate-600';
        }
    };

    const getTypeBg = (type: string) => {
        switch (type) {
            case 'leave': return 'bg-blue-100';
            case 'claim': return 'bg-emerald-100';
            case 'staff_loan': return 'bg-orange-100';
            default: return 'bg-slate-100';
        }
    };

    const filteredApprovals = pendingApprovals?.filter(a =>
        typeFilter === 'all' || a.targetType === typeFilter
    ) || [];

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const then = new Date(date);
        const diffHours = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60));
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
    };

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
                        toastMessage.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
                    }`}>
                        {toastMessage.type === 'success' ? (
                            <CheckCircle size={18} className="text-emerald-400" />
                        ) : (
                            <AlertCircle size={18} className="text-white" />
                        )}
                        <span className="font-medium">{toastMessage.text}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Approvals Center</h1>
                    <p className="text-slate-500">Review and process approval requests</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                    >
                        <option value="all">All Types</option>
                        <option value="leave">Leave</option>
                        <option value="claim">Claims</option>
                        <option value="staff_loan">Loans</option>
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                            <Clock className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.pending || 0}</p>
                            <p className="text-sm text-slate-500">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl">
                            <CheckCircle className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.approvedToday || 0}</p>
                            <p className="text-sm text-slate-500">Approved Today</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-xl">
                            <XCircle className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.rejectedToday || 0}</p>
                            <p className="text-sm text-slate-500">Rejected Today</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#0066B3] rounded-xl">
                            <Zap className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.avgApprovalTimeHours || 0}h</p>
                            <p className="text-sm text-slate-500">Avg. Time</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats by Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { type: 'leave', label: 'Leave Requests', icon: Calendar, color: 'blue' },
                    { type: 'claim', label: 'Expense Claims', icon: DollarSign, color: 'emerald' },
                    { type: 'staff_loan', label: 'Loan Applications', icon: Briefcase, color: 'orange' },
                ].map(({ type, label, icon: Icon, color }) => {
                    const count = pendingApprovals?.filter(a => a.targetType === type).length || 0;
                    const urgent = pendingApprovals?.filter(a => a.targetType === type && a.isUrgent).length || 0;
                    return (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                            className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md text-left ${typeFilter === type ? `border-${color}-500 ring-2 ring-${color}-100` : 'border-slate-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${color === 'blue' ? 'bg-blue-100' :
                                            color === 'emerald' ? 'bg-emerald-100' :
                                                'bg-orange-100'
                                        }`}>
                                        <Icon className={`${color === 'blue' ? 'text-blue-600' :
                                                color === 'emerald' ? 'text-emerald-600' :
                                                    'text-orange-600'
                                            }`} size={22} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{count}</p>
                                        <p className="text-sm text-slate-500">{label}</p>
                                    </div>
                                </div>
                                {urgent > 0 && (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium animate-pulse">
                                        <AlertTriangle size={12} />
                                        {urgent} urgent
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex gap-8">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-4 px-1 font-medium transition-colors relative ${activeTab === 'pending' ? 'text-[#0066B3]' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Clock size={18} />
                            Pending Approvals
                        </span>
                        {(pendingApprovals?.length || 0) > 0 && (
                            <span className="absolute -top-1 -right-3 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full min-w-[20px] text-center">
                                {pendingApprovals?.length}
                            </span>
                        )}
                        {activeTab === 'pending' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066B3] rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-4 px-1 font-medium transition-colors relative ${activeTab === 'history' ? 'text-[#0066B3]' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <History size={18} />
                            My Submissions
                        </span>
                        {activeTab === 'history' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066B3] rounded-full" />
                        )}
                    </button>
                </nav>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    {/* Pending Approvals List */}
                    {activeTab === 'pending' && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {isLoading ? (
                                <div className="px-6 py-16 text-center text-slate-500">
                                    <div className="animate-spin w-8 h-8 border-2 border-[#0066B3] border-t-transparent rounded-full mx-auto mb-4" />
                                    Loading approvals...
                                </div>
                            ) : filteredApprovals.length === 0 ? (
                                <div className="px-6 py-16 text-center">
                                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="text-emerald-600" size={40} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
                                    <p className="text-slate-500">No pending approvals at the moment.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {filteredApprovals.map((approval) => (
                                        <div
                                            key={approval.instance.id}
                                            className={`p-5 hover:bg-slate-50 transition-colors cursor-pointer ${selectedApproval === approval.instance.id ? 'bg-blue-50 border-l-4 border-l-[#0066B3]' : ''
                                                }`}
                                            onClick={() => setSelectedApproval(approval.instance.id)}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className={`p-3 bg-gradient-to-br ${getTypeColor(approval.targetType)} rounded-xl shadow-sm`}>
                                                        {React.cloneElement(getTypeIcon(approval.targetType), { className: 'text-white', size: 22 })}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <h4 className="font-semibold text-slate-900">
                                                                {getTypeLabel(approval.targetType)}
                                                            </h4>
                                                            {approval.isUrgent && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full animate-pulse">
                                                                    <AlertTriangle size={10} />
                                                                    Urgent
                                                                </span>
                                                            )}
                                                            <span className="px-2 py-0.5 bg-blue-100 text-[#0066B3] text-xs font-medium rounded-full">
                                                                Step {approval.instance.current_step_order}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-sm text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <User size={14} />
                                                                {approval.requesterName}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={14} />
                                                                {getTimeAgo(approval.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 mt-1">
                                                            {approval.stepName}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActionModal({ approval, action: 'approve' }); }}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm shadow-sm"
                                                    >
                                                        <CheckCircle size={16} />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActionModal({ approval, action: 'reject' }); }}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm shadow-sm"
                                                    >
                                                        <XCircle size={16} />
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* My Submissions */}
                    {activeTab === 'history' && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-900">My Submitted Requests</h3>
                            </div>
                            {mySubmissions?.length === 0 ? (
                                <div className="px-6 py-12 text-center text-slate-500">
                                    <FileText className="mx-auto mb-3 text-slate-400" size={40} />
                                    <p>No submissions yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {mySubmissions?.map((sub: any) => (
                                        <div
                                            key={sub.id}
                                            className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedApproval(sub.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-xl ${getTypeBg(sub.target_type)}`}>
                                                    {getTypeIcon(sub.target_type, 18)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-slate-900">{getTypeLabel(sub.target_type)}</p>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                                sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                    sub.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {sub.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500">
                                                        {sub.flow?.name} • Submitted {getTimeAgo(sub.created_at)}
                                                    </p>
                                                </div>
                                                {sub.status === 'pending' && (
                                                    <div className="text-right">
                                                        <p className="text-sm text-amber-600 font-medium">Step {sub.current_step_order}</p>
                                                        <p className="text-xs text-slate-500">In progress</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Detail Sidebar */}
                <div className="lg:col-span-1">
                    <ApprovalDetailSidebar
                        approval={approvalDetail}
                        isLoading={!!selectedApproval && !approvalDetail}
                        onClose={() => setSelectedApproval(null)}
                    />
                </div>
            </div>

            {/* Action Modal */}
            {actionModal && (
                <ApprovalActionModal
                    approval={actionModal.approval}
                    action={actionModal.action}
                    onClose={() => setActionModal(null)}
                    onConfirm={(comment) => {
                        if (actionModal.action === 'approve') {
                            approveMutation.mutate({ id: actionModal.approval.instance.id, comment });
                        } else {
                            rejectMutation.mutate({ id: actionModal.approval.instance.id, comment: comment || 'Rejected' });
                        }
                    }}
                    isLoading={approveMutation.isPending || rejectMutation.isPending}
                />
            )}
        </div>
    );
};

// ================== APPROVAL DETAIL SIDEBAR ==================
const ApprovalDetailSidebar: React.FC<{
    approval: any;
    isLoading: boolean;
    onClose: () => void;
}> = ({ approval, isLoading, onClose }) => {
    if (!approval && !isLoading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Eye className="text-slate-400" size={24} />
                </div>
                <h4 className="font-medium text-slate-900 mb-1">Select an Approval</h4>
                <p className="text-sm text-slate-500">Click on an approval to view its details and timeline</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#0066B3] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-500">Loading details...</p>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle className="text-emerald-600" size={24} />;
            case 'rejected': return <XCircle className="text-red-600" size={24} />;
            case 'pending': return <Clock className="text-amber-600" size={24} />;
            default: return <AlertCircle className="text-slate-600" size={24} />;
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-50 border-emerald-200';
            case 'rejected': return 'bg-red-50 border-red-200';
            case 'pending': return 'bg-amber-50 border-amber-200';
            default: return 'bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                <h4 className="font-semibold text-slate-900">Approval Details</h4>
                <button onClick={onClose} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="p-5 space-y-5">
                {/* Status Card */}
                <div className={`p-4 rounded-xl border ${getStatusBg(approval.status)}`}>
                    <div className="flex items-center gap-3">
                        {getStatusIcon(approval.status)}
                        <div>
                            <p className="font-semibold text-slate-900 capitalize">{approval.status}</p>
                            <p className="text-sm text-slate-600">
                                {approval.target_type === 'leave' ? 'Leave Request' :
                                    approval.target_type === 'claim' ? 'Expense Claim' :
                                        'Staff Loan'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Requester</span>
                        <span className="font-medium text-slate-900">
                            {approval.requester?.full_name || 'Unknown'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Workflow</span>
                        <span className="font-medium text-slate-900">
                            {approval.flow?.name || 'Default'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Submitted</span>
                        <span className="font-medium text-slate-900">
                            {new Date(approval.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    {approval.status === 'pending' && (
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Current Step</span>
                            <span className="font-medium text-amber-600">
                                Step {approval.current_step_order}
                            </span>
                        </div>
                    )}
                </div>

                {/* Approval Timeline */}
                <div>
                    <h5 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <History size={16} />
                        Approval Timeline
                    </h5>
                    <ApprovalTimelineCompact instance={approval} />
                </div>
            </div>
        </div>
    );
};

// ================== COMPACT APPROVAL TIMELINE ==================
const ApprovalTimelineCompact: React.FC<{ instance: any }> = ({ instance }) => {
    const steps = instance.flow?.steps?.sort((a: any, b: any) => a.step_order - b.step_order) || [];
    const actions = instance.actions || [];
    const actionsMap = new Map(actions.map((a: any) => [a.step_order, a]));

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-slate-200" />

            <div className="space-y-4">
                {/* Request Created */}
                <div className="relative flex gap-3">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-[#0066B3] flex items-center justify-center">
                        <FileText className="text-white" size={12} />
                    </div>
                    <div className="flex-1 pt-0.5">
                        <p className="text-sm font-medium text-slate-900">Request Created</p>
                        <p className="text-xs text-slate-500">
                            {new Date(instance.created_at).toLocaleString('en-GB', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>

                {/* Steps */}
                {steps.map((step: any) => {
                    const action = actionsMap.get(step.step_order);
                    const isPending = !action && instance.current_step_order === step.step_order;
                    const isFuture = !action && instance.current_step_order < step.step_order;

                    return (
                        <div key={step.id} className={`relative flex gap-3 ${isFuture ? 'opacity-40' : ''}`}>
                            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${action?.action === 'approved' ? 'bg-emerald-500' :
                                    action?.action === 'rejected' ? 'bg-red-500' :
                                        isPending ? 'bg-amber-500 animate-pulse' :
                                            'bg-slate-200'
                                }`}>
                                {action?.action === 'approved' && <CheckCircle className="text-white" size={12} />}
                                {action?.action === 'rejected' && <XCircle className="text-white" size={12} />}
                                {isPending && <Clock className="text-white" size={12} />}
                                {isFuture && <div className="w-2 h-2 rounded-full bg-slate-400" />}
                            </div>
                            <div className="flex-1 pt-0.5">
                                <p className="text-sm font-medium text-slate-900">
                                    {step.name || `Step ${step.step_order}`}
                                </p>
                                {action ? (
                                    <>
                                        <p className={`text-xs font-medium ${action.action === 'approved' ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                            {action.action} by {action.approver?.full_name || 'System'}
                                        </p>
                                        {action.comment && (
                                            <p className="text-xs text-slate-500 italic mt-1">"{action.comment}"</p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {new Date(action.acted_at).toLocaleString('en-GB', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </>
                                ) : isPending ? (
                                    <p className="text-xs text-amber-600">Awaiting action...</p>
                                ) : (
                                    <p className="text-xs text-slate-400">
                                        Approver: {step.approver_role_code}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Final Status */}
                {(instance.status === 'approved' || instance.status === 'rejected') && (
                    <div className="relative flex gap-3">
                        <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${instance.status === 'approved' ? 'bg-emerald-600' : 'bg-red-600'
                            }`}>
                            {instance.status === 'approved' ? (
                                <CheckCircle className="text-white" size={14} />
                            ) : (
                                <XCircle className="text-white" size={14} />
                            )}
                        </div>
                        <div className="flex-1 pt-0.5">
                            <p className={`text-sm font-bold ${instance.status === 'approved' ? 'text-emerald-700' : 'text-red-700'
                                }`}>
                                Request {instance.status === 'approved' ? 'Approved' : 'Rejected'}
                            </p>
                            {instance.resolved_at && (
                                <p className="text-xs text-slate-500">
                                    {new Date(instance.resolved_at).toLocaleString('en-GB', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ================== ACTION MODAL ==================
const ApprovalActionModal: React.FC<{
    approval: PendingApproval;
    action: 'approve' | 'reject';
    onClose: () => void;
    onConfirm: (comment?: string) => void;
    isLoading: boolean;
}> = ({ approval, action, onClose, onConfirm, isLoading }) => {
    const [comment, setComment] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-5 ${action === 'approve' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                            {action === 'approve' ? <CheckCircle size={28} /> : <XCircle size={28} />}
                            <h2 className="text-xl font-bold">
                                {action === 'approve' ? 'Approve Request' : 'Reject Request'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X className="text-white" size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Request Summary */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${approval.targetType === 'leave' ? 'bg-blue-100' :
                                    approval.targetType === 'claim' ? 'bg-emerald-100' :
                                        'bg-orange-100'
                                }`}>
                                {approval.targetType === 'leave' ? <Calendar className="text-blue-600" size={20} /> :
                                    approval.targetType === 'claim' ? <DollarSign className="text-emerald-600" size={20} /> :
                                        <Briefcase className="text-orange-600" size={20} />}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">
                                    {approval.targetType === 'leave' ? 'Leave Request' :
                                        approval.targetType === 'claim' ? 'Expense Claim' : 'Staff Loan'}
                                </p>
                                <p className="text-sm text-slate-500">
                                    From: {approval.requesterName}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Comment Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <MessageSquare className="inline mr-1" size={14} />
                            Comment {action === 'reject' && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] resize-none"
                            placeholder={action === 'reject'
                                ? 'Please provide a reason for rejection...'
                                : 'Optional comment (e.g., conditions, notes)...'}
                            required={action === 'reject'}
                        />
                    </div>

                    {/* Warning for rejection */}
                    {action === 'reject' && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                            <div className="text-sm text-amber-800">
                                <p className="font-medium">This action cannot be undone</p>
                                <p className="text-amber-700">The requester will be notified of this rejection.</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(comment)}
                            disabled={isLoading || (action === 'reject' && !comment.trim())}
                            className={`flex-1 px-4 py-3 rounded-xl font-medium text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${action === 'approve'
                                    ? 'bg-emerald-500 hover:bg-emerald-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <RotateCcw className="animate-spin" size={18} />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {action === 'approve' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                    {action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
