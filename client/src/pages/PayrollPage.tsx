import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { InputDialog } from '../components/ui/InputDialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Calendar, Plus, Calculator, CheckCircle, DollarSign, Lock, FileText,
    Download, Eye, X, Loader2, AlertTriangle, RefreshCw,
    TrendingUp, FileSpreadsheet, Banknote, Receipt, Ban, Edit,
} from 'lucide-react';

type Tab = 'periods' | 'runs' | 'rates';

interface Period {
    id: string;
    year: number;
    month: number;
    start_date: string;
    end_date: string;
    pay_date: string;
    status: 'open' | 'locked' | 'closed';
    notes?: string;
}

interface Run {
    id: string;
    period_id: string;
    period?: Period;
    name: string;
    run_type: string;
    status: 'draft' | 'calculated' | 'approved' | 'paid' | 'cancelled';
    employee_count: number;
    total_gross: number;
    total_paye: number;
    total_nssf: number;
    total_shif: number;
    total_housing_levy: number;
    total_nita: number;
    total_loan_deductions: number;
    total_other_deductions: number;
    total_net: number;
    notes?: string;
    calculated_at?: string;
    approved_at?: string;
    paid_at?: string;
    created_at: string;
}

interface Payslip {
    id: string;
    payslip_number: string;
    full_name_snapshot: string;
    employee_number_snapshot: string;
    position_snapshot?: string;
    branch_snapshot?: string;
    basic_salary: number;
    total_allowances: number;
    gross_pay: number;
    paye: number;
    nssf_employee: number;
    shif: number;
    housing_levy_employee: number;
    loan_deductions: number;
    total_deductions: number;
    net_pay: number;
    status: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PayrollPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<Tab>('runs');
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Modals
    const [showCreatePeriod, setShowCreatePeriod] = useState(false);
    const [periodForm, setPeriodForm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, pay_date: '', notes: '' });
    const [showCreateRun, setShowCreateRun] = useState(false);
    const [runForm, setRunForm] = useState({ period_id: '', name: '', run_type: 'regular', notes: '' });
    const [cancelRunId, setCancelRunId] = useState<string | null>(null);
    const [approveRunId, setApproveRunId] = useState<string | null>(null);
    const [markPaidRunId, setMarkPaidRunId] = useState<string | null>(null);
    const [calcRunId, setCalcRunId] = useState<string | null>(null);
    const [viewRunId, setViewRunId] = useState<string | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [editPeriod, setEditPeriod] = useState<Period | null>(null);
    const [editPeriodForm, setEditPeriodForm] = useState({ pay_date: '', notes: '' });

    // Queries
    const { data: periods = [] } = useQuery<Period[]>({
        queryKey: ['payroll-periods'],
        queryFn: async () => (await api.get('/payroll/periods')).data,
    });

    const { data: runs = [] } = useQuery<Run[]>({
        queryKey: ['payroll-runs'],
        queryFn: async () => (await api.get('/payroll/runs')).data,
    });

    const { data: rates } = useQuery<any>({
        queryKey: ['payroll-rates'],
        queryFn: async () => (await api.get('/payroll/statutory/rates')).data,
        enabled: tab === 'rates',
    });

    const { data: payslips = [], isLoading: payslipsLoading } = useQuery<Payslip[]>({
        queryKey: ['payslips', viewRunId],
        queryFn: async () => (await api.get(`/payroll/runs/${viewRunId}/payslips`)).data,
        enabled: !!viewRunId,
    });

    const { data: viewRun } = useQuery<Run>({
        queryKey: ['run-detail', viewRunId],
        queryFn: async () => (await api.get(`/payroll/runs/${viewRunId}`)).data,
        enabled: !!viewRunId,
    });

    // Mutations
    const createPeriodMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/payroll/periods', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
            setShowCreatePeriod(false);
            setPeriodForm({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, pay_date: '', notes: '' });
            showToast('Period created');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create period', 'error'),
    });

    const lockPeriodMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/payroll/periods/${id}/lock`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-periods'] }); showToast('Period locked'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to lock', 'error'),
    });

    const closePeriodMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/payroll/periods/${id}/close`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-periods'] }); showToast('Period closed'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to close', 'error'),
    });

    const updatePeriodMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: { pay_date?: string; notes?: string } }) =>
            (await api.patch(`/payroll/periods/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
            setEditPeriod(null);
            showToast('Period updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update period', 'error'),
    });

    const createRunMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/payroll/runs', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
            setShowCreateRun(false);
            setRunForm({ period_id: '', name: '', run_type: 'regular', notes: '' });
            showToast('Run created');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create run', 'error'),
    });

    const calculateRunMutation = useMutation({
        mutationFn: async (id: string) => (await api.post(`/payroll/runs/${id}/calculate`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
            setCalcRunId(null);
            showToast('Run calculated successfully');
        },
        onError: (e: any) => { setCalcRunId(null); showToast(e?.response?.data?.message || 'Calculation failed', 'error'); },
    });

    const approveRunMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/payroll/runs/${id}/approve`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-runs'] }); setApproveRunId(null); showToast('Run approved'); },
        onError: (e: any) => { setApproveRunId(null); showToast(e?.response?.data?.message || 'Approval failed', 'error'); },
    });

    const markPaidMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/payroll/runs/${id}/mark-paid`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-runs'] }); setMarkPaidRunId(null); showToast('Run marked paid'); },
        onError: (e: any) => { setMarkPaidRunId(null); showToast(e?.response?.data?.message || 'Failed', 'error'); },
    });

    const cancelRunMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
            (await api.patch(`/payroll/runs/${id}/cancel`, { reason })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-runs'] }); setCancelRunId(null); showToast('Run cancelled'); },
        onError: (e: any) => { setCancelRunId(null); showToast(e?.response?.data?.message || 'Cancel failed', 'error'); },
    });

    // Helpers
    const fmtKES = (n: number | string) =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 })
            .format(Number(n || 0));

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            draft: 'bg-slate-100 text-slate-600',
            open: 'bg-blue-100 text-blue-700',
            calculated: 'bg-amber-100 text-amber-700',
            approved: 'bg-purple-100 text-purple-700',
            paid: 'bg-emerald-100 text-emerald-700',
            locked: 'bg-orange-100 text-orange-700',
            closed: 'bg-slate-100 text-slate-500',
            cancelled: 'bg-red-100 text-red-700',
        };
        return map[status] || 'bg-slate-100 text-slate-600';
    };

    const downloadExport = async (runId: string, kind: 'paye' | 'nssf' | 'shif' | 'housing-levy' | 'nita' | 'bank') => {
        try {
            const response = await api.get(`/payroll/runs/${runId}/export/${kind}`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${kind.toUpperCase()}-${runId.slice(0, 8)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`${kind.toUpperCase()} export downloaded`);
        } catch (e: any) {
            showToast(e?.response?.data?.message || `Failed to export ${kind}`, 'error');
        }
    };

    const downloadPayslipPdf = async (payslipId: string) => {
        try {
            const response = await api.get(`/payroll/payslips/${payslipId}/pdf`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `payslip-${payslipId.slice(0, 8)}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Failed to download payslip', 'error');
        }
    };

    const previewPayslipPdf = async (payslipId: string) => {
        try {
            const response = await api.get(`/payroll/payslips/${payslipId}/pdf`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            setPdfPreviewUrl(url);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Failed to preview payslip', 'error');
        }
    };

    // Stats
    const totalNetThisYear = runs
        .filter(r => r.status === 'paid' && r.period?.year === new Date().getFullYear())
        .reduce((sum, r) => sum + Number(r.total_net), 0);
    const totalPayeThisYear = runs
        .filter(r => r.status === 'paid' && r.period?.year === new Date().getFullYear())
        .reduce((sum, r) => sum + Number(r.total_paye), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Banknote className="text-[#0066B3]" size={32} />Payroll
                </h1>
                <p className="text-slate-500 mt-1">Kenya-compliant payroll: PAYE, NSSF, SHIF, Affordable Housing Levy, NITA</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#0066B3] to-[#00AEEF] text-white rounded-xl p-5 shadow-sm">
                    <p className="text-xs uppercase opacity-80 font-semibold mb-1">Net Paid YTD</p>
                    <p className="text-2xl font-bold">{fmtKES(totalNetThisYear)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="text-xs uppercase text-slate-400 font-semibold mb-1">PAYE Remitted YTD</p>
                    <p className="text-2xl font-bold text-slate-900">{fmtKES(totalPayeThisYear)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Open Periods</p>
                    <p className="text-2xl font-bold text-slate-900">{periods.filter(p => p.status === 'open').length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Active Runs</p>
                    <p className="text-2xl font-bold text-slate-900">{runs.filter(r => ['draft', 'calculated', 'approved'].includes(r.status)).length}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl">
                {([
                    { id: 'runs' as Tab, label: 'Payroll Runs', icon: Calculator },
                    { id: 'periods' as Tab, label: 'Periods', icon: Calendar },
                    { id: 'rates' as Tab, label: 'Statutory Rates', icon: TrendingUp },
                ]).map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                                tab === t.id ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon size={16} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* RUNS TAB */}
            {tab === 'runs' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">{runs.length} payroll run{runs.length === 1 ? '' : 's'}</p>
                        <button
                            onClick={() => { setRunForm({ ...runForm, period_id: periods.find(p => p.status === 'open')?.id || '' }); setShowCreateRun(true); }}
                            disabled={!periods.some(p => p.status === 'open')}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-40"
                            title={!periods.some(p => p.status === 'open') ? 'Create an open period first' : 'New payroll run'}
                        >
                            <Plus size={16} />New Run
                        </button>
                    </div>

                    {runs.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <Banknote className="mx-auto text-slate-300 mb-3" size={48} />
                            <p className="text-slate-500 font-medium">No payroll runs yet</p>
                            <p className="text-sm text-slate-400">Create a period first, then start a payroll run.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                                        <th className="px-5 py-3">Run</th>
                                        <th className="px-5 py-3">Period</th>
                                        <th className="px-5 py-3 text-center">Employees</th>
                                        <th className="px-5 py-3 text-right">Gross</th>
                                        <th className="px-5 py-3 text-right">Net</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {runs.map(run => (
                                        <tr key={run.id} className="hover:bg-slate-50">
                                            <td className="px-5 py-3">
                                                <p className="font-semibold text-slate-900 text-sm">{run.name}</p>
                                                <p className="text-xs text-slate-400 capitalize">{run.run_type}</p>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-700">
                                                {run.period ? `${MONTH_NAMES[run.period.month - 1]} ${run.period.year}` : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-center text-sm font-medium text-slate-700">{run.employee_count}</td>
                                            <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtKES(run.total_gross)}</td>
                                            <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtKES(run.total_net)}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusBadge(run.status)}`}>
                                                    {run.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setViewRunId(run.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-[#0066B3]" title="View payslips">
                                                        <Eye size={15} />
                                                    </button>
                                                    {run.status === 'draft' && (
                                                        <button onClick={() => setCalcRunId(run.id)} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1">
                                                            <Calculator size={12} />Calculate
                                                        </button>
                                                    )}
                                                    {run.status === 'calculated' && (
                                                        <>
                                                            <button onClick={() => setCalcRunId(run.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600" title="Recalculate">
                                                                <RefreshCw size={15} />
                                                            </button>
                                                            <button onClick={() => setApproveRunId(run.id)} className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1">
                                                                <CheckCircle size={12} />Approve
                                                            </button>
                                                        </>
                                                    )}
                                                    {run.status === 'approved' && (
                                                        <button onClick={() => setMarkPaidRunId(run.id)} className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 flex items-center gap-1">
                                                            <DollarSign size={12} />Mark Paid
                                                        </button>
                                                    )}
                                                    {run.status !== 'paid' && run.status !== 'cancelled' && (
                                                        <button onClick={() => setCancelRunId(run.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600" title="Cancel">
                                                            <Ban size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* PERIODS TAB */}
            {tab === 'periods' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">{periods.length} period{periods.length === 1 ? '' : 's'}</p>
                        <button
                            onClick={() => setShowCreatePeriod(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"
                        >
                            <Plus size={16} />New Period
                        </button>
                    </div>

                    {periods.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <Calendar className="mx-auto text-slate-300 mb-3" size={48} />
                            <p className="text-slate-500 font-medium">No periods created yet</p>
                            <p className="text-sm text-slate-400">A payroll period is typically one calendar month.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                                        <th className="px-5 py-3">Period</th>
                                        <th className="px-5 py-3">Date Range</th>
                                        <th className="px-5 py-3">Pay Date</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {periods.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="px-5 py-3 font-semibold text-slate-900">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                                            <td className="px-5 py-3 text-sm text-slate-600">{p.start_date} → {p.end_date}</td>
                                            <td className="px-5 py-3 text-sm text-slate-600">{p.pay_date}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusBadge(p.status)}`}>{p.status}</span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {p.status !== 'closed' && (
                                                        <button
                                                            onClick={() => { setEditPeriod(p); setEditPeriodForm({ pay_date: p.pay_date || '', notes: p.notes || '' }); }}
                                                            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-[#0066B3]"
                                                            title="Edit period"
                                                        >
                                                            <Edit size={15} />
                                                        </button>
                                                    )}
                                                    {p.status === 'open' && (
                                                        <button onClick={() => lockPeriodMutation.mutate(p.id)} className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded hover:bg-orange-200 flex items-center gap-1">
                                                            <Lock size={12} />Lock
                                                        </button>
                                                    )}
                                                    {p.status === 'locked' && (
                                                        <button onClick={() => closePeriodMutation.mutate(p.id)} className="px-2 py-1 text-xs font-medium bg-slate-200 text-slate-700 rounded hover:bg-slate-300 flex items-center gap-1">
                                                            <CheckCircle size={12} />Close
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* RATES TAB */}
            {tab === 'rates' && rates && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* PAYE Bands */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Receipt size={18} className="text-[#0066B3]" />PAYE Bands</h3>
                        <table className="w-full text-sm">
                            <thead className="text-slate-400 text-xs">
                                <tr><th className="text-left pb-2">Band Upper Bound (KES)</th><th className="text-right pb-2">Rate</th></tr>
                            </thead>
                            <tbody>
                                {rates.paye.bands.map((b: any, i: number) => (
                                    <tr key={i} className="border-t border-slate-100">
                                        <td className="py-2">{b.upTo === null || !isFinite(b.upTo) ? 'Above' : fmtKES(b.upTo)}</td>
                                        <td className="py-2 text-right font-semibold text-slate-700">{(b.rate * 100).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-sm">
                            <p className="flex justify-between"><span className="text-slate-500">Personal Relief</span><span className="font-medium">{fmtKES(rates.paye.personalRelief)}/mo</span></p>
                            <p className="flex justify-between"><span className="text-slate-500">Insurance Relief Cap</span><span className="font-medium">{fmtKES(rates.paye.insuranceReliefCap)}/mo</span></p>
                            <p className="flex justify-between"><span className="text-slate-500">Pension Relief Cap</span><span className="font-medium">{fmtKES(rates.paye.pensionReliefCapMonthly)}/mo</span></p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><FileSpreadsheet size={18} className="text-[#0066B3]" />Statutory Contributions</h3>
                        <div className="space-y-3 text-sm">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="font-semibold text-slate-700 mb-1">NSSF Act 2013</p>
                                <p className="text-slate-500">Tier 1 ceiling: {fmtKES(rates.nssf.tier1Ceiling)} · Upper limit: {fmtKES(rates.nssf.upperEarningsLimit)}</p>
                                <p className="text-slate-500">Employee: {(rates.nssf.employeeRate * 100).toFixed(1)}% · Employer: {(rates.nssf.employerRate * 100).toFixed(1)}%</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="font-semibold text-slate-700 mb-1">SHIF (Social Health Insurance Fund)</p>
                                <p className="text-slate-500">{(rates.shif.rate * 100).toFixed(2)}% of gross · Minimum {fmtKES(rates.shif.minimum)}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="font-semibold text-slate-700 mb-1">Affordable Housing Levy</p>
                                <p className="text-slate-500">Employee: {(rates.housingLevy.employeeRate * 100).toFixed(1)}% · Employer: {(rates.housingLevy.employerRate * 100).toFixed(1)}%</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="font-semibold text-slate-700 mb-1">NITA Industrial Levy</p>
                                <p className="text-slate-500">{fmtKES(rates.nita.amount)}/employee/month (employer-funded)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Edit Period Modal ─── */}
            {editPeriod && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">
                                Edit Period — {MONTH_NAMES[editPeriod.month - 1]} {editPeriod.year}
                            </h2>
                            <button onClick={() => setEditPeriod(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pay Date</label>
                                <input
                                    type="date"
                                    value={editPeriodForm.pay_date}
                                    onChange={(e) => setEditPeriodForm({ ...editPeriodForm, pay_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea
                                    value={editPeriodForm.notes}
                                    onChange={(e) => setEditPeriodForm({ ...editPeriodForm, notes: e.target.value })}
                                    rows={3}
                                    placeholder="Optional notes..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setEditPeriod(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button
                                onClick={() => updatePeriodMutation.mutate({ id: editPeriod.id, data: editPeriodForm })}
                                disabled={updatePeriodMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50"
                            >
                                {updatePeriodMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Create Period Modal ─── */}
            {showCreatePeriod && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">New Payroll Period</h2>
                            <button onClick={() => setShowCreatePeriod(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                                    <input type="number" value={periodForm.year} onChange={(e) => setPeriodForm({ ...periodForm, year: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                                    <select value={periodForm.month} onChange={(e) => setPeriodForm({ ...periodForm, month: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]">
                                        {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pay Date (optional)</label>
                                <input type="date" value={periodForm.pay_date} onChange={(e) => setPeriodForm({ ...periodForm, pay_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea value={periodForm.notes} onChange={(e) => setPeriodForm({ ...periodForm, notes: e.target.value })}
                                    rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowCreatePeriod(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => createPeriodMutation.mutate(periodForm)} disabled={createPeriodMutation.isPending}
                                className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] flex items-center gap-2 disabled:opacity-50">
                                {createPeriodMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Create Run Modal ─── */}
            {showCreateRun && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">New Payroll Run</h2>
                            <button onClick={() => setShowCreateRun(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                                <select value={runForm.period_id} onChange={(e) => setRunForm({ ...runForm, period_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]">
                                    <option value="">— Select open period —</option>
                                    {periods.filter(p => p.status === 'open').map(p => (
                                        <option key={p.id} value={p.id}>{MONTH_NAMES[p.month - 1]} {p.year}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input type="text" value={runForm.name} onChange={(e) => setRunForm({ ...runForm, name: e.target.value })}
                                    placeholder="e.g., March 2026 Monthly Payroll" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Run Type</label>
                                <select value={runForm.run_type} onChange={(e) => setRunForm({ ...runForm, run_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]">
                                    <option value="regular">Regular Monthly</option>
                                    <option value="bonus">Bonus</option>
                                    <option value="arrears">Arrears</option>
                                    <option value="off_cycle">Off-cycle</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowCreateRun(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => createRunMutation.mutate(runForm)}
                                disabled={!runForm.period_id || !runForm.name || createRunMutation.isPending}
                                className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] flex items-center gap-2 disabled:opacity-50">
                                {createRunMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Run Detail Drawer ─── */}
            {viewRunId && (
                <div className="fixed inset-0 bg-black/60 flex items-stretch justify-end z-50">
                    <div className="bg-white w-full max-w-3xl flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0066B3] to-[#00AEEF] text-white">
                            <div>
                                <h2 className="font-bold text-lg">{viewRun?.name || 'Payroll Run'}</h2>
                                <p className="text-sm opacity-80">
                                    {viewRun?.period && `${MONTH_NAMES[viewRun.period.month - 1]} ${viewRun.period.year}`} ·
                                    {viewRun && ` ${viewRun.employee_count} employees · Net ${fmtKES(viewRun.total_net)}`}
                                </p>
                            </div>
                            <button onClick={() => setViewRunId(null)} className="p-2 hover:bg-white/20 rounded-lg"><X size={20} /></button>
                        </div>

                        {/* Run summary + exports */}
                        {viewRun && (
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 space-y-3">
                                <div className="grid grid-cols-4 gap-3 text-sm">
                                    <div><p className="text-xs text-slate-400">PAYE</p><p className="font-semibold">{fmtKES(viewRun.total_paye)}</p></div>
                                    <div><p className="text-xs text-slate-400">NSSF</p><p className="font-semibold">{fmtKES(viewRun.total_nssf)}</p></div>
                                    <div><p className="text-xs text-slate-400">SHIF</p><p className="font-semibold">{fmtKES(viewRun.total_shif)}</p></div>
                                    <div><p className="text-xs text-slate-400">Housing Levy</p><p className="font-semibold">{fmtKES(viewRun.total_housing_levy)}</p></div>
                                </div>
                                {viewRun.status !== 'draft' && (
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                                        <p className="text-xs font-semibold text-slate-500 uppercase mr-1 self-center">Statutory Exports:</p>
                                        <button onClick={() => downloadExport(viewRun.id, 'paye')} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"><Download size={11} />PAYE iTax</button>
                                        <button onClick={() => downloadExport(viewRun.id, 'nssf')} className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1"><Download size={11} />NSSF</button>
                                        <button onClick={() => downloadExport(viewRun.id, 'shif')} className="px-2 py-1 text-xs bg-pink-100 text-pink-700 rounded hover:bg-pink-200 flex items-center gap-1"><Download size={11} />SHIF</button>
                                        <button onClick={() => downloadExport(viewRun.id, 'housing-levy')} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 flex items-center gap-1"><Download size={11} />Housing Levy</button>
                                        <button onClick={() => downloadExport(viewRun.id, 'nita')} className="px-2 py-1 text-xs bg-teal-100 text-teal-700 rounded hover:bg-teal-200 flex items-center gap-1"><Download size={11} />NITA</button>
                                        <button onClick={() => downloadExport(viewRun.id, 'bank')} className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 flex items-center gap-1"><Download size={11} />Bank File</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Payslip list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {payslipsLoading ? (
                                <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#0066B3]" size={28} /></div>
                            ) : payslips.length === 0 ? (
                                <div className="text-center py-16">
                                    <FileText className="mx-auto text-slate-300 mb-2" size={40} />
                                    <p className="text-slate-500 text-sm">No payslips yet. Calculate the run to generate them.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                                        <tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">Deductions</th><th className="px-3 py-2 text-right">Net</th><th className="px-3 py-2"></th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payslips.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50">
                                                <td className="px-3 py-2">
                                                    <p className="font-medium text-slate-900">{p.full_name_snapshot}</p>
                                                    <p className="text-xs text-slate-400">{p.employee_number_snapshot} · {p.position_snapshot || '—'}</p>
                                                </td>
                                                <td className="px-3 py-2 text-right">{fmtKES(p.gross_pay)}</td>
                                                <td className="px-3 py-2 text-right text-red-600">{fmtKES(p.total_deductions)}</td>
                                                <td className="px-3 py-2 text-right font-semibold">{fmtKES(p.net_pay)}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <button onClick={() => previewPayslipPdf(p.id)} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-[#0066B3]" title="Preview PDF" aria-label="Preview payslip PDF"><Eye size={14} /></button>
                                                        <button onClick={() => downloadPayslipPdf(p.id)} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-[#0066B3]" title="Download PDF" aria-label="Download payslip PDF"><Download size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PDF preview modal */}
            {pdfPreviewUrl && (
                <div
                    className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); } }}
                >
                    <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900">Payslip preview</h3>
                            <div className="flex items-center gap-2">
                                <a href={pdfPreviewUrl} download="payslip.pdf" className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"><Download size={14} /> Download</a>
                                <button onClick={() => { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Close preview"><X size={18} /></button>
                            </div>
                        </div>
                        <iframe src={pdfPreviewUrl} title="Payslip PDF" className="flex-1 w-full" />
                    </div>
                </div>
            )}

            {/* Confirm dialogs */}
            <ConfirmDialog
                isOpen={!!calcRunId}
                title="Calculate Payroll Run"
                message="This will compute payslips for all active staff (deleting any prior payslips for this run). Continue?"
                confirmLabel="Calculate"
                onConfirm={() => { if (calcRunId) calculateRunMutation.mutate(calcRunId); }}
                onCancel={() => setCalcRunId(null)}
                isLoading={calculateRunMutation.isPending}
            />
            <ConfirmDialog
                isOpen={!!approveRunId}
                title="Approve Payroll Run"
                message="Approving locks the calculation. Statutory exports become available. Continue?"
                confirmLabel="Approve"
                onConfirm={() => { if (approveRunId) approveRunMutation.mutate(approveRunId); }}
                onCancel={() => setApproveRunId(null)}
                isLoading={approveRunMutation.isPending}
            />
            <ConfirmDialog
                isOpen={!!markPaidRunId}
                title="Mark as Paid"
                message="Confirm that net pay has been disbursed to staff bank accounts. Payslips will be marked PAID."
                confirmLabel="Mark Paid"
                onConfirm={() => { if (markPaidRunId) markPaidMutation.mutate(markPaidRunId); }}
                onCancel={() => setMarkPaidRunId(null)}
                isLoading={markPaidMutation.isPending}
            />
            <InputDialog
                isOpen={!!cancelRunId}
                title="Cancel Payroll Run"
                message="Provide a reason for cancelling this run. Payslips will be voided."
                inputLabel="Reason"
                placeholder="e.g., Period miscalculated, rerunning"
                confirmLabel="Cancel Run"
                required
                minLength={5}
                onConfirm={(reason) => { if (cancelRunId) cancelRunMutation.mutate({ id: cancelRunId, reason }); }}
                onCancel={() => setCancelRunId(null)}
                isLoading={cancelRunMutation.isPending}
            />

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 z-[100] ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                    <span className="text-sm font-medium">{toast.text}</span>
                </div>
            )}
        </div>
    );
};

export default PayrollPage;
