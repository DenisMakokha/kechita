import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
    MapPin,
    Users,
    Calendar,
    Clock,
    CheckCircle,
    ChevronRight,
    AlertTriangle,
    FileText,
    BarChart3,
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

export const RegionalManagerDashboard: React.FC = () => {
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

    // Fetch staff on leave today
    const { data: staffOnLeave } = useQuery({
        queryKey: ['staff-on-leave-today'],
        queryFn: async () => {
            const response = await api.get('/leave/on-leave-today');
            return response.data;
        },
    });

    // Fetch leave conflict preview
    const { data: upcomingConflicts } = useQuery({
        queryKey: ['upcoming-conflicts'],
        queryFn: async () => {
            try {
                // Would need branch ID from user's context
                const response = await api.get('/leave/conflicts/upcoming?branchId=all&daysAhead=14');
                return response.data;
            } catch {
                return [];
            }
        },
    });

    // Fetch branches (simulated - would come from region data)
    const branches = [
        { id: '1', name: 'Main Branch', staff: 12, onLeave: 2, collections: 2500000, par: 3.2 },
        { id: '2', name: 'Westlands', staff: 8, onLeave: 1, collections: 1800000, par: 4.1 },
        { id: '3', name: 'Eastleigh', staff: 10, onLeave: 0, collections: 2100000, par: 2.8 },
        { id: '4', name: 'Thika Road', staff: 6, onLeave: 1, collections: 1200000, par: 5.5 },
    ];

    const totalStaff = branches.reduce((acc, b) => acc + b.staff, 0);
    const totalOnLeave = branches.reduce((acc, b) => acc + b.onLeave, 0);
    const totalCollections = branches.reduce((acc, b) => acc + b.collections, 0);
    const avgPar = branches.reduce((acc, b) => acc + b.par, 0) / branches.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Regional Dashboard</h1>
                    <p className="text-slate-500">Monitor branch performance and team activity</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-[#0066B3] rounded-full text-sm font-medium flex items-center gap-1">
                        <MapPin size={14} />
                        Central Region
                    </span>
                </div>
            </div>

            {/* Regional Summary */}
            <div className="bg-gradient-to-r from-[#0F172A] via-[#1E3A5F] to-[#0F172A] rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <BarChart3 size={24} />
                        Regional Performance
                    </h2>
                    <span className="text-sm text-blue-200">
                        {branches.length} Branches
                    </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-blue-200 text-sm">Total Staff</p>
                        <p className="text-2xl font-bold mt-1">{totalStaff}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-blue-200 text-sm">On Leave Today</p>
                        <p className="text-2xl font-bold mt-1">{totalOnLeave}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-blue-200 text-sm">Collections (MTD)</p>
                        <p className="text-2xl font-bold mt-1">
                            KES {(totalCollections / 1000000).toFixed(1)}M
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-blue-200 text-sm">Average PAR</p>
                        <p className={`text-2xl font-bold mt-1 ${avgPar > 5 ? 'text-red-300' : 'text-emerald-300'}`}>
                            {avgPar.toFixed(1)}%
                        </p>
                    </div>
                </div>
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
                    title="Leave Requests"
                    value={leaveStats?.pendingRequests || 0}
                    subtitle="Pending approval"
                    icon={<Calendar className="text-white" size={24} />}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    link="/leave"
                />
                <StatCard
                    title="Team on Leave"
                    value={staffOnLeave?.length || 0}
                    subtitle="Staff away today"
                    icon={<Users className="text-white" size={24} />}
                    color="bg-[#0066B3]"
                />
                <StatCard
                    title="Reports Submitted"
                    value="3/4"
                    subtitle="Branches reported today"
                    icon={<FileText className="text-white" size={24} />}
                    color="bg-gradient-to-br from-emerald-500 to-green-600"
                    link="/reports"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Branch Performance */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Branch Performance</h3>
                        <Link to="/reports" className="text-sm text-[#0066B3] hover:text-[#005299] font-medium flex items-center gap-1">
                            View details <ChevronRight size={16} />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {branches.map((branch) => (
                            <div key={branch.id} className="p-4 hover:bg-slate-50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <MapPin className="text-[#0066B3]" size={20} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{branch.name}</p>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span>{branch.staff} staff</span>
                                                {branch.onLeave > 0 && (
                                                    <span className="text-amber-600">{branch.onLeave} on leave</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-900">
                                            KES {(branch.collections / 1000000).toFixed(2)}M
                                        </p>
                                        <p className={`text-xs ${branch.par > 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            PAR: {branch.par}%
                                            {branch.par > 5 && <AlertTriangle className="inline ml-1" size={12} />}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${branch.par > 5 ? 'bg-red-500' : 'bg-[#0066B3]'}`}
                                        style={{ width: `${Math.min((branch.collections / 3000000) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
                        <div className="space-y-2">
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
                                to="/leave"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Calendar className="text-blue-600" size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">Leave Calendar</p>
                                    <p className="text-xs text-slate-500">View team schedule</p>
                                </div>
                                <ChevronRight className="text-slate-400" size={18} />
                            </Link>
                            <Link
                                to="/reports"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="text-[#0066B3]" size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">Daily Reports</p>
                                    <p className="text-xs text-slate-500">Check submissions</p>
                                </div>
                                <ChevronRight className="text-slate-400" size={18} />
                            </Link>
                        </div>
                    </div>

                    {/* Leave Conflicts Preview */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">Upcoming Leave Conflicts</h3>
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                {upcomingConflicts?.length || 0}
                            </span>
                        </div>
                        {!upcomingConflicts || upcomingConflicts.length === 0 ? (
                            <div className="text-center py-4">
                                <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
                                <p className="text-sm text-slate-500">No conflicts in next 14 days</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingConflicts?.slice(0, 3).map((conflict: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-amber-50 rounded-lg">
                                        <p className="text-sm font-medium text-amber-900">
                                            {new Date(conflict.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </p>
                                        <p className="text-xs text-amber-700">
                                            {conflict.staffOnLeave} staff on leave
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Staff Overview */}
                    <div className="bg-[#0066B3] rounded-xl p-5 text-white">
                        <h3 className="font-semibold mb-4">Team Status</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-blue-200 text-xs">Present</p>
                                <p className="text-2xl font-bold">{totalStaff - totalOnLeave}</p>
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs">On Leave</p>
                                <p className="text-2xl font-bold">{totalOnLeave}</p>
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs">Branches</p>
                                <p className="text-2xl font-bold">{branches.length}</p>
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs">Coverage</p>
                                <p className="text-2xl font-bold">{Math.round((1 - totalOnLeave / totalStaff) * 100)}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegionalManagerDashboard;
