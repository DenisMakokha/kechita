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

    // Fetch pending approvals
    const { data: pendingApprovals } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            const response = await api.get('/approvals/pending');
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

    // Fetch my leave balance
    const { data: myBalance } = useQuery({
        queryKey: ['my-leave-balance'],
        queryFn: async () => {
            const response = await api.get('/leave/my-balance');
            return response.data;
        },
    });

    // Simulated branch team data
    const teamMembers = [
        { id: '1', name: 'John Kamau', position: 'Relationship Officer', status: 'present' },
        { id: '2', name: 'Mary Wanjiku', position: 'Relationship Officer', status: 'present' },
        { id: '3', name: 'Peter Ochieng', position: 'BDM', status: 'leave' },
        { id: '4', name: 'Grace Muthoni', position: 'Support Staff', status: 'present' },
        { id: '5', name: 'James Mwangi', position: 'Relationship Officer', status: 'present' },
    ];

    const presentCount = teamMembers.filter(m => m.status === 'present').length;
    const onLeaveCount = teamMembers.filter(m => m.status === 'leave').length;
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
                        {teamMembers.map((member) => (
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
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                                <AlertTriangle className="mx-auto text-amber-500 mb-2" size={32} />
                                <p className="font-medium text-amber-900">Report Not Submitted</p>
                                <p className="text-xs text-amber-700 mt-1">Please submit your daily report</p>
                            </div>
                            <Link
                                to="/reports"
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0066B3] text-white rounded-lg hover:bg-[#005299] transition-colors font-medium"
                            >
                                <FileText size={18} />
                                Submit Report Now
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

                    {/* My Leave Balance */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
                        <h3 className="font-semibold mb-4">My Leave Balance</h3>
                        <div className="space-y-3">
                            {myBalance?.slice(0, 3).map((balance: any) => (
                                <div key={balance.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: balance.leaveType?.color || '#fff' }}
                                        />
                                        <span className="text-sm text-blue-100">{balance.leaveType?.name}</span>
                                    </div>
                                    <span className="font-bold">{Number(balance.balance_days).toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                        <Link
                            to="/leave"
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
                        >
                            Request Leave
                            <ChevronRight size={16} />
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
