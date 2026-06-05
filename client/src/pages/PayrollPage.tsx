import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { InputDialog } from '../components/ui/InputDialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuthStore } from '../store/auth.store';
import {
    Calendar, Plus, Calculator, CheckCircle, DollarSign, Lock, FileText,
    Download, Eye, X, Loader2, AlertTriangle, RefreshCw,
    TrendingUp, FileSpreadsheet, Banknote, Receipt, Ban, Edit, Trash2,
    AlertCircle, Sparkles, Info,
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
    days_worked: number;
    lwop_days: number;
    staff_id: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PayrollPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [tab, setTab] = useState<Tab>('runs');
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Modals & Forms State
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

    // Statutory Rates Editing State
    const canEditRates = user?.roles?.some(r => ['CEO', 'HR_MANAGER'].includes(r.code));
    const [isEditingRates, setIsEditingRates] = useState(false);
    const [ratesForm, setRatesForm] = useState<any>(null);

    // Staff Drawer / Settings state
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [drawerTab, setDrawerTab] = useState<'allowances' | 'deductions' | 'loans' | 'leave'>('deductions');
    const [showAddAllowance, setShowAddAllowance] = useState(false);
    const [allowanceForm, setAllowanceForm] = useState({
        label: '',
        type: 'other',
        amount: '',
        taxable: true,
        frequency: 'monthly',
        effective_from: new Date().toISOString().slice(0, 10),
        effective_to: '',
        notes: '',
    });
    const [showAddDeduction, setShowAddDeduction] = useState(false);
    const [deductionForm, setDeductionForm] = useState({
        label: '',
        type: 'other',
        amount: '',
        tax_relievable: false,
        effective_from: new Date().toISOString().slice(0, 10),
        effective_to: '',
        notes: '',
    });

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
        enabled: tab === 'rates' || isEditingRates,
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

    // Drawer queries
    const { data: staffAllowances = [], refetch: refetchAllowances } = useQuery<any[]>({
        queryKey: ['staff-allowances', selectedPayslip?.staff_id],
        queryFn: async () => (await api.get(`/payroll/staff/${selectedPayslip?.staff_id}/allowances`)).data,
        enabled: !!selectedPayslip,
    });

    const { data: staffDeductions = [], refetch: refetchDeductions } = useQuery<any[]>({
        queryKey: ['staff-deductions', selectedPayslip?.staff_id],
        queryFn: async () => (await api.get(`/payroll/staff/${selectedPayslip?.staff_id}/deductions`)).data,
        enabled: !!selectedPayslip,
    });

    const { data: staffLoans = [] } = useQuery<any[]>({
        queryKey: ['staff-loans', selectedPayslip?.staff_id],
        queryFn: async () => (await api.get(`/loans`, { params: { staffId: selectedPayslip?.staff_id } })).data,
        enabled: !!selectedPayslip,
    });

    const { data: staffLeaveRequests = [] } = useQuery<any[]>({
        queryKey: ['staff-leaves', selectedPayslip?.staff_id],
        queryFn: async () => (await api.get(`/leave/requests`, { params: { staffId: selectedPayslip?.staff_id } })).data,
        enabled: !!selectedPayslip,
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

    const updateRatesMutation = useMutation({
        mutationFn: async (newRates: any) => (await api.patch('/payroll/statutory/rates', newRates)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-rates'] });
            setIsEditingRates(false);
            showToast('Statutory rates updated successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update rates', 'error'),
    });

    const createAllowanceMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/payroll/allowances', data)).data,
        onSuccess: () => {
            refetchAllowances();
            setShowAddAllowance(false);
            setAllowanceForm({
                label: '',
                type: 'other',
                amount: '',
                taxable: true,
                frequency: 'monthly',
                effective_from: new Date().toISOString().slice(0, 10),
                effective_to: '',
                notes: '',
            });
            showToast('Allowance added successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to add allowance', 'error'),
    });

    const deleteAllowanceMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/payroll/allowances/${id}`)).data,
        onSuccess: () => {
            refetchAllowances();
            showToast('Allowance deleted successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete allowance', 'error'),
    });

    const createDeductionMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/payroll/deductions', data)).data,
        onSuccess: () => {
            refetchDeductions();
            setShowAddDeduction(false);
            setDeductionForm({
                label: '',
                type: 'other',
                amount: '',
                tax_relievable: false,
                effective_from: new Date().toISOString().slice(0, 10),
                effective_to: '',
                notes: '',
            });
            showToast('Deduction added successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to add deduction', 'error'),
    });

    const deleteDeductionMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/payroll/deductions/${id}`)).data,
        onSuccess: () => {
            refetchDeductions();
            showToast('Deduction deleted successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete deduction', 'error'),
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
                                                    <button onClick={() => setViewRunId(run.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-[#0066B3]" title="View payslips" aria-label="View payslips">
                                                        <Eye size={15} />
                                                    </button>
                                                    {run.status === 'draft' && (
                                                        <button onClick={() => setCalcRunId(run.id)} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1">
                                                            <Calculator size={12} />Calculate
                                                        </button>
                                                    )}
                                                    {run.status === 'calculated' && (
                                                        <>
                                                            <button onClick={() => setCalcRunId(run.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600" title="Recalculate" aria-label="Recalculate">
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
                                                        <button onClick={() => setCancelRunId(run.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600" title="Cancel" aria-label="Cancel">
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
                                                            title="Edit period" aria-label="Edit period"
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
                <div className="space-y-4">
                    {/* Toolbar */}
                    {canEditRates && (
                        <div className="flex justify-end bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-2">
                            {isEditingRates ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setIsEditingRates(false);
                                            setRatesForm(null);
                                        }}
                                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => updateRatesMutation.mutate(ratesForm)}
                                        disabled={updateRatesMutation.isPending}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {updateRatesMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                        Save Configuration
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        setRatesForm(JSON.parse(JSON.stringify(rates)));
                                        setIsEditingRates(true);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"
                                >
                                    <Edit size={16} />
                                    Edit Configuration
                                </button>
                            )}
                        </div>
                    )}

                    {isEditingRates && ratesForm ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* PAYE Configurator */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Receipt size={18} className="text-[#0066B3]" />
                                    Configure PAYE & Reliefs
                                </h3>

                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-slate-400 uppercase">Monthly PAYE Tax Bands</p>
                                    {ratesForm.paye.bands.map((b: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-slate-400 font-medium block">Upper Limit (KES)</label>
                                                {b.upTo === null || !isFinite(b.upTo) ? (
                                                    <input
                                                        type="text"
                                                        value="Above (Infinity)"
                                                        disabled
                                                        className="w-full px-2 py-1 border border-slate-200 bg-slate-50 text-slate-400 rounded-lg text-sm font-medium"
                                                    />
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={b.upTo}
                                                        onChange={(e) => {
                                                            const newBands = [...ratesForm.paye.bands];
                                                            newBands[i].upTo = Number(e.target.value);
                                                            setRatesForm({
                                                                ...ratesForm,
                                                                paye: { ...ratesForm.paye, bands: newBands }
                                                            });
                                                        }}
                                                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0066B3]"
                                                    />
                                                )}
                                            </div>
                                            <div className="w-24">
                                                <label className="text-[10px] text-slate-400 font-medium block">Rate (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={(b.rate * 100).toFixed(1)}
                                                    onChange={(e) => {
                                                        const newBands = [...ratesForm.paye.bands];
                                                        newBands[i].rate = Number(e.target.value) / 100;
                                                        setRatesForm({
                                                            ...ratesForm,
                                                            paye: { ...ratesForm.paye, bands: newBands }
                                                        });
                                                    }}
                                                    className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0066B3]"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                                    <div>
                                        <label className="text-[10px] text-slate-400 font-medium block">Personal Relief</label>
                                        <input
                                            type="number"
                                            value={ratesForm.paye.personalRelief}
                                            onChange={(e) => setRatesForm({
                                                ...ratesForm,
                                                paye: { ...ratesForm.paye, personalRelief: Number(e.target.value) }
                                            })}
                                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0066B3]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 font-medium block">Insurance Relief Cap</label>
                                        <input
                                            type="number"
                                            value={ratesForm.paye.insuranceReliefCap}
                                            onChange={(e) => setRatesForm({
                                                ...ratesForm,
                                                paye: { ...ratesForm.paye, insuranceReliefCap: Number(e.target.value) }
                                            })}
                                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0066B3]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 font-medium block">Pension Relief Cap</label>
                                        <input
                                            type="number"
                                            value={ratesForm.paye.pensionReliefCapMonthly}
                                            onChange={(e) => setRatesForm({
                                                ...ratesForm,
                                                paye: { ...ratesForm.paye, pensionReliefCapMonthly: Number(e.target.value) }
                                            })}
                                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0066B3]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Statutory Contributions Configurator */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <FileSpreadsheet size={18} className="text-[#0066B3]" />
                                    Statutory Levies & Deductions
                                </h3>

                                <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-xs">
                                    <p className="font-semibold text-slate-700">NSSF Act 2013 Settings</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-400">Tier 1 Ceiling (KES)</label>
                                            <input
                                                type="number"
                                                value={ratesForm.nssf.tier1Ceiling}
                                                onChange={(e) => setRatesForm({
                                                    ...ratesForm,
                                                    nssf: { ...ratesForm.nssf, tier1Ceiling: Number(e.target.value) }
                                                })}
                                                className="w-full px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400">Upper Limit (KES)</label>
                                            <input
                                                type="number"
                                                value={ratesForm.nssf.upperEarningsLimit}
                                                onChange={(e) => setRatesForm({
                                                    ...ratesForm,
                                                    nssf: { ...ratesForm.nssf, upperEarningsLimit: Number(e.target.value) }
                                                })}
                                                className="w-full px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-400">Employee Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={(ratesForm.nssf.employeeRate * 100).toFixed(1)}
                                                onChange={(e) => setRatesForm({
                                                    ...ratesForm,
                                                    nssf: { ...ratesForm.nssf, employeeRate: Number(e.target.value) / 100 }
                                                })}
                                                className="w-full px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400">Employer Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={(ratesForm.nssf.employerRate * 100).toFixed(1)}
                                                onChange={(e) => setRatesForm({
                                                    ...ratesForm,
                                                    nssf: { ...ratesForm.nssf, employerRate: Number(e.target.value) / 100 }
                                                })}
                                                className="w-full px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-xs">
                                    <p className="font-semibold text-slate-700">SHIF Health Fund Settings</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-400">Contribution Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={(ratesForm.shif.rate * 100).toFixed(2)}
                                                onChange={(e) => setRatesForm({
                                                    ...ratesForm,
                                                    shif: { ...ratesForm.shif, rate: Number(e.target.value) / 100 }
                                                })}
                                                className="w-full px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400">Minimum Premium (KES)</label>
                                            <input
                                                type="number"
                                                value={ratesForm.shif.minimum}
                                                onChange={(e) => setRatesForm({
                                                    ...ratesForm,
                                                    shif: { ...ratesForm.shif, minimum: Number(e.target.value) }
                                                })}
                                                className="w-full px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-xs">
                                    <p className="font-semibold text-slate-700">Affordable Housing Levy Settings</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-400">Employee Levy Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={(ratesForm.housingLevy.employeeRate * 100).toFixed(1)}
                                                onChange={(e) => setRatesForm({
                                                    ...ratesForm,
                                                    housingLevy: { ...ratesForm.housingLevy, employeeRate: Number(e.target.value) / 100 }
                                                })}
                                                className="w-full px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400">Employer Levy Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={(ratesForm.housingLevy.employerRate * 100).toFixed(1)}
                                                onChange={(e) => setRatesForm({
                                                    ...ratesForm,
                                                    housingLevy: { ...ratesForm.housingLevy, employerRate: Number(e.target.value) / 100 }
                                                })}
                                                className="w-full px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-xs">
                                    <p className="font-semibold text-slate-700">NITA Industrial Levy</p>
                                    <div>
                                        <label className="text-[10px] text-slate-400">Employer Monthly Fee (KES)</label>
                                        <input
                                            type="number"
                                            value={ratesForm.nita.amount}
                                            onChange={(e) => setRatesForm({
                                                ...ratesForm,
                                                nita: { ...ratesForm.nita, amount: Number(e.target.value) }
                                            })}
                                            className="w-48 px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
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
                                        <tr>
                                            <th className="px-3 py-2.5 text-left">Employee</th>
                                            <th className="px-3 py-2.5 text-right">Gross</th>
                                            <th className="px-3 py-2.5 text-right">Deductions</th>
                                            <th className="px-3 py-2.5 text-right">Net Pay</th>
                                            <th className="px-3 py-2.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payslips.map(p => (
                                            <tr key={p.id} className="hover:bg-blue-50/40 transition-colors group">
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0066B3] to-[#004d88] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                                                            {p.full_name_snapshot?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="font-semibold text-slate-900">{p.full_name_snapshot}</p>
                                                                {Number(p.days_worked) + Number(p.lwop_days) < 30 && (
                                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-full ring-1 ring-amber-200">Prorated</span>
                                                                )}
                                                                {Number(p.lwop_days) > 0 && (
                                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-50 text-red-700 rounded-full ring-1 ring-red-200">LWOP</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-400">{p.employee_number_snapshot} · {p.position_snapshot || '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-right font-medium text-slate-700">{fmtKES(p.gross_pay)}</td>
                                                <td className="px-3 py-3 text-right font-medium text-red-600">{fmtKES(p.total_deductions)}</td>
                                                <td className="px-3 py-3 text-right">
                                                    <span className="font-bold text-slate-900 text-sm">{fmtKES(p.net_pay)}</span>
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => setSelectedPayslip(p)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-[11px] font-semibold hover:bg-[#005299] shadow-sm hover:shadow transition-all"
                                                            title="Manage payroll settings for this employee"
                                                            aria-label={`Manage payroll for ${p.full_name_snapshot}`}
                                                        >
                                                            <Edit size={12} /> Manage
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); previewPayslipPdf(p.id); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-[#0066B3] transition-colors" title="Preview PDF" aria-label="Preview payslip PDF"><Eye size={15} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); downloadPayslipPdf(p.id); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-[#0066B3] transition-colors" title="Download PDF" aria-label="Download payslip PDF"><Download size={15} /></button>
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

            {/* ─── Staff Payroll Settings Drawer ─── */}
            {selectedPayslip && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-end transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setSelectedPayslip(null); }}>
                    <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right" style={{ animation: 'slideInRight 0.25s ease-out' }}>
                        {/* Header */}
                        <div className="px-6 py-5 bg-gradient-to-r from-[#0066B3] to-[#004d88] text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/30">
                                        {selectedPayslip.full_name_snapshot?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-lg leading-tight">{selectedPayslip.full_name_snapshot}</h2>
                                        <p className="text-xs text-blue-100">
                                            {selectedPayslip.employee_number_snapshot} · {selectedPayslip.position_snapshot || '—'}
                                            {selectedPayslip.branch_snapshot ? ` · ${selectedPayslip.branch_snapshot}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPayslip(null)} className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Payslip Financial Summary */}
                            <div className="grid grid-cols-4 gap-3">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-blue-200 font-medium">Basic Salary</p>
                                    <p className="text-sm font-bold mt-0.5">{fmtKES(selectedPayslip.basic_salary)}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-blue-200 font-medium">Gross Pay</p>
                                    <p className="text-sm font-bold mt-0.5">{fmtKES(selectedPayslip.gross_pay)}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-blue-200 font-medium">Deductions</p>
                                    <p className="text-sm font-bold mt-0.5 text-red-200">{fmtKES(selectedPayslip.total_deductions)}</p>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 ring-1 ring-white/20">
                                    <p className="text-[10px] uppercase tracking-wider text-emerald-200 font-medium">Net Pay</p>
                                    <p className="text-base font-extrabold mt-0.5 text-emerald-100">{fmtKES(selectedPayslip.net_pay)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Notifications / Alerts Block */}
                        {(Number(selectedPayslip.days_worked) + Number(selectedPayslip.lwop_days) < 30 || Number(selectedPayslip.lwop_days) > 0 || staffLoans.some((l: any) => l.status === 'disbursed')) && (
                            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 space-y-2">
                                {/* Joined or Exited mid-month check */}
                                {Number(selectedPayslip.days_worked) + Number(selectedPayslip.lwop_days) < 30 && (
                                    <div className="flex items-start gap-2 text-xs text-amber-800">
                                        <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                                        <span>
                                            <strong>Proration Notice:</strong> Active days are <strong>{Number(selectedPayslip.days_worked) + Number(selectedPayslip.lwop_days)}/30 days</strong>. Basic Salary has been prorated to <strong>{fmtKES(selectedPayslip.basic_salary)}</strong>.
                                        </span>
                                    </div>
                                )}
                                {/* LWOP Notice */}
                                {Number(selectedPayslip.lwop_days) > 0 && (
                                    <div className="flex items-start gap-2 text-xs text-amber-800">
                                        <Info size={14} className="mt-0.5 shrink-0 text-amber-600" />
                                        <span>
                                            Employee went on <strong>{selectedPayslip.lwop_days} day(s)</strong> of Leave Without Pay (LWOP) during this period.
                                        </span>
                                    </div>
                                )}
                                {/* Active Loans Notification */}
                                {staffLoans.some((l: any) => l.status === 'disbursed') && (
                                    <div className="flex items-start gap-2 text-xs text-blue-800">
                                        <Sparkles size={14} className="mt-0.5 shrink-0 text-blue-500" />
                                        <span>
                                            Employee has <strong>{staffLoans.filter((l: any) => l.status === 'disbursed').length}</strong> active loan(s). Deductions are automatically factored into payroll.
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 bg-slate-50">
                            {[
                                { id: 'deductions' as const, label: 'Deductions', count: staffDeductions.length },
                                { id: 'allowances' as const, label: 'Allowances', count: staffAllowances.length },
                                { id: 'loans' as const, label: 'Loans', count: staffLoans.filter((l: any) => l.status === 'disbursed').length },
                                { id: 'leave' as const, label: 'LWOP', count: staffLeaveRequests.filter((l: any) => l.leaveType?.code === 'LWOP' || l.leaveType?.is_paid === false).length },
                            ].map((tabInfo) => (
                                <button
                                    key={tabInfo.id}
                                    onClick={() => setDrawerTab(tabInfo.id)}
                                    className={`flex-1 text-center py-3 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                                        drawerTab === tabInfo.id
                                            ? 'border-[#0066B3] text-[#0066B3] bg-white'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                                    }`}
                                >
                                    {tabInfo.label}
                                    {tabInfo.count > 0 && (
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                                            drawerTab === tabInfo.id
                                                ? 'bg-[#0066B3] text-white'
                                                : 'bg-slate-200 text-slate-600'
                                        }`}>{tabInfo.count}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* DEDUCTIONS TAB */}
                            {drawerTab === 'deductions' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-800">Recurring Deductions</h3>
                                        <button
                                            onClick={() => setShowAddDeduction(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-xs font-medium hover:bg-[#005299]"
                                        >
                                            <Plus size={14} /> Add Deduction
                                        </button>
                                    </div>

                                    {showAddDeduction && (
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                            <h4 className="text-xs font-bold text-slate-700">New Recurring Deduction</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block font-medium">Label</label>
                                                    <input
                                                        type="text"
                                                        value={deductionForm.label}
                                                        onChange={(e) => setDeductionForm({ ...deductionForm, label: e.target.value })}
                                                        placeholder="e.g., HELB contribution, Car Loan"
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#0066B3] focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block font-medium">Type</label>
                                                    <select
                                                        value={deductionForm.type}
                                                        onChange={(e) => setDeductionForm({ ...deductionForm, type: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-[#0066B3] focus:outline-none"
                                                    >
                                                        <option value="other">Other Deductions</option>
                                                        <option value="helb">HELB</option>
                                                        <option value="car_loan">Car Loan</option>
                                                        <option value="staff_loan">Staff Loan</option>
                                                        <option value="salary_advance">Salary Advance</option>
                                                        <option value="sacco">SACCO</option>
                                                        <option value="pension">Pension</option>
                                                        <option value="insurance">Insurance</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block font-medium">Amount (KES)</label>
                                                    <input
                                                        type="number"
                                                        value={deductionForm.amount}
                                                        onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#0066B3] focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block font-medium">Effective From</label>
                                                    <input
                                                        type="date"
                                                        value={deductionForm.effective_from}
                                                        onChange={(e) => setDeductionForm({ ...deductionForm, effective_from: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#0066B3] focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="tax_relievable"
                                                    checked={deductionForm.tax_relievable}
                                                    onChange={(e) => setDeductionForm({ ...deductionForm, tax_relievable: e.target.checked })}
                                                    className="rounded border-slate-200 text-[#0066B3]"
                                                />
                                                <label htmlFor="tax_relievable" className="text-xs text-slate-600 font-medium">Tax Relievable (e.g. Pension)</label>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    onClick={() => setShowAddDeduction(false)}
                                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => createDeductionMutation.mutate({
                                                        staff_id: selectedPayslip.staff_id,
                                                        ...deductionForm,
                                                        amount: Number(deductionForm.amount),
                                                    })}
                                                    disabled={!deductionForm.label || !deductionForm.amount || createDeductionMutation.isPending}
                                                    className="px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-xs hover:bg-[#005299] disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {staffDeductions.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-6 text-center">No recurring deductions configured for this employee.</p>
                                    ) : (
                                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                                            {staffDeductions.map((d: any) => (
                                                <div key={d.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{d.label}</p>
                                                        <p className="text-[10px] text-slate-400 capitalize">
                                                            Type: {d.type.replace('_', ' ')} · Effective: {d.effective_from} {d.effective_to ? `to ${d.effective_to}` : ''}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-800">{fmtKES(d.amount)}</span>
                                                        <button
                                                            onClick={() => deleteDeductionMutation.mutate(d.id)}
                                                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ALLOWANCES TAB */}
                            {drawerTab === 'allowances' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-800">Recurring & One-Time Allowances</h3>
                                        <button
                                            onClick={() => setShowAddAllowance(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-xs font-medium hover:bg-[#005299]"
                                        >
                                            <Plus size={14} /> Add Allowance
                                        </button>
                                    </div>

                                    {showAddAllowance && (
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                            <h4 className="text-xs font-bold text-slate-700">New Allowance</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block font-medium">Label</label>
                                                    <input
                                                        type="text"
                                                        value={allowanceForm.label}
                                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, label: e.target.value })}
                                                        placeholder="e.g., Responsibility, Travel"
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#0066B3] focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block font-medium">Type</label>
                                                    <select
                                                        value={allowanceForm.type}
                                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, type: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-[#0066B3] focus:outline-none"
                                                    >
                                                        <option value="house">House</option>
                                                        <option value="transport">Transport</option>
                                                        <option value="airtime">Airtime</option>
                                                        <option value="medical">Medical</option>
                                                        <option value="hardship">Hardship</option>
                                                        <option value="responsibility">Responsibility</option>
                                                        <option value="acting">Acting</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block font-medium">Amount (KES)</label>
                                                    <input
                                                        type="number"
                                                        value={allowanceForm.amount}
                                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, amount: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#0066B3] focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block font-medium">Frequency</label>
                                                    <select
                                                        value={allowanceForm.frequency}
                                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, frequency: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-[#0066B3] focus:outline-none"
                                                    >
                                                        <option value="monthly">Monthly Recurring</option>
                                                        <option value="one_time">One-time</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 block font-medium">Effective From</label>
                                                    <input
                                                        type="date"
                                                        value={allowanceForm.effective_from}
                                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, effective_from: e.target.value })}
                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#0066B3] focus:outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 pt-4 pl-2">
                                                    <input
                                                        type="checkbox"
                                                        id="allowance_taxable"
                                                        checked={allowanceForm.taxable}
                                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, taxable: e.target.checked })}
                                                        className="rounded border-slate-200 text-[#0066B3]"
                                                    />
                                                    <label htmlFor="allowance_taxable" className="text-xs text-slate-600 font-medium">Taxable</label>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    onClick={() => setShowAddAllowance(false)}
                                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => createAllowanceMutation.mutate({
                                                        staff_id: selectedPayslip.staff_id,
                                                        ...allowanceForm,
                                                        amount: Number(allowanceForm.amount),
                                                    })}
                                                    disabled={!allowanceForm.label || !allowanceForm.amount || createAllowanceMutation.isPending}
                                                    className="px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-xs hover:bg-[#005299] disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {staffAllowances.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-6 text-center">No allowances configured for this employee.</p>
                                    ) : (
                                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                                            {staffAllowances.map((a: any) => (
                                                <div key={a.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{a.label}</p>
                                                        <p className="text-[10px] text-slate-400 capitalize">
                                                            Type: {a.type} · {a.frequency} · {a.taxable ? 'Taxable' : 'Tax Free'} · {a.effective_from}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-800">{fmtKES(a.amount)}</span>
                                                        <button
                                                            onClick={() => deleteAllowanceMutation.mutate(a.id)}
                                                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ACTIVE LOANS TAB */}
                            {drawerTab === 'loans' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                        <Sparkles size={16} className="text-blue-500" /> Outstanding Staff Loans & Advances
                                    </h3>
                                    {staffLoans.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-6 text-center">No active loans or advances found for this employee.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {staffLoans.map((loan: any) => (
                                                <div key={loan.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-slate-800 capitalize">{loan.loan_type?.replace('_', ' ') || 'Staff Loan'}</p>
                                                            <p className="text-[10px] text-slate-400">Disbursed on: {loan.disbursed_at?.slice(0,10) || '—'}</p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                                            loan.status === 'disbursed'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : loan.status === 'paid'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-slate-100 text-slate-800'
                                                        }`}>
                                                            {loan.status}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-2 text-[11px]">
                                                        <div>
                                                            <p className="text-slate-400 font-medium">Principal Amount</p>
                                                            <p className="font-semibold text-slate-800">{fmtKES(loan.amount)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 font-medium">Total Repaid</p>
                                                            <p className="font-semibold text-emerald-700">{fmtKES(loan.paid_amount || 0)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 font-medium">Remaining Bal</p>
                                                            <p className="font-semibold text-red-600">
                                                                {fmtKES(Number(loan.amount) + Number(loan.interest_amount || 0) - Number(loan.paid_amount || 0))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LEAVE HISTORY TAB */}
                            {drawerTab === 'leave' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-800">Leaves History & Unpaid Absences (LWOP)</h3>
                                    {staffLeaveRequests.filter((l: any) => l.leaveType?.code === 'LWOP' || l.leaveType?.is_paid === false).length === 0 ? (
                                        <p className="text-xs text-slate-400 py-6 text-center">No unpaid leaves (LWOP) found for this employee.</p>
                                    ) : (
                                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                                            {staffLeaveRequests
                                                .filter((l: any) => l.leaveType?.code === 'LWOP' || l.leaveType?.is_paid === false)
                                                .map((leave: any) => (
                                                    <div key={leave.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="font-semibold text-slate-800">{leave.leaveType?.name || 'Unpaid Leave'}</p>
                                                                <span className="px-1 text-[9px] font-semibold bg-red-100 text-red-800 rounded">Unpaid</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400">
                                                                {leave.start_date?.slice(0,10)} to {leave.end_date?.slice(0,10)}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-slate-800">{leave.total_days} day(s)</p>
                                                            <span className="text-[10px] text-slate-400 capitalize">{leave.status}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => previewPayslipPdf(selectedPayslip.id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                                    >
                                        <Eye size={14} className="text-slate-500" /> Preview Payslip
                                    </button>
                                    <button
                                        onClick={() => downloadPayslipPdf(selectedPayslip.id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                                    >
                                        <Download size={14} className="text-slate-500" /> Download PDF
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedPayslip(null)}
                                    className="px-5 py-2 bg-[#0066B3] text-white rounded-lg text-xs font-semibold hover:bg-[#005299] shadow-sm hover:shadow transition-all"
                                >
                                    Done
                                </button>
                            </div>
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
