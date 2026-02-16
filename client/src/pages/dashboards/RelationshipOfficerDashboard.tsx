import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import {
    TrendingUp, Calendar, FileText,
    CheckCircle, Clock, ChevronRight, Target,
    PiggyBank, Wallet, Megaphone,
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
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500 font-medium">{title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                            <TrendingUp size={12} className={!trend.positive ? 'rotate-180' : ''} />
                            <span>{trend.positive ? '+' : ''}{trend.value}% vs last month</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
            </div>
        </div>
    );
    return link ? <Link to={link}>{content}</Link> : content;
};

export const RelationshipOfficerDashboard: React.FC = () => {
    // Fetch my leave balance (returns array of balances)
    const { data: leaveBalance } = useQuery({
        queryKey: ['my-leave-balance'],
        queryFn: () => api.get('/leave/my-balance').then(r => r.data).catch(() => []),
    });

    // Fetch my claims
    const { data: myClaims } = useQuery({
        queryKey: ['my-claims-summary'],
        queryFn: () => api.get('/claims/my').then(r => r.data).catch(() => []),
        refetchInterval: 60000,
    });

    // Fetch my loans
    const { data: myLoans } = useQuery({
        queryKey: ['my-loans'],
        queryFn: () => api.get('/loans/my').then(r => r.data).catch(() => []),
    });

    // Fetch my submissions
    const { data: mySubmissions } = useQuery({
        queryKey: ['my-submissions'],
        queryFn: () => api.get('/approvals/my-submissions').then(r => r.data).catch(() => []),
    });

    // Fetch announcements
    const { data: announcements } = useQuery({
        queryKey: ['my-announcements'],
        queryFn: () => api.get('/communications/my-announcements?limit=3').then(r => r.data).catch(() => []),
    });

    // Normalize: claims can come as array or { data: [] }
    const claimsList = Array.isArray(myClaims) ? myClaims : (myClaims?.data || []);
    // Normalize: leave balance is an array of { leaveType, balance_days, entitled_days }
    const balanceList: any[] = Array.isArray(leaveBalance) ? leaveBalance : [];
    const totalLeaveBalance = balanceList.reduce((acc: number, b: any) => acc + Number(b.balance_days || 0), 0);

    const pendingClaims = claimsList.filter((c: any) => c.status === 'submitted' || c.status === 'under_review' || c.status === 'pending').length;
    const activeLoans = (myLoans || []).filter((l: any) => l.status === 'active' || l.status === 'disbursed').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
                <p className="text-slate-500">Your personal overview and quick actions</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Leave Balance"
                    value={`${totalLeaveBalance.toFixed(1)} days`}
                    subtitle="Total leave remaining"
                    icon={<Calendar className="text-white" size={24} />}
                    color="bg-gradient-to-br from-blue-500 to-cyan-600"
                    link="/leave-management"
                />
                <StatCard
                    title="Pending Claims"
                    value={pendingClaims}
                    subtitle="Awaiting approval"
                    icon={<FileText className="text-white" size={24} />}
                    color="bg-gradient-to-br from-amber-500 to-orange-600"
                    link="/claims"
                />
                <StatCard
                    title="Active Loans"
                    value={activeLoans}
                    subtitle={myLoans?.length > 0 ? `Total: ${myLoans.length} loans` : 'No active loans'}
                    icon={<PiggyBank className="text-white" size={24} />}
                    color="bg-gradient-to-br from-emerald-500 to-teal-600"
                    link="/loans"
                />
                <StatCard
                    title="My Submissions"
                    value={mySubmissions?.length || 0}
                    subtitle="Approval requests submitted"
                    icon={<Clock className="text-white" size={24} />}
                    color="bg-gradient-to-br from-purple-500 to-indigo-600"
                    link="/approvals"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Link
                                to="/leave"
                                className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 text-blue-700 transition-colors"
                            >
                                <Calendar size={28} />
                                <span className="text-sm font-medium text-center">Request Leave</span>
                            </Link>
                            <Link
                                to="/claims"
                                className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 text-emerald-700 transition-colors"
                            >
                                <Wallet size={28} />
                                <span className="text-sm font-medium text-center">Submit Claim</span>
                            </Link>
                            <Link
                                to="/loans"
                                className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 text-purple-700 transition-colors"
                            >
                                <PiggyBank size={28} />
                                <span className="text-sm font-medium text-center">Apply for Loan</span>
                            </Link>
                            <Link
                                to="/approvals"
                                className="flex flex-col items-center gap-2 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 text-amber-700 transition-colors"
                            >
                                <CheckCircle size={28} />
                                <span className="text-sm font-medium text-center">My Approvals</span>
                            </Link>
                        </div>
                    </div>

                    {/* Leave Balance Overview */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">Leave Balance</h3>
                            <Link to="/leave" className="text-sm text-[#0066B3] hover:text-[#005599] font-medium flex items-center gap-1">
                                View details <ChevronRight size={16} />
                            </Link>
                        </div>
                        <div className="p-6">
                            {balanceList.length > 0 ? (
                                <div className="space-y-3">
                                    {balanceList.map((balance: any) => (
                                        <div key={balance.id}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: balance.leaveType?.color || '#6366f1' }} />
                                                    <span className="text-sm text-slate-600">{balance.leaveType?.name}</span>
                                                </div>
                                                <span className="font-semibold text-slate-900">{Number(balance.balance_days).toFixed(1)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="h-2 rounded-full" style={{ backgroundColor: balance.leaveType?.color || '#6366f1', width: `${Math.min((Number(balance.balance_days) / Number(balance.entitled_days || 30)) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 text-sm">No leave balance data</p>
                            )}
                        </div>
                    </div>

                    {/* Recent Claims */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">Recent Claims</h3>
                            <Link to="/claims" className="text-sm text-[#0066B3] hover:text-[#005599] font-medium flex items-center gap-1">
                                View all <ChevronRight size={16} />
                            </Link>
                        </div>
                        {claimsList.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {claimsList.slice(0, 4).map((claim: any) => (
                                    <div key={claim.id} className="p-4 hover:bg-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                                    <FileText size={20} className="text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{claim.claim_number}</p>
                                                    <p className="text-sm text-slate-500">
                                                        KES {claim.total_amount?.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                claim.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                claim.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <FileText className="mx-auto text-slate-300 mb-3" size={40} />
                                <p className="text-slate-500">No claims submitted yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Announcements */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">Announcements</h3>
                            <Link to="/announcements" className="text-sm text-[#0066B3]">View all</Link>
                        </div>
                        {announcements?.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {announcements.slice(0, 3).map((announcement: any) => (
                                    <div key={announcement.id} className="p-4 hover:bg-slate-50">
                                        <p className="font-medium text-slate-900 text-sm line-clamp-2">
                                            {announcement.title}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(announcement.published_at).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-slate-500 text-sm">
                                No recent announcements
                            </div>
                        )}
                    </div>

                    {/* My Active Loans */}
                    {myLoans?.length > 0 && (
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-5 text-white">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <PiggyBank size={18} />
                                My Active Loans
                            </h3>
                            <div className="space-y-3">
                                {myLoans.filter((l: any) => l.status === 'active' || l.status === 'disbursed').slice(0, 2).map((loan: any) => (
                                    <div key={loan.id} className="bg-white/10 backdrop-blur rounded-lg p-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium">{loan.loan_type?.replace(/_/g, ' ')}</span>
                                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{loan.status}</span>
                                        </div>
                                        <p className="text-lg font-bold">
                                            KES {loan.outstanding_balance?.toLocaleString() || loan.principal?.toLocaleString()}
                                        </p>
                                        <p className="text-xs opacity-80">Outstanding balance</p>
                                    </div>
                                ))}
                            </div>
                            <Link to="/loans" className="block mt-4 text-center text-sm font-medium hover:underline">
                                View all loans →
                            </Link>
                        </div>
                    )}

                    {/* Announcements */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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

                    {/* Performance Tips */}
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Target size={18} className="text-[#0066B3]" />
                            Quick Tips
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>Submit claims within 30 days of expense</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>Request leave at least 2 weeks in advance</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>Keep receipts for all expense claims</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RelationshipOfficerDashboard;
