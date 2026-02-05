import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ApprovalTimeline } from '../components/ApprovalTimeline';
import {
    Plus, Receipt, DollarSign, CheckCircle, XCircle, Clock,
    FileText, Eye, Calendar, Building2, User, CreditCard,
    Filter, Search, ChevronDown, X, Upload, Trash2, AlertTriangle,
    TrendingUp, Wallet, BarChart3
} from 'lucide-react';

interface ClaimType {
    id: string;
    code: string;
    name: string;
    description?: string;
    max_amount_per_claim?: number;
    requires_receipt: boolean;
    color?: string;
    icon?: string;
}

interface ClaimItem {
    id: string;
    description: string;
    amount: number;
    expense_date?: string;
    quantity?: number;
    unit_price?: number;
    unit?: string;
    receipt_number?: string;
    vendor_name?: string;
    status: string;
    approved_amount: number;
    claimType: ClaimType;
}

interface Claim {
    id: string;
    claim_number: string;
    claim_date: string;
    period_start?: string;
    period_end?: string;
    total_amount: number;
    approved_amount: number;
    paid_amount: number;
    currency: string;
    status: string;
    purpose?: string;
    is_urgent: boolean;
    submitted_at?: string;
    approved_at?: string;
    rejected_at?: string;
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
    items?: ClaimItem[];
}

interface ClaimFormItem {
    claim_type_id: string;
    description: string;
    amount: number;
    expense_date: string;
    quantity: number;
    unit_price: number;
    unit: string;
    receipt_number: string;
    vendor_name: string;
}

