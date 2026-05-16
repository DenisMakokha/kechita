import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { InputDialog } from '../components/ui/InputDialog';
import {
    BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Target, AlertTriangle,
    Download, FileSpreadsheet, FileText, RefreshCw, ChevronDown, Building2,
    Calendar, Briefcase, UserCheck, Clock, Wallet, CalendarDays, X,
    CheckCircle, XCircle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

type ReportTab = 'overview' | 'financial' | 'hr' | 'recruitment';

const COLORS = {
    primary: '#0066B3',
    secondary: '#3B82F6',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    teal: '#14B8A6',
    pink: '#EC4899',
};

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

interface BranchReport {
    id: string;
    report_date: string;
    status: string;
    disbursements: number;
    collections: number;
    new_clients: number;
    par_30: number;
    branch?: { name: string };
    submitted_by?: { full_name: string };
    approval_comment?: string;
    rejection_reason?: string;
}

const ReportsPage: React.FC = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [period, setPeriod] = useState('month');
    const [isExporting, setIsExporting] = useState(false);
    const [activeView, setActiveView] = useState<'dashboard' | 'my-reports' | 'pending'>('dashboard');
    const isAccountant = user?.roles.some((r) => r.code === 'ACCOUNTANT');
    const [reportTab, setReportTab] = useState<ReportTab>(isAccountant ? 'financial' : 'overview');
    const [rejectReportId, setRejectReportId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitFormData, setSubmitFormData] = useState({ report_date: new Date().toISOString().split('T')[0], disbursements: '', collections: '', new_clients: '', par_30: '', notes: '' });

    const isCEO = user?.roles.some((r) => r.code === 'CEO');
    const isHR = user?.roles.some((r) => r.code === 'HR_MANAGER');
    const isRM = user?.roles.some((r) => r.code === 'REGIONAL_MANAGER');
    const isBM = user?.roles.some((r) => r.code === 'BRANCH_MANAGER');
    const canViewDashboard = isCEO || isHR || isRM || isAccountant;
    const canSubmitReports = isBM;
    const canApproveReports = isRM || isCEO;

    const { data: dashboardData, isLoading, refetch } = useQuery<DashboardData>({
        queryKey: ['ceo-dashboard', period],
        queryFn: async () => {
            const response = await api.get('/reporting/dashboard/ceo');
            return response.data;
        },
        enabled: canViewDashboard,
        refetchInterval: 120000,
    });

    const { data: recruitmentStats } = useQuery<{ activeJobs: number; totalApplications: number; interviewsThisWeek: number; avgTimeToHire: number; pipeline: { stage: string; count: number }[] }>({
        queryKey: ['recruitment-stats'],
        queryFn: async () => {
            try {
                const response = await api.get('/recruitment/stats');
                return response.data;
            } catch {
                return { activeJobs: 0, totalApplications: 0, interviewsThisWeek: 0, avgTimeToHire: 0, pipeline: [] };
            }
        },
        enabled: canViewDashboard && reportTab === 'recruitment',
    });

    const { data: myReports } = useQuery<BranchReport[]>({
        queryKey: ['my-reports'],
        queryFn: async () => (await api.get('/reporting/my/reports')).data,
        enabled: canSubmitReports,
        refetchInterval: 60000,
    });

    const { data: pendingReports } = useQuery<BranchReport[]>({
        queryKey: ['pending-reports'],
        queryFn: async () => (await api.get('/reporting/pending')).data,
        enabled: canApproveReports,
        refetchInterval: 60000,
    });

    const { data: reportsPolicy } = useQuery<Record<string, any>>({
        queryKey: ['reports-settings'],
        queryFn: async () => (await api.get('/settings/category/reports')).data,
    });
    const reportDeadlineHour = Number(reportsPolicy?.reports_submission_deadline_hour ?? 17);
    const requireDailyReports = reportsPolicy?.reports_require_daily ?? true;
    const allowLateSubmission = reportsPolicy?.reports_allow_late_submission ?? false;

    const submitReportMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/reporting/daily', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-reports'] });
            setShowSubmitModal(false);
            setSubmitFormData({ report_date: new Date().toISOString().split('T')[0], disbursements: '', collections: '', new_clients: '', par_30: '', notes: '' });
            showToast('Report submitted successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to submit report', 'error'),
    });

    const approveReportMutation = useMutation({
        mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
            return (await api.post(`/reporting/${id}/approve`, { comment })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-reports'] });
            queryClient.invalidateQueries({ queryKey: ['ceo-dashboard'] });
            showToast('Report approved');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to approve report', 'error'),
    });

    const rejectReportMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            return (await api.post(`/reporting/${id}/reject`, { reason })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-reports'] });
            queryClient.invalidateQueries({ queryKey: ['ceo-dashboard'] });
            showToast('Report rejected');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to reject report', 'error'),
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

    if (!canViewDashboard && !canSubmitReports) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <AlertTriangle className="mx-auto mb-4 text-amber-500" size={48} />
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
                    <p className="text-slate-500">You don't have permission to view reports.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                        <span className="font-medium">{toast.text}</span>
                    </div>
                </div>
            )}

            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-[#0066B3] to-[#005299] rounded-2xl p-6 text-white shadow-lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <BarChart3 size={28} className="text-white" />
                            </div>
                            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
                        </div>
                        <p className="text-blue-100">Performance insights, KPIs, and business intelligence</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Quick Stats Summary */}
                        {dashboardData && (
                            <div className="hidden md:flex items-center gap-4 mr-4 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                                <div className="text-center">
                                    <p className="text-lg font-bold">{dashboardData.reportCount || 0}</p>
                                    <p className="text-xs text-blue-200">Reports</p>
                                </div>
                                <div className="w-px h-8 bg-white/20" />
                                <div className="text-center">
                                    <p className="text-lg font-bold">KES {((dashboardData.totalDisbursed || 0) / 1000000).toFixed(1)}M</p>
                                    <p className="text-xs text-blue-200">Disbursed</p>
                                </div>
                            </div>
                        )}
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm cursor-pointer"
                        >
                            <option value="week" className="text-slate-900">This Week</option>
                            <option value="month" className="text-slate-900">This Month</option>
                            <option value="quarter" className="text-slate-900">This Quarter</option>
                            <option value="year" className="text-slate-900">This Year</option>
                        </select>
                        <button
                            onClick={() => refetch()}
                            disabled={isLoading}
                            className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <div className="relative group">
                            <button
                                disabled={isExporting}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#0066B3] rounded-xl hover:bg-blue-50 transition-all shadow-lg disabled:opacity-50 font-medium"
                            >
                                <Download size={18} />
                                <span className="hidden sm:inline">Export</span>
                                <ChevronDown size={14} />
                            </button>
                            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
                                >
                                    <div className="p-1.5 bg-red-100 rounded-lg">
                                        <FileText size={16} className="text-red-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Export as PDF</p>
                                        <p className="text-xs text-slate-500">Detailed report</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleExport('excel')}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="p-1.5 bg-green-100 rounded-lg">
                                        <FileSpreadsheet size={16} className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Export as Excel</p>
                                        <p className="text-xs text-slate-500">Spreadsheet format</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Category Tabs */}
            <div className="flex flex-wrap gap-2">
                {[
                    { key: 'overview', label: 'Overview', icon: BarChart3, color: 'blue' },
                    { key: 'financial', label: 'Financial', icon: Wallet, color: 'green' },
                    ...(isAccountant ? [] : [
                        { key: 'hr', label: 'HR & Staff', icon: Users, color: 'purple' },
                        { key: 'recruitment', label: 'Recruitment', icon: Briefcase, color: 'amber' },
                    ]),
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = reportTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setReportTab(tab.key as ReportTab)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                isActive
                                    ? 'bg-[#0066B3] text-white shadow-lg shadow-blue-500/25'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-[#0066B3] hover:shadow-md'
                            }`}
                        >
                            <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                                <Icon size={16} />
                            </div>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Enhanced Policy Banner */}
            {reportsPolicy && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-blue-700">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <Clock size={14} className="text-blue-600" />
                            </div>
                            <span className="font-medium">Deadline: {reportDeadlineHour}:00</span>
                        </div>
                        <div className="w-px h-5 bg-blue-200" />
                        <div className={`flex items-center gap-2 ${requireDailyReports ? 'text-green-700' : 'text-amber-700'}`}>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${requireDailyReports ? 'bg-green-100' : 'bg-amber-100'}`}>
                                {requireDailyReports ? 'Required' : 'Optional'}
                            </span>
                            <span className="text-slate-600">Daily reports</span>
                        </div>
                        {!allowLateSubmission && (
                            <>
                                <div className="w-px h-5 bg-blue-200" />
                                <span className="text-red-600 font-medium text-xs">No late submissions</span>
                            </>
                        )}
                    </div>
                    {canSubmitReports && (
                        <button
                            onClick={() => setShowSubmitModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg hover:bg-[#005299] text-sm font-medium transition-colors"
                        >
                            <CalendarDays size={14} />
                            Submit Report
                        </button>
                    )}
                </div>
            )}

            {/* View Switcher for Branch Managers & Approvers */}
            {(canSubmitReports || canApproveReports) && (
                <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveView('dashboard')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'dashboard' ? 'bg-white text-[#0066B3] shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                        >
                            <div className="flex items-center gap-2">
                                <BarChart3 size={16} />
                                Analytics
                            </div>
                        </button>
                        {canSubmitReports && (
                            <button
                                onClick={() => setActiveView('my-reports')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'my-reports' ? 'bg-white text-[#0066B3] shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <FileText size={16} />
                                    My Reports
                                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">{myReports?.length || 0}</span>
                                </div>
                            </button>
                        )}
                        {canApproveReports && (
                            <button
                                onClick={() => setActiveView('pending')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'pending' ? 'bg-white text-[#0066B3] shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Clock size={16} />
                                    Pending
                                    {(pendingReports?.length || 0) > 0 && (
                                        <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-xs">{pendingReports?.length || 0}</span>
                                    )}
                                </div>
                            </button>
                        )}
                    </div>
                    {canSubmitReports && (
                        <button
                            onClick={() => setShowSubmitModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium shadow-md shadow-emerald-500/20 transition-all"
                        >
                            <CalendarDays size={18} />
                            Submit Daily Report
                        </button>
                    )}
                </div>
            )}

            {/* My Reports View */}
            {activeView === 'my-reports' && myReports && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">My Submitted Reports</h3>
                            <p className="text-sm text-slate-500 mt-1">Track your daily report submissions and their approval status</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                {myReports.length} Total
                            </span>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {myReports.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="text-slate-400" size={32} />
                                </div>
                                <h4 className="text-lg font-medium text-slate-900 mb-2">No reports submitted yet</h4>
                                <p className="text-slate-500 mb-4">Start by submitting your first daily report</p>
                                <button
                                    onClick={() => setShowSubmitModal(true)}
                                    className="px-4 py-2 bg-[#0066B3] text-white rounded-lg hover:bg-[#005299] font-medium"
                                >
                                    Submit Your First Report
                                </button>
                            </div>
                        ) : myReports.map((report) => (
                            <div key={report.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${
                                            report.status === 'approved' ? 'bg-green-100' :
                                            report.status === 'rejected' ? 'bg-red-100' :
                                            'bg-amber-100'
                                        }`}>
                                            <CalendarDays size={20} className={
                                                report.status === 'approved' ? 'text-green-600' :
                                                report.status === 'rejected' ? 'text-red-600' :
                                                'text-amber-600'
                                            } />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{new Date(report.report_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                            <p className="text-sm text-slate-500">{report.branch?.name} · by {report.submitted_by?.full_name || 'You'}</p>
                                            <div className="flex gap-4 text-sm text-slate-600 mt-2">
                                                <span className="flex items-center gap-1">
                                                    <TrendingUp size={14} className="text-green-500" />
                                                    KES {(report.disbursements || 0).toLocaleString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Wallet size={14} className="text-blue-500" />
                                                    KES {(report.collections || 0).toLocaleString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users size={14} className="text-purple-500" />
                                                    {(report.new_clients || 0)} new
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <AlertTriangle size={14} className={report.par_30 > 5 ? 'text-red-500' : 'text-green-500'} />
                                                    {(report.par_30 || 0).toFixed(2)}% PAR
                                                </span>
                                            </div>
                                            {report.approval_comment && (
                                                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                                                    <CheckCircle size={14} />
                                                    {report.approval_comment}
                                                </p>
                                            )}
                                            {report.rejection_reason && (
                                                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                                                    <XCircle size={14} />
                                                    {report.rejection_reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                            report.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            report.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            report.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {report.status === 'approved' && <span className="flex items-center gap-1"><CheckCircle size={12} /> Approved</span>}
                                            {report.status === 'rejected' && <span className="flex items-center gap-1"><XCircle size={12} /> Rejected</span>}
                                            {report.status === 'pending' && <span className="flex items-center gap-1"><Clock size={12} /> Pending</span>}
                                            {!['approved', 'rejected', 'pending'].includes(report.status) && report.status}
                                        </span>
                                        {canApproveReports && report.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => approveReportMutation.mutate({ id: report.id })}
                                                    disabled={approveReportMutation.isPending}
                                                    className="px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-medium"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => setRejectReportId(report.id)}
                                                    className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 font-medium"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Executive Summary - Overview Tab */}
            {activeView === 'dashboard' && reportTab === 'overview' && (
            <>
            <div className="bg-gradient-to-r from-[#0F172A] via-[#1E3A5F] to-[#0F172A] rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0yaDF2NGgtMXYtNHptMi0yaDF2MWgtMXYtMXptLTIgMGgxdjFoLTF2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <BarChart3 size={24} />
                        Executive Summary
                        {dashboardData && (
                            <span className="ml-2 text-sm font-normal text-blue-200">
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
                                <p className="text-blue-200 text-sm mt-1">Total Disbursed (MTD)</p>
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
                                <p className="text-blue-200 text-sm mt-1">Total Recoveries (MTD)</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <Users className="text-blue-400" size={24} />
                                    </div>
                                    <span className="text-green-400 text-sm flex items-center font-medium">
                                        <TrendingUp size={14} className="mr-1" /> +15
                                    </span>
                                </div>
                                <p className="text-3xl font-bold">{dashboardData?.totalNewLoans || 0}</p>
                                <p className="text-blue-200 text-sm mt-1">New Loans (MTD)</p>
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
                                <p className="text-blue-200 text-sm mt-1">Portfolio at Risk</p>
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
                        <TrendingUp className="text-[#0066B3]" size={20} />
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
                        <Users className="text-[#0066B3]" size={20} />
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
                                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
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
                <div className="bg-[#0066B3] rounded-xl shadow-lg p-6 text-white">
                    <h4 className="text-sm font-medium text-blue-100 mb-4">Staff Overview</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-blue-100">Total Staff</span>
                            <span className="font-bold text-xl">{dashboardData?.staffStats.total || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-blue-100">Active</span>
                            <span className="font-semibold text-green-300">{dashboardData?.staffStats.active || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-blue-100">On Leave</span>
                            <span className="font-semibold text-amber-300">{dashboardData?.staffStats.onLeave || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-blue-100">Onboarding</span>
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
            </>
            )}

            {/* Financial Reports Tab */}
            {activeView === 'dashboard' && reportTab === 'financial' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-green-100 rounded-lg"><DollarSign className="text-green-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">KES {((dashboardData?.totalDisbursed || 0) / 1000000).toFixed(1)}M</p>
                            <p className="text-xs text-slate-500 mt-1">Total Disbursed</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-blue-100 rounded-lg"><Wallet className="text-blue-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">KES {((dashboardData?.totalRecoveries || 0) / 1000000).toFixed(1)}M</p>
                            <p className="text-xs text-slate-500 mt-1">Total Recoveries</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-amber-100 rounded-lg"><AlertTriangle className="text-amber-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{(dashboardData?.avgPAR || 0).toFixed(2)}%</p>
                            <p className="text-xs text-slate-500 mt-1">Portfolio at Risk</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-purple-100 rounded-lg"><TrendingUp className="text-purple-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{dashboardData?.totalNewLoans || 0}</p>
                            <p className="text-xs text-slate-500 mt-1">New Loans</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Claims & Expenses Summary</h3>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="text-sm text-slate-600 mb-1">Claims Submitted</p>
                                <p className="text-2xl font-bold text-slate-900">{dashboardData?.claimsStats.submitted || 0}</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-slate-600 mb-1">Approved Amount</p>
                                <p className="text-2xl font-bold text-green-600">KES {((dashboardData?.claimsStats.approvedAmount || 0) / 1000).toFixed(0)}K</p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-lg">
                                <p className="text-sm text-slate-600 mb-1">Pending Claims</p>
                                <p className="text-2xl font-bold text-amber-600">{dashboardData?.claimsStats.pendingCount || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Financial Trends</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => `${v}M`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Area type="monotone" dataKey="disbursed" name="Disbursed (KES M)" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.2} />
                                    <Area type="monotone" dataKey="collections" name="Collections (KES M)" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* HR Reports Tab */}
            {activeView === 'dashboard' && reportTab === 'hr' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-blue-100 rounded-lg"><Users className="text-blue-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{dashboardData?.staffStats.total || 0}</p>
                            <p className="text-xs text-slate-500 mt-1">Total Staff</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-green-100 rounded-lg"><UserCheck className="text-green-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{dashboardData?.staffStats.active || 0}</p>
                            <p className="text-xs text-slate-500 mt-1">Active Staff</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-amber-100 rounded-lg"><CalendarDays className="text-amber-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{dashboardData?.staffStats.onLeave || 0}</p>
                            <p className="text-xs text-slate-500 mt-1">On Leave</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-purple-100 rounded-lg"><Clock className="text-purple-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{dashboardData?.staffStats.onboarding || 0}</p>
                            <p className="text-xs text-slate-500 mt-1">Onboarding</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Staff Distribution</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={staffPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {staffPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Leave Summary</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                    <span className="text-slate-700">Approved Leaves</span>
                                    <span className="text-xl font-bold text-green-600">{dashboardData?.leaveStats.approved || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                                    <span className="text-slate-700">Pending Requests</span>
                                    <span className="text-xl font-bold text-amber-600">{dashboardData?.leaveStats.pending || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                                    <span className="text-slate-700">Rejected</span>
                                    <span className="text-xl font-bold text-red-600">{dashboardData?.leaveStats.rejected || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                    <span className="text-slate-700">Total Days Used</span>
                                    <span className="text-xl font-bold text-blue-600">{dashboardData?.leaveStats.totalDays || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recruitment Reports Tab */}
            {activeView === 'dashboard' && reportTab === 'recruitment' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-blue-100 rounded-lg"><Briefcase className="text-blue-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{recruitmentStats?.activeJobs || 0}</p>
                            <p className="text-xs text-slate-500 mt-1">Active Job Posts</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-green-100 rounded-lg"><Users className="text-green-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{recruitmentStats?.totalApplications || 0}</p>
                            <p className="text-xs text-slate-500 mt-1">Total Applications</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-purple-100 rounded-lg"><Calendar className="text-purple-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{recruitmentStats?.interviewsThisWeek || 0}</p>
                            <p className="text-xs text-slate-500 mt-1">Interviews This Week</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-amber-100 rounded-lg"><Clock className="text-amber-600" size={20} /></div>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{recruitmentStats?.avgTimeToHire || 0}d</p>
                            <p className="text-xs text-slate-500 mt-1">Avg. Time to Hire</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recruitment Pipeline</h3>
                        <div className="grid grid-cols-6 gap-4">
                            {(recruitmentStats?.pipeline?.length ? recruitmentStats.pipeline : [
                                { stage: 'Applied', count: 0 }, { stage: 'Screening', count: 0 }, { stage: 'Interview', count: 0 },
                                { stage: 'Assessment', count: 0 }, { stage: 'Offer', count: 0 }, { stage: 'Hired', count: 0 },
                            ]).map((item) => (
                                <div key={item.stage} className="text-center p-4 bg-slate-50 rounded-lg">
                                    <p className="text-2xl font-bold text-slate-900">{item.count}</p>
                                    <p className="text-xs text-slate-500">{item.stage}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Source of Hire</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Job Boards', count: 45 },
                                    { name: 'LinkedIn', count: 32 },
                                    { name: 'Referrals', count: 28 },
                                    { name: 'Website', count: 18 },
                                    { name: 'Agencies', count: 12 },
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Candidates" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
            {/* Pending Reports View for RM/CEO */}
            {activeView === 'pending' && canApproveReports && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Clock className="text-amber-600" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Pending Reports for Approval</h3>
                                <p className="text-sm text-slate-500">Review and approve branch manager reports</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                            {pendingReports?.length || 0} pending
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {!pendingReports || pendingReports.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="text-green-600" size={32} />
                                </div>
                                <h4 className="text-lg font-medium text-slate-900 mb-2">All caught up!</h4>
                                <p className="text-slate-500">No pending reports to approve at this time</p>
                            </div>
                        ) : pendingReports.map((report) => (
                            <div key={report.id} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                                            <Building2 className="text-amber-600" size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="font-semibold text-slate-900">{new Date(report.report_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                                    Pending
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 mb-3">{report.branch?.name} · Submitted by {report.submitted_by?.full_name}</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                                                    <TrendingUp size={16} className="text-green-600" />
                                                    <div>
                                                        <p className="text-xs text-slate-500">Disbursed</p>
                                                        <p className="text-sm font-semibold text-slate-900">KES {(report.disbursements || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                                                    <Wallet size={16} className="text-blue-600" />
                                                    <div>
                                                        <p className="text-xs text-slate-500">Collections</p>
                                                        <p className="text-sm font-semibold text-slate-900">KES {(report.collections || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                                                    <Users size={16} className="text-purple-600" />
                                                    <div>
                                                        <p className="text-xs text-slate-500">New Clients</p>
                                                        <p className="text-sm font-semibold text-slate-900">{report.new_clients || 0}</p>
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-2 p-2 rounded-lg ${(report.par_30 || 0) > 5 ? 'bg-red-50' : 'bg-green-50'}`}>
                                                    <AlertTriangle size={16} className={(report.par_30 || 0) > 5 ? 'text-red-600' : 'text-green-600'} />
                                                    <div>
                                                        <p className="text-xs text-slate-500">PAR 30</p>
                                                        <p className={`text-sm font-semibold ${(report.par_30 || 0) > 5 ? 'text-red-700' : 'text-green-700'}`}>
                                                            {(report.par_30 || 0).toFixed(2)}%
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            onClick={() => approveReportMutation.mutate({ id: report.id })}
                                            disabled={approveReportMutation.isPending}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-medium transition-colors"
                                        >
                                            <CheckCircle size={16} />
                                            {approveReportMutation.isPending ? 'Approving...' : 'Approve'}
                                        </button>
                                        <button
                                            onClick={() => setRejectReportId(report.id)}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 font-medium transition-colors"
                                        >
                                            <XCircle size={16} />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Submit Daily Report Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">Submit Daily Report</h2>
                            <button onClick={() => setShowSubmitModal(false)} className="p-2 hover:bg-white rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {reportsPolicy && (
                                <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs">
                                    📋 Submit by <strong>{reportDeadlineHour}:00</strong>{!allowLateSubmission ? ' — late submissions are not accepted' : ''}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Report Date</label>
                                <input type="date" value={submitFormData.report_date} onChange={e => setSubmitFormData({ ...submitFormData, report_date: e.target.value })} max={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Disbursements (KES)</label>
                                    <input type="number" min="0" value={submitFormData.disbursements} onChange={e => setSubmitFormData({ ...submitFormData, disbursements: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Collections (KES)</label>
                                    <input type="number" min="0" value={submitFormData.collections} onChange={e => setSubmitFormData({ ...submitFormData, collections: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Clients</label>
                                    <input type="number" min="0" value={submitFormData.new_clients} onChange={e => setSubmitFormData({ ...submitFormData, new_clients: e.target.value })} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">PAR 30 (%)</label>
                                    <input type="number" min="0" max="100" step="0.01" value={submitFormData.par_30} onChange={e => setSubmitFormData({ ...submitFormData, par_30: e.target.value })} placeholder="0.00" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Comments</label>
                                <textarea value={submitFormData.notes} onChange={e => setSubmitFormData({ ...submitFormData, notes: e.target.value })} rows={3} placeholder="Any notable events, challenges, or highlights..." className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:outline-none resize-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button
                                onClick={() => submitReportMutation.mutate({ report_date: submitFormData.report_date, loans_disbursed_amount: parseFloat(submitFormData.disbursements) || 0, recoveries_amount: parseFloat(submitFormData.collections) || 0, loans_new_count: parseInt(submitFormData.new_clients) || 0, par_ratio: parseFloat(submitFormData.par_30) || 0, manager_comment: submitFormData.notes })}
                                disabled={submitReportMutation.isPending || !submitFormData.report_date}
                                className="px-6 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50"
                            >
                                {submitReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Report Dialog */}
            <InputDialog
                isOpen={!!rejectReportId}
                title="Reject Report"
                message="Please provide a reason for rejecting this report."
                inputLabel="Reason"
                inputType="textarea"
                placeholder="Enter reason..."
                confirmLabel="Reject"
                onConfirm={(reason) => { if (rejectReportId && reason) rejectReportMutation.mutate({ id: rejectReportId, reason }); setRejectReportId(null); }}
                onCancel={() => setRejectReportId(null)}
                isLoading={rejectReportMutation.isPending}
            />
        </div>
    );
};

export { ReportsPage };
export default ReportsPage;
