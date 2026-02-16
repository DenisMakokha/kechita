import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InputDialog } from '../components/ui/InputDialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useFormValidation, validators, fieldErrorClass } from '../hooks/useFormValidation';
import type { ValidationRules } from '../hooks/useFormValidation';
import { FieldError } from '../components/ui/FieldError';
import {
    Wallet, Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, FileText,
    AlertTriangle, Check, Clock, Calendar, Building2,
    User, Download, TrendingDown, X, CheckCircle, Search, BarChart3
} from 'lucide-react';
import { api } from '../lib/api';

interface PettyCashFloat {
    id: string;
    tier: string;
    maximum_limit: number;
    minimum_threshold: number;
    current_balance: number;
    is_active: boolean;
    branch: { id: string; name: string; code: string };
    custodian?: { id: string; first_name: string; last_name: string };
    needs_replenishment: boolean;
}

interface Transaction {
    id: string;
    transaction_number: string;
    type: string;
    category?: string;
    description: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    transaction_date: string;
    status: string;
    createdBy?: { first_name: string; last_name: string };
}

interface Replenishment {
    id: string;
    request_number: string;
    amount_requested: number;
    amount_approved?: number;
    status: string;
    justification?: string;
    requested_at: string;
    requestedBy: { first_name: string; last_name: string };
    float: { branch: { name: string } };
}

interface DashboardStats {
    total_floats: number;
    total_balance: number;
    floats_needing_replenishment: number;
    pending_replenishments: number;
    pending_replenishment_amount: number;
    total_expenses_this_month: number;
    variance_alerts: number;
}

type Tab = 'dashboard' | 'floats' | 'transactions' | 'replenishments';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        approved: 'bg-emerald-100 text-emerald-700',
        completed: 'bg-emerald-100 text-emerald-700',
        disbursed: 'bg-emerald-100 text-emerald-700',
        pending: 'bg-amber-100 text-amber-700',
        requested: 'bg-amber-100 text-amber-700',
        rejected: 'bg-red-100 text-red-700',
        cancelled: 'bg-slate-100 text-slate-600',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colors[status.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
};

