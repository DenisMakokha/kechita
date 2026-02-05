import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import {
    Users,
    Calendar,
    FileText,
    Briefcase,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    ChevronRight,
    Umbrella,
    UserCheck,
    AlertTriangle,
    ArrowUpRight,
} from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    link?: string;
    trend?: { value: number; positive: boolean };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, link, trend }) => {
    const Card = (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                        {trend && (
                            <span className={`flex items-center text-xs font-medium mb-1 ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                                <ArrowUpRight size={14} className={trend.positive ? '' : 'rotate-180'} />
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

    return link ? <Link to={link}>{Card}</Link> : Card;
};

export const DashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const isCEO = user?.roles.some((r) => r.code === 'CEO');
    const isHR = user?.roles.some((r) => r.code === 'HR_MANAGER');
    const isManager = user?.roles.some((r) => ['REGIONAL_MANAGER', 'BRANCH_MANAGER'].includes(r.code));

    // Fetch pending approvals
    const { data: pendingApprovals } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            const response = await api.get('/approvals/pending');
            return response.data;
        },
    });

    // Fetch approval stats
    const { data: approvalStats } = useQuery({
        queryKey: ['approval-stats'],
        queryFn: async () => {
            const response = await api.get('/approvals/stats');
            return response.data;
        },
    });

    // Fetch leave stats
    const { data: leaveStats } = useQuery({
        queryKey: ['leave-stats'],
        queryFn: async () => {
            const response = await api.get('/leave/stats');
            return response.data;
        },
    });

    // Fetch staff on leave today
    const { data: staffOnLeave } = useQuery({
        queryKey: ['staff-on-leave-today'],
        queryFn: async () => {
            const response = await api.get('/leave/on-leave-today');
            return response.data;
        },
    });

    // Fetch my leave balance
    const { data: myBalance } = useQuery({
        queryKey: ['my-leave-balance'],
        queryFn: async () => {
            const response = await api.get('/leave/my-balance');
            return response.data;
        },
    });

    // Fetch upcoming holidays
    const { data: holidays } = useQuery({
        queryKey: ['public-holidays'],
        queryFn: async () => {
            const response = await api.get('/leave/holidays');
            return response.data;
        },
    });

    const { data: dashboardData } = useQuery({
        queryKey: ['ceo-dashboard'],
        queryFn: async () => {
            if (isCEO) {
                const response = await api.get('/reporting/dashboard/ceo');
                return response.data;
            }
            return null;
        },
        enabled: isCEO,
    });

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'leave': return 'Leave Request';
            case 'claim': return 'Expense Claim';
            case 'staff_loan': return 'Staff Loan';
            default: return type;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'leave': return <Calendar className="text-blue-500" size={18} />;
            case 'claim': return <FileText className="text-emerald-500" size={18} />;
            case 'staff_loan': return <Briefcase className="text-purple-500" size={18} />;
            default: return <AlertCircle className="text-slate-500" size={18} />;
        }
    };

    const upcomingHoliday = holidays?.find((h: any) => new Date(h.date) >= new Date());
    const totalLeaveBalance = myBalance?.reduce((acc: number, b: any) => acc + Number(b.balance_days), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.first_name || 'there'}!
                    </h1>
                    <p className="text-slate-500">Here's what's happening in your organization.</p>
                </div>
                {upcomingHoliday && (
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-purple-50 border border-purple-100 rounded-lg">
                        <Calendar className="text-purple-600" size={18} />
                        <div>
                            <p className="text-sm font-medium text-purple-900">Next Holiday: {upcomingHoliday.name}</p>
                            <p className="text-xs text-purple-600">
                                {new Date(upcomingHoliday.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Pending Approvals"
                    value={approvalStats?.pending || 0}
                    subtitle="Awaiting your action"
                    icon={<Clock className="text-white" size={24} />}
                    color="bg-gradient-to-br from-amber-500 to-orange-600"
                    link="/approvals"
                />
                <StatCard
                    title="On Leave Today"
                    value={staffOnLeave?.length || 0}
                    subtitle="Team members away"
                    icon={<Umbrella className="text-white" size={24} />}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    link="/leave"
                />
                <StatCard
                    title="Leave Balance"
                    value={`${totalLeaveBalance.toFixed(1)} days`}
                    subtitle="Your available leave"
                    icon={<Calendar className="text-white" size={24} />}
                    color="bg-gradient-to-br from-emerald-500 to-green-600"
                    link="/leave"
                />
                <StatCard
                    title="Approved Today"
                    value={approvalStats?.approvedToday || 0}
                    subtitle={`Avg time: ${approvalStats?.avgApprovalTimeHours || 0}h`}
                    icon={<CheckCircle className="text-white" size={24} />}
                    color="bg-gradient-to-br from-purple-500 to-pink-600"
                />
            </div>

            {/* CEO Executive Summary */}
            {isCEO && dashboardData && (
                <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">Executive Summary</h2>
                        <span className="text-sm text-purple-300">{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-300 text-sm">Total Disbursed</p>
                            <p className="text-2xl font-bold mt-1">KES {(dashboardData.totalDisbursed || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-300 text-sm">Total Recoveries</p>
                            <p className="text-2xl font-bold mt-1">KES {(dashboardData.totalRecoveries || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-300 text-sm">New Loans</p>
                            <p className="text-2xl font-bold mt-1">{dashboardData.totalNewLoans || 0}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-300 text-sm">Avg PAR Ratio</p>
                            <p className="text-2xl font-bold mt-1">{(dashboardData.avgPAR || 0).toFixed(2)}%</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Approvals List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Pending Approvals</h3>
                        <Link to="/approvals" className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                            View all <ChevronRight size={16} />
                        </Link>
                    </div>

                    {!pendingApprovals || pendingApprovals.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="text-emerald-600" size={32} />
                            </div>
                            <p className="text-slate-600 font-medium">All caught up!</p>
                            <p className="text-sm text-slate-500">No pending approvals at the moment.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {pendingApprovals?.slice(0, 5).map((approval: any) => (
                                <Link
                                    key={approval.instance?.id}
                                    to="/approvals"
                                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            {getTypeIcon(approval.targetType)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-slate-900">{getTypeLabel(approval.targetType)}</p>
                                                {approval.isUrgent && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                                        <AlertTriangle size={10} />
                                                        Urgent
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">
                                                {approval.requesterName} • {approval.stepName}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-400" size={20} />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Staff On Leave Today */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">On Leave Today</h3>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                {staffOnLeave?.length || 0}
                            </span>
                        </div>
                        {!staffOnLeave || staffOnLeave.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Everyone is at work today! 🎉</p>
                        ) : (
                            <div className="space-y-3">
                                {staffOnLeave?.slice(0, 4).map((staff: any) => (
                                    <div key={staff.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                            {staff.first_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate">{staff.full_name}</p>
                                            <p className="text-xs text-slate-500 truncate">{staff.position?.name}</p>
                                        </div>
                                    </div>
                                ))}
                                {staffOnLeave?.length > 4 && (
                                    <Link to="/leave" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                                        +{staffOnLeave.length - 4} more
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {/* My Leave Balance */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">My Leave Balance</h3>
                            <Link to="/leave" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                                Request
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {myBalance?.slice(0, 3).map((balance: any) => (
                                <div key={balance.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: balance.leaveType?.color || '#6366f1' }}
                                        />
                                        <span className="text-sm text-slate-600">{balance.leaveType?.name}</span>
                                    </div>
                                    <span className="font-semibold text-slate-900">{Number(balance.balance_days).toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-5 text-white">
                        <h3 className="font-semibold mb-4">Leave Overview</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-purple-200 text-xs">Total Requests</p>
                                <p className="text-2xl font-bold">{leaveStats?.totalRequests || 0}</p>
                            </div>
                            <div>
                                <p className="text-purple-200 text-xs">Pending</p>
                                <p className="text-2xl font-bold">{leaveStats?.pendingRequests || 0}</p>
                            </div>
                            <div>
                                <p className="text-purple-200 text-xs">Approved</p>
                                <p className="text-2xl font-bold">{leaveStats?.approvedRequests || 0}</p>
                            </div>
                            <div>
                                <p className="text-purple-200 text-xs">Days Taken</p>
                                <p className="text-2xl font-bold">{leaveStats?.totalDaysTaken || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
