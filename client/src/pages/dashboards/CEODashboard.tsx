import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import {
    DollarSign,
    AlertTriangle,
    CheckCircle,
    Clock,
    ChevronRight,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    RefreshCw,
    Download,
    Briefcase,
    FileText,
    Wallet,
    ScrollText,
    ClipboardList,
    Calendar,
    Users,
    X,
} from 'lucide-react';

interface GlassStatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: { value: number; positive: boolean };
}

const GlassStatCard: React.FC<GlassStatCardProps> = ({ title, value, subtitle, trend }) => {
    return (
        <div className="bg-white/12 backdrop-blur-md border border-white/20 rounded-2xl p-6 md:p-7 min-h-[165px] hover:bg-white/18 hover:border-white/25 transition-all duration-200 flex flex-col justify-between group h-full">
            <div>
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">{title}</p>
                <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-2xl font-black text-white tracking-tight leading-none">{value}</p>
                    {trend && trend.value !== 0 && (
                        <span className="flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/25 text-white select-none">
                            {trend.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            {Math.abs(trend.value)}%
                        </span>
                    )}
                </div>
            </div>
            {subtitle && (
                <p className="text-xs text-blue-50/80 mt-4 pt-3 border-t border-white/10 font-semibold truncate">
                    {subtitle}
                </p>
            )}
        </div>
    );
};

interface OperationalCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    iconBg: string;
    link: string;
}

const OperationalCard: React.FC<OperationalCardProps> = ({ title, value, subtitle, icon, iconBg, link }) => {
    return (
        <Link 
            to={link}
            className="bg-white rounded-2xl border border-slate-200/70 shadow-sm shadow-slate-100/40 p-6 md:p-7 min-h-[135px] hover:border-slate-300 hover:shadow-md hover:scale-[1.01] transition-all duration-200 group flex items-center justify-between"
        >
            <div className="space-y-1 truncate pr-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{title}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-2">{value}</p>
                {subtitle && (
                    <p className="text-[10px] text-slate-450 font-semibold truncate mt-2 select-none">
                        {subtitle}
                    </p>
                )}
            </div>
            <div className={`p-4 rounded-2xl ${iconBg} text-white shrink-0 shadow-sm transition-transform duration-250 group-hover:scale-105 group-hover:rotate-3`}>
                {icon}
            </div>
        </Link>
    );
};

