import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
    Users,
    UserPlus,
    Calendar,
    FileText,
    AlertTriangle,
    CheckCircle,
    Clock,
    Briefcase,
    FileCheck,
    UserCheck,
    TrendingUp,
    ArrowUpRight,
    ClipboardList,
    Video,
    MapPin,
    ChevronRight,
    FileWarning,
    ScrollText,
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

export const HRDashboard: React.FC = () => {
    useAuthStore();

    // Staff stats (proper endpoint)
    const { data: staffStats } = useQuery({
        queryKey: ['staff-stats'],
        queryFn: () => api.get('/staff/stats').then(r => r.data).catch(() => null),
        refetchInterval: 60000,
    });

    // Leave stats
    const { data: leaveStats } = useQuery({
        queryKey: ['leave-stats-hr'],
        queryFn: () => api.get('/leave/stats').then(r => r.data),
        refetchInterval: 60000,
    });

    // Staff on leave today
    const { data: staffOnLeave } = useQuery({
        queryKey: ['staff-on-leave-today'],
        queryFn: () => api.get('/leave/on-leave-today').then(r => r.data),
        refetchInterval: 60000,
    });

    // Pending approvals
    const { data: pendingApprovals } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: () => api.get('/approvals/pending').then(r => r.data),
        refetchInterval: 30000,
    });

    // Approval stats
    const { data: approvalStats } = useQuery({
        queryKey: ['approval-stats-hr'],
        queryFn: () => api.get('/approvals/stats?all=true').then(r => r.data).catch(() => null),
    });

    // Recruitment stats
    const { data: recruitmentStats } = useQuery({
        queryKey: ['recruitment-stats'],
        queryFn: () => api.get('/recruitment/stats').then(r => r.data),
        refetchInterval: 60000,
    });

    // Claims stats
    const { data: claimsStats } = useQuery({
        queryKey: ['claims-stats'],
        queryFn: () => api.get('/claims/stats').then(r => r.data),
        refetchInterval: 120000,
    });

    // Loan stats
    const { data: loanStats } = useQuery({
        queryKey: ['loan-stats'],
        queryFn: () => api.get('/loans/stats').then(r => r.data),
        refetchInterval: 120000,
    });

    // Expiring documents (30 days)
    const { data: expiringDocs } = useQuery({
        queryKey: ['expiring-documents'],
        queryFn: () => api.get('/staff/documents/expiring?days=30').then(r => r.data).catch(() => []),
        refetchInterval: 120000,
    });

    // Expired documents
    const { data: expiredDocs } = useQuery({
        queryKey: ['expired-documents'],
        queryFn: () => api.get('/staff/documents/expired').then(r => r.data).catch(() => []),
        refetchInterval: 120000,
    });

    // Expiring contracts (30 days)
    const { data: expiringContracts } = useQuery({
        queryKey: ['expiring-contracts'],
        queryFn: () => api.get('/staff/contracts/expiring?days=30').then(r => r.data).catch(() => []),
        refetchInterval: 120000,
    });

    // Upcoming probation reviews
    const { data: upcomingProbation } = useQuery({
        queryKey: ['probation-upcoming'],
        queryFn: () => api.get('/staff/probation/upcoming?days=30').then(r => r.data).catch(() => []),
        refetchInterval: 120000,
    });

    // Overdue probation reviews
    const { data: overdueProbation } = useQuery({
        queryKey: ['probation-overdue'],
        queryFn: () => api.get('/staff/probation/overdue').then(r => r.data).catch(() => []),
        refetchInterval: 120000,
    });

    // Onboarding stats
    const { data: onboardingStats } = useQuery({
        queryKey: ['onboarding-stats-hr'],
        queryFn: () => api.get('/staff/onboarding/stats').then(r => r.data).catch(() => null),
        refetchInterval: 60000,
    });

    // Overdue onboarding
    const { data: overdueOnboarding } = useQuery({
        queryKey: ['overdue-onboarding'],
        queryFn: () => api.get('/staff/onboarding/instances/overdue').then(r => r.data).catch(() => []),
        refetchInterval: 60000,
    });

    // Upcoming interviews
    const { data: interviews } = useQuery({
        queryKey: ['hr-interviews'],
        queryFn: () => api.get('/recruitment/interviews').then(r => r.data).catch(() => []),
        refetchInterval: 60000,
    });

    const upcomingInterviews = (interviews || []).filter((i: any) => new Date(i.scheduled_at) >= new Date()).slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">HR Dashboard</h1>
                    <p className="text-slate-500">Staff management, recruitment, and HR analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link to="/recruitment" className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2">
                        <Briefcase size={18} /> Post Job
                    </Link>
                    <Link to="/staff-management" className="px-4 py-2 bg-[#0066B3] text-white rounded-lg hover:bg-[#005299] transition-colors font-medium flex items-center gap-2">
                        <UserPlus size={18} /> New Staff
                    </Link>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="On Leave Today"
                    value={staffOnLeave?.length || 0}
                    subtitle="Staff members away"
                    icon={<Calendar className="text-white" size={24} />}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    link="/leave-management"
                />
                <StatCard
                    title="Pending Approvals"
                    value={pendingApprovals?.length || 0}
                    subtitle={approvalStats ? `Avg ${approvalStats.avgApprovalTimeHours || 0}h response` : 'Requires your action'}
                    icon={<Clock className="text-white" size={24} />}
                    color="bg-gradient-to-br from-amber-500 to-orange-600"
                    link="/approvals"
                />
                <StatCard
                    title="Open Positions"
                    value={recruitmentStats?.activeJobs || 0}
                    subtitle={`${recruitmentStats?.newThisWeek || 0} new applications this week`}
                    icon={<Briefcase className="text-white" size={24} />}
                    color="bg-[#0066B3]"
                    link="/recruitment"
                />
                <StatCard
                    title="Document Alerts"
                    value={(expiringDocs?.length || 0) + (expiredDocs?.length || 0)}
                    subtitle={`${expiredDocs?.length || 0} expired, ${expiringDocs?.length || 0} expiring`}
                    icon={<FileCheck className="text-white" size={24} />}
                    color={(expiringDocs?.length || 0) + (expiredDocs?.length || 0) > 0 ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gradient-to-br from-emerald-500 to-green-600"}
                />
            </div>

            {/* Staff Overview Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Headcount Summary — using /staff/stats */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users size={20} /> Headcount Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-400 text-sm">Total Staff</p>
                            <p className="text-2xl font-bold mt-1">{staffStats?.total ?? '--'}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-400 text-sm">Active</p>
                            <p className="text-2xl font-bold mt-1 text-emerald-400">{staffStats?.byStatus?.active ?? '--'}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-400 text-sm">On Probation</p>
                            <p className="text-2xl font-bold mt-1 text-amber-400">{staffStats?.byProbationStatus?.on_probation ?? staffStats?.upcomingProbationReviews ?? 0}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-400 text-sm">On Leave Today</p>
                            <p className="text-2xl font-bold mt-1 text-blue-400">{staffOnLeave?.length || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Leave Overview */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Leave Overview</h3>
                        <Link to="/leave-management" className="text-sm text-[#0066B3] hover:text-[#005299] font-medium">View all</Link>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg"><Calendar className="text-blue-600" size={18} /></div>
                                <span className="font-medium text-slate-900">Total Requests</span>
                            </div>
                            <span className="text-xl font-bold text-slate-900">{leaveStats?.totalRequests || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg"><Clock className="text-amber-600" size={18} /></div>
                                <span className="font-medium text-slate-900">Pending</span>
                            </div>
                            <span className="text-xl font-bold text-amber-600">{leaveStats?.pendingRequests || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle className="text-emerald-600" size={18} /></div>
                                <span className="font-medium text-slate-900">Approved</span>
                            </div>
                            <span className="text-xl font-bold text-emerald-600">{leaveStats?.approvedRequests || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Recruitment Pipeline */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Recruitment</h3>
                        <Link to="/recruitment" className="text-sm text-[#0066B3] hover:text-[#005299] font-medium">View all</Link>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between"><span className="text-slate-600">Open Positions</span><span className="font-bold text-slate-900">{recruitmentStats?.activeJobs || 0}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600">Total Applications</span><span className="font-bold text-slate-900">{recruitmentStats?.totalApplications || 0}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600">Interviews This Week</span><span className="font-bold text-slate-900">{recruitmentStats?.interviewsThisWeek || 0}</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600">Total Hired</span><span className="font-bold text-emerald-600">{recruitmentStats?.hiredCount || 0}</span></div>
                        <div className="pt-3 border-t border-slate-100">
                            <Link to="/recruitment" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-[#0066B3] rounded-lg hover:bg-blue-100 transition-colors font-medium">
                                <Briefcase size={16} /> Manage Recruitment
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts Row — Onboarding, Contracts, Upcoming Interviews */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Onboarding */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ClipboardList size={18} className="text-emerald-600" /> Onboarding</h3>
                        <Link to="/staff-management" className="text-sm text-[#0066B3] flex items-center gap-1">View <ChevronRight size={14} /></Link>
                    </div>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600 text-sm">Active Onboardings</span>
                            <span className="font-bold text-slate-900">{onboardingStats?.inProgress || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600 text-sm">Overdue</span>
                            <span className="font-bold text-amber-600">{onboardingStats?.overdue || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600 text-sm">Completed</span>
                            <span className="font-bold text-emerald-600">{onboardingStats?.completed || 0}</span>
                        </div>
                        {(overdueOnboarding?.length || 0) > 0 && (
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                                <span className="text-sm text-red-700 font-medium">{overdueOnboarding.length} overdue onboarding{overdueOnboarding.length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expiring Contracts */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ScrollText size={18} className="text-amber-600" /> Contract Alerts</h3>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{expiringContracts?.length || 0}</span>
                    </div>
                    {!expiringContracts || expiringContracts.length === 0 ? (
                        <div className="p-8 text-center">
                            <CheckCircle className="mx-auto text-emerald-500 mb-3" size={40} />
                            <p className="font-medium text-slate-900">All contracts current</p>
                            <p className="text-sm text-slate-500">No contracts expiring in 30 days</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                            {expiringContracts.slice(0, 5).map((c: any) => (
                                <div key={c.id} className="p-4 hover:bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                                                {c.staff?.first_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{c.staff?.first_name} {c.staff?.last_name}</p>
                                                <p className="text-xs text-slate-500">{c.contract_type} • {c.title || c.job_title}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-amber-600">{c.end_date ? new Date(c.end_date).toLocaleDateString() : '--'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming Interviews */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Video size={18} className="text-blue-600" /> Upcoming Interviews</h3>
                        <Link to="/recruitment" className="text-sm text-[#0066B3] flex items-center gap-1">View <ChevronRight size={14} /></Link>
                    </div>
                    {upcomingInterviews.length === 0 ? (
                        <div className="p-8 text-center">
                            <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
                            <p className="text-slate-500 text-sm">No upcoming interviews</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                            {upcomingInterviews.map((i: any) => {
                                const isToday = new Date(i.scheduled_at).toDateString() === new Date().toDateString();
                                return (
                                    <div key={i.id} className="p-4 hover:bg-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{i.application?.candidate?.first_name} {i.application?.candidate?.last_name}</p>
                                                <p className="text-xs text-slate-500">{i.title} • {i.application?.jobPost?.title}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                                                    {isToday ? 'TODAY' : new Date(i.scheduled_at).toLocaleDateString()}
                                                </p>
                                                <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                                                    {i.type === 'video' ? <Video size={10} /> : <MapPin size={10} />}
                                                    {new Date(i.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Row — Probation + Financial */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Probation Reviews */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Probation Reviews</h3>
                        <div className="flex items-center gap-2">
                            {(overdueProbation?.length || 0) > 0 && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1">
                                    <AlertTriangle size={10} /> {overdueProbation.length} overdue
                                </span>
                            )}
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                {upcomingProbation?.length || 0} upcoming
                            </span>
                        </div>
                    </div>
                    {(!upcomingProbation || upcomingProbation.length === 0) && (!overdueProbation || overdueProbation.length === 0) ? (
                        <div className="p-8 text-center">
                            <UserCheck className="mx-auto text-emerald-500 mb-4" size={48} />
                            <p className="font-medium text-slate-900">No pending reviews</p>
                            <p className="text-sm text-slate-500">All probation reviews are up to date</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                            {(overdueProbation || []).slice(0, 3).map((staff: any) => (
                                <div key={staff.id} className="p-4 bg-red-50/50 hover:bg-red-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">{staff.first_name?.charAt(0)}</div>
                                            <div>
                                                <p className="font-medium text-slate-900">{staff.full_name || `${staff.first_name} ${staff.last_name}`}</p>
                                                <p className="text-xs text-slate-500">{staff.position?.name}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">Overdue</span>
                                    </div>
                                </div>
                            ))}
                            {(upcomingProbation || []).slice(0, 5).map((staff: any) => (
                                <div key={staff.id} className="p-4 hover:bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-bold">{staff.first_name?.charAt(0)}</div>
                                            <div>
                                                <p className="font-medium text-slate-900">{staff.full_name || `${staff.first_name} ${staff.last_name}`}</p>
                                                <p className="text-xs text-slate-500">{staff.position?.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-slate-900">{staff.probation_end_date ? new Date(staff.probation_end_date).toLocaleDateString() : 'TBD'}</p>
                                            <p className="text-xs text-amber-600">Review due</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Staff Loans & Claims */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Requests</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/loans" className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="text-blue-600" size={18} />
                                <span className="font-medium text-blue-900">Staff Loans</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-900">{loanStats?.pending || 0}</p>
                            <p className="text-xs text-blue-600">Pending approval</p>
                        </Link>
                        <Link to="/claims" className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="text-emerald-600" size={18} />
                                <span className="font-medium text-emerald-900">Claims</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-900">{claimsStats?.pending || claimsStats?.pendingClaims || 0}</p>
                            <p className="text-xs text-emerald-600">Pending review</p>
                        </Link>
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="text-[#0066B3]" size={18} />
                                <span className="font-medium text-slate-900">Active Loans</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{loanStats?.active || loanStats?.activeLoans || 0}</p>
                            <p className="text-xs text-[#0066B3]">Currently running</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="text-amber-600" size={18} />
                                <span className="font-medium text-amber-900">Outstanding</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-900">
                                KES {((loanStats?.totalOutstanding || 0) / 1000).toFixed(0)}K
                            </p>
                            <p className="text-xs text-amber-600">Total balance</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <Link to="/leave-management" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                        <Calendar size={22} /><span className="text-sm font-medium">Review Leave</span>
                    </Link>
                    <Link to="/approvals" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                        <ClipboardList size={22} /><span className="text-sm font-medium">Approvals</span>
                    </Link>
                    <Link to="/recruitment" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                        <UserPlus size={22} /><span className="text-sm font-medium">Recruitment</span>
                    </Link>
                    <Link to="/staff-management" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                        <Users size={22} /><span className="text-sm font-medium">Staff Directory</span>
                    </Link>
                    <Link to="/announcements" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                        <Megaphone size={22} /><span className="text-sm font-medium">Announcements</span>
                    </Link>
                    <Link to="/reports" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                        <FileWarning size={22} /><span className="text-sm font-medium">Reports</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default HRDashboard;
