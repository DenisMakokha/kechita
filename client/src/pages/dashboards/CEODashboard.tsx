import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import {
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    Clock,
    ChevronRight,
    BarChart3,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    MapPin,
    RefreshCw,
    Download,
    Briefcase,
    FileText,
    Wallet,
    ScrollText,
    ClipboardList,
} from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: { value: number; positive: boolean };
    link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, trend, link }) => {
    const content = (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all hover:scale-[1.02]">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                        {trend && (
                            <span className={`flex items-center text-xs font-medium mb-1 ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                                {trend.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {trend.value}%
                            </span>
                        )}
                    </div>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
            </div>
        </div>
    );

    return link ? <Link to={link}>{content}</Link> : content;
};

export const CEODashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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
    const { data: pendingApprovals } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            const response = await api.get('/approvals/pending');
            return response.data;
        },
    });

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

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066B3] mx-auto"></div>
                    <p className="mt-4 text-slate-500">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                    <p className="text-lg font-medium text-slate-900">Failed to load dashboard</p>
                    <p className="text-sm text-slate-500 mt-1">Please try again later</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-[#0066B3] text-white rounded-lg hover:bg-[#005599] transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Extract data from dashboard response
    const regions = dashboard?.regionPerformance || [];
    const riskAlerts = dashboard?.riskAlerts || [];
    const trends = dashboard?.trends || { disbursedChange: 0, recoveriesChange: 0, newLoansChange: 0, parChange: 0 };
    const staffStats = dashboard?.staffStats || { total: 0, active: 0, onLeave: 0, onboarding: 0, probation: 0 };
    const leaveStats = dashboard?.leaveStats || { total: 0, approved: 0, pending: 0, rejected: 0, totalDays: 0 };
    const claimsStats = dashboard?.claimsStats || { total: 0, submitted: 0, approved: 0, rejected: 0, totalAmount: 0, approvedAmount: 0, pendingCount: 0 };
    const loanStats = dashboard?.loanStats || { total: 0, pending: 0, active: 0, completed: 0, totalDisbursed: 0, totalOutstanding: 0 };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Executive Dashboard
                    </h1>
                    <p className="text-slate-500">
                        Company-wide performance and insights
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 hidden md:block">
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <div className="relative group">
                        <button
                            disabled={isExporting}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#0066B3] rounded-lg hover:bg-[#005599] transition-colors disabled:opacity-50"
                        >
                            <Download size={16} />
                            Export
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                                onClick={handleExportExcel}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                            >
                                Export to Excel
                            </button>
                            <button
                                onClick={handleExportPdf}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg"
                            >
                                Export to PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Executive Summary Bar */}
            <div className="bg-gradient-to-br from-[#0066B3] via-[#0088E0] to-[#00AEEF] rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <BarChart3 size={24} />
                        Monthly Performance Overview
                    </h2>
                    <span className="text-sm text-blue-200">
                        {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white/25 backdrop-blur rounded-xl p-4 border border-white/30">
                        <p className="text-white text-sm font-medium">Total Disbursed</p>
                        <p className="text-2xl font-bold mt-1 text-white">
                            KES {((dashboard?.totalDisbursed || 0) / 1000000).toFixed(1)}M
                        </p>
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trends.disbursedChange >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                            {trends.disbursedChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>{trends.disbursedChange >= 0 ? '+' : ''}{trends.disbursedChange}% from last month</span>
                        </div>
                    </div>
                    <div className="bg-white/25 backdrop-blur rounded-xl p-4 border border-white/30">
                        <p className="text-white text-sm font-medium">Total Collections</p>
                        <p className="text-2xl font-bold mt-1 text-white">
                            KES {((dashboard?.totalRecoveries || 0) / 1000000).toFixed(1)}M
                        </p>
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trends.recoveriesChange >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                            {trends.recoveriesChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>{trends.recoveriesChange >= 0 ? '+' : ''}{trends.recoveriesChange}% from last month</span>
                        </div>
                    </div>
                    <div className="bg-white/25 backdrop-blur rounded-xl p-4 border border-white/30">
                        <p className="text-white text-sm font-medium">New Loans</p>
                        <p className="text-2xl font-bold mt-1 text-white">{dashboard?.totalNewLoans || 0}</p>
                        <div className="flex items-center gap-1 mt-2 text-white/80 text-xs">
                            <span>{dashboard?.reportCount || 0} branches reporting</span>
                        </div>
                    </div>
                    <div className="bg-white/25 backdrop-blur rounded-xl p-4 border border-white/30">
                        <p className="text-white text-sm font-medium">Portfolio at Risk (PAR)</p>
                        <p className={`text-2xl font-bold mt-1 ${(dashboard?.avgPAR || 0) > 5 ? 'text-red-200' : 'text-emerald-200'}`}>
                            {(dashboard?.avgPAR || 0).toFixed(2)}%
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs font-medium">
                            {(dashboard?.avgPAR || 0) > 5 ? (
                                <span className="text-red-200 flex items-center gap-1">
                                    <AlertTriangle size={12} /> Above threshold
                                </span>
                            ) : (
                                <span className="text-emerald-200 flex items-center gap-1">
                                    <CheckCircle size={12} /> Within target
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Pending Approvals"
                    value={pendingApprovals?.length || 0}
                    subtitle="Awaiting your decision"
                    icon={<Clock className="text-white" size={24} />}
                    color="bg-gradient-to-br from-amber-500 to-orange-600"
                    link="/approvals"
                />
                <StatCard
                    title="Total Staff"
                    value={staffStats.total || '--'}
                    subtitle={`${staffStats.active} active, ${staffStats.onLeave} on leave`}
                    icon={<Users className="text-white" size={24} />}
                    color="bg-gradient-to-br from-cyan-400 to-blue-600"
                    link="/staff-management"
                />
                <StatCard
                    title="Outstanding Loans"
                    value={`KES ${((loanStats.totalOutstanding || 0) / 1000000).toFixed(1)}M`}
                    subtitle={`${loanStats.active || 0} active loans`}
                    icon={<DollarSign className="text-white" size={24} />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-600"
                    link="/loans"
                />
                <StatCard
                    title="Open Positions"
                    value={recruitmentStats?.openPositions || 0}
                    subtitle={`${recruitmentStats?.applicationsThisMonth || 0} new applications`}
                    icon={<Briefcase className="text-white" size={24} />}
                    color="bg-gradient-to-br from-[#0066B3] to-[#00AEEF]"
                    link="/recruitment"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Regional Performance */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Regional Performance</h3>
                        <Link to="/reports" className="text-sm text-[#0066B3] hover:text-[#005599] font-medium flex items-center gap-1">
                            View details <ChevronRight size={16} />
                        </Link>
                    </div>
                    {regions.length === 0 ? (
                        <div className="p-8 text-center">
                            <PieChart className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-500">No regional data available</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {regions.map((region: any, idx: number) => (
                                <div key={idx} className="p-4 hover:bg-slate-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center">
                                                <MapPin className="text-[#0066B3]" size={16} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{region.name}</p>
                                                <p className="text-xs text-slate-500">{region.branchCount || 0} branches</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-900">
                                                KES {((region.collections || 0) / 1000000).toFixed(2)}M
                                            </p>
                                            <p className={`text-xs ${(region.par || 0) > 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                PAR: {(region.par || 0).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-[#0066B3] to-[#00AEEF] h-2 rounded-full"
                                            style={{ width: `${Math.min((region.collections || 0) / 10000000 * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Risk Alerts */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Risk Alerts</h3>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            {riskAlerts.length}
                        </span>
                    </div>
                    {riskAlerts.length === 0 ? (
                        <div className="p-8 text-center">
                            <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
                            <p className="font-medium text-slate-900">All Clear!</p>
                            <p className="text-sm text-slate-500">No critical alerts at this time</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                            {riskAlerts.map((alert: any, idx: number) => (
                                <div key={idx} className="p-4 hover:bg-slate-50">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${alert.severity === 'high' ? 'bg-red-100' :
                                            alert.severity === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                                            }`}>
                                            <AlertCircle className={`${alert.severity === 'high' ? 'text-red-600' :
                                                alert.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                                                }`} size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{alert.type}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{alert.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Operational Alerts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Petty Cash */}
                <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><Wallet size={18} /> Petty Cash</h3>
                        <Link to="/petty-cash" className="text-xs text-purple-200 hover:text-white">Manage</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-purple-200 text-xs">Total Balance</p><p className="text-xl font-bold">KES {((pettyCashStats?.total_balance || 0) / 1000).toFixed(0)}K</p></div>
                        <div><p className="text-purple-200 text-xs">Active Floats</p><p className="text-xl font-bold">{pettyCashStats?.total_floats || 0}</p></div>
                        <div><p className="text-purple-200 text-xs">Month Expenses</p><p className="text-xl font-bold">KES {((pettyCashStats?.total_expenses_this_month || 0) / 1000).toFixed(0)}K</p></div>
                        <div><p className="text-purple-200 text-xs">Pending Replenish</p><p className="text-xl font-bold">{pettyCashStats?.pending_replenishments || 0}</p></div>
                    </div>
                </div>

                {/* Expiring Contracts */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ScrollText size={18} className="text-amber-600" /> Contract Alerts</h3>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{expiringContracts?.length || 0}</span>
                    </div>
                    {!expiringContracts || expiringContracts.length === 0 ? (
                        <div className="text-center py-4"><CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} /><p className="text-sm text-slate-500">No contracts expiring in 30 days</p></div>
                    ) : (
                        <div className="space-y-2">
                            {expiringContracts.slice(0, 4).map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                                    <div><p className="text-sm font-medium text-slate-900">{c.staff?.first_name} {c.staff?.last_name}</p><p className="text-xs text-slate-500">{c.contract_type}</p></div>
                                    <p className="text-xs font-medium text-amber-600">{c.end_date ? new Date(c.end_date).toLocaleDateString() : '--'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Onboarding */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ClipboardList size={18} className="text-emerald-600" /> Onboarding</h3>
                        <Link to="/staff-management" className="text-sm text-[#0066B3]">View</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-emerald-50 rounded-lg text-center"><p className="text-2xl font-bold text-emerald-700">{onboardingStats?.activeCount || onboardingStats?.inProgress || 0}</p><p className="text-xs text-emerald-600">In Progress</p></div>
                        <div className="p-3 bg-amber-50 rounded-lg text-center"><p className="text-2xl font-bold text-amber-700">{onboardingStats?.pendingTasks || 0}</p><p className="text-xs text-amber-600">Pending Tasks</p></div>
                        <div className="p-3 bg-blue-50 rounded-lg text-center"><p className="text-2xl font-bold text-blue-700">{onboardingStats?.completedThisMonth || 0}</p><p className="text-xs text-blue-600">Completed</p></div>
                        <div className="p-3 bg-slate-50 rounded-lg text-center"><p className="text-2xl font-bold text-slate-700">{staffStats.probation || 0}</p><p className="text-xs text-slate-600">On Probation</p></div>
                    </div>
                </div>
            </div>

            {/* HR & Staff Loans Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><FileText size={18} /> Leave Summary</h3>
                        <Link to="/leave-management" className="text-xs text-blue-200 hover:text-white">View all</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-blue-200 text-xs">Total Requests</p><p className="text-2xl font-bold">{leaveStats.total}</p></div>
                        <div><p className="text-blue-200 text-xs">Pending</p><p className="text-2xl font-bold">{leaveStats.pending}</p></div>
                        <div><p className="text-blue-200 text-xs">Approved</p><p className="text-2xl font-bold">{leaveStats.approved}</p></div>
                        <div><p className="text-blue-200 text-xs">Days Taken</p><p className="text-2xl font-bold">{leaveStats.totalDays}</p></div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><Wallet size={18} /> Claims Summary</h3>
                        <Link to="/claims" className="text-xs text-emerald-200 hover:text-white">View all</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-emerald-200 text-xs">Total Claims</p><p className="text-2xl font-bold">{claimsStats.total}</p></div>
                        <div><p className="text-emerald-200 text-xs">Pending</p><p className="text-2xl font-bold">{claimsStats.pendingCount}</p></div>
                        <div><p className="text-emerald-200 text-xs">Total Amount</p><p className="text-lg font-bold">KES {((claimsStats.totalAmount || 0) / 1000).toFixed(0)}K</p></div>
                        <div><p className="text-emerald-200 text-xs">Approved</p><p className="text-lg font-bold">KES {((claimsStats.approvedAmount || 0) / 1000).toFixed(0)}K</p></div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#0066B3] to-[#00AEEF] rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><Briefcase size={18} /> Staff Loans</h3>
                        <Link to="/loans" className="text-xs text-blue-100 hover:text-white">View all</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-blue-100 text-xs">Total Loans</p><p className="text-2xl font-bold">{loanStats.total}</p></div>
                        <div><p className="text-blue-100 text-xs">Pending Approval</p><p className="text-2xl font-bold">{loanStats.pending}</p></div>
                        <div><p className="text-blue-100 text-xs">Disbursed</p><p className="text-lg font-bold">KES {((loanStats.totalDisbursed || 0) / 1000000).toFixed(1)}M</p></div>
                        <div><p className="text-blue-100 text-xs">Outstanding</p><p className="text-lg font-bold">KES {((loanStats.totalOutstanding || 0) / 1000000).toFixed(1)}M</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CEODashboard;
