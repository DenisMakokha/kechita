import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { ApprovalTimeline } from '../components/ApprovalTimeline';
import { InputDialog } from '../components/ui/InputDialog';
import { useFormValidation, validators, fieldErrorClass } from '../hooks/useFormValidation';
import type { ValidationRules } from '../hooks/useFormValidation';
import { FieldError } from '../components/ui/FieldError';
import {
    Plus, Wallet, TrendingUp, Calendar, AlertTriangle,
    DollarSign, Clock, CheckCircle, XCircle, Eye, Search,
    Filter, ChevronDown, X, Building2, Briefcase,
    CreditCard, Percent, Calculator, FileText,
    BarChart3, PiggyBank, CircleDollarSign
} from 'lucide-react';

interface StaffLoan {
    id: string;
    loan_number: string;
    loan_type: 'salary_advance' | 'staff_loan' | 'emergency_loan';
    principal: number;
    total_interest: number;
    total_payable: number;
    total_paid: number;
    outstanding_balance: number;
    currency: string;
    term_months: number;
    interest_rate: number;
    monthly_installment?: number;
    application_date: string;
    approval_date?: string;
    disbursement_date?: string;
    first_repayment_date?: string;
    maturity_date?: string;
    status: string;
    purpose?: string;
    is_urgent: boolean;
    approval_comment?: string;
    rejection_reason?: string;
    staff?: {
        id: string;
        first_name: string;
        last_name: string;
        full_name: string;
        position?: { name: string };
        branch?: { name: string };
    };
    guarantor?: {
        id: string;
        full_name: string;
    };
    repayments?: {
        id: string;
        installment_number: number;
        due_date: string;
        principal_component: number;
        interest_component: number;
        total_amount: number;
        paid_amount: number;
        status: string;
    }[];
}

const LOANS_MANAGER_ROLES = ['CEO', 'HR_MANAGER', 'ACCOUNTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER'];

const LoansPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const userRoles = user?.roles?.map((r: any) => r.code) || [];
    const isManager = userRoles.some((role: string) => LOANS_MANAGER_ROLES.includes(role));
    const [activeTab, setActiveTab] = useState<'all' | 'my' | 'pending' | 'overdue'>(isManager ? 'all' : 'my');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<StaffLoan | null>(null);
    const [loanDialogType, setLoanDialogType] = useState<'reject' | 'disburse' | 'payment' | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        loan_type: 'staff_loan' as 'salary_advance' | 'staff_loan',
        principal: 0,
        term_months: 12,
        interest_rate: 12,
        purpose: '',
        is_urgent: false,
        deduct_from_salary: true,
        max_salary_deduction_percent: 33,
        guarantor_id: '',
    });

    const loanRules = useMemo<ValidationRules<typeof formData>>(() => ({
        principal: [v => validators.required(v, 'Loan amount'), validators.positiveNumber('Loan amount')],
        term_months: [v => validators.required(v, 'Term'), validators.minValue(1, 'Term'), validators.maxValue(24, 'Term')],
        purpose: [v => validators.required(v, 'Purpose'), validators.minLength(5, 'Purpose')],
    }), []);
    const loanValidation = useFormValidation(loanRules);

    // Queries
    const { data: myLoans } = useQuery<StaffLoan[]>({
        queryKey: ['my-loans'],
        queryFn: async () => (await api.get('/loans/my')).data,
        refetchInterval: 60000,
    });

    const { data: allLoans, isLoading } = useQuery<StaffLoan[]>({
        queryKey: ['all-loans'],
        queryFn: async () => (await api.get('/loans')).data,
        enabled: isManager,
        refetchInterval: 30000,
    });

    const { data: myStats } = useQuery({
        queryKey: ['my-loan-stats'],
        queryFn: async () => (await api.get('/loans/my/stats')).data,
        refetchInterval: 60000,
    });

    const { data: overdueLoans } = useQuery<StaffLoan[]>({
        queryKey: ['overdue-loans'],
        queryFn: async () => (await api.get('/loans/overdue')).data,
        enabled: isManager,
        refetchInterval: 60000,
    });

    const { data: staffForGuarantor } = useQuery<any[]>({
        queryKey: ['staff-for-guarantor'],
        queryFn: async () => {
            const res = await api.get('/staff?limit=500');
            return Array.isArray(res.data) ? res.data : res.data?.data || [];
        },
    });

    const { data: approvalInstance } = useQuery({
        queryKey: ['loan-approval', selectedLoan?.id],
        queryFn: async () => (await api.get(`/approvals/target/staff_loan/${selectedLoan?.id}`)).data,
        enabled: !!selectedLoan?.id,
    });

    // Toast state
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Mutations
    const applyLoanMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await api.post('/loans/apply', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-loans'] });
            queryClient.invalidateQueries({ queryKey: ['all-loans'] });
            queryClient.invalidateQueries({ queryKey: ['my-loan-stats'] });
            setShowApplyModal(false);
            resetForm();
            showToast('Loan application submitted successfully!');
        },
        onError: (error: any) => {
            showToast(error?.response?.data?.message || 'Failed to submit loan application', 'error');
        },
    });

    const cancelLoanMutation = useMutation({
        mutationFn: async (loanId: string) => {
            const response = await api.patch(`/loans/${loanId}/cancel`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-loans'] });
            queryClient.invalidateQueries({ queryKey: ['all-loans'] });
            setShowDetailModal(false);
            showToast('Loan application cancelled');
        },
        onError: (error: any) => {
            showToast(error?.response?.data?.message || 'Failed to cancel loan', 'error');
        },
    });

    const rejectLoanMutation = useMutation({
        mutationFn: async ({ loanId, reason }: { loanId: string; reason: string }) => {
            const response = await api.patch(`/loans/${loanId}/reject`, { reason });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-loans'] });
            queryClient.invalidateQueries({ queryKey: ['all-loans'] });
            setShowDetailModal(false);
            showToast('Loan application rejected');
        },
        onError: (error: any) => {
            showToast(error?.response?.data?.message || 'Failed to reject loan', 'error');
        },
    });

    const disburseLoanMutation = useMutation({
        mutationFn: async ({ loanId, disbursement_reference, disbursement_method }: { loanId: string; disbursement_reference: string; disbursement_method: string }) => {
            const response = await api.patch(`/loans/${loanId}/disburse`, { disbursement_reference, disbursement_method });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-loans'] });
            queryClient.invalidateQueries({ queryKey: ['all-loans'] });
            setShowDetailModal(false);
            showToast('Loan disbursed successfully');
        },
        onError: (error: any) => {
            showToast(error?.response?.data?.message || 'Failed to disburse loan', 'error');
        },
    });

    const recordPaymentMutation = useMutation({
        mutationFn: async ({ loanId, amount, payment_method, payment_reference }: { loanId: string; amount: number; payment_method: string; payment_reference: string }) => {
            const response = await api.patch(`/loans/${loanId}/payment`, { amount, payment_method, payment_reference });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-loans'] });
            queryClient.invalidateQueries({ queryKey: ['all-loans'] });
            showToast('Payment recorded successfully');
        },
        onError: (error: any) => {
            showToast(error?.response?.data?.message || 'Failed to record payment', 'error');
        },
    });

    const resetForm = () => {
        setFormData({
            loan_type: 'staff_loan',
            principal: 0,
            term_months: 12,
            interest_rate: 12,
            purpose: '',
            is_urgent: false,
            deduct_from_salary: true,
            max_salary_deduction_percent: 33,
            guarantor_id: '',
        });
    };

    const calculateMonthlyPayment = () => {
        const { principal, interest_rate, term_months } = formData;
        if (principal <= 0 || term_months <= 0) return 0;
        if (interest_rate === 0) return principal / term_months;
        const monthlyRate = interest_rate / 100 / 12;
        const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, term_months))
            / (Math.pow(1 + monthlyRate, term_months) - 1);
        return Math.round(emi);
    };

    const calculateTotalPayable = () => {
        return calculateMonthlyPayment() * formData.term_months;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
            case 'disbursed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'defaulted': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="text-emerald-500" size={16} />;
            case 'approved': return <CheckCircle className="text-green-500" size={16} />;
            case 'active':
            case 'disbursed': return <TrendingUp className="text-blue-500" size={16} />;
            case 'pending': return <Clock className="text-amber-500" size={16} />;
            case 'rejected': return <XCircle className="text-red-500" size={16} />;
            case 'defaulted': return <AlertTriangle className="text-rose-500" size={16} />;
            default: return <FileText className="text-slate-500" size={16} />;
        }
    };

    const getLoanTypeLabel = (type: string) => {
        switch (type) {
            case 'salary_advance': return 'Salary Advance';
            case 'staff_loan': return 'Staff Loan';
            case 'emergency_loan': return 'Emergency Loan';
            default: return type;
        }
    };

    const getLoanTypeColor = (type: string) => {
        switch (type) {
            case 'salary_advance': return 'bg-cyan-100 text-cyan-700';
            case 'emergency_loan': return 'bg-red-100 text-red-700';
            default: return 'bg-blue-100 text-[#0066B3]';
        }
    };

    const displayLoans = activeTab === 'my' ? myLoans : activeTab === 'pending'
        ? allLoans?.filter(l => l.status === 'pending')
        : activeTab === 'overdue'
            ? overdueLoans
            : allLoans;

    const filteredLoans = displayLoans?.filter(loan => {
        if (statusFilter !== 'all' && loan.status !== statusFilter) return false;
        if (typeFilter !== 'all' && loan.loan_type !== typeFilter) return false;
        if (searchQuery) {
            const search = searchQuery.toLowerCase();
            return (
                loan.loan_number?.toLowerCase().includes(search) ||
                loan.staff?.full_name?.toLowerCase().includes(search) ||
                loan.purpose?.toLowerCase().includes(search)
            );
        }
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
                        toastMessage.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
                    }`}>
                        {toastMessage.type === 'success' ? (
                            <CheckCircle size={18} className="text-emerald-400" />
                        ) : (
                            <AlertTriangle size={18} className="text-white" />
                        )}
                        <span className="font-medium">{toastMessage.text}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <PiggyBank className="text-[#0066B3]" size={28} />
                        Staff Loans
                    </h1>
                    <p className="text-slate-500">Manage staff loans and salary advances</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowApplyModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus size={20} />
                    Apply for Loan
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-[#0066B3] rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <Wallet size={24} className="opacity-80" />
                        <BarChart3 size={20} className="opacity-60" />
                    </div>
                    <p className="text-3xl font-bold">{myStats?.total || 0}</p>
                    <p className="text-blue-100 text-sm">Total Applications</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <TrendingUp size={24} className="opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">{myStats?.active || 0}</p>
                    <p className="text-blue-100 text-sm">Active Loans</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <Clock size={24} className="opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">{myStats?.pending || 0}</p>
                    <p className="text-amber-100 text-sm">Pending Approval</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <CircleDollarSign size={24} className="opacity-80" />
                    </div>
                    <p className="text-2xl font-bold">
                        KES {(myStats?.totalOutstanding || 0).toLocaleString()}
                    </p>
                    <p className="text-rose-100 text-sm">Outstanding Balance</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <CreditCard size={24} className="opacity-80" />
                    </div>
                    <p className="text-2xl font-bold">
                        KES {(myStats?.totalRepaid || 0).toLocaleString()}
                    </p>
                    <p className="text-emerald-100 text-sm">Total Repaid</p>
                </div>
            </div>

            {/* By Type Breakdown */}
            {myStats?.byType && myStats.byType.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-[#0066B3]" />
                        Loans by Type
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {myStats.byType.map((t: any) => (
                            <div key={t.type} className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg">
                                <Briefcase size={16} className="text-[#0066B3]" />
                                <div>
                                    <p className="font-medium text-slate-900">{getLoanTypeLabel(t.type)}</p>
                                    <p className="text-xs text-slate-500">
                                        {t.count} loans · KES {(t.amount || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs & Filters */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {[
                        ...(isManager ? [{ key: 'all', label: 'All Loans' }] : []),
                        { key: 'my', label: 'My Loans' },
                        ...(isManager ? [
                            { key: 'pending', label: 'Pending Approval' },
                            { key: 'overdue', label: 'Overdue', badge: overdueLoans?.length },
                        ] : []),
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.key
                                ? 'bg-white text-[#0066B3] shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            {tab.label}
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search loans..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        />
                    </div>

                    <div className="relative">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        >
                            <option value="all">All Types</option>
                            <option value="staff_loan">Staff Loan</option>
                            <option value="salary_advance">Salary Advance</option>
                            <option value="emergency_loan">Emergency Loan</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="disbursed">Disbursed</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                            <option value="defaulted">Defaulted</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Loans Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Loan #</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Staff</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Type</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Principal</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Term</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Balance</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin w-8 h-8 border-2 border-[#0066B3] border-t-transparent rounded-full" />
                                        <span>Loading loans...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredLoans?.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Wallet className="text-slate-300" size={48} />
                                        <p className="text-slate-500">No loans found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredLoans?.map((loan) => (
                                <tr
                                    key={loan.id}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => { setSelectedLoan(loan); setShowDetailModal(true); }}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {loan.is_urgent && (
                                                <AlertTriangle className="text-red-500" size={16} />
                                            )}
                                            <span className="font-mono text-sm text-[#0066B3]">
                                                {loan.loan_number}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-sm font-bold">
                                                {loan.staff?.first_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{loan.staff?.full_name}</p>
                                                <p className="text-xs text-slate-500">{loan.staff?.branch?.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getLoanTypeColor(loan.loan_type)}`}>
                                            {getLoanTypeLabel(loan.loan_type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-900">
                                            {loan.currency} {Number(loan.principal).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-slate-500">{loan.interest_rate}% p.a.</p>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {loan.term_months} months
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-900">
                                            {loan.currency} {Number(loan.outstanding_balance || 0).toLocaleString()}
                                        </p>
                                        {Number(loan.total_paid) > 0 && (
                                            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full"
                                                    style={{ width: `${Number(loan.total_payable) > 0 ? (Number(loan.total_paid) / Number(loan.total_payable)) * 100 : 0}%` }}
                                                />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(loan.status)}`}>
                                            {getStatusIcon(loan.status)}
                                            <span className="capitalize">{loan.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedLoan(loan); setShowDetailModal(true); }}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Apply for Loan Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">Apply for Loan</h2>
                            <button onClick={() => setShowApplyModal(false)} className="p-2 hover:bg-white rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Loan Type */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Loan Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, loan_type: 'salary_advance', interest_rate: 0, term_months: 1 }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${formData.loan_type === 'salary_advance'
                                            ? 'border-cyan-500 bg-cyan-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <DollarSign className={formData.loan_type === 'salary_advance' ? 'text-cyan-600' : 'text-slate-400'} size={24} />
                                        <p className="font-semibold text-slate-900 mt-2">Salary Advance</p>
                                        <p className="text-xs text-slate-500">Quick advance, 0% interest</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, loan_type: 'staff_loan', interest_rate: 12, term_months: 12 }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${formData.loan_type === 'staff_loan'
                                            ? 'border-[#0066B3] bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <Briefcase className={formData.loan_type === 'staff_loan' ? 'text-[#0066B3]' : 'text-slate-400'} size={24} />
                                        <p className="font-semibold text-slate-900 mt-2">Staff Loan</p>
                                        <p className="text-xs text-slate-500">Up to 12 months term</p>
                                    </button>
                                </div>
                            </div>

                            {/* Amount & Terms */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Principal Amount (KES)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.principal || ''}
                                        onChange={(e) => { const v = parseFloat(e.target.value) || 0; setFormData(p => ({ ...p, principal: v })); loanValidation.onChange('principal', v); }}
                                        onBlur={() => loanValidation.onBlur('principal', formData.principal)}
                                        placeholder="0"
                                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${fieldErrorClass(loanValidation.getFieldError('principal'))}`}
                                    />
                                    <FieldError error={loanValidation.getFieldError('principal')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Term (months)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.term_months}
                                        onChange={(e) => { const v = parseInt(e.target.value) || 1; setFormData(p => ({ ...p, term_months: v })); loanValidation.onChange('term_months', v); }}
                                        onBlur={() => loanValidation.onBlur('term_months', formData.term_months)}
                                        min={1}
                                        max={24}
                                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${fieldErrorClass(loanValidation.getFieldError('term_months'))}`}
                                    />
                                    <FieldError error={loanValidation.getFieldError('term_months')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Interest Rate (% p.a.)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.interest_rate}
                                        onChange={(e) => setFormData(p => ({ ...p, interest_rate: parseFloat(e.target.value) || 0 }))}
                                        min={0}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                        disabled={formData.loan_type === 'salary_advance'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Max Salary Deduction (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.max_salary_deduction_percent}
                                        onChange={(e) => setFormData(p => ({ ...p, max_salary_deduction_percent: parseInt(e.target.value) || 33 }))}
                                        min={10}
                                        max={50}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                    />
                                </div>
                            </div>

                            {/* Purpose */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Purpose / Reason
                                </label>
                                <textarea
                                    value={formData.purpose}
                                    onChange={(e) => { setFormData(p => ({ ...p, purpose: e.target.value })); loanValidation.onChange('purpose', e.target.value); }}
                                    onBlur={() => loanValidation.onBlur('purpose', formData.purpose)}
                                    rows={3}
                                    placeholder="Brief description of why you need this loan..."
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${fieldErrorClass(loanValidation.getFieldError('purpose'))}`}
                                />
                                <FieldError error={loanValidation.getFieldError('purpose')} />
                            </div>

                            {/* Guarantor */}
                            {formData.loan_type === 'staff_loan' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Guarantor (optional)</label>
                                    <select
                                        value={formData.guarantor_id}
                                        onChange={(e) => setFormData(p => ({ ...p, guarantor_id: e.target.value }))}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                    >
                                        <option value="">Select guarantor...</option>
                                        {staffForGuarantor?.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Options */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="deduct_salary"
                                        checked={formData.deduct_from_salary}
                                        onChange={(e) => setFormData(p => ({ ...p, deduct_from_salary: e.target.checked }))}
                                        className="w-4 h-4 text-[#0066B3] rounded"
                                    />
                                    <label htmlFor="deduct_salary" className="text-sm text-slate-700">
                                        Deduct repayments from salary
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_urgent"
                                        checked={formData.is_urgent}
                                        onChange={(e) => setFormData(p => ({ ...p, is_urgent: e.target.checked }))}
                                        className="w-4 h-4 text-[#0066B3] rounded"
                                    />
                                    <label htmlFor="is_urgent" className="text-sm text-slate-700">
                                        Mark as urgent
                                    </label>
                                </div>
                            </div>

                            {/* Loan Summary */}
                            <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl p-5 border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calculator className="text-[#0066B3]" size={20} />
                                    <h4 className="font-semibold text-slate-900">Loan Summary</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-slate-500">Principal</p>
                                        <p className="text-xl font-bold text-slate-900">
                                            KES {formData.principal.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Monthly Payment</p>
                                        <p className="text-xl font-bold text-[#0066B3]">
                                            KES {calculateMonthlyPayment().toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Total Payable</p>
                                        <p className="text-lg font-semibold text-slate-900">
                                            KES {calculateTotalPayable().toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Total Interest</p>
                                        <p className="text-lg font-semibold text-amber-600">
                                            KES {(calculateTotalPayable() - formData.principal).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowApplyModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { if (loanValidation.validateAll(formData)) applyLoanMutation.mutate(formData); }}
                                disabled={applyLoanMutation.isPending}
                                className="px-6 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {applyLoanMutation.isPending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <FileText size={18} />
                                        Submit Application
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loan Detail Modal */}
            {showDetailModal && selectedLoan && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className={`flex items-center justify-between px-6 py-4 border-b ${selectedLoan.status === 'completed'
                                ? 'bg-gradient-to-r from-emerald-50 to-green-50'
                                : selectedLoan.status === 'rejected'
                                    ? 'bg-gradient-to-r from-red-50 to-rose-50'
                                    : selectedLoan.status === 'active' || selectedLoan.status === 'disbursed'
                                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50'
                                        : 'bg-gradient-to-r from-blue-50 to-slate-50'
                            }`}>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Loan {selectedLoan.loan_number}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Applied on {new Date(selectedLoan.application_date).toLocaleDateString('en-GB', {
                                        day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Status Banner */}
                            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${getStatusColor(selectedLoan.status)} border`}>
                                {getStatusIcon(selectedLoan.status)}
                                <div>
                                    <p className="font-semibold capitalize">{selectedLoan.status}</p>
                                    {selectedLoan.rejection_reason && (
                                        <p className="text-sm opacity-80">{selectedLoan.rejection_reason}</p>
                                    )}
                                    {selectedLoan.approval_comment && (
                                        <p className="text-sm opacity-80">{selectedLoan.approval_comment}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                {/* Left Column - Loan Details */}
                                <div className="col-span-2 space-y-6">
                                    {/* Loan Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Briefcase size={16} className="text-slate-400" />
                                                <span className="text-sm text-slate-500">Loan Type</span>
                                            </div>
                                            <p className="font-medium text-slate-900">{getLoanTypeLabel(selectedLoan.loan_type)}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <DollarSign size={16} className="text-slate-400" />
                                                <span className="text-sm text-slate-500">Principal</span>
                                            </div>
                                            <p className="text-xl font-bold text-slate-900">
                                                {selectedLoan.currency} {Number(selectedLoan.principal).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Percent size={16} className="text-slate-400" />
                                                <span className="text-sm text-slate-500">Interest Rate</span>
                                            </div>
                                            <p className="font-medium text-slate-900">{selectedLoan.interest_rate}% p.a.</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar size={16} className="text-slate-400" />
                                                <span className="text-sm text-slate-500">Term</span>
                                            </div>
                                            <p className="font-medium text-slate-900">{selectedLoan.term_months} months</p>
                                        </div>
                                    </div>

                                    {/* Financial Summary */}
                                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                                        <h4 className="font-semibold text-slate-900 mb-4">Financial Summary</h4>
                                        <div className="grid grid-cols-4 gap-4">
                                            <div>
                                                <p className="text-sm text-slate-500">Total Payable</p>
                                                <p className="text-lg font-bold text-slate-900">
                                                    KES {Number(selectedLoan.total_payable || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Total Paid</p>
                                                <p className="text-lg font-bold text-emerald-600">
                                                    KES {Number(selectedLoan.total_paid || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Outstanding</p>
                                                <p className="text-lg font-bold text-rose-600">
                                                    KES {Number(selectedLoan.outstanding_balance || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Monthly EMI</p>
                                                <p className="text-lg font-bold text-[#0066B3]">
                                                    KES {Number(selectedLoan.monthly_installment || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        {Number(selectedLoan.total_payable) > 0 && (
                                            <div className="mt-4">
                                                <div className="flex justify-between text-sm text-slate-600 mb-1">
                                                    <span>Repayment Progress</span>
                                                    <span>{Number(selectedLoan.total_payable) > 0 ? Math.round((Number(selectedLoan.total_paid) / Number(selectedLoan.total_payable)) * 100) : 0}%</span>
                                                </div>
                                                <div className="w-full h-3 bg-white rounded-full">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                                                        style={{ width: `${Number(selectedLoan.total_payable) > 0 ? (Number(selectedLoan.total_paid) / Number(selectedLoan.total_payable)) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Repayment Schedule */}
                                    {selectedLoan.repayments && selectedLoan.repayments.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-slate-900 mb-3">Repayment Schedule</h4>
                                            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="text-left px-4 py-2 text-slate-600">#</th>
                                                            <th className="text-left px-4 py-2 text-slate-600">Due Date</th>
                                                            <th className="text-right px-4 py-2 text-slate-600">Amount</th>
                                                            <th className="text-right px-4 py-2 text-slate-600">Paid</th>
                                                            <th className="text-left px-4 py-2 text-slate-600">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedLoan.repayments.map((r) => (
                                                            <tr key={r.id} className="border-t border-slate-100">
                                                                <td className="px-4 py-2">{r.installment_number}</td>
                                                                <td className="px-4 py-2">
                                                                    {new Date(r.due_date).toLocaleDateString('en-GB', {
                                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                                    })}
                                                                </td>
                                                                <td className="px-4 py-2 text-right font-medium">
                                                                    KES {Number(r.total_amount).toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-2 text-right text-emerald-600">
                                                                    KES {Number(r.paid_amount).toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                                            r.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                                                'bg-slate-100 text-slate-700'
                                                                        }`}>
                                                                        {r.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Approval Timeline */}
                                    {approvalInstance && (
                                        <div>
                                            <ApprovalTimeline instance={approvalInstance} variant="full" />
                                        </div>
                                    )}
                                </div>

                                {/* Right Column - Staff & Meta */}
                                <div className="space-y-4">
                                    {/* Staff Info */}
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-12 h-12 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-lg font-bold">
                                                {selectedLoan.staff?.first_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{selectedLoan.staff?.full_name}</p>
                                                <p className="text-sm text-slate-500">{selectedLoan.staff?.position?.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Building2 size={14} />
                                            {selectedLoan.staff?.branch?.name}
                                        </div>
                                    </div>

                                    {/* Guarantor */}
                                    {selectedLoan.guarantor && (
                                        <div className="p-4 bg-slate-50 rounded-lg">
                                            <p className="text-sm text-slate-500 mb-2">Guarantor</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-white text-sm font-bold">
                                                    {selectedLoan.guarantor.full_name?.charAt(0)}
                                                </div>
                                                <p className="font-medium text-slate-900">{selectedLoan.guarantor.full_name}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Purpose */}
                                    {selectedLoan.purpose && (
                                        <div className="p-4 bg-slate-50 rounded-lg">
                                            <p className="text-sm text-slate-500 mb-1">Purpose</p>
                                            <p className="text-slate-700">{selectedLoan.purpose}</p>
                                        </div>
                                    )}

                                    {/* Key Dates */}
                                    <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                                        <p className="text-sm font-medium text-slate-700 mb-2">Key Dates</p>
                                        {selectedLoan.approval_date && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Approved</span>
                                                <span className="text-slate-700">
                                                    {new Date(selectedLoan.approval_date).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                        )}
                                        {selectedLoan.disbursement_date && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Disbursed</span>
                                                <span className="text-slate-700">
                                                    {new Date(selectedLoan.disbursement_date).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                        )}
                                        {selectedLoan.first_repayment_date && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">First Payment</span>
                                                <span className="text-slate-700">
                                                    {new Date(selectedLoan.first_repayment_date).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                        )}
                                        {selectedLoan.maturity_date && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Maturity</span>
                                                <span className="text-slate-700">
                                                    {new Date(selectedLoan.maturity_date).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
                            {selectedLoan.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => cancelLoanMutation.mutate(selectedLoan.id)}
                                        disabled={cancelLoanMutation.isPending}
                                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2"
                                    >
                                        <XCircle size={18} />
                                        Cancel
                                    </button>
                                    {isManager && (
                                    <button
                                        onClick={() => setLoanDialogType('reject')}
                                        disabled={rejectLoanMutation.isPending}
                                        className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg font-medium flex items-center gap-2"
                                    >
                                        <XCircle size={18} />
                                        Reject
                                    </button>
                                    )}
                                </>
                            )}
                            {isManager && selectedLoan.status === 'approved' && (
                                <button
                                    onClick={() => setLoanDialogType('disburse')}
                                    disabled={disburseLoanMutation.isPending}
                                    className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-medium flex items-center gap-2"
                                >
                                    <DollarSign size={18} />
                                    Disburse Loan
                                </button>
                            )}
                            {isManager && (selectedLoan.status === 'active' || selectedLoan.status === 'disbursed') && Number(selectedLoan.outstanding_balance) > 0 && (
                                <button
                                    onClick={() => setLoanDialogType('payment')}
                                    disabled={recordPaymentMutation.isPending}
                                    className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-medium flex items-center gap-2"
                                >
                                    <CreditCard size={18} />
                                    Record Payment
                                </button>
                            )}
                            <div className="flex-1" />
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Loan Dialog */}
            <InputDialog
                isOpen={loanDialogType === 'reject'}
                title="Reject Loan"
                message="Please provide a reason for rejecting this loan."
                inputLabel="Rejection Reason"
                inputType="textarea"
                placeholder="Enter reason..."
                confirmLabel="Reject"
                onConfirm={(reason) => {
                    if (selectedLoan) {
                        rejectLoanMutation.mutate({ loanId: selectedLoan.id, reason });
                    }
                    setLoanDialogType(null);
                }}
                onCancel={() => setLoanDialogType(null)}
                isLoading={rejectLoanMutation.isPending}
            />

            {/* Disburse Loan Dialog */}
            <InputDialog
                isOpen={loanDialogType === 'disburse'}
                title="Disburse Loan"
                message="Enter the disbursement reference for this loan."
                inputLabel="Disbursement Reference"
                placeholder="Enter reference..."
                confirmLabel="Disburse"
                onConfirm={(reference) => {
                    if (selectedLoan) {
                        disburseLoanMutation.mutate({
                            loanId: selectedLoan.id,
                            disbursement_reference: reference,
                            disbursement_method: 'bank_transfer',
                        });
                    }
                    setLoanDialogType(null);
                }}
                onCancel={() => setLoanDialogType(null)}
                isLoading={disburseLoanMutation.isPending}
            />

            {/* Record Payment Dialog */}
            <InputDialog
                isOpen={loanDialogType === 'payment'}
                title="Record Loan Payment"
                message={`Enter payment reference. Outstanding balance: ${selectedLoan?.outstanding_balance}`}
                inputLabel="Payment Reference"
                placeholder="Enter payment reference..."
                confirmLabel="Record Payment"
                onConfirm={(reference) => {
                    if (selectedLoan) {
                        recordPaymentMutation.mutate({
                            loanId: selectedLoan.id,
                            amount: Number(selectedLoan.outstanding_balance),
                            payment_method: 'bank_transfer',
                            payment_reference: reference,
                        });
                    }
                    setLoanDialogType(null);
                }}
                onCancel={() => setLoanDialogType(null)}
                isLoading={recordPaymentMutation.isPending}
            />
        </div>
    );
};

export { LoansPage };
export default LoansPage;