export const ClaimsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'all' | 'my' | 'pending'>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        purpose: '',
        period_start: '',
        period_end: '',
        is_urgent: false,
        items: [] as ClaimFormItem[],
    });

    // Queries
    const { data: claimTypes } = useQuery<ClaimType[]>({
        queryKey: ['claim-types'],
        queryFn: async () => (await api.get('/claims/types')).data,
    });

    const { data: myClaims } = useQuery<Claim[]>({
        queryKey: ['my-claims'],
        queryFn: async () => (await api.get('/claims/my')).data,
    });

    const { data: allClaims, isLoading } = useQuery<Claim[]>({
        queryKey: ['all-claims'],
        queryFn: async () => (await api.get('/claims')).data,
    });

    const { data: myStats } = useQuery({
        queryKey: ['my-claim-stats'],
        queryFn: async () => (await api.get('/claims/my/stats')).data,
    });

    const { data: approvalInstance } = useQuery({
        queryKey: ['claim-approval', selectedClaim?.id],
        queryFn: async () => (await api.get(`/approvals/target/claim/${selectedClaim?.id}`)).data,
        enabled: !!selectedClaim?.id,
    });

    // Mutations
    const submitClaimMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await api.post('/claims', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-claims'] });
            queryClient.invalidateQueries({ queryKey: ['all-claims'] });
            queryClient.invalidateQueries({ queryKey: ['my-claim-stats'] });
            setShowSubmitModal(false);
            resetForm();
        },
    });

    const cancelClaimMutation = useMutation({
        mutationFn: async (claimId: string) => {
            const response = await api.patch(`/claims/${claimId}/cancel`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-claims'] });
            queryClient.invalidateQueries({ queryKey: ['all-claims'] });
            setShowDetailModal(false);
        },
    });

    const resetForm = () => {
        setFormData({
            purpose: '',
            period_start: '',
            period_end: '',
            is_urgent: false,
            items: [],
        });
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    claim_type_id: claimTypes?.[0]?.id || '',
                    description: '',
                    amount: 0,
                    expense_date: new Date().toISOString().split('T')[0],
                    quantity: 1,
                    unit_price: 0,
                    unit: '',
                    receipt_number: '',
                    vendor_name: '',
                },
            ],
        }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const updateItem = (index: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            ),
        }));
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'paid': return 'bg-green-100 text-green-700 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'submitted':
            case 'under_review': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
            case 'paid': return <CheckCircle className="text-emerald-500" size={16} />;
            case 'rejected': return <XCircle className="text-red-500" size={16} />;
            case 'submitted':
            case 'under_review': return <Clock className="text-amber-500" size={16} />;
            default: return <FileText className="text-slate-500" size={16} />;
        }
    };

    const displayClaims = activeTab === 'my' ? myClaims : activeTab === 'pending'
        ? allClaims?.filter(c => c.status === 'submitted' || c.status === 'under_review')
        : allClaims;

    const filteredClaims = displayClaims?.filter(claim => {
        if (statusFilter !== 'all' && claim.status !== statusFilter) return false;
        if (searchQuery) {
            const search = searchQuery.toLowerCase();
            return (
                claim.claim_number?.toLowerCase().includes(search) ||
                claim.staff?.full_name?.toLowerCase().includes(search) ||
                claim.purpose?.toLowerCase().includes(search)
            );
        }
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Receipt className="text-purple-500" size={28} />
                        Claims Management
                    </h1>
                    <p className="text-slate-500">Submit and track expense claims</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowSubmitModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus size={20} />
                    Submit Claim
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <Wallet size={24} className="opacity-80" />
                        <TrendingUp size={20} className="opacity-60" />
                    </div>
                    <p className="text-3xl font-bold">
                        {myStats?.total || 0}
                    </p>
                    <p className="text-purple-100 text-sm">Total Claims</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <Clock size={24} className="opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">
                        {myStats?.pending || 0}
                    </p>
                    <p className="text-amber-100 text-sm">Pending</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <CheckCircle size={24} className="opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">
                        {myStats?.approved || 0}
                    </p>
                    <p className="text-emerald-100 text-sm">Approved</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <DollarSign size={24} className="opacity-80" />
                    </div>
                    <p className="text-2xl font-bold">
                        KES {(myStats?.approvedAmount || 0).toLocaleString()}
                    </p>
                    <p className="text-blue-100 text-sm">Approved Amount</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <CreditCard size={24} className="opacity-80" />
                    </div>
                    <p className="text-2xl font-bold">
                        KES {(myStats?.paidAmount || 0).toLocaleString()}
                    </p>
                    <p className="text-green-100 text-sm">Paid Amount</p>
                </div>
            </div>

            {/* By Type Breakdown */}
            {myStats?.byType && myStats.byType.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-purple-500" />
                        Claims by Type
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {myStats.byType.map((t: any) => (
                            <div key={t.type} className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg">
                                <Receipt size={16} className="text-purple-500" />
                                <div>
                                    <p className="font-medium text-slate-900">{t.type}</p>
                                    <p className="text-xs text-slate-500">
                                        {t.count} claims · KES {(t.amount || 0).toLocaleString()}
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
                        { key: 'all', label: 'All Claims' },
                        { key: 'my', label: 'My Claims' },
                        { key: 'pending', label: 'Pending Review' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            {tab.label}
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
                            placeholder="Search claims..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="paid">Paid</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Claims Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Claim #</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Staff</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Items</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Amount</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
                                        <span>Loading claims...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredClaims?.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Receipt className="text-slate-300" size={48} />
                                        <p className="text-slate-500">No claims found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredClaims?.map((claim) => (
                                <tr
                                    key={claim.id}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => { setSelectedClaim(claim); setShowDetailModal(true); }}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {claim.is_urgent && (
                                                <AlertTriangle className="text-red-500" size={16} />
                                            )}
                                            <span className="font-mono text-sm text-purple-600">
                                                {claim.claim_number}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                                {claim.staff?.first_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{claim.staff?.full_name}</p>
                                                <p className="text-xs text-slate-500">{claim.staff?.branch?.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {new Date(claim.claim_date).toLocaleDateString('en-GB', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {claim.items?.length || 0} items
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-900">
                                                {claim.currency} {Number(claim.total_amount).toLocaleString()}
                                            </p>
                                            {Number(claim.approved_amount) > 0 && (
                                                <p className="text-xs text-emerald-600">
                                                    Approved: {Number(claim.approved_amount).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                                            {getStatusIcon(claim.status)}
                                            <span className="capitalize">{claim.status.replace('_', ' ')}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedClaim(claim); setShowDetailModal(true); }}
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

            {/* Submit Claim Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50">
                            <h2 className="text-xl font-bold text-slate-900">Submit New Claim</h2>
                            <button onClick={() => setShowSubmitModal(false)} className="p-2 hover:bg-white rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Claim Details */}
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Purpose / Description
                                    </label>
                                    <textarea
                                        value={formData.purpose}
                                        onChange={(e) => setFormData(p => ({ ...p, purpose: e.target.value }))}
                                        rows={2}
                                        placeholder="Brief description of the expense claim..."
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Period Start
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.period_start}
                                            onChange={(e) => setFormData(p => ({ ...p, period_start: e.target.value }))}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Period End
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.period_end}
                                            onChange={(e) => setFormData(p => ({ ...p, period_end: e.target.value }))}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_urgent"
                                        checked={formData.is_urgent}
                                        onChange={(e) => setFormData(p => ({ ...p, is_urgent: e.target.checked }))}
                                        className="w-4 h-4 text-purple-600 rounded"
                                    />
                                    <label htmlFor="is_urgent" className="text-sm text-slate-700">
                                        Mark as urgent
                                    </label>
                                </div>
                            </div>

                            {/* Claim Items */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-slate-900">Claim Items</h3>
                                    <button
                                        onClick={addItem}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200"
                                    >
                                        <Plus size={16} />
                                        Add Item
                                    </button>
                                </div>

                                {formData.items.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                        <Receipt className="text-slate-300 mx-auto mb-2" size={32} />
                                        <p className="text-slate-500">No items added yet</p>
                                        <button
                                            onClick={addItem}
                                            className="mt-2 text-purple-600 font-medium text-sm hover:underline"
                                        >
                                            Add your first item
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {formData.items.map((item, index) => (
                                            <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                                                <div className="flex items-start justify-between gap-4 mb-4">
                                                    <div className="flex-1">
                                                        <label className="block text-xs text-slate-500 mb-1">Type</label>
                                                        <select
                                                            value={item.claim_type_id}
                                                            onChange={(e) => updateItem(index, 'claim_type_id', e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                                                        >
                                                            {claimTypes?.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="col-span-2">
                                                        <label className="block text-xs text-slate-500 mb-1">Description</label>
                                                        <input
                                                            type="text"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                            placeholder="What was this expense for?"
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">Amount (KES)</label>
                                                        <input
                                                            type="number"
                                                            value={item.amount}
                                                            onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                                            placeholder="0"
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">Date</label>
                                                        <input
                                                            type="date"
                                                            value={item.expense_date}
                                                            onChange={(e) => updateItem(index, 'expense_date', e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">Receipt #</label>
                                                        <input
                                                            type="text"
                                                            value={item.receipt_number}
                                                            onChange={(e) => updateItem(index, 'receipt_number', e.target.value)}
                                                            placeholder="Receipt number"
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">Vendor</label>
                                                        <input
                                                            type="text"
                                                            value={item.vendor_name}
                                                            onChange={(e) => updateItem(index, 'vendor_name', e.target.value)}
                                                            placeholder="Vendor name"
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Total */}
                            <div className="bg-purple-50 rounded-xl p-4 flex items-center justify-between">
                                <span className="font-semibold text-slate-900">Total Amount</span>
                                <span className="text-2xl font-bold text-purple-700">
                                    KES {calculateTotal().toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => submitClaimMutation.mutate(formData)}
                                disabled={formData.items.length === 0 || submitClaimMutation.isPending}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {submitClaimMutation.isPending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Submit Claim
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Claim Detail Modal */}
            {showDetailModal && selectedClaim && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className={`flex items-center justify-between px-6 py-4 border-b ${selectedClaim.status === 'approved' || selectedClaim.status === 'paid'
                                ? 'bg-gradient-to-r from-emerald-50 to-green-50'
                                : selectedClaim.status === 'rejected'
                                    ? 'bg-gradient-to-r from-red-50 to-rose-50'
                                    : 'bg-gradient-to-r from-purple-50 to-pink-50'
                            }`}>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Claim {selectedClaim.claim_number}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Submitted on {new Date(selectedClaim.claim_date).toLocaleDateString('en-GB', {
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
                            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${getStatusColor(selectedClaim.status)} border`}>
                                {getStatusIcon(selectedClaim.status)}
                                <div>
                                    <p className="font-semibold capitalize">
                                        {selectedClaim.status.replace('_', ' ')}
                                    </p>
                                    {selectedClaim.rejection_reason && (
                                        <p className="text-sm opacity-80">{selectedClaim.rejection_reason}</p>
                                    )}
                                    {selectedClaim.approval_comment && (
                                        <p className="text-sm opacity-80">{selectedClaim.approval_comment}</p>
                                    )}
                                </div>
                            </div>

                            {/* Claim Info */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User size={16} className="text-slate-400" />
                                        <span className="text-sm text-slate-500">Staff</span>
                                    </div>
                                    <p className="font-medium text-slate-900">{selectedClaim.staff?.full_name}</p>
                                    <p className="text-xs text-slate-500">{selectedClaim.staff?.position?.name}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Building2 size={16} className="text-slate-400" />
                                        <span className="text-sm text-slate-500">Branch</span>
                                    </div>
                                    <p className="font-medium text-slate-900">{selectedClaim.staff?.branch?.name}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <DollarSign size={16} className="text-slate-400" />
                                        <span className="text-sm text-slate-500">Total Amount</span>
                                    </div>
                                    <p className="text-xl font-bold text-slate-900">
                                        {selectedClaim.currency} {Number(selectedClaim.total_amount).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle size={16} className="text-slate-400" />
                                        <span className="text-sm text-slate-500">Approved Amount</span>
                                    </div>
                                    <p className="text-xl font-bold text-emerald-600">
                                        {selectedClaim.currency} {Number(selectedClaim.approved_amount).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Purpose */}
                            {selectedClaim.purpose && (
                                <div className="mb-6">
                                    <h4 className="font-semibold text-slate-900 mb-2">Purpose</h4>
                                    <p className="text-slate-600">{selectedClaim.purpose}</p>
                                </div>
                            )}

                            {/* Items */}
                            <div className="mb-6">
                                <h4 className="font-semibold text-slate-900 mb-3">Items ({selectedClaim.items?.length || 0})</h4>
                                <div className="space-y-2">
                                    {selectedClaim.items?.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg">
                                                    <Receipt size={16} className="text-purple-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{item.description}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {item.claimType?.name}
                                                        {item.vendor_name && ` · ${item.vendor_name}`}
                                                        {item.receipt_number && ` · #${item.receipt_number}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-slate-900">
                                                    KES {Number(item.amount).toLocaleString()}
                                                </p>
                                                {Number(item.approved_amount) > 0 && (
                                                    <p className="text-xs text-emerald-600">
                                                        Approved: {Number(item.approved_amount).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Approval Timeline */}
                            {approvalInstance && (
                                <div className="mb-6">
                                    <ApprovalTimeline instance={approvalInstance} variant="full" />
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                            {selectedClaim.status === 'submitted' && (
                                <button
                                    onClick={() => cancelClaimMutation.mutate(selectedClaim.id)}
                                    disabled={cancelClaimMutation.isPending}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2"
                                >
                                    <XCircle size={18} />
                                    Cancel Claim
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
        </div>
    );
};