export const PettyCashPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [selectedFloat, setSelectedFloat] = useState<string | null>(null);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showReplenishmentModal, setShowReplenishmentModal] = useState(false);
    const [showAddFloatModal, setShowAddFloatModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [pcDialogType, setPcDialogType] = useState<'reject-rep' | 'cancel-txn' | 'disburse-rep' | null>(null);
    const [pcDialogTargetId, setPcDialogTargetId] = useState<string | null>(null);
    const [deactivateFloatId, setDeactivateFloatId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Queries
    const { data: stats } = useQuery<DashboardStats>({
        queryKey: ['petty-cash-stats'],
        queryFn: () => api.get('/petty-cash/dashboard').then(r => r.data),
        refetchInterval: 30000,
    });

    const { data: floats = [] } = useQuery<PettyCashFloat[]>({
        queryKey: ['petty-cash-floats'],
        queryFn: () => api.get('/petty-cash/floats').then(r => r.data),
        refetchInterval: 60000,
    });

    const { data: transactions = [], isLoading: loadingTransactions } = useQuery<Transaction[]>({
        queryKey: ['petty-cash-transactions', selectedFloat],
        refetchInterval: 60000,
        queryFn: () => api.get('/petty-cash/transactions', { params: { float_id: selectedFloat } }).then(r => r.data),
        enabled: activeTab === 'transactions',
    });

    const { data: replenishments = [] } = useQuery<Replenishment[]>({
        queryKey: ['petty-cash-replenishments'],
        queryFn: () => api.get('/petty-cash/replenishments/pending').then(r => r.data),
        refetchInterval: 30000,
    });

    const { data: categories = [] } = useQuery<{ code: string; name: string }[]>({
        queryKey: ['petty-cash-categories'],
        queryFn: () => api.get('/petty-cash/categories').then(r => r.data),
    });

    // Mutations
    const approveReplenishmentMutation = useMutation({
        mutationFn: async ({ id, amount_approved }: { id: string; amount_approved?: number }) =>
            (await api.patch(`/petty-cash/replenishments/${id}/approve`, { amount_approved })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['petty-cash-replenishments'] });
            queryClient.invalidateQueries({ queryKey: ['petty-cash-floats'] });
            queryClient.invalidateQueries({ queryKey: ['petty-cash-stats'] });
            showToast('Replenishment approved');
        },
        onError: () => showToast('Failed to approve', 'error'),
    });

    const rejectReplenishmentMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
            (await api.patch(`/petty-cash/replenishments/${id}/reject`, { reason })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['petty-cash-replenishments'] });
            showToast('Replenishment rejected');
        },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to reject replenishment', 'error'),
    });

    const disburseReplenishmentMutation = useMutation({
        mutationFn: async ({ id, disbursement_method, reference_number }: { id: string; disbursement_method: string; reference_number?: string }) =>
            (await api.patch(`/petty-cash/replenishments/${id}/disburse`, { disbursement_method, reference_number })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['petty-cash-replenishments'] });
            queryClient.invalidateQueries({ queryKey: ['petty-cash-floats'] });
            queryClient.invalidateQueries({ queryKey: ['petty-cash-stats'] });
            showToast('Funds disbursed');
        },
    });

    const cancelTransactionMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
            (await api.patch(`/petty-cash/transactions/${id}/cancel`, { reason })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['petty-cash-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['petty-cash-floats'] });
            queryClient.invalidateQueries({ queryKey: ['petty-cash-stats'] });
            showToast('Transaction cancelled');
        },
    });

    const activateFloatMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/petty-cash/floats/${id}/activate`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['petty-cash-floats'] });
            showToast('Float activated');
        },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to activate float', 'error'),
    });

    const deactivateFloatMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/petty-cash/floats/${id}/deactivate`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['petty-cash-floats'] });
            showToast('Float deactivated');
        },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to deactivate float', 'error'),
    });

    const getTierColor = (tier: string) => {
        switch (tier.toLowerCase()) {
            case 'small': return 'bg-blue-100 text-blue-700';
            case 'medium': return 'bg-purple-100 text-purple-700';
            case 'large': return 'bg-emerald-100 text-emerald-700';
            case 'hq': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const tabs = [
        { id: 'dashboard' as Tab, label: 'Dashboard', icon: BarChart3 },
        { id: 'floats' as Tab, label: 'Branch Floats', icon: Building2 },
        { id: 'transactions' as Tab, label: 'Transactions', icon: FileText },
        { id: 'replenishments' as Tab, label: 'Replenishments', icon: RefreshCw },
    ];

    const filteredFloats = floats.filter(f =>
        f.branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.branch.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {toast && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
                    <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
                        {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-400" /> : <AlertTriangle size={18} />}
                        <span className="font-medium">{toast.text}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Petty Cash Management</h1>
                    <p className="text-slate-500">Manage branch floats, expenses, and replenishments</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => queryClient.invalidateQueries({ queryKey: ['petty-cash-stats'] })} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                        <RefreshCw size={20} />
                    </button>
                    <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]">
                        <ArrowUpRight size={20} />Record Expense
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg"><Wallet className="text-[#0066B3]" size={20} /></div>
                        <div><p className="text-lg font-bold text-slate-900">{formatCurrency(stats?.total_balance || 0)}</p><p className="text-xs text-slate-500">Total Balance</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg"><Building2 className="text-emerald-600" size={20} /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{stats?.total_floats || 0}</p><p className="text-xs text-slate-500">Active Floats</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg"><TrendingDown className="text-amber-600" size={20} /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{stats?.floats_needing_replenishment || 0}</p><p className="text-xs text-slate-500">Need Replenishment</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg"><Clock className="text-purple-600" size={20} /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{stats?.pending_replenishments || 0}</p><p className="text-xs text-slate-500">Pending Requests</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg"><ArrowUpRight className="text-red-600" size={20} /></div>
                        <div><p className="text-lg font-bold text-slate-900">{formatCurrency(stats?.total_expenses_this_month || 0)}</p><p className="text-xs text-slate-500">Expenses (Month)</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle className="text-orange-600" size={20} /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{stats?.variance_alerts || 0}</p><p className="text-xs text-slate-500">Variance Alerts</p></div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-slate-200 p-1.5 inline-flex gap-1 flex-wrap">
                {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id ? 'bg-[#0066B3] text-white shadow-lg shadow-blue-500/25' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <tab.icon size={18} />{tab.label}
                    </button>
                ))}
            </div>

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <button onClick={() => setShowExpenseModal(true)} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 text-left transition-all group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors"><ArrowUpRight className="text-[#0066B3]" size={20} /></div>
                                    <h3 className="font-medium text-slate-900">Record Expense</h3>
                                </div>
                                <p className="text-sm text-slate-500">Record a new petty cash expense</p>
                            </button>
                            <button onClick={() => setShowReplenishmentModal(true)} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-emerald-300 text-left transition-all group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors"><RefreshCw className="text-emerald-600" size={20} /></div>
                                    <h3 className="font-medium text-slate-900">Request Replenishment</h3>
                                </div>
                                <p className="text-sm text-slate-500">Request float top-up from HQ</p>
                            </button>
                            <button onClick={() => setActiveTab('transactions')} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-purple-300 text-left transition-all group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors"><FileText className="text-purple-600" size={20} /></div>
                                    <h3 className="font-medium text-slate-900">View Transactions</h3>
                                </div>
                                <p className="text-sm text-slate-500">Browse transaction ledger</p>
                            </button>
                        </div>
                    </div>

                    {/* Floats Needing Replenishment */}
                    {floats.filter(f => f.needs_replenishment).length > 0 && (
                        <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-amber-200 flex items-center gap-2">
                                <AlertTriangle className="text-amber-600" size={20} />
                                <h2 className="font-semibold text-amber-800">Floats Needing Replenishment</h2>
                            </div>
                            <div className="divide-y divide-amber-100">
                                {floats.filter(f => f.needs_replenishment).map(float => (
                                    <div key={float.id} className="px-6 py-3 flex items-center justify-between hover:bg-amber-100/50">
                                        <div>
                                            <p className="font-medium text-slate-900">{float.branch.name}</p>
                                            <p className="text-sm text-slate-500">Balance: {formatCurrency(float.current_balance)} / {formatCurrency(float.maximum_limit)}</p>
                                        </div>
                                        <button onClick={() => { setSelectedFloat(float.id); setShowReplenishmentModal(true); }} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200">
                                            Request
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Replenishments */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">Pending Replenishments</h2>
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{replenishments.filter(r => r.status === 'requested').length} pending</span>
                        </div>
                        {replenishments.filter(r => r.status === 'requested').length === 0 ? (
                            <div className="p-8 text-center"><CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No pending replenishments</p></div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {replenishments.filter(r => r.status === 'requested').slice(0, 5).map(rep => (
                                    <div key={rep.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium">{rep.requestedBy.first_name[0]}{rep.requestedBy.last_name[0]}</div>
                                            <div>
                                                <p className="font-medium text-slate-900">{rep.float.branch.name}</p>
                                                <p className="text-xs text-slate-500">{formatCurrency(rep.amount_requested)} • {rep.requestedBy.first_name} {rep.requestedBy.last_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => approveReplenishmentMutation.mutate({ id: rep.id, amount_approved: rep.amount_requested })} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200">Approve</button>
                                            <button onClick={() => { setPcDialogTargetId(rep.id); setPcDialogType('reject-rep'); }} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FLOATS TAB */}
            {activeTab === 'floats' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" placeholder="Search branches..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64" />
                        </div>
                        <button onClick={() => setShowAddFloatModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]">
                            <Plus size={18} />Add Float
                        </button>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredFloats.map(float => (
                            <div key={float.id} className={`bg-white rounded-xl border p-5 ${float.needs_replenishment ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-slate-900">{float.branch.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getTierColor(float.tier)}`}>{float.tier}</span>
                                </div>
                                <div className="mb-3">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">Balance</span>
                                        <span className="font-semibold text-slate-900">{formatCurrency(float.current_balance)}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#0066B3] rounded-full transition-all" style={{ width: `${Math.min((float.current_balance / float.maximum_limit) * 100, 100)}%` }} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Limit: {formatCurrency(float.maximum_limit)}</p>
                                </div>
                                {float.custodian && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                                        <User size={14} />
                                        <span>{float.custodian.first_name} {float.custodian.last_name}</span>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedFloat(float.id); setActiveTab('transactions'); }} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Transactions</button>
                                    <button onClick={() => { setSelectedFloat(float.id); setShowExpenseModal(true); }} className="flex-1 px-3 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]">Add Expense</button>
                                </div>
                                <div className="mt-2 flex gap-2">
                                    {float.is_active ? (
                                        <button onClick={() => setDeactivateFloatId(float.id)} className="flex-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">Deactivate</button>
                                    ) : (
                                        <button onClick={() => activateFloatMutation.mutate(float.id)} className="flex-1 px-3 py-1.5 border border-emerald-200 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-50">Activate</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Transaction Ledger</h2>
                        <div className="flex items-center gap-3">
                            <select value={selectedFloat || ''} onChange={e => setSelectedFloat(e.target.value || null)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                <option value="">All Floats</option>
                                {floats.map(f => <option key={f.id} value={f.id}>{f.branch.name}</option>)}
                            </select>
                            <button onClick={() => {
                                const csvContent = 'Date,Ref#,Type,Description,Amount,Balance,Status\n' + 
                                    transactions.map(t => `${new Date(t.transaction_date).toLocaleDateString('en-GB')},${t.transaction_number},${t.type},"${t.description}",${t.amount},${t.balance_after},${t.status}`).join('\n');
                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `petty-cash-transactions-${new Date().toISOString().split('T')[0]}.csv`;
                                a.click();
                                showToast('Transactions exported');
                            }} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                                <Download size={16} />Export
                            </button>
                        </div>
                    </div>
                    {loadingTransactions ? (
                        <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-2 border-[#0066B3] border-t-transparent rounded-full mx-auto" /></div>
                    ) : transactions.length === 0 ? (
                        <div className="p-12 text-center"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No transactions found</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Date</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Ref#</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Type</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Description</th>
                                        <th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">Amount</th>
                                        <th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">Balance</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
                                        <th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map(txn => (
                                        <tr key={txn.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-slate-600">{new Date(txn.transaction_date).toLocaleDateString('en-GB')}</td>
                                            <td className="px-6 py-4 font-mono text-sm text-slate-500">{txn.transaction_number}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${txn.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {txn.type === 'expense' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                                                    {txn.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-900">{txn.description}</td>
                                            <td className={`px-6 py-4 text-right font-medium ${txn.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {txn.type === 'expense' ? '-' : '+'}{formatCurrency(txn.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(txn.balance_after)}</td>
                                            <td className="px-6 py-4"><StatusBadge status={txn.status} /></td>
                                            <td className="px-6 py-4 text-right">
                                                {txn.status === 'pending' && (
                                                    <button onClick={() => { setPcDialogTargetId(txn.id); setPcDialogType('cancel-txn'); }} className="text-sm text-red-600 hover:text-red-700">Cancel</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* REPLENISHMENTS TAB */}
            {activeTab === 'replenishments' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Replenishment Requests</h2>
                        <button onClick={() => setShowReplenishmentModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]">
                            <Plus size={18} />New Request
                        </button>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {replenishments.map(rep => (
                            <div key={rep.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                                    <span className="font-mono text-sm text-[#0066B3] font-medium">{rep.request_number}</span>
                                    <StatusBadge status={rep.status} />
                                </div>
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Building2 size={14} /><span>{rep.float.branch.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Wallet size={14} /><span>Requested: <strong className="text-slate-900">{formatCurrency(rep.amount_requested)}</strong></span>
                                    </div>
                                    {rep.amount_approved && (
                                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                                            <Check size={14} /><span>Approved: <strong>{formatCurrency(rep.amount_approved)}</strong></span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <User size={14} /><span>{rep.requestedBy.first_name} {rep.requestedBy.last_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Calendar size={14} /><span>{new Date(rep.requested_at).toLocaleDateString('en-GB')}</span>
                                    </div>
                                </div>
                                {rep.status === 'requested' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => approveReplenishmentMutation.mutate({ id: rep.id, amount_approved: rep.amount_requested })} disabled={approveReplenishmentMutation.isPending} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                                        <button onClick={() => { setPcDialogTargetId(rep.id); setPcDialogType('reject-rep'); }} disabled={rejectReplenishmentMutation.isPending} className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">Reject</button>
                                    </div>
                                )}
                                {rep.status === 'approved' && (
                                    <button onClick={() => { setPcDialogTargetId(rep.id); setPcDialogType('disburse-rep'); }} disabled={disburseReplenishmentMutation.isPending} className="w-full px-3 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50">Disburse</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* EXPENSE MODAL */}
            {showExpenseModal && (
                <ExpenseModal
                    floats={floats}
                    categories={categories}
                    selectedFloat={selectedFloat}
                    onClose={() => setShowExpenseModal(false)}
                    onError={() => showToast('Failed to record expense', 'error')}
                    onSuccess={() => {
                        setShowExpenseModal(false);
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-transactions'] });
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-floats'] });
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-stats'] });
                        showToast('Expense recorded');
                    }}
                />
            )}

            {/* REPLENISHMENT MODAL */}
            {showReplenishmentModal && (
                <ReplenishmentModal
                    floats={floats}
                    selectedFloat={selectedFloat}
                    onClose={() => setShowReplenishmentModal(false)}
                    onError={() => showToast('Failed to submit request', 'error')}
                    onSuccess={() => {
                        setShowReplenishmentModal(false);
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-replenishments'] });
                        showToast('Replenishment request submitted');
                    }}
                />
            )}

            {/* ADD FLOAT MODAL */}
            {showAddFloatModal && (
                <AddFloatModal
                    onClose={() => setShowAddFloatModal(false)}
                    onError={() => showToast('Failed to create float', 'error')}
                    onSuccess={() => {
                        setShowAddFloatModal(false);
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-floats'] });
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-stats'] });
                        showToast('Float created successfully');
                    }}
                />
            )}

            {/* Reject Replenishment Dialog */}
            <InputDialog
                isOpen={pcDialogType === 'reject-rep'}
                title="Reject Replenishment"
                message="Please provide a reason for rejecting this replenishment request."
                inputLabel="Rejection Reason"
                inputType="textarea"
                placeholder="Enter reason..."
                confirmLabel="Reject"
                onConfirm={(reason) => {
                    if (pcDialogTargetId) {
                        rejectReplenishmentMutation.mutate({ id: pcDialogTargetId, reason });
                    }
                    setPcDialogType(null);
                    setPcDialogTargetId(null);
                }}
                onCancel={() => { setPcDialogType(null); setPcDialogTargetId(null); }}
                isLoading={rejectReplenishmentMutation.isPending}
            />

            {/* Cancel Transaction Dialog */}
            <InputDialog
                isOpen={pcDialogType === 'cancel-txn'}
                title="Cancel Transaction"
                message="Please provide a reason for cancelling this transaction."
                inputLabel="Cancellation Reason"
                inputType="textarea"
                placeholder="Enter reason..."
                confirmLabel="Cancel Transaction"
                onConfirm={(reason) => {
                    if (pcDialogTargetId) {
                        cancelTransactionMutation.mutate({ id: pcDialogTargetId, reason });
                    }
                    setPcDialogType(null);
                    setPcDialogTargetId(null);
                }}
                onCancel={() => { setPcDialogType(null); setPcDialogTargetId(null); }}
                isLoading={cancelTransactionMutation.isPending}
            />

            {/* Disburse Replenishment Dialog */}
            <InputDialog
                isOpen={pcDialogType === 'disburse-rep'}
                title="Disburse Replenishment"
                message="Enter the disbursement reference number."
                inputLabel="Disbursement Reference"
                placeholder="Enter reference..."
                confirmLabel="Disburse"
                required={false}
                onConfirm={(reference) => {
                    if (pcDialogTargetId) {
                        disburseReplenishmentMutation.mutate({ id: pcDialogTargetId, disbursement_method: 'cash', reference_number: reference || undefined });
                    }
                    setPcDialogType(null);
                    setPcDialogTargetId(null);
                }}
                onCancel={() => { setPcDialogType(null); setPcDialogTargetId(null); }}
                isLoading={disburseReplenishmentMutation.isPending}
            />

            {/* Deactivate Float Dialog */}
            <ConfirmDialog
                isOpen={!!deactivateFloatId}
                title="Deactivate Float"
                message="Are you sure you want to deactivate this float? It will no longer accept transactions."
                confirmLabel="Deactivate"
                variant="danger"
                onConfirm={() => { if (deactivateFloatId) deactivateFloatMutation.mutate(deactivateFloatId); setDeactivateFloatId(null); }}
                onCancel={() => setDeactivateFloatId(null)}
                isLoading={deactivateFloatMutation.isPending}
            />
        </div>
    );
};

// Expense Modal
const ExpenseModal: React.FC<{
    floats: PettyCashFloat[];
    categories: { code: string; name: string }[];
    selectedFloat: string | null;
    onClose: () => void;
    onError: () => void;
    onSuccess: () => void;
}> = ({ floats, categories, selectedFloat, onClose, onError, onSuccess }) => {
    const [formData, setFormData] = useState({
        float_id: selectedFloat || '',
        category: '',
        description: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        receipt_number: '',
    });

    const expenseRules = useMemo<ValidationRules<typeof formData>>(() => ({
        float_id: [v => validators.required(v, 'Branch float')],
        category: [v => validators.required(v, 'Category')],
        description: [v => validators.required(v, 'Description')],
        amount: [v => validators.required(v, 'Amount'), validators.positiveNumber('Amount')],
        transaction_date: [v => validators.required(v, 'Date')],
    }), []);
    const ev = useFormValidation(expenseRules);

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/petty-cash/expenses', data),
        onSuccess,
        onError,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ev.validateAll(formData)) return;
        mutation.mutate({ ...formData, amount: parseFloat(formData.amount) });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Record Expense</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Branch Float</label>
                        <select value={formData.float_id} onChange={e => { setFormData({ ...formData, float_id: e.target.value }); ev.onChange('float_id', e.target.value); }} onBlur={() => ev.onBlur('float_id', formData.float_id)} className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(ev.getFieldError('float_id'))}`}>
                            <option value="">Select Float</option>
                            {floats.map(f => <option key={f.id} value={f.id}>{f.branch.name} ({formatCurrency(f.current_balance)})</option>)}
                        </select>
                        <FieldError error={ev.getFieldError('float_id')} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                        <select value={formData.category} onChange={e => { setFormData({ ...formData, category: e.target.value }); ev.onChange('category', e.target.value); }} onBlur={() => ev.onBlur('category', formData.category)} className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(ev.getFieldError('category'))}`}>
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                        <FieldError error={ev.getFieldError('category')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (KES)</label>
                            <input type="number" value={formData.amount} onChange={e => { setFormData({ ...formData, amount: e.target.value }); ev.onChange('amount', e.target.value); }} onBlur={() => ev.onBlur('amount', formData.amount)} min="0" step="0.01" className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(ev.getFieldError('amount'))}`} />
                            <FieldError error={ev.getFieldError('amount')} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input type="date" value={formData.transaction_date} onChange={e => { setFormData({ ...formData, transaction_date: e.target.value }); ev.onChange('transaction_date', e.target.value); }} onBlur={() => ev.onBlur('transaction_date', formData.transaction_date)} className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(ev.getFieldError('transaction_date'))}`} />
                            <FieldError error={ev.getFieldError('transaction_date')} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <input type="text" value={formData.description} onChange={e => { setFormData({ ...formData, description: e.target.value }); ev.onChange('description', e.target.value); }} onBlur={() => ev.onBlur('description', formData.description)} placeholder="Purpose of expense" className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(ev.getFieldError('description'))}`} />
                        <FieldError error={ev.getFieldError('description')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                            <input type="text" value={formData.vendor_name} onChange={e => setFormData({ ...formData, vendor_name: e.target.value })} placeholder="Vendor name" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Receipt #</label>
                            <input type="text" value={formData.receipt_number} onChange={e => setFormData({ ...formData, receipt_number: e.target.value })} placeholder="Receipt number" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50">{mutation.isPending ? 'Saving...' : 'Record Expense'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Replenishment Modal
const ReplenishmentModal: React.FC<{
    floats: PettyCashFloat[];
    selectedFloat: string | null;
    onClose: () => void;
    onError: () => void;
    onSuccess: () => void;
}> = ({ floats, selectedFloat, onClose, onError, onSuccess }) => {
    const [formData, setFormData] = useState({
        float_id: selectedFloat || '',
        amount_requested: '',
        justification: '',
    });

    const repRules = useMemo<ValidationRules<typeof formData>>(() => ({
        float_id: [v => validators.required(v, 'Branch float')],
        amount_requested: [v => validators.required(v, 'Amount'), validators.positiveNumber('Amount')],
        justification: [v => validators.required(v, 'Justification')],
    }), []);
    const rv = useFormValidation(repRules);

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/petty-cash/replenishments', data),
        onSuccess,
        onError,
    });

    const selectedFloatData = floats.find(f => f.id === formData.float_id);
    const maxReplenishment = selectedFloatData ? selectedFloatData.maximum_limit - selectedFloatData.current_balance : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rv.validateAll(formData)) return;
        mutation.mutate({ ...formData, amount_requested: parseFloat(formData.amount_requested) });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Request Replenishment</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Branch Float</label>
                        <select value={formData.float_id} onChange={e => { setFormData({ ...formData, float_id: e.target.value }); rv.onChange('float_id', e.target.value); }} onBlur={() => rv.onBlur('float_id', formData.float_id)} className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(rv.getFieldError('float_id'))}`}>
                            <option value="">Select Float</option>
                            {floats.map(f => <option key={f.id} value={f.id}>{f.branch.name} (Balance: {formatCurrency(f.current_balance)})</option>)}
                        </select>
                        <FieldError error={rv.getFieldError('float_id')} />
                    </div>
                    {selectedFloatData && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div><p className="text-slate-500">Current Balance</p><p className="font-semibold text-slate-900">{formatCurrency(selectedFloatData.current_balance)}</p></div>
                                <div><p className="text-slate-500">Maximum Limit</p><p className="font-semibold text-slate-900">{formatCurrency(selectedFloatData.maximum_limit)}</p></div>
                                <div><p className="text-slate-500">Max Request</p><p className="font-semibold text-[#0066B3]">{formatCurrency(maxReplenishment)}</p></div>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount Requested (KES)</label>
                        <input type="number" value={formData.amount_requested} onChange={e => { setFormData({ ...formData, amount_requested: e.target.value }); rv.onChange('amount_requested', e.target.value); }} onBlur={() => rv.onBlur('amount_requested', formData.amount_requested)} max={maxReplenishment} min="0" step="0.01" className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(rv.getFieldError('amount_requested'))}`} />
                        <FieldError error={rv.getFieldError('amount_requested')} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Justification</label>
                        <textarea value={formData.justification} onChange={e => { setFormData({ ...formData, justification: e.target.value }); rv.onChange('justification', e.target.value); }} onBlur={() => rv.onBlur('justification', formData.justification)} placeholder="Reason for replenishment request" rows={3} className={`w-full px-4 py-2.5 border rounded-lg resize-none ${fieldErrorClass(rv.getFieldError('justification'))}`} />
                        <FieldError error={rv.getFieldError('justification')} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50">{mutation.isPending ? 'Submitting...' : 'Submit Request'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Add Float Modal
const AddFloatModal: React.FC<{
    onClose: () => void;
    onError: () => void;
    onSuccess: () => void;
}> = ({ onClose, onError, onSuccess }) => {
    const [formData, setFormData] = useState({
        branch_id: '',
        tier: 'small',
        maximum_limit: '',
        minimum_threshold: '',
        custodian_id: '',
    });

    const floatRules = useMemo<ValidationRules<typeof formData>>(() => ({
        branch_id: [v => validators.required(v, 'Branch')],
        maximum_limit: [v => validators.required(v, 'Maximum limit'), validators.positiveNumber('Maximum limit')],
        minimum_threshold: [v => validators.required(v, 'Minimum threshold'), validators.positiveNumber('Minimum threshold')],
        custodian_id: [v => validators.required(v, 'Custodian')],
    }), []);
    const fv = useFormValidation(floatRules);

    const { data: branches = [] } = useQuery<{ id: string; name: string; code: string }[]>({
        queryKey: ['branches'],
        queryFn: () => api.get('/org/branches').then(r => r.data),
    });

    const { data: staff = [] } = useQuery<{ id: string; first_name: string; last_name: string; employee_number: string }[]>({
        queryKey: ['staff-list'],
        queryFn: () => api.get('/staff?limit=500').then(r => r.data?.data || r.data || []),
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/petty-cash/floats', data),
        onSuccess,
        onError,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fv.validateAll(formData)) return;
        mutation.mutate({
            ...formData,
            maximum_limit: parseFloat(formData.maximum_limit),
            minimum_threshold: parseFloat(formData.minimum_threshold),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Add New Float</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                        <select value={formData.branch_id} onChange={e => { setFormData({ ...formData, branch_id: e.target.value }); fv.onChange('branch_id', e.target.value); }} onBlur={() => fv.onBlur('branch_id', formData.branch_id)} className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(fv.getFieldError('branch_id'))}`}>
                            <option value="">Select Branch</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                        </select>
                        <FieldError error={fv.getFieldError('branch_id')} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tier</label>
                        <select value={formData.tier} onChange={e => setFormData({ ...formData, tier: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg">
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                            <option value="hq">HQ</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Maximum Limit (KES)</label>
                            <input type="number" value={formData.maximum_limit} onChange={e => { setFormData({ ...formData, maximum_limit: e.target.value }); fv.onChange('maximum_limit', e.target.value); }} onBlur={() => fv.onBlur('maximum_limit', formData.maximum_limit)} min="0" step="0.01" className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(fv.getFieldError('maximum_limit'))}`} placeholder="e.g., 50000" />
                            <FieldError error={fv.getFieldError('maximum_limit')} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Min Threshold (KES)</label>
                            <input type="number" value={formData.minimum_threshold} onChange={e => { setFormData({ ...formData, minimum_threshold: e.target.value }); fv.onChange('minimum_threshold', e.target.value); }} onBlur={() => fv.onBlur('minimum_threshold', formData.minimum_threshold)} min="0" step="0.01" className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(fv.getFieldError('minimum_threshold'))}`} placeholder="e.g., 10000" />
                            <FieldError error={fv.getFieldError('minimum_threshold')} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Custodian</label>
                        <select value={formData.custodian_id} onChange={e => setFormData({ ...formData, custodian_id: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg">
                            <option value="">Select Custodian (Optional)</option>
                            {staff.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.employee_number})</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50">{mutation.isPending ? 'Creating...' : 'Create Float'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PettyCashPage;