export const CEODashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState('');

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Quick approve mutation
    const approveMutation = useMutation({
        mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
            return api.post(`/approvals/instances/${id}/approve`, { comment });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['ceo-dashboard'] });
            showToast('Request approved successfully!');
        },
        onError: (err: any) => {
            showToast(err?.response?.data?.message || 'Failed to approve request', 'error');
        },
    });

    // Quick reject mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
            return api.post(`/approvals/instances/${id}/reject`, { comment });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['ceo-dashboard'] });
            setRejectingId(null);
            setRejectComment('');
            showToast('Request rejected successfully');
        },
        onError: (err: any) => {
            showToast(err?.response?.data?.message || 'Failed to reject request', 'error');
        },
    });

    const handleQuickApprove = (id: string) => {
        approveMutation.mutate({ id });
    };

    const startQuickReject = (id: string) => {
        setRejectingId(id);
        setRejectComment('');
    };

    const handleQuickReject = (id: string) => {
        if (!rejectComment.trim()) return;
        rejectMutation.mutate({ id, comment: rejectComment });
    };

    const cancelReject = () => {
        setRejectingId(null);
        setRejectComment('');
    };

    // Fetch CEO dashboard data
    const { data: dashboard, isLoading, error, refetch } = useQuery({
        queryKey: ['ceo-dashboard'],
        queryFn: async () => {
            const response = await api.get('/reporting/dashboard/ceo');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchInterval: 120000,
    });

    // Fetch pending approvals
    const { data: pendingApprovalsRaw } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            const response = await api.get('/approvals/pending');
            return response.data;
        },
    });

    // Handle both array and { data: [...] } response formats
    const pendingApprovals = Array.isArray(pendingApprovalsRaw)
        ? pendingApprovalsRaw
        : (pendingApprovalsRaw as any)?.data || [];

    // Fetch recruitment stats
    const { data: recruitmentStats } = useQuery({
        queryKey: ['recruitment-stats'],
        queryFn: async () => {
            const response = await api.get('/recruitment/stats');
            return response.data;
        },
    });

    // Fetch petty cash dashboard
    const { data: pettyCashStats } = useQuery({
        queryKey: ['ceo-petty-cash'],
        queryFn: () => api.get('/petty-cash/dashboard').then(r => r.data).catch(() => null),
        refetchInterval: 60000,
    });

    // Expiring contracts
    const { data: expiringContracts } = useQuery({
        queryKey: ['ceo-expiring-contracts'],
        queryFn: () => api.get('/staff/contracts/expiring?days=30').then(r => r.data).catch(() => []),
    });

    // Onboarding stats
    const { data: onboardingStats } = useQuery({
        queryKey: ['ceo-onboarding-stats'],
        queryFn: () => api.get('/staff/onboarding/stats').then(r => r.data).catch(() => null),
    });

    // Refresh all dashboard data
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                refetch(),
                queryClient.invalidateQueries({ queryKey: ['pending-approvals'] }),
                queryClient.invalidateQueries({ queryKey: ['recruitment-stats'] }),
            ]);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Export dashboard to Excel
    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const response = await api.get('/reporting/export/excel?type=summary', {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `executive-report-${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    // Export dashboard to PDF
    const handleExportPdf = async () => {
        setIsExporting(true);
        try {
            const response = await api.get('/reporting/export/pdf?type=summary', {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `executive-report-${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    // Format currency dynamically
    const formatAmount = (val: number) => {
        if (val >= 1000000) return `KES ${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `KES ${(val / 1000).toFixed(0)}K`;
        return `KES ${val}`;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[450px]">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#0066B3] mx-auto"></div>
                    <p className="text-sm font-semibold text-slate-500 tracking-wide">Loading executive insights...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[450px]">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-md text-center max-w-md space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-500">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Failed to load dashboard</h3>
                        <p className="text-sm text-slate-500 mt-1">We couldn't retrieve the report summary at this time.</p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="w-full py-3 bg-gradient-to-r from-[#005599] to-[#0066B3] hover:from-[#0066B3] hover:to-[#0077cc] text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    // Extract data from dashboard response
    const riskAlerts = dashboard?.riskAlerts || [];
    const trends = dashboard?.trends || { disbursedChange: 0, recoveriesChange: 0, newLoansChange: 0, parChange: 0 };
    const staffStats = dashboard?.staffStats || { total: 0, active: 0, onLeave: 0, onboarding: 0, probation: 0 };
    const leaveStats = dashboard?.leaveStats || { total: 0, approved: 0, pending: 0, rejected: 0, totalDays: 0 };
    const claimsStats = dashboard?.claimsStats || { total: 0, submitted: 0, approved: 0, rejected: 0, totalAmount: 0, approvedAmount: 0, pendingCount: 0 };
    const loanStats = dashboard?.loanStats || { total: 0, pending: 0, active: 0, completed: 0, totalDisbursed: 0, totalOutstanding: 0 };

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
                        toastMessage.type === 'success' ? 'bg-slate-900 text-white font-semibold' : 'bg-red-650 text-white font-semibold'
                    }`}>
                        {toastMessage.type === 'success' ? (
                            <CheckCircle size={18} className="text-emerald-400" />
                        ) : (
                            <AlertCircle size={18} className="text-white" />
                        )}
                        <span className="text-xs">{toastMessage.text}</span>
                    </div>
                </div>
            )}

            {/* Header / Top Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-2">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
                    <p className="text-sm font-semibold text-slate-500 mt-0.5">Company-wide performance and insights</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100/80 px-3.5 py-2 rounded-xl hidden md:inline-block border border-slate-200/50">
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <Link
                        to="/approvals"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
                    >
                        <Clock size={14} />
                        <span>Approvals</span>
                        {pendingApprovals?.length > 0 && (
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black">{pendingApprovals.length}</span>
                        )}
                    </Link>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <div className="relative group">
                        <button
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0066B3] hover:bg-[#005599] rounded-xl transition-all shadow-sm hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <Download size={14} />
                            Export
                        </button>
                        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 py-1.5">
                            <button
                                onClick={handleExportExcel}
                                className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                                <FileText size={13} className="text-[#0066B3]" />
                                Export to Excel
                            </button>
                            <button
                                onClick={handleExportPdf}
                                className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                                <FileText size={13} className="text-red-500" />
                                Export to PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Performance Overview Blue Banner */}
            <div className="bg-gradient-to-r from-[#0066B3] to-[#00AEEF] rounded-3xl p-6 text-white shadow-lg shadow-blue-500/15 relative overflow-hidden">
                {/* Dynamic radial gradient for highlights */}
                <div className="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none opacity-30"></div>
                
                <div className="flex items-center justify-between pb-4 border-b border-white/20 mb-6 relative z-10">
                    <h2 className="text-base font-extrabold flex items-center gap-2 tracking-tight">
                        <BarChart3 size={18} /> Monthly Performance Overview
                    </h2>
                    <span className="text-xs font-black bg-white/20 border border-white/10 px-3.5 py-1 rounded-full uppercase tracking-wider select-none">
                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
                    <GlassStatCard
                        title="Total Disbursed"
                        value={`KES ${((dashboard?.totalDisbursed || 0) / 1000000).toFixed(1)}M`}
                        subtitle={`${dashboard?.reportCount || 0} reports compiled this month`}
                        trend={{ value: trends.disbursedChange, positive: trends.disbursedChange >= 0 }}
                    />
                    <GlassStatCard
                        title="Total Collections"
                        value={`KES ${((dashboard?.totalRecoveries || 0) / 1000000).toFixed(1)}M`}
                        subtitle="Payments collected MTD"
                        trend={{ value: trends.recoveriesChange, positive: trends.recoveriesChange >= 0 }}
                    />
                    <GlassStatCard
                        title="New Loans"
                        value={dashboard?.totalNewLoans || 0}
                        subtitle={`${dashboard?.reportCount || 0} reports compiled`}
                        trend={{ value: trends.newLoansChange, positive: trends.newLoansChange >= 0 }}
                    />
                    <GlassStatCard
                        title="Portfolio at Risk (PAR)"
                        value={`${(dashboard?.avgPAR || 0).toFixed(2)}%`}
                        subtitle={(dashboard?.avgPAR || 0) > 5 ? "Arrears above threshold" : "Collections within target"}
                    />
                </div>
            </div>

            {/* Operational 8-Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <OperationalCard
                    title="Pending Approvals"
                    value={pendingApprovals?.length || 0}
                    subtitle="Awaiting your decision"
                    icon={<Clock size={20} className="text-white" />}
                    iconBg="bg-[#ff7700]"
                    link="/approvals"
                />
                <OperationalCard
                    title="Total Staff"
                    value={staffStats.total}
                    subtitle={`${staffStats.active} active, ${staffStats.onLeave} on leave`}
                    icon={<Users size={20} className="text-white" />}
                    iconBg="bg-[#00aeef]"
                    link="/staff-management"
                />
                <OperationalCard
                    title="Outstanding Loans"
                    value={formatAmount(loanStats.totalOutstanding || 0)}
                    subtitle={`${loanStats.active || 0} active loans`}
                    icon={<DollarSign size={20} className="text-white" />}
                    iconBg="bg-[#00b074]"
                    link="/loans"
                />
                <OperationalCard
                    title="Open Positions"
                    value={recruitmentStats?.activeJobs || recruitmentStats?.openPositions || 0}
                    subtitle={`${recruitmentStats?.totalApplications || 0} total applications`}
                    icon={<Briefcase size={20} className="text-white" />}
                    iconBg="bg-[#0066b3]"
                    link="/recruitment"
                />
                <OperationalCard
                    title="Leave Requests"
                    value={leaveStats.pending}
                    subtitle={`${leaveStats.approved} approved this month`}
                    icon={<Calendar size={20} className="text-white" />}
                    iconBg="bg-[#8f39fa]"
                    link="/leave-management"
                />
                <OperationalCard
                    title="Expense Claims"
                    value={claimsStats.pending || claimsStats.pendingCount || 0}
                    subtitle={`KES ${((claimsStats?.pendingAmount || claimsStats?.totalAmount || 0) / 1000).toFixed(0)}K pending`}
                    icon={<FileText size={20} className="text-white" />}
                    iconBg="bg-[#f42b6b]"
                    link="/claims"
                />
                <OperationalCard
                    title="Onboarding"
                    value={onboardingStats?.activeCount || onboardingStats?.inProgress || 0}
                    subtitle={`${staffStats.probation || 0} on probation`}
                    icon={<ClipboardList size={20} className="text-white" />}
                    iconBg="bg-[#00a896]"
                    link="/staff-management"
                />
                <OperationalCard
                    title="Expiring Contracts"
                    value={expiringContracts?.length || 0}
                    subtitle="Expiring within 30 days"
                    icon={<ScrollText size={20} className="text-white" />}
                    iconBg="bg-[#5c6f84]"
                    link="/hr-admin"
                />
            </div>

            {/* Bottom 3-Column Structured Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Action List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-100 p-7 min-h-[460px] flex flex-col justify-between hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-sm">
                                <Clock size={15} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">Action List</h3>
                        </div>
                        <Link to="/approvals" className="text-xs font-bold text-[#0066B3] hover:text-[#005599] bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 hover:scale-[1.02] active:scale-95">
                            Manage <ChevronRight size={13} />
                        </Link>
                    </div>

                    {pendingApprovals.length === 0 ? (
                        <div className="p-8 text-center flex-1 flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-md">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">All Clear!</p>
                                <p className="text-xs text-slate-500 mt-0.5">No actions pending your approval.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[330px] flex-1 pr-1 scrollbar-thin">
                            {pendingApprovals.slice(0, 4).map((approval: any) => {
                                const type = approval.targetType || approval.instance?.target_type;
                                const requesterName = approval.requesterName || approval.instance?.requester?.full_name || 'Staff';
                                const id = approval.instance?.id;

                                // Determine icon and colors
                                let icon = <FileText size={14} />;
                                let iconBg = 'bg-slate-50 text-slate-600 border-slate-100';
                                let typeLabel = 'Request';

                                if (type === 'leave') {
                                    icon = <Calendar size={14} />;
                                    iconBg = 'bg-blue-50 text-blue-600 border-blue-100';
                                    typeLabel = 'Leave';
                                } else if (type === 'claim') {
                                    icon = <DollarSign size={14} />;
                                    iconBg = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                    typeLabel = 'Claim';
                                } else if (type === 'staff_loan') {
                                    icon = <Briefcase size={14} />;
                                    iconBg = 'bg-orange-50 text-orange-600 border-orange-100';
                                    typeLabel = 'Loan';
                                } else if (type === 'petty_cash_replenishment') {
                                    icon = <Wallet size={14} />;
                                    iconBg = 'bg-purple-50 text-purple-600 border-purple-100';
                                    typeLabel = 'Petty Cash';
                                }

                                return (
                                    <div key={id} className="py-3.5 first:pt-0 last:pb-0 group/item">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${iconBg}`}>
                                                    {icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 truncate">
                                                        {requesterName}
                                                    </p>
                                                    <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">
                                                        {typeLabel} · {approval.stepName || 'Pending approval'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Inline Approval Action Buttons */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => handleQuickApprove(id)}
                                                    title="Approve"
                                                    className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-100 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                                >
                                                    <CheckCircle size={14} />
                                                </button>
                                                <button
                                                    onClick={() => startQuickReject(id)}
                                                    title="Reject"
                                                    className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-500 text-red-650 hover:text-white border border-red-100 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Inline Rejection Reason Form */}
                                        {rejectingId === id && (
                                            <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded-xl p-2.5 animate-in slide-in-from-top-1 duration-200">
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Enter rejection comment:</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Reason (required)..."
                                                        value={rejectComment}
                                                        onChange={(e) => setRejectComment(e.target.value)}
                                                        className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800"
                                                    />
                                                    <button
                                                        onClick={() => handleQuickReject(id)}
                                                        disabled={!rejectComment.trim()}
                                                        className="px-3 py-1.5 bg-red-650 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={cancelReject}
                                                        className="px-2 py-1.5 border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {pendingApprovals.length > 4 && (
                                <div className="pt-3 text-center border-t border-slate-100">
                                    <Link to="/approvals" className="text-[11px] font-bold text-[#0066B3] hover:text-[#005599] transition-colors">
                                        + {pendingApprovals.length - 4} more actions pending
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Column 2: Petty Cash */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-100 p-7 min-h-[460px] flex flex-col justify-between hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                                <Wallet size={15} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">Petty Cash</h3>
                        </div>
                        <Link to="/petty-cash" className="text-xs font-bold text-[#0066B3] hover:text-[#005599] bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-95">
                            Manage
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4 flex-1 py-1">
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4.5 flex flex-col justify-center">
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Balance</p>
                            <p className="text-lg font-black text-slate-900 mt-1">KES {((pettyCashStats?.total_balance || 0) / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4.5 flex flex-col justify-center">
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Floats</p>
                            <p className="text-lg font-black text-slate-900 mt-1">{pettyCashStats?.total_floats || 0}</p>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4.5 flex flex-col justify-center">
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Expenses</p>
                            <p className="text-lg font-black text-slate-900 mt-1">KES {((pettyCashStats?.total_expenses_this_month || 0) / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4.5 flex flex-col justify-center">
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Pending</p>
                            <p className="text-lg font-black text-slate-900 mt-1">{pettyCashStats?.pending_replenishments || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Column 3: Risk Alerts */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-100 p-7 min-h-[460px] flex flex-col justify-between hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-650 shadow-sm">
                                <AlertTriangle size={15} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">Risk Alerts</h3>
                        </div>
                        <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-750 text-[10px] font-black rounded-full shadow-sm select-none">
                            {riskAlerts.length} Active
                        </span>
                    </div>
                    {riskAlerts.length === 0 ? (
                        <div className="p-8 text-center py-12 flex-1 flex flex-col items-center justify-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-505 shadow-md">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">All Clear!</p>
                                <p className="text-xs text-slate-500 mt-0.5">No critical alerts detected today.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[300px] flex-1 pr-1 scrollbar-thin">
                            {riskAlerts.map((alert: any, idx: number) => {
                                const isHigh = alert.severity === 'high';
                                const isMedium = alert.severity === 'medium';
                                return (
                                    <div key={idx} className="py-3.5 first:pt-0 last:pb-0 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-xl border shrink-0 shadow-sm ${
                                                isHigh ? 'bg-red-50 border-red-100 text-red-600' :
                                                isMedium ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                                            }`}>
                                                <AlertCircle size={14} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold text-slate-955">{alert.type}</p>
                                                <p className="text-[11px] font-semibold text-slate-500 leading-snug">{alert.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CEODashboard;
