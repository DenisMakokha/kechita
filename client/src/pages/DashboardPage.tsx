import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import {
    Calendar,
    FileText,
    Briefcase,
    CheckCircle,
    Clock,
    ChevronRight,
    Umbrella,
    AlertTriangle,
    AlertCircle,
    ArrowUpRight,
    Receipt,
    PiggyBank,
    CalendarDays,
    Building2,
    TrendingUp,
    DollarSign,
    Target,
    Activity,
} from 'lucide-react';

// Kechita Brand Colors: Primary #0066B3, Secondary #8DC63F, Accent #F97316

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    iconBg: string;
    link?: string;
    trend?: { value: number; positive: boolean };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, iconBg, link, trend }) => {
    const Card = (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all duration-200 hover:border-slate-300 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-3xl font-bold text-slate-900">{value}</p>
                        {trend && (
                            <span className={`flex items-center text-xs font-medium mb-1 ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                                <ArrowUpRight size={14} className={trend.positive ? '' : 'rotate-180'} />
                                {trend.value}%
                            </span>
                        )}
                    </div>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${iconBg} group-hover:scale-105 transition-transform`}>{icon}</div>
            </div>
        </div>
    );

    return link ? <Link to={link}>{Card}</Link> : Card;
};

// Donut Chart Component
const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[]; size?: number; centerLabel?: string }> = ({ data, size = 100, centerLabel }) => {
    const total = data.reduce((acc, d) => acc + d.value, 0);
    let cumulative = 0;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth={strokeWidth}
                />
                {data.map((segment, i) => {
                    const percentage = total > 0 ? segment.value / total : 0;
                    const strokeDasharray = `${percentage * circumference} ${circumference}`;
                    const strokeDashoffset = -cumulative * circumference;
                    cumulative += percentage;
                    return (
                        <circle
                            key={i}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl font-bold text-slate-900">{total}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">{centerLabel || 'Total'}</p>
                </div>
            </div>
        </div>
    );
};

export const DashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const isCEO = user?.roles.some((r) => r.code === 'CEO');

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
            case 'leave': return <Calendar className="text-[#0066B3]" size={18} />;
            case 'claim': return <FileText className="text-emerald-500" size={18} />;
            case 'staff_loan': return <Briefcase className="text-[#0066B3]" size={18} />;
            default: return <AlertCircle className="text-slate-500" size={18} />;
        }
    };

    const upcomingHoliday = holidays?.find((h: any) => new Date(h.date) >= new Date());
    const totalLeaveBalance = myBalance?.reduce((acc: number, b: any) => acc + Number(b.balance_days), 0) || 0;

    // Team distribution data for donut chart
    const teamDistribution = [
        { label: 'At Work', value: Math.max(0, 50 - (staffOnLeave?.length || 0)), color: '#10B981' },
        { label: 'On Leave', value: staffOnLeave?.length || 0, color: '#F59E0B' },
    ];

    const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-br from-[#0066B3] via-[#0088E0] to-[#00AEEF] rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0yaDF2NGgtMXYtNHptMi0yaDF2MWgtMXYtMXptLTIgMGgxdjFoLTF2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">{greeting}, {user?.first_name}! 👋</h1>
                            <p className="text-blue-100 mt-1">Here's what's happening with your team today.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                to="/leave"
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg transition-all text-sm font-medium"
                            >
                                <CalendarDays size={16} />
                                Request Leave
                            </Link>
                            <Link
                                to="/claims"
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg transition-all text-sm font-medium"
                            >
                                <Receipt size={16} />
                                Submit Claim
                            </Link>
                            <Link
                                to="/loans"
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg transition-all text-sm font-medium"
                            >
                                <PiggyBank size={16} />
                                Apply for Loan
                            </Link>
                        </div>
                    </div>
                    {upcomingHoliday && (
                        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg w-fit">
                            <Calendar size={16} className="text-yellow-300" />
                            <span className="text-sm">
                                <span className="font-medium">Next Holiday:</span> {upcomingHoliday.name} - {new Date(upcomingHoliday.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Pending Approvals"
                    value={approvalStats?.pending || 0}
                    subtitle="Awaiting your action"
                    icon={<Clock className="text-white" size={22} />}
                    iconBg="bg-gradient-to-br from-orange-400 to-orange-600"
                    link="/approvals"
                />
                <StatCard
                    title="On Leave Today"
                    value={staffOnLeave?.length || 0}
                    subtitle="Team members away"
                    icon={<Umbrella className="text-white" size={22} />}
                    iconBg="bg-gradient-to-br from-cyan-400 to-blue-600"
                    link="/leave"
                />
                <StatCard
                    title="Leave Balance"
                    value={`${totalLeaveBalance.toFixed(1)} days`}
                    subtitle="Your available leave"
                    icon={<Calendar className="text-white" size={22} />}
                    iconBg="bg-gradient-to-br from-lime-400 to-green-600"
                    link="/leave"
                />
                <StatCard
                    title="Approved Today"
                    value={approvalStats?.approvedToday || 0}
                    subtitle={`Avg time: ${approvalStats?.avgApprovalTimeHours || 0}h`}
                    icon={<CheckCircle className="text-white" size={22} />}
                    iconBg="bg-gradient-to-br from-emerald-400 to-teal-600"
                />
            </div>

            {/* CEO Executive Summary */}
            {isCEO && dashboardData && (
                <div className="bg-gradient-to-br from-slate-800 via-[#0066B3] to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <TrendingUp size={20} />
                            </div>
                            <h2 className="text-xl font-bold">Executive Summary</h2>
                        </div>
                        <span className="text-sm text-blue-200">{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign size={16} className="text-[#8DC63F]" />
                                <p className="text-blue-200 text-sm">Total Disbursed</p>
                            </div>
                            <p className="text-2xl font-bold">KES {(dashboardData.totalDisbursed || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity size={16} className="text-[#8DC63F]" />
                                <p className="text-blue-200 text-sm">Total Recoveries</p>
                            </div>
                            <p className="text-2xl font-bold">KES {(dashboardData.totalRecoveries || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Briefcase size={16} className="text-[#F97316]" />
                                <p className="text-blue-200 text-sm">New Loans</p>
                            </div>
                            <p className="text-2xl font-bold">{dashboardData.totalNewLoans || 0}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Target size={16} className="text-[#F97316]" />
                                <p className="text-blue-200 text-sm">Avg PAR Ratio</p>
                            </div>
                            <p className="text-2xl font-bold">{(dashboardData.avgPAR || 0).toFixed(2)}%</p>
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
                        <Link to="/approvals" className="text-sm text-[#0066B3] hover:text-[#005299] font-medium flex items-center gap-1">
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
                    {/* Team Overview with Donut Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">Team Today</h3>
                            <Building2 size={18} className="text-slate-400" />
                        </div>
                        <div className="flex items-center gap-6">
                            <DonutChart data={teamDistribution} size={100} />
                            <div className="space-y-2">
                                {teamDistribution.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm text-slate-600">{item.label}</span>
                                        <span className="text-sm font-semibold text-slate-900 ml-auto">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Staff On Leave Today */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">On Leave Today</h3>
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                {staffOnLeave?.length || 0}
                            </span>
                        </div>
                        {!staffOnLeave || staffOnLeave.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Everyone is at work today! 🎉</p>
                        ) : (
                            <div className="space-y-3">
                                {staffOnLeave?.slice(0, 4).map((staff: any) => (
                                    <div key={staff.id} className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-orange-500/30">
                                            {staff.first_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate">{staff.full_name}</p>
                                            <p className="text-xs text-slate-500 truncate">{staff.position?.name}</p>
                                        </div>
                                    </div>
                                ))}
                                {staffOnLeave?.length > 4 && (
                                    <Link to="/leave" className="text-sm text-[#0066B3] hover:text-[#005599] font-medium">
                                        +{staffOnLeave.length - 4} more
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {/* My Leave Balance */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">My Leave Balance</h3>
                            <Link to="/leave" className="text-sm text-[#0066B3] hover:text-[#005299] font-medium">
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
                    <div className="bg-gradient-to-br from-[#0088E0] via-[#0066B3] to-[#00AEEF] rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
                        <h3 className="font-semibold mb-4">Leave Overview</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-blue-200 text-xs">Total Requests</p>
                                <p className="text-2xl font-bold">{leaveStats?.totalRequests || 0}</p>
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs">Pending</p>
                                <p className="text-2xl font-bold">{leaveStats?.pendingRequests || 0}</p>
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs">Approved</p>
                                <p className="text-2xl font-bold">{leaveStats?.approvedRequests || 0}</p>
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs">Days Taken</p>
                                <p className="text-2xl font-bold">{leaveStats?.totalDaysTaken || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
