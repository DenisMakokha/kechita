import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, Clock, Briefcase, Calendar, Target, Award, UserCheck, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../../lib/api';

export const RecruitmentMetrics: React.FC = () => {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['recruitment-dashboard'],
        queryFn: async () => (await api.get('/recruitment/dashboard')).data,
    });

    const { data: recentApps } = useQuery({
        queryKey: ['recent-applications'],
        queryFn: async () => (await api.get('/recruitment/applications?limit=5&sort=applied_at:desc')).data,
    });

    const { data: topJobs } = useQuery({
        queryKey: ['top-jobs'],
        queryFn: async () => (await api.get('/recruitment/jobs?status=published&limit=5')).data,
    });

    if (isLoading) return (
        <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-[#0066B3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading recruitment metrics...</p>
        </div>
    );

    const displayStats = stats || {
        totalApplications: 0,
        activeJobs: 0,
        avgTimeToHire: 0,
        hiredCount: 0,
        interviewsThisWeek: 0,
        newThisWeek: 0,
        pipelineBreakdown: [],
        conversionRate: 0,
        pendingReview: 0
    };

    const cards = [
        { label: 'Total Applications', value: displayStats.totalApplications, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: displayStats.newThisWeek > 0 ? 'up' : 'neutral' },
        { label: 'Active Jobs', value: displayStats.activeJobs, icon: Briefcase, color: 'text-[#0066B3]', bg: 'bg-blue-50', trend: 'neutral' },
        { label: 'Avg. Time to Hire', value: `${displayStats.avgTimeToHire}d`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', trend: 'neutral' },
        { label: 'Hired This Month', value: displayStats.hiredCount, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50', trend: 'up' },
        { label: 'Interviews This Week', value: displayStats.interviewsThisWeek, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'neutral' },
        { label: 'New This Week', value: displayStats.newThisWeek, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: displayStats.newThisWeek > 5 ? 'up' : 'neutral' },
    ];

    const sourceData = [
        { name: 'Job Boards', value: 35, fill: '#0066B3' },
        { name: 'Referrals', value: 25, fill: '#10b981' },
        { name: 'LinkedIn', value: 20, fill: '#6366f1' },
        { name: 'Website', value: 15, fill: '#f59e0b' },
        { name: 'Other', value: 5, fill: '#94a3b8' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {cards.map((card, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2.5 rounded-lg ${card.bg}`}>
                                <card.icon className={card.color} size={20} />
                            </div>
                            {card.trend === 'up' && <ArrowUpRight size={16} className="text-green-500" />}
                            {card.trend === 'down' && <ArrowDownRight size={16} className="text-red-500" />}
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
                        <p className="text-xs text-slate-500 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Pipeline Funnel */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Pipeline Overview</h3>
                        <span className="text-sm text-slate-500">{displayStats.totalApplications} total applicants</span>
                    </div>
                    <div className="h-72">
                        {displayStats.pipelineBreakdown?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={displayStats.pipelineBreakdown} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => [`${value} applicants`, 'Count']}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                                        {displayStats.pipelineBreakdown.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill || '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Target size={40} className="mb-2 opacity-50" />
                                <p>No pipeline data yet</p>
                                <p className="text-sm">Applications will appear here</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Source Breakdown */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Application Sources</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {sourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`${value}%`, 'Share']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                        {sourceData.map((source, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.fill }} />
                                    <span className="text-slate-600">{source.name}</span>
                                </div>
                                <span className="font-medium text-slate-900">{source.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Activity Highlights */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                            <div className="p-2 bg-white rounded-lg shadow-sm"><Calendar className="text-blue-500" size={20} /></div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-slate-900">{displayStats.interviewsThisWeek}</p>
                                <p className="text-xs text-slate-600">Interviews This Week</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                            <div className="p-2 bg-white rounded-lg shadow-sm"><Users className="text-green-500" size={20} /></div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-slate-900">{displayStats.newThisWeek}</p>
                                <p className="text-xs text-slate-600">New Applications</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg">
                            <div className="p-2 bg-white rounded-lg shadow-sm"><Award className="text-purple-500" size={20} /></div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-slate-900">{displayStats.hiredCount}</p>
                                <p className="text-xs text-slate-600">Hired This Month</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Jobs */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Active Job Posts</h3>
                    <div className="space-y-3">
                        {topJobs?.slice(0, 4).map((job: any) => (
                            <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 text-sm truncate">{job.title}</p>
                                    <p className="text-xs text-slate-500">{job.department?.name || 'No department'}</p>
                                </div>
                                <div className="text-right ml-3">
                                    <p className="text-sm font-bold text-[#0066B3]">{job.applications_count || 0}</p>
                                    <p className="text-xs text-slate-400">applicants</p>
                                </div>
                            </div>
                        )) || (
                            <div className="text-center py-6 text-slate-400">
                                <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No active jobs</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Applications */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Applications</h3>
                    <div className="space-y-3">
                        {recentApps?.data?.slice(0, 4).map((app: any) => (
                            <div key={app.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {app.candidate?.first_name?.charAt(0)}{app.candidate?.last_name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 text-sm truncate">
                                        {app.candidate?.first_name} {app.candidate?.last_name}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{app.jobPost?.title}</p>
                                </div>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    app.match_score >= 80 ? 'bg-green-100 text-green-700' :
                                    app.match_score >= 60 ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {app.match_score || 0}%
                                </span>
                            </div>
                        )) || (
                            <div className="text-center py-6 text-slate-400">
                                <FileText size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No recent applications</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
