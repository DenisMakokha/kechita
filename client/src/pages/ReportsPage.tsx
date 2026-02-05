import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import {
    BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Target, AlertTriangle,
    Download, FileSpreadsheet, FileText, Calendar, RefreshCw, ChevronDown, Building2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';

const COLORS = {
    primary: '#7C3AED',
    secondary: '#3B82F6',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#A855F7',
    teal: '#14B8A6',
    pink: '#EC4899',
};

const CHART_COLORS = ['#7C3AED', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#A855F7'];

interface DashboardData {
    period: { start: string; end: string };
    totalDisbursed: number;
    totalRecoveries: number;
    totalNewLoans: number;
    avgPAR: number;
    reportCount: number;
    regionPerformance: Array<{
        name: string;
        disbursed: number;
        collections: number;
        par: number;
        loansCount: number;
    }>;
    monthlyTrends: Array<{
        month: string;
        disbursed: number;
        collections: number;
        newLoans: number;
        par: number;
    }>;
    topPerformingBranches: Array<{
        name: string;
        collections: number;
        par: number;
    }>;
    riskAlerts: Array<{
        type: string;
        message: string;
        severity: 'low' | 'medium' | 'high';
    }>;
    staffStats: {
        total: number;
        active: number;
        onLeave: number;
        onboarding: number;
    };
    leaveStats: {
        approved: number;
        pending: number;
        rejected: number;
        totalDays: number;
    };
    claimsStats: {
        submitted: number;
        approvedAmount: number;
        pendingCount: number;
    };
}

export const ReportsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [period, setPeriod] = useState('month');
    const [isExporting, setIsExporting] = useState(false);

    const isCEO = user?.roles.some((r) => r.code === 'CEO');
    const isHR = user?.roles.some((r) => r.code === 'HR_MANAGER');
    const isRM = user?.roles.some((r) => r.code === 'REGIONAL_MANAGER');
    const canViewDashboard = isCEO || isHR || isRM;

    const { data: dashboardData, isLoading, refetch } = useQuery<DashboardData>({
        queryKey: ['ceo-dashboard', period],
        queryFn: async () => {
            const response = await api.get('/reporting/dashboard/ceo');
            return response.data;
        },
        enabled: canViewDashboard,
    });

    const handleExport = async (format: 'pdf' | 'excel') => {
        setIsExporting(true);
        try {
            const response = await api.get(`/reporting/export/${format}?type=summary`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `kechita-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    // Prepare chart data
    const regionChartData = dashboardData?.regionPerformance.map(r => ({
        ...r,
        disbursed: r.disbursed / 1000000, // Convert to millions
        collections: r.collections / 1000000,
        collectionRate: r.disbursed > 0 ? ((r.collections / r.disbursed) * 100).toFixed(1) : 0,
    })) || [];

    const trendChartData = dashboardData?.monthlyTrends.map(t => ({
        ...t,
        disbursed: t.disbursed / 1000000,
        collections: t.collections / 1000000,
    })) || [];

    const staffPieData = dashboardData ? [
        { name: 'Active', value: dashboardData.staffStats.active, color: COLORS.success },
        { name: 'On Leave', value: dashboardData.staffStats.onLeave, color: COLORS.warning },
        { name: 'Onboarding', value: dashboardData.staffStats.onboarding, color: COLORS.primary },
    ] : [];

    const parByRegion = dashboardData?.regionPerformance.map(r => ({
        name: r.name,
        par: Number(r.par.toFixed(2)),
        fill: r.par > 5 ? COLORS.danger : r.par > 3 ? COLORS.warning : COLORS.success,
    })) || [];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                    <p className="font-semibold text-slate-900 mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {typeof entry.value === 'number' && entry.name.includes('KES')
                                ? `KES ${entry.value.toFixed(2)}M`
                                : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (!canViewDashboard) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <AlertTriangle className="mx-auto mb-4 text-amber-500" size={48} />
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
                    <p className="text-slate-500">You don't have permission to view the analytics dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
                    <p className="text-slate-500">Performance insights and KPIs</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                    </select>
                    <button
                        onClick={() => refetch()}
                        className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <div className="relative group">
                        <button
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50"
                        >
                            <Download size={18} />
                            Export
                            <ChevronDown size={14} />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                                onClick={() => handleExport('pdf')}
                                className="flex items-center gap-2 w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 rounded-t-lg"
                            >
                                <FileText size={16} className="text-red-500" />
                                Export as PDF
                            </button>
                            <button
                                onClick={() => handleExport('excel')}
                                className="flex items-center gap-2 w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 rounded-b-lg"
                            >
                                <FileSpreadsheet size={16} className="text-green-500" />
                                Export as Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0yaDF2NGgtMXYtNHptMi0yaDF2MWgtMXYtMXptLTIgMGgxdjFoLTF2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <BarChart3 size={24} />
                        Executive Summary
                        {dashboardData && (
                            <span className="ml-2 text-sm font-normal text-purple-200">
                                ({new Date(dashboardData.period.start).toLocaleDateString()} - {new Date(dashboardData.period.end).toLocaleDateString()})
                            </span>
                        )}
                    </h2>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 bg-green-500/20 rounded-lg">
                                        <DollarSign className="text-green-400" size={24} />
                                    </div>
                                    <span className="text-green-400 text-sm flex items-center font-medium">
                                        <TrendingUp size={14} className="mr-1" /> +12%
                                    </span>
                                </div>
                                <p className="text-3xl font-bold">
                                    KES {((dashboardData?.totalDisbursed || 0) / 1000000).toFixed(1)}M
                                </p>
                                <p className="text-purple-200 text-sm mt-1">Total Disbursed (MTD)</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <DollarSign className="text-blue-400" size={24} />
                                    </div>
                                    <span className="text-green-400 text-sm flex items-center font-medium">
                                        <TrendingUp size={14} className="mr-1" /> +8%
                                    </span>
                                </div>
                                <p className="text-3xl font-bold">
                                    KES {((dashboardData?.totalRecoveries || 0) / 1000000).toFixed(1)}M
                                </p>
                                <p className="text-purple-200 text-sm mt-1">Total Recoveries (MTD)</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                        <Users className="text-purple-400" size={24} />
                                    </div>
                                    <span className="text-green-400 text-sm flex items-center font-medium">
                                        <TrendingUp size={14} className="mr-1" /> +15
                                    </span>
                                </div>
                                <p className="text-3xl font-bold">{dashboardData?.totalNewLoans || 0}</p>
                                <p className="text-purple-200 text-sm mt-1">New Loans (MTD)</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${(dashboardData?.avgPAR || 0) > 5 ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                                        <AlertTriangle className={(dashboardData?.avgPAR || 0) > 5 ? 'text-red-400' : 'text-amber-400'} size={24} />
                                    </div>
                                    <span className={`text-sm flex items-center font-medium ${(dashboardData?.avgPAR || 0) > 5 ? 'text-red-400' : 'text-green-400'}`}>
                                        {(dashboardData?.avgPAR || 0) > 5 ? (
                                            <><TrendingUp size={14} className="mr-1" /> +0.5%</>
                                        ) : (
                                            <><TrendingDown size={14} className="mr-1" /> -0.3%</>
                                        )}
                                    </span>
                                </div>
                                <p className="text-3xl font-bold">{(dashboardData?.avgPAR || 0).toFixed(2)}%</p>
                                <p className="text-purple-200 text-sm mt-1">Portfolio at Risk</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="text-purple-600" size={20} />
                        Monthly Trends
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendChartData}>
                                <defs>
                                    <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => `${v}M`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="disbursed"
                                    name="Disbursed (KES M)"
                                    stroke={COLORS.primary}
                                    fillOpacity={1}
                                    fill="url(#colorDisbursed)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="collections"
                                    name="Collections (KES M)"
                                    stroke={COLORS.success}
                                    fillOpacity={1}
                                    fill="url(#colorCollections)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Regional Performance Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Building2 className="text-blue-600" size={20} />
                        Regional Performance
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => `${v}M`} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#94A3B8" width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="disbursed" name="Disbursed (KES M)" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                                <Bar dataKey="collections" name="Collections (KES M)" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PAR by Region */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={20} />
                        PAR by Region
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={parByRegion}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => `${v}%`} />
                                <Tooltip
                                    formatter={(value: number) => [`${value}%`, 'PAR']}
                                    contentStyle={{ borderRadius: '8px' }}
                                />
                                <Bar dataKey="par" radius={[4, 4, 0, 0]}>
                                    {parByRegion.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-slate-600">Good (&lt;3%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <span className="text-slate-600">Warning (3-5%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-slate-600">Critical (&gt;5%)</span>
                        </div>
                    </div>
                </div>

                {/* Staff Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Users className="text-purple-600" size={20} />
                        Staff Distribution
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={staffPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {staffPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{dashboardData?.staffStats.total || 0}</p>
                        <p className="text-sm text-slate-500">Total Staff</p>
                    </div>
                </div>

                {/* Risk Alerts */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={20} />
                        Risk Alerts
                    </h3>
                    <div className="space-y-3">
                        {dashboardData?.riskAlerts && dashboardData.riskAlerts.length > 0 ? (
                            dashboardData.riskAlerts.map((alert, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg border-l-4 ${alert.severity === 'high'
                                        ? 'bg-red-50 border-red-500'
                                        : alert.severity === 'medium'
                                            ? 'bg-amber-50 border-amber-500'
                                            : 'bg-green-50 border-green-500'
                                        }`}
                                >
                                    <p className={`text-sm font-medium ${alert.severity === 'high'
                                        ? 'text-red-800'
                                        : alert.severity === 'medium'
                                            ? 'text-amber-800'
                                            : 'text-green-800'
                                        }`}>
                                        {alert.message}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 capitalize">{alert.type.replace('_', ' ')}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Target className="text-green-600" size={24} />
                                </div>
                                <p className="text-green-600 font-medium">All metrics are healthy</p>
                                <p className="text-sm text-slate-500">No risk alerts at this time</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Regional Performance Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Regional Performance Details</h3>
                    <button
                        onClick={() => handleExport('excel')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Download size={14} />
                        Export
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Region</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Disbursed</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Collections</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Collection Rate</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">PAR</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboardData?.regionPerformance.map((region) => {
                                const collectionRate = region.disbursed > 0
                                    ? ((region.collections / region.disbursed) * 100).toFixed(1)
                                    : '0';
                                return (
                                    <tr key={region.name} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{region.name}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            KES {region.disbursed.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            KES {region.collections.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${Number(collectionRate) >= 90 ? 'bg-green-500' :
                                                            Number(collectionRate) >= 80 ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${Math.min(Number(collectionRate), 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">{collectionRate}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${region.par <= 3 ? 'bg-green-100 text-green-700' :
                                                region.par <= 5 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {region.par.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${region.par <= 3 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {region.par <= 3 ? 'On Track' : 'Needs Attention'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                    <h4 className="text-sm font-medium text-purple-100 mb-4">Staff Overview</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-purple-100">Total Staff</span>
                            <span className="font-bold text-xl">{dashboardData?.staffStats.total || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-purple-100">Active</span>
                            <span className="font-semibold text-green-300">{dashboardData?.staffStats.active || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-purple-100">On Leave</span>
                            <span className="font-semibold text-amber-300">{dashboardData?.staffStats.onLeave || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-purple-100">Onboarding</span>
                            <span className="font-semibold text-blue-300">{dashboardData?.staffStats.onboarding || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
                    <h4 className="text-sm font-medium text-teal-100 mb-4">Leave Summary (MTD)</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-teal-100">Approved</span>
                            <span className="font-semibold text-green-300">{dashboardData?.leaveStats.approved || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-teal-100">Pending</span>
                            <span className="font-semibold text-amber-300">{dashboardData?.leaveStats.pending || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-teal-100">Rejected</span>
                            <span className="font-semibold text-red-300">{dashboardData?.leaveStats.rejected || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-teal-100">Total Days Used</span>
                            <span className="font-bold text-xl">{dashboardData?.leaveStats.totalDays || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                    <h4 className="text-sm font-medium text-amber-100 mb-4">Claims & Finance (MTD)</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-amber-100">Claims Submitted</span>
                            <span className="font-semibold">{dashboardData?.claimsStats.submitted || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-amber-100">Claims Approved</span>
                            <span className="font-semibold text-green-300">
                                KES {((dashboardData?.claimsStats.approvedAmount || 0) / 1000).toFixed(0)}K
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-amber-100">Pending Claims</span>
                            <span className="font-semibold text-amber-200">{dashboardData?.claimsStats.pendingCount || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-amber-100">New Staff Loans</span>
                            <span className="font-semibold text-blue-300">{dashboardData?.totalNewLoans || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Performing Branches */}
            {dashboardData?.topPerformingBranches && dashboardData.topPerformingBranches.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Target className="text-green-600" size={20} />
                        Top Performing Branches
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {dashboardData.topPerformingBranches.map((branch, index) => (
                            <div
                                key={branch.name}
                                className={`p-4 rounded-xl border-2 text-center ${index === 0
                                    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300'
                                    : index === 1
                                        ? 'bg-gradient-to-br from-slate-50 to-gray-100 border-slate-300'
                                        : index === 2
                                            ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300'
                                            : 'bg-slate-50 border-slate-200'
                                    }`}
                            >
                                <div className={`text-2xl font-bold mb-1 ${index === 0 ? 'text-amber-600' : index === 1 ? 'text-slate-600' : index === 2 ? 'text-orange-600' : 'text-slate-500'
                                    }`}>
                                    #{index + 1}
                                </div>
                                <p className="font-semibold text-slate-900 truncate">{branch.name}</p>
                                <p className="text-sm text-slate-500">KES {(branch.collections / 1000000).toFixed(2)}M</p>
                                <p className={`text-xs mt-1 ${branch.par <= 3 ? 'text-green-600' : 'text-amber-600'}`}>
                                    PAR: {branch.par.toFixed(2)}%
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
