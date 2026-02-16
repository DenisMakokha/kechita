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
    DollarSign,
    Briefcase,
    ArrowUpRight,
    Umbrella,
    AlertTriangle,
    Megaphone,
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

export const StaffDashboard: React.FC = () => {
    useAuthStore();

    // Fetch my leave balance
    const { data: myBalance } = useQuery({
        queryKey: ['my-leave-balance'],
        queryFn: () => api.get('/leave/my-balance').then(r => r.data),
    });

    // Fetch my leave requests
    const { data: myLeaveRequests } = useQuery({
        queryKey: ['my-leave-requests'],
        queryFn: () => api.get('/leave/my-requests').then(r => r.data),
        refetchInterval: 60000,
    });

    // Fetch my loans
    const { data: myLoans } = useQuery({
        queryKey: ['my-loans'],
        queryFn: () => api.get('/loans/my').then(r => r.data),
    });

    // Fetch my claims
    const { data: myClaims } = useQuery({
        queryKey: ['my-claims'],
        queryFn: () => api.get('/claims/my').then(r => r.data),
    });

    // Fetch upcoming holidays
    const { data: holidays } = useQuery({
        queryKey: ['public-holidays'],
        queryFn: () => api.get('/leave/holidays').then(r => r.data),
    });

    // Announcements
    const { data: announcements } = useQuery({
        queryKey: ['staff-announcements'],
        queryFn: () => api.get('/communications/my-announcements?limit=3').then(r => r.data).catch(() => []),
    });

    const totalLeaveBalance = myBalance?.reduce((acc: number, b: any) => acc + Number(b.balance_days), 0) || 0;
    const pendingLeave = myLeaveRequests?.filter((r: any) => r.status === 'pending').length || 0;
    const activeLoans = myLoans?.filter((l: any) => ['active', 'disbursed'].includes(l.status)).length || 0;
    const pendingClaims = myClaims?.filter((c: any) => c.status === 'pending').length || 0;
    const upcomingHoliday = holidays?.find((h: any) => new Date(h.date) >= new Date());

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
                    <p className="text-slate-500">Track your requests, balances, and notifications</p>
                </div>
                {upcomingHoliday && (
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#00AEEF]/10 border border-[#00AEEF]/20 rounded-lg">
                        <Calendar className="text-[#0066B3]" size={18} />
                        <div>
                            <p className="text-sm font-medium text-[#003366]">Next Holiday: {upcomingHoliday.name}</p>
                            <p className="text-xs text-[#0066B3]">
                                {new Date(upcomingHoliday.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Leave Balance"
                    value={`${totalLeaveBalance.toFixed(1)} days`}
                    subtitle="Available to use"
                    icon={<Umbrella className="text-white" size={24} />}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    link="/leave"
                />
                <StatCard
                    title="Pending Requests"
                    value={pendingLeave + pendingClaims}
                    subtitle="Leave & claims awaiting approval"
                    icon={<Clock className="text-white" size={24} />}
                    color="bg-gradient-to-br from-amber-500 to-orange-600"
                />
                <StatCard
                    title="Active Loans"
                    value={activeLoans}
                    subtitle="Currently running"
                    icon={<Briefcase className="text-white" size={24} />}
                    color="bg-gradient-to-br from-[#0066B3] to-[#00AEEF]"
                    link="/loans"
                />
                <StatCard
                    title="Claims Submitted"
                    value={myClaims?.length || 0}
                    subtitle="This year"
                    icon={<DollarSign className="text-white" size={24} />}
                    color="bg-gradient-to-br from-emerald-500 to-green-600"
                    link="/claims"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link
                            to="/leave"
                            className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white hover:from-blue-600 hover:to-blue-700 transition-all"
                        >
                            <Calendar size={32} className="mb-4" />
                            <h3 className="text-lg font-bold">Request Leave</h3>
                            <p className="text-blue-100 text-sm mt-1">
                                Apply for annual, sick, or other leave
                            </p>
                        </Link>
                        <Link
                            to="/claims"
                            className="p-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl text-white hover:from-emerald-600 hover:to-green-700 transition-all"
                        >
                            <DollarSign size={32} className="mb-4" />
                            <h3 className="text-lg font-bold">Submit Claim</h3>
                            <p className="text-emerald-100 text-sm mt-1">
                                File expense reimbursements
                            </p>
                        </Link>
                        <Link
                            to="/loans"
                            className="p-6 bg-gradient-to-br from-[#0066B3] to-[#00AEEF] rounded-xl text-white hover:from-[#005599] hover:to-[#0099DD] transition-all"
                        >
                            <Briefcase size={32} className="mb-4" />
                            <h3 className="text-lg font-bold">Apply for Loan</h3>
                            <p className="text-blue-100 text-sm mt-1">
                                Staff loan or salary advance
                            </p>
                        </Link>
                        <Link
                            to="/approvals/history"
                            className="p-6 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl text-white hover:from-slate-800 hover:to-slate-900 transition-all"
                        >
                            <FileText size={32} className="mb-4" />
                            <h3 className="text-lg font-bold">My History</h3>
                            <p className="text-slate-300 text-sm mt-1">
                                View all past requests
                            </p>
                        </Link>
                    </div>

                    {/* Recent Leave Requests */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">Recent Leave Requests</h3>
                            <Link to="/leave" className="text-sm text-[#0066B3] hover:text-[#005599] font-medium flex items-center gap-1">
                                View all <ChevronRight size={16} />
                            </Link>
                        </div>
                        {!myLeaveRequests || myLeaveRequests.length === 0 ? (
                            <div className="p-8 text-center">
                                <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500">No leave requests yet</p>
                                <Link
                                    to="/leave"
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg hover:bg-[#005599] transition-colors font-medium"
                                >
                                    Request Leave
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {myLeaveRequests?.slice(0, 4).map((request: any) => (
                                    <div key={request.id} className="p-4 hover:bg-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${request.status === 'approved' ? 'bg-emerald-100' :
                                                    request.status === 'pending' ? 'bg-amber-100' :
                                                        request.status === 'rejected' ? 'bg-red-100' : 'bg-slate-100'
                                                    }`}>
                                                    {request.status === 'approved' ? (
                                                        <CheckCircle className="text-emerald-600" size={18} />
                                                    ) : request.status === 'pending' ? (
                                                        <Clock className="text-amber-600" size={18} />
                                                    ) : request.status === 'rejected' ? (
                                                        <AlertTriangle className="text-red-600" size={18} />
                                                    ) : (
                                                        <Calendar className="text-slate-600" size={18} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{request.leaveType?.name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(request.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                        {' - '}
                                                        {new Date(request.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                        {' • '}
                                                        {request.total_days} days
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    request.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Leave Balance Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">Leave Balance</h3>
                            <Link to="/leave" className="text-sm text-[#0066B3] hover:text-[#005599] font-medium">
                                Request
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {myBalance?.map((balance: any) => (
                                <div key={balance.id}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: balance.leaveType?.color || '#6366f1' }}
                                            />
                                            <span className="text-sm text-slate-600">{balance.leaveType?.name}</span>
                                        </div>
                                        <span className="font-semibold text-slate-900">
                                            {Number(balance.balance_days).toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full"
                                            style={{
                                                backgroundColor: balance.leaveType?.color || '#6366f1',
                                                width: `${Math.min((Number(balance.balance_days) / Number(balance.entitled_days)) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Active Loans */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">My Loans</h3>
                            <Link to="/loans" className="text-sm text-[#0066B3] hover:text-[#005599] font-medium">
                                Apply
                            </Link>
                        </div>
                        {!myLoans || myLoans.length === 0 ? (
                            <div className="text-center py-4">
                                <Briefcase className="mx-auto text-slate-300 mb-2" size={32} />
                                <p className="text-sm text-slate-500">No active loans</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myLoans?.slice(0, 2).map((loan: any) => (
                                    <div key={loan.id} className="p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-medium text-slate-900 text-sm">{loan.loan_number}</p>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${loan.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                loan.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {loan.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            KES {Number(loan.outstanding_balance || 0).toLocaleString()} remaining
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

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

                    {/* Upcoming Holidays */}
                    <div className="bg-gradient-to-br from-[#003366] to-[#005599] rounded-xl p-5 text-white">
                        <h3 className="font-semibold mb-4">Upcoming Holidays</h3>
                        <div className="space-y-3">
                            {holidays?.filter((h: any) => new Date(h.date) >= new Date()).slice(0, 3).map((holiday: any) => (
                                <div key={holiday.id} className="flex items-center justify-between bg-white/10 backdrop-blur rounded-lg p-3">
                                    <div>
                                        <p className="font-medium text-sm">{holiday.name}</p>
                                        <p className="text-blue-200 text-xs">
                                            {new Date(holiday.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {(!holidays || holidays.filter((h: any) => new Date(h.date) >= new Date()).length === 0) && (
                                <p className="text-blue-200 text-sm">No upcoming holidays</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
