import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
    Calendar,
    Clock,
    CheckCircle,
    ChevronRight,
    FileText,
    AlertTriangle,
    DollarSign,
    UserCheck,
    ArrowUpRight,
    Wallet,
    Megaphone,
    Briefcase,
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

    return link ? <Link to={link}>{content}</Link> : content;
};

export const BranchManagerDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const staffId = (user as any)?.staff?.id || (user as any)?.staff_id;

    // Fetch pending approvals
    const { data: pendingApprovals } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: () => api.get('/approvals/pending').then(r => r.data),
        refetchInterval: 30000,
    });

    // Fetch leave stats
    const { data: leaveStats } = useQuery({
        queryKey: ['leave-stats'],
        queryFn: () => api.get('/leave/stats').then(r => r.data),
        refetchInterval: 60000,
    });

    // Fetch my leave balance
    const { data: myBalance } = useQuery({
        queryKey: ['my-leave-balance'],
        queryFn: () => api.get('/leave/my-balance').then(r => r.data),
    });

    // Fetch team members (direct reports)
    const { data: directReports } = useQuery({
        queryKey: ['my-direct-reports', staffId],
        queryFn: () => api.get(`/staff/${staffId}/direct-reports`).then(r => r.data),
        enabled: !!staffId,
    });

    // Fetch staff on leave today
    const { data: staffOnLeaveToday } = useQuery({
        queryKey: ['staff-on-leave-today'],
        queryFn: () => api.get('/leave/on-leave-today').then(r => r.data),
        refetchInterval: 60000,
    });

    // Fetch my daily reports
    const { data: myReports } = useQuery({
        queryKey: ['my-reports-today'],
        queryFn: () => api.get('/reporting/my/reports?status=submitted').then(r => r.data).catch(() => []),
    });

    // Petty cash
    const { data: pettyCashStats } = useQuery({
        queryKey: ['bm-petty-cash'],
        queryFn: () => api.get('/petty-cash/dashboard').then(r => r.data).catch(() => null),
        refetchInterval: 60000,
    });

    // Announcements
    const { data: announcements } = useQuery({
        queryKey: ['bm-announcements'],
        queryFn: () => api.get('/communications/my-announcements?limit=3').then(r => r.data).catch(() => []),
    });

    // My loans
    const { data: myLoans } = useQuery({
        queryKey: ['my-loans'],
        queryFn: () => api.get('/loans/my').then(r => r.data).catch(() => []),
    });

    const onLeaveIds = new Set((staffOnLeaveToday || []).map((s: any) => s.staff?.id || s.staffId || s.id));
    const teamMembers = (directReports || []).map((s: any) => ({
        id: s.id,
        name: s.full_name || `${s.first_name} ${s.last_name}`,
        position: s.position?.name || 'Staff',
        status: onLeaveIds.has(s.id) ? 'leave' : 'present',
    }));

    const presentCount = teamMembers.filter((m: any) => m.status === 'present').length;
    const onLeaveCount = teamMembers.filter((m: any) => m.status === 'leave').length;
    const todayReportSubmitted = (myReports || []).some((r: any) => {
        const reportDate = new Date(r.report_date || r.created_at).toDateString();
        return reportDate === new Date().toDateString();
    });
    const totalLeaveBalance = myBalance?.reduce((acc: number, b: any) => acc + Number(b.balance_days), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Branch Dashboard</h1>
                    <p className="text-slate-500">Manage your team and daily operations</p>
                </div>
                <Link
                    to="/reports"
                    className="px-4 py-2 bg-[#0066B3] text-white rounded-lg hover:bg-[#005299] transition-colors font-medium flex items-center gap-2"
                >
                    <FileText size={18} />
                    Submit Daily Report
                </Link>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Pending Approvals"
                    value={pendingApprovals?.length || 0}
                    subtitle="Awaiting your action"
                    icon={<Clock className="text-white" size={24} />}
                    color="bg-gradient-to-br from-amber-500 to-orange-600"
                    link="/approvals"
                />
                <StatCard
                    title="Team Present"
                    value={`${presentCount}/${teamMembers.length}`}
                    subtitle={`${onLeaveCount} on leave today`}
                    icon={<UserCheck className="text-white" size={24} />}
                    color="bg-gradient-to-br from-emerald-500 to-green-600"
                />
                <StatCard
                    title="My Leave Balance"
                    value={`${totalLeaveBalance.toFixed(1)} days`}
                    subtitle="Annual leave available"
                    icon={<Calendar className="text-white" size={24} />}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    link="/leave"
                />
                <StatCard
                    title="Leave Requests"
                    value={leaveStats?.pendingRequests || 0}
                    subtitle="Pending from team"
                    icon={<FileText className="text-white" size={24} />}
                    color="bg-[#0066B3]"
                    link="/leave"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team Status */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">My Team Today</h3>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                {presentCount} Present
                            </span>
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                {onLeaveCount} Away
                            </span>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {teamMembers.map((member: any) => (
                            <div key={member.id} className="p-4 hover:bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${member.status === 'present'
                                            ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                                            : 'bg-gradient-to-br from-amber-500 to-orange-500'
                                            }`}>
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{member.name}</p>
                                            <p className="text-xs text-slate-500">{member.position}</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${member.status === 'present'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {member.status === 'present' ? (
                                            <>
                                                <CheckCircle size={14} />
                                                Present
                                            </>
                                        ) : (
                                            <>
                                                <Calendar size={14} />
                                                On Leave
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Daily Report Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 mb-4">Today's Report</h3>
                        <div className="space-y-3">
                            {todayReportSubmitted ? (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                                    <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
                                    <p className="font-medium text-emerald-900">Report Submitted</p>
                                    <p className="text-xs text-emerald-700 mt-1">Today's report is up to date</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                                    <AlertTriangle className="mx-auto text-amber-500 mb-2" size={32} />
                                    <p className="font-medium text-amber-900">Report Not Submitted</p>
                                    <p className="text-xs text-amber-700 mt-1">Please submit your daily report</p>
                                </div>
                            )}
                            <Link
                                to="/reports"
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0066B3] text-white rounded-lg hover:bg-[#005299] transition-colors font-medium"
                            >
                                <FileText size={18} />
                                {todayReportSubmitted ? 'View Reports' : 'Submit Report Now'}
                            </Link>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <Link
                                to="/leave"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Calendar className="text-blue-600" size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">Request Leave</p>
                                </div>
                                <ChevronRight className="text-slate-400" size={18} />
                            </Link>
                            <Link
                                to="/approvals"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Clock className="text-amber-600" size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">Review Approvals</p>
                                    <p className="text-xs text-slate-500">{pendingApprovals?.length || 0} pending</p>
                                </div>
                                <ChevronRight className="text-slate-400" size={18} />
                            </Link>
                            <Link
                                to="/claims"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <DollarSign className="text-emerald-600" size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">Submit Claim</p>
                                </div>
                                <ChevronRight className="text-slate-400" size={18} />
                            </Link>
                        </div>
                    </div>

                    {/* Petty Cash */}
                    {pettyCashStats && (
                        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl p-5 text-white">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold flex items-center gap-2"><Wallet size={16} /> Petty Cash</h3>
                                <Link to="/petty-cash" className="text-xs text-purple-200 hover:text-white">Manage</Link>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><p className="text-purple-200 text-xs">Balance</p><p className="text-lg font-bold">KES {((pettyCashStats.total_balance || 0) / 1000).toFixed(0)}K</p></div>
                                <div><p className="text-purple-200 text-xs">Pending</p><p className="text-lg font-bold">{pettyCashStats.pending_replenishments || 0}</p></div>
                            </div>
                        </div>
                    )}

                    {/* My Active Loans */}
                    {myLoans && myLoans.filter((l: any) => ['active', 'disbursed'].includes(l.status)).length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Briefcase size={16} className="text-blue-600" /> My Loans</h3>
                                <Link to="/loans" className="text-sm text-[#0066B3]">View all</Link>
                            </div>
                            <div className="space-y-2">
                                {myLoans.filter((l: any) => ['active', 'disbursed'].includes(l.status)).slice(0, 2).map((loan: any) => (
                                    <div key={loan.id} className="p-3 bg-slate-50 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium text-slate-900 text-sm">{loan.loan_number}</p>
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">{loan.status}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">KES {Number(loan.outstanding_balance || 0).toLocaleString()} remaining</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Announcements */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Megaphone size={16} className="text-blue-600" /> Announcements</h3>
                            <Link to="/announcements" className="text-sm text-[#0066B3]">View all</Link>
                        </div>
                        {announcements?.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {announcements.slice(0, 3).map((a: any) => (
                                    <div key={a.id} className="p-4 hover:bg-slate-50">
                                        <p className="font-medium text-slate-900 text-sm line-clamp-2">{a.title}</p>
                                        <p className="text-xs text-slate-400 mt-1">{new Date(a.published_at || a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-slate-500 text-sm">No recent announcements</div>
                        )}
                    </div>

                    {/* My Leave Balance */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
                        <h3 className="font-semibold mb-4">My Leave Balance</h3>
                        <div className="space-y-3">
                            {myBalance?.slice(0, 3).map((balance: any) => (
                                <div key={balance.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: balance.leaveType?.color || '#fff' }} />
                                        <span className="text-sm text-blue-100">{balance.leaveType?.name}</span>
                                    </div>
                                    <span className="font-bold">{Number(balance.balance_days).toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                        <Link to="/leave-management" className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium">
                            Request Leave <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Pending Approvals */}
            {pendingApprovals && pendingApprovals.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Pending Team Requests</h3>
                        <Link to="/approvals" className="text-sm text-[#0066B3] hover:text-[#005299] font-medium flex items-center gap-1">
                            View all <ChevronRight size={16} />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {pendingApprovals?.slice(0, 3).map((approval: any) => (
                            <Link
                                key={approval.instance?.id}
                                to="/approvals"
                                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg">
                                        {approval.targetType === 'leave' ? (
                                            <Calendar className="text-blue-500" size={18} />
                                        ) : approval.targetType === 'claim' ? (
                                            <DollarSign className="text-emerald-500" size={18} />
                                        ) : (
                                            <FileText className="text-[#0066B3]" size={18} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {approval.targetType === 'leave' ? 'Leave Request' :
                                                approval.targetType === 'claim' ? 'Expense Claim' : 'Staff Loan'}
                                        </p>
                                        <p className="text-sm text-slate-500">{approval.requesterName}</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-slate-400" size={20} />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchManagerDashboard;
