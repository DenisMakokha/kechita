import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, Clock, Briefcase, Calendar } from 'lucide-react';
import api from '../../lib/api';

export const RecruitmentMetrics: React.FC = () => {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['recruitment-dashboard'],
        queryFn: async () => (await api.get('/recruitment/dashboard')).data,
    });

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading metrics...</div>;
    if (!stats) return null;

    const cards = [
        { label: 'Total Applications', value: stats.totalApplications, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Time to Hire (Avg)', value: `${stats.avgTimeToHire} Days`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Hired Candidates', value: stats.hiredCount, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1">{card.label}</p>
                            <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${card.bg}`}>
                            <card.icon className={card.color} size={24} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Pipeline Funnel</h3>
                    <div className="h-80">
                        {stats.pipelineBreakdown?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.pipelineBreakdown} layout="vertical" margin={{ left: 0, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={120}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                        {stats.pipelineBreakdown.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill || '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No pipeline data available</div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Activity Highlights</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="p-2 bg-white rounded-lg shadow-sm"><Calendar className="text-blue-500" size={24} /></div>
                            <div>
                                <p className="text-lg font-bold text-slate-900">{stats.interviewsThisWeek}</p>
                                <p className="text-sm text-slate-600">Interviews Scheduled (This Week)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                            <div className="p-2 bg-white rounded-lg shadow-sm"><Users className="text-green-500" size={24} /></div>
                            <div>
                                <p className="text-lg font-bold text-slate-900">{stats.newThisWeek}</p>
                                <p className="text-sm text-slate-600">New Applications (This Week)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <div className="p-2 bg-white rounded-lg shadow-sm"><TrendingUp className="text-purple-500" size={24} /></div>
                            <div>
                                <p className="text-lg font-bold text-slate-900">+{Math.round((stats.newThisWeek / (stats.totalApplications || 1)) * 100)}%</p>
                                <p className="text-sm text-slate-600">Growth in applicant pool</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
