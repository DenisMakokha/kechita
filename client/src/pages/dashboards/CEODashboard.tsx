import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
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
    const { user } = useAuthStore();

    // Fetch CEO dashboard data
    const { data: dashboard, isLoading } = useQuery({
        queryKey: ['ceo-dashboard'],
        queryFn: async () => {
            const response = await api.get('/reporting/dashboard/ceo');
            return response.data;
        },
    });

    // Fetch pending approvals
    const { data: pendingApprovals } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            const response = await api.get('/approvals/pending');
            return response.data;
        },
    });

    // Fetch loan stats
    const { data: loanStats } = useQuery({
        queryKey: ['loan-stats'],
        queryFn: async () => {
            const response = await api.get('/loans/stats');
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066B3]"></div>
            </div>
        );
    }

    const regions = dashboard?.regionPerformance || [];
    const riskAlerts = dashboard?.riskAlerts || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Executive Dashboard
                    </h1>
                    <p className="text-slate-500">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.first_name || 'CEO'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Executive Summary Bar */}
            <div className="bg-gradient-to-r from-[#003366] to-[#002244] rounded-2xl p-6 text-white">
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
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-slate-300 text-sm">Total Disbursed</p>
                        <p className="text-2xl font-bold mt-1">
                            KES {((dashboard?.totalDisbursed || 0) / 1000000).toFixed(1)}M
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-emerald-400 text-xs">
                            <TrendingUp size={12} />
                            <span>+12% from last month</span>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-slate-300 text-sm">Total Collections</p>
                        <p className="text-2xl font-bold mt-1">
                            KES {((dashboard?.totalRecoveries || 0) / 1000000).toFixed(1)}M
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-emerald-400 text-xs">
                            <TrendingUp size={12} />
                            <span>+8% from last month</span>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-slate-300 text-sm">New Loans</p>
                        <p className="text-2xl font-bold mt-1">{dashboard?.totalNewLoans || 0}</p>
                        <div className="flex items-center gap-1 mt-2 text-slate-400 text-xs">
                            <span>{dashboard?.reportCount || 0} branches reporting</span>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-slate-300 text-sm">Portfolio at Risk (PAR)</p>
                        <p className={`text-2xl font-bold mt-1 ${(dashboard?.avgPAR || 0) > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {(dashboard?.avgPAR || 0).toFixed(2)}%
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs">
                            {(dashboard?.avgPAR || 0) > 5 ? (
                                <span className="text-red-400 flex items-center gap-1">
                                    <AlertTriangle size={12} /> Above threshold
                                </span>
                            ) : (
                                <span className="text-emerald-400 flex items-center gap-1">
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
                    value={dashboard?.staffStats?.total || '--'}
                    subtitle="Active employees"
                    icon={<Users className="text-white" size={24} />}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    link="/staff"
                />
                <StatCard
                    title="Outstanding Loans"
                    value={`KES ${((loanStats?.totalOutstanding || 0) / 1000000).toFixed(1)}M`}
                    subtitle={`${loanStats?.active || 0} active loans`}
                    icon={<DollarSign className="text-white" size={24} />}
                    color="bg-gradient-to-br from-emerald-500 to-green-600"
                    link="/loans"
                />
                <StatCard
                    title="Open Positions"
                    value={recruitmentStats?.openPositions || 0}
                    subtitle={`${recruitmentStats?.applicationsThisMonth || 0} new applications`}
                    icon={<Users className="text-white" size={24} />}
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

            {/* HR & Leave Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
                    <h3 className="font-semibold mb-4">Leave Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-blue-200 text-xs">Total Requests</p>
                            <p className="text-2xl font-bold">{dashboard?.leaveStats?.total || 0}</p>
                        </div>
                        <div>
                            <p className="text-blue-200 text-xs">Pending</p>
                            <p className="text-2xl font-bold">{dashboard?.leaveStats?.pending || 0}</p>
                        </div>
                        <div>
                            <p className="text-blue-200 text-xs">Approved</p>
                            <p className="text-2xl font-bold">{dashboard?.leaveStats?.approved || 0}</p>
                        </div>
                        <div>
                            <p className="text-blue-200 text-xs">Days Taken</p>
                            <p className="text-2xl font-bold">{dashboard?.leaveStats?.totalDays || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white">
                    <h3 className="font-semibold mb-4">Claims Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-emerald-200 text-xs">Submitted</p>
                            <p className="text-2xl font-bold">{dashboard?.claimsStats?.submitted || 0}</p>
                        </div>
                        <div>
                            <p className="text-emerald-200 text-xs">Pending</p>
                            <p className="text-2xl font-bold">{dashboard?.claimsStats?.pendingCount || 0}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-emerald-200 text-xs">Approved Amount</p>
                            <p className="text-2xl font-bold">
                                KES {((dashboard?.claimsStats?.approvedAmount || 0) / 1000).toFixed(0)}K
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#0066B3] to-[#00AEEF] rounded-xl p-5 text-white">
                    <h3 className="font-semibold mb-4">Recruitment Pipeline</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-blue-100 text-xs">Open Jobs</p>
                            <p className="text-2xl font-bold">{recruitmentStats?.openPositions || 0}</p>
                        </div>
                        <div>
                            <p className="text-blue-100 text-xs">Applications</p>
                            <p className="text-2xl font-bold">{recruitmentStats?.totalApplications || 0}</p>
                        </div>
                        <div>
                            <p className="text-blue-100 text-xs">Interviews</p>
                            <p className="text-2xl font-bold">{recruitmentStats?.scheduledInterviews || 0}</p>
                        </div>
                        <div>
                            <p className="text-blue-100 text-xs">Hired</p>
                            <p className="text-2xl font-bold">{recruitmentStats?.hiredThisMonth || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CEODashboard;
