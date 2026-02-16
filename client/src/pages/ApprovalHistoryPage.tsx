import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { ApprovalTimeline } from '../components/ApprovalTimeline';
import {
    History, Calendar, DollarSign, Briefcase, CheckCircle,
    XCircle, Clock, Search, Filter, ChevronDown, X,
    FileText, User, ArrowRight
} from 'lucide-react';

interface ApprovalHistoryItem {
    id: string;
    target_type: string;
    target_id: string;
    status: 'approved' | 'rejected' | 'pending' | 'cancelled';
    current_step_order: number;
    is_urgent: boolean;
    created_at: string;
    resolved_at?: string;
    final_comment?: string;
    requester?: {
        id: string;
        full_name: string;
        first_name: string;
        position?: { name: string };
        branch?: { name: string };
    };
    final_approver?: {
        full_name: string;
    };
    flow?: {
        id: string;
        name: string;
        steps?: any[];
    };
    actions?: any[];
}

export const ApprovalHistoryPage: React.FC = () => {
    const [selectedItem, setSelectedItem] = useState<ApprovalHistoryItem | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

    // Query for approval history
    const { data: historyData, isLoading } = useQuery<ApprovalHistoryItem[]>({
        queryKey: ['approval-history', statusFilter, typeFilter, searchQuery],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (typeFilter !== 'all') params.append('type', typeFilter);
            if (searchQuery) params.append('search', searchQuery);
            if (dateRange.start) params.append('startDate', dateRange.start);
            if (dateRange.end) params.append('endDate', dateRange.end);

            const response = await api.get(`/approvals/my-submissions?${params.toString()}`);
            return response.data;
        },
    });

    // Query for selected item details
    const { data: itemDetail } = useQuery<ApprovalHistoryItem>({
        queryKey: ['approval-detail', selectedItem?.id],
        queryFn: async () => {
            if (!selectedItem) return null;
            const response = await api.get(`/approvals/instances/${selectedItem.id}`);
            return response.data;
        },
        enabled: !!selectedItem,
    });

    const getTypeIcon = (type: string, size = 20) => {
        switch (type) {
            case 'leave': return <Calendar className="text-blue-500" size={size} />;
            case 'claim': return <DollarSign className="text-emerald-500" size={size} />;
            case 'staff_loan': return <Briefcase className="text-[#0066B3]" size={size} />;
            default: return <FileText className="text-slate-500" size={size} />;
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle className="text-emerald-500" size={18} />;
            case 'rejected': return <XCircle className="text-red-500" size={18} />;
            case 'pending': return <Clock className="text-amber-500" size={18} />;
            case 'cancelled': return <X className="text-slate-500" size={18} />;
            default: return <Clock className="text-slate-500" size={18} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Group items by date
    const groupedHistory = React.useMemo(() => {
        if (!historyData) return {};
        return historyData.reduce((acc, item) => {
            const date = new Date(item.created_at).toDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push(item);
            return acc;
        }, {} as Record<string, ApprovalHistoryItem[]>);
    }, [historyData]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <History className="text-[#0066B3]" size={28} />
                        Approval History
                    </h1>
                    <p className="text-slate-500 mt-1">Track and review all your submitted requests</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by reference or details..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        >
                            <option value="all">All Status</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Type Filter */}
                    <div className="relative">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="pl-4 pr-8 py-2 border border-slate-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        >
                            <option value="all">All Types</option>
                            <option value="leave">Leave</option>
                            <option value="claim">Claims</option>
                            <option value="staff_loan">Loans</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))}
                            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        />
                        <ArrowRight size={16} className="text-slate-400" />
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))}
                            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* History List */}
                <div className="lg:col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-[#0066B3] border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-slate-500">Loading history...</p>
                        </div>
                    ) : Object.keys(groupedHistory).length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="text-slate-400" size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No History Found</h3>
                            <p className="text-slate-500">No approval history matches your filters.</p>
                        </div>
                    ) : (
                        Object.entries(groupedHistory).map(([date, items]) => (
                            <div key={date}>
                                {/* Date Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Calendar className="text-[#0066B3]" size={18} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {new Date(date).toLocaleDateString('en-GB', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-sm text-slate-500">{items.length} requests</p>
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="space-y-3 pl-5 ml-5 border-l-2 border-slate-100">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedItem(item)}
                                            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedItem?.id === item.id
                                                    ? 'border-[#0066B3] ring-2 ring-blue-100'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2.5 rounded-xl ${item.target_type === 'leave' ? 'bg-blue-100' :
                                                        item.target_type === 'claim' ? 'bg-emerald-100' :
                                                            'bg-blue-100'
                                                    }`}>
                                                    {getTypeIcon(item.target_type, 22)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-slate-900">
                                                            {getTypeLabel(item.target_type)}
                                                        </h4>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                                            {item.status}
                                                        </span>
                                                        {item.is_urgent && (
                                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                                Urgent
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-slate-500 mb-2">
                                                        {item.flow?.name || 'Standard Workflow'}
                                                    </p>

                                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {formatTime(item.created_at)}
                                                        </span>
                                                        {item.resolved_at && (
                                                            <span className="flex items-center gap-1">
                                                                {getStatusIcon(item.status)}
                                                                {formatDate(item.resolved_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    {getStatusIcon(item.status)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detail Panel */}
                <div className="lg:col-span-1">
                    {selectedItem ? (
                        <div className="bg-white rounded-xl border border-slate-200 sticky top-6">
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50 rounded-t-xl">
                                <h3 className="font-semibold text-slate-900">Request Details</h3>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* Status Card */}
                                <div className={`p-4 rounded-xl border ${getStatusColor(selectedItem.status)}`}>
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(selectedItem.status)}
                                        <div>
                                            <p className="font-semibold capitalize">{selectedItem.status}</p>
                                            <p className="text-sm opacity-75">
                                                {selectedItem.resolved_at
                                                    ? `Resolved on ${formatDate(selectedItem.resolved_at)}`
                                                    : 'In progress'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <div className={`p-2 rounded-lg ${selectedItem.target_type === 'leave' ? 'bg-blue-100' :
                                                selectedItem.target_type === 'claim' ? 'bg-emerald-100' :
                                                    'bg-blue-100'
                                            }`}>
                                            {getTypeIcon(selectedItem.target_type, 18)}
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Type</p>
                                            <p className="font-medium text-slate-900">{getTypeLabel(selectedItem.target_type)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <div className="p-2 bg-slate-200 rounded-lg">
                                            <Calendar className="text-slate-600" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Submitted</p>
                                            <p className="font-medium text-slate-900">
                                                {formatDate(selectedItem.created_at)} at {formatTime(selectedItem.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedItem.final_approver && (
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            <div className="p-2 bg-slate-200 rounded-lg">
                                                <User className="text-slate-600" size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Final Approver</p>
                                                <p className="font-medium text-slate-900">{selectedItem.final_approver.full_name}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Final Comment */}
                                {selectedItem.final_comment && (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-sm text-slate-500 mb-1">Final Comment</p>
                                        <p className="text-slate-700 italic">"{selectedItem.final_comment}"</p>
                                    </div>
                                )}

                                {/* Timeline */}
                                {itemDetail && (
                                    <div>
                                        <h4 className="font-semibold text-slate-900 mb-4">Approval Timeline</h4>
                                        <ApprovalTimeline instance={itemDetail} variant="compact" showHeader={false} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center sticky top-6">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="text-slate-400" size={24} />
                            </div>
                            <h4 className="font-medium text-slate-900 mb-1">Select a Request</h4>
                            <p className="text-sm text-slate-500">Click on a request to view its details and timeline</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApprovalHistoryPage;
