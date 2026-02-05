import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
    Users,
    UserPlus,
    UserX,
    Calendar,
    FileText,
    AlertTriangle,
    CheckCircle,
    Clock,
    ChevronRight,
    Briefcase,
    FileCheck,
    UserCheck,
    TrendingUp,
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

export const HRDashboard: React.FC = () => {
    const { user } = useAuthStore();

    // Fetch leave stats
    const { data: leaveStats } = useQuery({
        queryKey: ['leave-stats-hr'],
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

    // Fetch pending approvals
    const { data: pendingApprovals } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            const response = await api.get('/approvals/pending');
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

    // Fetch claims stats
    const { data: claimsStats } = useQuery({
        queryKey: ['claims-stats'],
        queryFn: async () => {
            const response = await api.get('/claims/stats');
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

    // Fetch staff with expiring documents
    const { data: expiringDocs } = useQuery({
        queryKey: ['expiring-documents'],
        queryFn: async () => {
            try {
                const response = await api.get('/documents/expiring?days=30');
                return response.data;
            } catch {
                return [];
            }
        },
    });

    // Fetch probation reviews
    const { data: probationReviews } = useQuery({
        queryKey: ['probation-reviews'],
        queryFn: async () => {
            try {
                const response = await api.get('/staff?status=probation');
                return response.data;
            } catch {
                return [];
            }
        },
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">HR Dashboard</h1>
                    <p className="text-slate-500">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.first_name}! Here's your HR overview.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/staff"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        New Staff
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
                    link="/leave"
                />
                <StatCard
                    title="Pending Approvals"
                    value={pendingApprovals?.length || 0}
                    subtitle="Requires your action"
                    icon={<Clock className="text-white" size={24} />}
                    color="bg-gradient-to-br from-amber-500 to-orange-600"
                    link="/approvals"
                />
                <StatCard
                    title="Open Positions"
                    value={recruitmentStats?.openPositions || 0}
                    subtitle={`${recruitmentStats?.applicationsThisMonth || 0} applications this month`}
                    icon={<Briefcase className="text-white" size={24} />}
                    color="bg-gradient-to-br from-purple-500 to-pink-600"
                    link="/recruitment"
                />
                <StatCard
                    title="Document Expiries"
                    value={expiringDocs?.length || 0}
                    subtitle="Expiring in 30 days"
                    icon={<FileCheck className="text-white" size={24} />}
                    color={expiringDocs?.length > 0 ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gradient-to-br from-emerald-500 to-green-600"}
                />
            </div>

            {/* Staff Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Headcount Summary */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users size={20} />
                        Headcount Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-400 text-sm">Total Staff</p>
                            <p className="text-2xl font-bold mt-1">{probationReviews?.total || '--'}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-400 text-sm">Active</p>
                            <p className="text-2xl font-bold mt-1 text-emerald-400">{probationReviews?.active || '--'}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-400 text-sm">On Probation</p>
                            <p className="text-2xl font-bold mt-1 text-amber-400">{Array.isArray(probationReviews) ? probationReviews.length : 0}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-slate-400 text-sm">Turnover</p>
                            <p className="text-2xl font-bold mt-1">2.3%</p>
                        </div>
                    </div>
                </div>

                {/* Leave Overview */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Leave Overview</h3>
                        <Link to="/leave" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                            View all
                        </Link>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Calendar className="text-blue-600" size={18} />
                                </div>
                                <span className="font-medium text-slate-900">Total Requests</span>
                            </div>
                            <span className="text-xl font-bold text-slate-900">{leaveStats?.totalRequests || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Clock className="text-amber-600" size={18} />
                                </div>
                                <span className="font-medium text-slate-900">Pending</span>
                            </div>
                            <span className="text-xl font-bold text-amber-600">{leaveStats?.pendingRequests || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <CheckCircle className="text-emerald-600" size={18} />
                                </div>
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
                        <Link to="/recruitment" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                            View all
                        </Link>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Open Positions</span>
                            <span className="font-bold text-slate-900">{recruitmentStats?.openPositions || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Total Applications</span>
                            <span className="font-bold text-slate-900">{recruitmentStats?.totalApplications || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Interviews Scheduled</span>
                            <span className="font-bold text-slate-900">{recruitmentStats?.scheduledInterviews || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Hired This Month</span>
                            <span className="font-bold text-emerald-600">{recruitmentStats?.hiredThisMonth || 0}</span>
                        </div>
                        <div className="pt-3 border-t border-slate-100">
                            <Link
                                to="/recruitment"
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                            >
                                <Briefcase size={16} />
                                Manage Recruitment
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Probation Reviews Due */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">Probation Reviews Due</h3>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            {Array.isArray(probationReviews) ? probationReviews.length : 0}
                        </span>
                    </div>
                    {!probationReviews || probationReviews.length === 0 ? (
                        <div className="p-8 text-center">
                            <UserCheck className="mx-auto text-emerald-500 mb-4" size={48} />
                            <p className="font-medium text-slate-900">No pending reviews</p>
                            <p className="text-sm text-slate-500">All probation reviews are up to date</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                            {(Array.isArray(probationReviews) ? probationReviews : []).slice(0, 5).map((staff: any) => (
                                <div key={staff.id} className="p-4 hover:bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                                {staff.first_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{staff.full_name || `${staff.first_name} ${staff.last_name}`}</p>
                                                <p className="text-xs text-slate-500">{staff.position?.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-slate-900">
                                                {staff.probation_end_date ? new Date(staff.probation_end_date).toLocaleDateString() : 'TBD'}
                                            </p>
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
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="text-blue-600" size={18} />
                                <span className="font-medium text-blue-900">Staff Loans</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-900">{loanStats?.pending || 0}</p>
                            <p className="text-xs text-blue-600">Pending approval</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="text-emerald-600" size={18} />
                                <span className="font-medium text-emerald-900">Claims</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-900">{claimsStats?.pending || 0}</p>
                            <p className="text-xs text-emerald-600">Pending review</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="text-purple-600" size={18} />
                                <span className="font-medium text-purple-900">Active Loans</span>
                            </div>
                            <p className="text-2xl font-bold text-purple-900">{loanStats?.active || 0}</p>
                            <p className="text-xs text-purple-600">Currently running</p>
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
        </div>
    );
};

export default HRDashboard;
