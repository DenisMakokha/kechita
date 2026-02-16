import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import {
    Users, Calendar, FileText, CheckSquare, Clock, ChevronRight,
    UserPlus, ClipboardList, AlertCircle, Briefcase,
    CalendarDays, UserCheck, AlertTriangle, FileWarning, ScrollText,
    Video, MapPin, FileCheck,
} from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, link }) => {
    const content = (
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500 font-medium">{title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
            </div>
        </div>
    );
    return link ? <Link to={link}>{content}</Link> : content;
};

export const HRAssistantDashboard: React.FC = () => {
    // Leave stats
    const { data: leaveStats } = useQuery({
        queryKey: ['leave-stats'],
        queryFn: () => api.get('/leave/stats').then(r => r.data),
        refetchInterval: 60000,
    });

    // Staff on leave today (full list)
    const { data: staffOnLeave } = useQuery({
        queryKey: ['staff-on-leave-today'],
        queryFn: () => api.get('/leave/on-leave-today').then(r => r.data).catch(() => []),
        refetchInterval: 60000,
    });

    // Onboarding stats
    const { data: onboardingStats } = useQuery({
        queryKey: ['onboarding-stats'],
        queryFn: () => api.get('/staff/onboarding/stats').then(r => r.data).catch(() => null),
    });

    // Overdue onboarding instances
    const { data: overdueOnboarding } = useQuery({
        queryKey: ['overdue-onboarding-hra'],
        queryFn: () => api.get('/onboarding/instances/overdue').then(r => r.data).catch(() => []),
    });

    // Recruitment stats
    const { data: recruitmentStats } = useQuery({
        queryKey: ['recruitment-stats'],
        queryFn: () => api.get('/recruitment/stats').then(r => r.data),
    });

    // Upcoming interviews
    const { data: interviews } = useQuery({
        queryKey: ['hra-interviews'],
        queryFn: () => api.get('/recruitment/interviews').then(r => r.data).catch(() => []),
    });
    const upcomingInterviews = (interviews || []).filter((i: any) => new Date(i.scheduled_at) >= new Date()).slice(0, 5);

    // Recent staff
    const { data: recentStaff } = useQuery({
        queryKey: ['recent-staff'],
        queryFn: () => api.get('/staff?limit=5&sort=created_at:desc').then(r => r.data),
    });

    // Pending approvals
    const { data: pendingApprovals } = useQuery({
        queryKey: ['my-pending-approvals'],
        queryFn: () => api.get('/approvals/pending').then(r => r.data),
        refetchInterval: 30000,
    });

    // Expiring documents (30 days)
    const { data: expiringDocs } = useQuery({
        queryKey: ['expiring-docs-hra'],
        queryFn: () => api.get('/staff/documents/expiring?days=30').then(r => r.data).catch(() => []),
    });

    // Expired documents
    const { data: expiredDocs } = useQuery({
        queryKey: ['expired-docs-hra'],
        queryFn: () => api.get('/staff/documents/expired').then(r => r.data).catch(() => []),
    });

    // Expiring contracts
    const { data: expiringContracts } = useQuery({
        queryKey: ['expiring-contracts-hra'],
        queryFn: () => api.get('/staff/contracts/expiring?days=30').then(r => r.data).catch(() => []),
    });

    // Build dynamic reminders
    const reminders: { text: string; urgent: boolean }[] = [];
    if ((expiredDocs?.length || 0) > 0) reminders.push({ text: `${expiredDocs.length} expired document${expiredDocs.length > 1 ? 's' : ''} need attention`, urgent: true });
    if ((expiringDocs?.length || 0) > 0) reminders.push({ text: `${expiringDocs.length} document${expiringDocs.length > 1 ? 's' : ''} expiring within 30 days`, urgent: false });
    if ((expiringContracts?.length || 0) > 0) reminders.push({ text: `${expiringContracts.length} contract${expiringContracts.length > 1 ? 's' : ''} expiring soon`, urgent: true });
    if ((overdueOnboarding?.length || 0) > 0) reminders.push({ text: `${overdueOnboarding.length} overdue onboarding${overdueOnboarding.length > 1 ? 's' : ''}`, urgent: true });
    if (upcomingInterviews.length > 0) reminders.push({ text: `${upcomingInterviews.length} upcoming interview${upcomingInterviews.length > 1 ? 's' : ''} to coordinate`, urgent: false });
    if (reminders.length === 0) reminders.push({ text: 'All tasks up to date!', urgent: false });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">HR Assistant Dashboard</h1>
                <p className="text-slate-500">Overview of HR operations and pending tasks</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    title="Pending Leave Requests"
                    value={leaveStats?.pendingRequests || 0}
                    subtitle="Awaiting review"
                    icon={<Calendar className="text-white" size={24} />}
                    color="bg-gradient-to-br from-blue-500 to-cyan-600"
                    link="/leave"
                />
                <StatCard
                    title="Active Onboarding"
                    value={onboardingStats?.activeCount || 0}
                    subtitle={`${onboardingStats?.pendingTasks || 0} tasks pending`}
                    icon={<UserPlus className="text-white" size={24} />}
                    color="bg-gradient-to-br from-emerald-500 to-teal-600"
                    link="/onboarding"
                />
                <StatCard
                    title="Open Positions"
                    value={recruitmentStats?.openPositions || 0}
                    subtitle={`${recruitmentStats?.applicationsThisMonth || 0} new applications`}
                    icon={<Briefcase className="text-white" size={24} />}
                    color="bg-gradient-to-br from-purple-500 to-indigo-600"
                    link="/recruitment"
                />
                <StatCard
                    title="My Pending Approvals"
                    value={pendingApprovals?.length || 0}
                    subtitle="Awaiting your action"
                    icon={<ClipboardList className="text-white" size={24} />}
                    color="bg-gradient-to-br from-amber-500 to-orange-600"
                    link="/approvals"
                />
            </div>

            {/* Document & Contract Alerts */}
            {((expiredDocs?.length || 0) + (expiringDocs?.length || 0) + (expiringContracts?.length || 0)) > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(expiredDocs?.length || 0) > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                            <div className="p-2.5 bg-red-100 rounded-lg"><FileWarning className="text-red-600" size={20} /></div>
                            <div>
                                <p className="font-bold text-red-800">{expiredDocs.length} Expired Doc{expiredDocs.length > 1 ? 's' : ''}</p>
                                <p className="text-xs text-red-600">Require immediate action</p>
                            </div>
                        </div>
                    )}
                    {(expiringDocs?.length || 0) > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                            <div className="p-2.5 bg-amber-100 rounded-lg"><FileCheck className="text-amber-600" size={20} /></div>
                            <div>
                                <p className="font-bold text-amber-800">{expiringDocs.length} Expiring Doc{expiringDocs.length > 1 ? 's' : ''}</p>
                                <p className="text-xs text-amber-600">Within 30 days</p>
                            </div>
                        </div>
                    )}
                    {(expiringContracts?.length || 0) > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                            <div className="p-2.5 bg-amber-100 rounded-lg"><ScrollText className="text-amber-600" size={20} /></div>
                            <div>
                                <p className="font-bold text-amber-800">{expiringContracts.length} Contract{expiringContracts.length > 1 ? 's' : ''} Expiring</p>
                                <p className="text-xs text-amber-600">Within 30 days</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tasks & Quick Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Today's Tasks */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <CheckSquare size={20} className="text-[#0066B3]" />
                                Today's Tasks
                            </h3>
                            <Link to="/approvals" className="text-sm text-[#0066B3] hover:text-[#005599] font-medium flex items-center gap-1">
                                View all <ChevronRight size={16} />
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {pendingApprovals?.slice(0, 5).map((approval: any) => (
                                <div key={approval.id} className="p-4 hover:bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                approval.target_type === 'leave' ? 'bg-blue-100 text-blue-600' :
                                                approval.target_type === 'claim' ? 'bg-emerald-100 text-emerald-600' :
                                                'bg-purple-100 text-purple-600'
                                            }`}>
                                                {approval.target_type === 'leave' ? <Calendar size={20} /> :
                                                 approval.target_type === 'claim' ? <FileText size={20} /> :
                                                 <Briefcase size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {approval.target_type?.charAt(0).toUpperCase() + approval.target_type?.slice(1)} Request
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {approval.requester?.first_name} {approval.requester?.last_name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">
                                                {new Date(approval.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </span>
                                            <ChevronRight size={16} className="text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!pendingApprovals || pendingApprovals.length === 0) && (
                                <div className="p-8 text-center">
                                    <CheckSquare className="mx-auto text-emerald-500 mb-3" size={40} />
                                    <p className="text-slate-600 font-medium">All caught up!</p>
                                    <p className="text-sm text-slate-400">No pending tasks at the moment</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Interviews */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Video size={20} className="text-blue-600" /> Upcoming Interviews
                            </h3>
                            <Link to="/recruitment" className="text-sm text-[#0066B3] flex items-center gap-1">View all <ChevronRight size={14} /></Link>
                        </div>
                        {upcomingInterviews.length === 0 ? (
                            <div className="p-8 text-center">
                                <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
                                <p className="text-slate-500 text-sm">No upcoming interviews</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {upcomingInterviews.map((i: any) => {
                                    const isToday = new Date(i.scheduled_at).toDateString() === new Date().toDateString();
                                    return (
                                        <div key={i.id} className={`p-4 hover:bg-slate-50 ${isToday ? 'bg-blue-50/50' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-slate-900 text-sm">{i.application?.candidate?.first_name} {i.application?.candidate?.last_name}</p>
                                                        {isToday && <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">TODAY</span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500">{i.title} • {i.application?.jobPost?.title}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-slate-700">{new Date(i.scheduled_at).toLocaleDateString()}</p>
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

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Link to="/leave-management" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                                <Calendar size={24} /><span className="text-sm font-medium">Review Leave</span>
                            </Link>
                            <Link to="/staff-management" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                                <UserCheck size={24} /><span className="text-sm font-medium">Onboarding</span>
                            </Link>
                            <Link to="/recruitment" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                                <UserPlus size={24} /><span className="text-sm font-medium">Recruitment</span>
                            </Link>
                            <Link to="/staff-management" className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 hover:text-[#0066B3] transition-colors">
                                <Users size={24} /><span className="text-sm font-medium">Staff Directory</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Staff on Leave Today — with names */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                <CalendarDays size={20} className="text-amber-500" /> On Leave Today
                            </h3>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{staffOnLeave?.length || 0}</span>
                        </div>
                        <div className="p-4">
                            {!staffOnLeave || staffOnLeave.length === 0 ? (
                                <div className="text-center py-4 text-slate-500">
                                    <UserCheck className="mx-auto mb-2 text-emerald-500" size={32} />
                                    <p className="text-sm">All staff present today</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {staffOnLeave.slice(0, 5).map((staff: any) => (
                                        <div key={staff.id} className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-orange-500/30">
                                                {staff.first_name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 text-sm truncate">{staff.full_name || `${staff.first_name} ${staff.last_name}`}</p>
                                                <p className="text-xs text-slate-500 truncate">{staff.position?.name || 'Staff'}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {staffOnLeave.length > 5 && (
                                        <Link to="/leave-management" className="text-sm text-[#0066B3] hover:text-[#005599] font-medium">+{staffOnLeave.length - 5} more</Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Onboarding Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                <ClipboardList size={18} className="text-emerald-600" /> Onboarding
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600 text-sm">In Progress</span>
                                <span className="font-bold text-slate-900">{onboardingStats?.activeCount || onboardingStats?.inProgress || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600 text-sm">Pending Tasks</span>
                                <span className="font-bold text-amber-600">{onboardingStats?.pendingTasks || 0}</span>
                            </div>
                            {(overdueOnboarding?.length || 0) > 0 && (
                                <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-red-500" />
                                    <span className="text-xs text-red-700 font-medium">{overdueOnboarding.length} overdue</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Staff */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900">Recent Staff</h3>
                            <Link to="/staff-management" className="text-sm text-[#0066B3] hover:text-[#005599]">View all</Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {(recentStaff?.data || recentStaff || []).slice(0, 4).map((staff: any) => (
                                <div key={staff.id} className="p-4 hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066B3] to-[#00AEEF] flex items-center justify-center text-white font-medium">
                                            {staff.first_name?.[0]}{staff.last_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{staff.first_name} {staff.last_name}</p>
                                            <p className="text-xs text-slate-500">{staff.position?.name || 'Staff'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!(recentStaff?.data || recentStaff)?.length && (
                                <div className="p-4 text-center text-slate-500 text-sm">No recent staff updates</div>
                            )}
                        </div>
                    </div>

                    {/* Dynamic Reminders */}
                    <div className="bg-gradient-to-br from-[#0066B3] to-[#00AEEF] rounded-xl p-5 text-white">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Clock size={18} /> Action Items
                        </h3>
                        <ul className="space-y-2 text-sm">
                            {reminders.map((r, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    {r.urgent ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-300" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
                                    <span>{r.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRAssistantDashboard;
