import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Wallet, Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, FileText,
    AlertTriangle, Check, Clock, Calendar, DollarSign, Building2,
    User, Search, Filter, Download, TrendingUp, TrendingDown
} from 'lucide-react';
import { api } from '../lib/api';
import '../styles/petty-cash.css';

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

export const PettyCashPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'floats' | 'transactions' | 'replenishments' | 'reconcile'>('dashboard');
    const [selectedFloat, setSelectedFloat] = useState<string | null>(null);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showReplenishmentModal, setShowReplenishmentModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const queryClient = useQueryClient();

    // Queries
    const { data: stats } = useQuery<DashboardStats>({
        queryKey: ['petty-cash-stats'],
        queryFn: () => api.get('/petty-cash/dashboard').then(r => r.data),
    });

    const { data: floats = [] } = useQuery<PettyCashFloat[]>({
        queryKey: ['petty-cash-floats'],
        queryFn: () => api.get('/petty-cash/floats').then(r => r.data),
    });

    const { data: transactions = [] } = useQuery<Transaction[]>({
        queryKey: ['petty-cash-transactions', selectedFloat],
        queryFn: () => api.get('/petty-cash/transactions', { params: { float_id: selectedFloat } }).then(r => r.data),
        enabled: activeTab === 'transactions',
    });

    const { data: replenishments = [] } = useQuery<Replenishment[]>({
        queryKey: ['petty-cash-replenishments'],
        queryFn: () => api.get('/petty-cash/replenishments/pending').then(r => r.data),
    });

    const { data: categories = [] } = useQuery<{ code: string; name: string }[]>({
        queryKey: ['petty-cash-categories'],
        queryFn: () => api.get('/petty-cash/categories').then(r => r.data),
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved': case 'completed': case 'disbursed': return 'status-success';
            case 'pending': case 'requested': return 'status-warning';
            case 'rejected': case 'variance_noted': return 'status-danger';
            default: return 'status-default';
        }
    };

    const renderDashboard = () => (
        <div className="pc-dashboard">
            <div className="pc-stats-grid">
                <div className="pc-stat-card">
                    <div className="pc-stat-icon primary">
                        <Wallet size={24} />
                    </div>
                    <div className="pc-stat-content">
                        <span className="pc-stat-value">{formatCurrency(stats?.total_balance || 0)}</span>
                        <span className="pc-stat-label">Total Balance</span>
                    </div>
                </div>
                <div className="pc-stat-card">
                    <div className="pc-stat-icon success">
                        <Building2 size={24} />
                    </div>
                    <div className="pc-stat-content">
                        <span className="pc-stat-value">{stats?.total_floats || 0}</span>
                        <span className="pc-stat-label">Active Floats</span>
                    </div>
                </div>
                <div className="pc-stat-card warning">
                    <div className="pc-stat-icon warning">
                        <TrendingDown size={24} />
                    </div>
                    <div className="pc-stat-content">
                        <span className="pc-stat-value">{stats?.floats_needing_replenishment || 0}</span>
                        <span className="pc-stat-label">Need Replenishment</span>
                    </div>
                </div>
                <div className="pc-stat-card">
                    <div className="pc-stat-icon info">
                        <Clock size={24} />
                    </div>
                    <div className="pc-stat-content">
                        <span className="pc-stat-value">{stats?.pending_replenishments || 0}</span>
                        <span className="pc-stat-label">Pending Requests</span>
                    </div>
                </div>
                <div className="pc-stat-card">
                    <div className="pc-stat-icon danger">
                        <ArrowUpRight size={24} />
                    </div>
                    <div className="pc-stat-content">
                        <span className="pc-stat-value">{formatCurrency(stats?.total_expenses_this_month || 0)}</span>
                        <span className="pc-stat-label">Expenses This Month</span>
                    </div>
                </div>
                <div className="pc-stat-card">
                    <div className="pc-stat-icon alert">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="pc-stat-content">
                        <span className="pc-stat-value">{stats?.variance_alerts || 0}</span>
                        <span className="pc-stat-label">Variance Alerts</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="pc-quick-actions">
                <h3>Quick Actions</h3>
                <div className="pc-action-buttons">
                    <button className="pc-action-btn primary" onClick={() => setShowExpenseModal(true)}>
                        <ArrowUpRight size={20} />
                        Record Expense
                    </button>
                    <button className="pc-action-btn success" onClick={() => setShowReplenishmentModal(true)}>
                        <RefreshCw size={20} />
                        Request Replenishment
                    </button>
                    <button className="pc-action-btn info" onClick={() => setShowReconcileModal(true)}>
                        <FileText size={20} />
                        Cash Count
                    </button>
                </div>
            </div>

            {/* Floats needing attention */}
            {floats.filter(f => f.needs_replenishment).length > 0 && (
                <div className="pc-alerts-section">
                    <h3><AlertTriangle size={20} /> Floats Needing Replenishment</h3>
                    <div className="pc-alert-list">
                        {floats.filter(f => f.needs_replenishment).map(float => (
                            <div key={float.id} className="pc-alert-item">
                                <div className="pc-alert-info">
                                    <strong>{float.branch.name}</strong>
                                    <span>Balance: {formatCurrency(float.current_balance)} / {formatCurrency(float.maximum_limit)}</span>
                                </div>
                                <button className="pc-btn-sm" onClick={() => {
                                    setSelectedFloat(float.id);
                                    setShowReplenishmentModal(true);
                                }}>
                                    Request
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderFloats = () => (
        <div className="pc-floats-section">
            <div className="pc-section-header">
                <h3>Branch Floats</h3>
                <button className="pc-btn primary">
                    <Plus size={18} /> Add Float
                </button>
            </div>
            <div className="pc-floats-grid">
                {floats.map(float => (
                    <div key={float.id} className={`pc-float-card ${float.needs_replenishment ? 'warning' : ''}`}>
                        <div className="pc-float-header">
                            <h4>{float.branch.name}</h4>
                            <span className={`pc-tier-badge ${float.tier.toLowerCase()}`}>{float.tier}</span>
                        </div>
                        <div className="pc-float-balance">
                            <div className="pc-balance-bar">
                                <div
                                    className="pc-balance-fill"
                                    style={{ width: `${(float.current_balance / float.maximum_limit) * 100}%` }}
                                />
                            </div>
                            <div className="pc-balance-text">
                                <span>{formatCurrency(float.current_balance)}</span>
                                <span className="pc-balance-limit">of {formatCurrency(float.maximum_limit)}</span>
                            </div>
                        </div>
                        {float.custodian && (
                            <div className="pc-float-custodian">
                                <User size={14} />
                                <span>{float.custodian.first_name} {float.custodian.last_name}</span>
                            </div>
                        )}
                        <div className="pc-float-actions">
                            <button onClick={() => {
                                setSelectedFloat(float.id);
                                setActiveTab('transactions');
                            }}>View Transactions</button>
                            <button onClick={() => {
                                setSelectedFloat(float.id);
                                setShowExpenseModal(true);
                            }}>Add Expense</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTransactions = () => (
        <div className="pc-transactions-section">
            <div className="pc-section-header">
                <h3>Transaction Ledger</h3>
                <div className="pc-header-actions">
                    <select
                        value={selectedFloat || ''}
                        onChange={e => setSelectedFloat(e.target.value || null)}
                        className="pc-select"
                    >
                        <option value="">All Floats</option>
                        {floats.map(f => (
                            <option key={f.id} value={f.id}>{f.branch.name}</option>
                        ))}
                    </select>
                    <button className="pc-btn secondary">
                        <Download size={18} /> Export
                    </button>
                </div>
            </div>
            <div className="pc-table-container">
                <table className="pc-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Ref#</th>
                            <th>Type</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Balance</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(txn => (
                            <tr key={txn.id}>
                                <td>{new Date(txn.transaction_date).toLocaleDateString()}</td>
                                <td className="pc-ref">{txn.transaction_number}</td>
                                <td>
                                    <span className={`pc-type-badge ${txn.type}`}>
                                        {txn.type === 'expense' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                        {txn.type}
                                    </span>
                                </td>
                                <td>{txn.description}</td>
                                <td className={txn.type === 'expense' ? 'pc-amount-out' : 'pc-amount-in'}>
                                    {txn.type === 'expense' ? '-' : '+'}{formatCurrency(txn.amount)}
                                </td>
                                <td>{formatCurrency(txn.balance_after)}</td>
                                <td><span className={`pc-status ${getStatusColor(txn.status)}`}>{txn.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderReplenishments = () => (
        <div className="pc-replenishments-section">
            <div className="pc-section-header">
                <h3>Replenishment Requests</h3>
            </div>
            <div className="pc-replenishment-list">
                {replenishments.map(rep => (
                    <div key={rep.id} className="pc-replenishment-card">
                        <div className="pc-rep-header">
                            <span className="pc-rep-number">{rep.request_number}</span>
                            <span className={`pc-status ${getStatusColor(rep.status)}`}>{rep.status}</span>
                        </div>
                        <div className="pc-rep-details">
                            <div className="pc-rep-row">
                                <Building2 size={16} />
                                <span>{rep.float.branch.name}</span>
                            </div>
                            <div className="pc-rep-row">
                                <DollarSign size={16} />
                                <span>Requested: {formatCurrency(rep.amount_requested)}</span>
                            </div>
                            {rep.amount_approved && (
                                <div className="pc-rep-row">
                                    <Check size={16} />
                                    <span>Approved: {formatCurrency(rep.amount_approved)}</span>
                                </div>
                            )}
                            <div className="pc-rep-row">
                                <User size={16} />
                                <span>By: {rep.requestedBy.first_name} {rep.requestedBy.last_name}</span>
                            </div>
                            <div className="pc-rep-row">
                                <Calendar size={16} />
                                <span>{new Date(rep.requested_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        {rep.status === 'requested' && (
                            <div className="pc-rep-actions">
                                <button className="pc-btn success">Approve</button>
                                <button className="pc-btn danger">Reject</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="petty-cash-page">
            <div className="pc-header">
                <h1><Wallet size={28} /> Petty Cash Management</h1>
                <p>Manage branch floats, expenses, and replenishments</p>
            </div>

            <div className="pc-tabs">
                <button
                    className={activeTab === 'dashboard' ? 'active' : ''}
                    onClick={() => setActiveTab('dashboard')}
                >
                    Dashboard
                </button>
                <button
                    className={activeTab === 'floats' ? 'active' : ''}
                    onClick={() => setActiveTab('floats')}
                >
                    Floats
                </button>
                <button
                    className={activeTab === 'transactions' ? 'active' : ''}
                    onClick={() => setActiveTab('transactions')}
                >
                    Transactions
                </button>
                <button
                    className={activeTab === 'replenishments' ? 'active' : ''}
                    onClick={() => setActiveTab('replenishments')}
                >
                    Replenishments
                </button>
            </div>

            <div className="pc-content">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'floats' && renderFloats()}
                {activeTab === 'transactions' && renderTransactions()}
                {activeTab === 'replenishments' && renderReplenishments()}
            </div>

            {/* Expense Modal */}
            {showExpenseModal && (
                <ExpenseModal
                    floats={floats}
                    categories={categories}
                    selectedFloat={selectedFloat}
                    onClose={() => setShowExpenseModal(false)}
                    onSuccess={() => {
                        setShowExpenseModal(false);
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-transactions'] });
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-floats'] });
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-stats'] });
                    }}
                />
            )}

            {/* Replenishment Modal */}
            {showReplenishmentModal && (
                <ReplenishmentModal
                    floats={floats}
                    selectedFloat={selectedFloat}
                    onClose={() => setShowReplenishmentModal(false)}
                    onSuccess={() => {
                        setShowReplenishmentModal(false);
                        queryClient.invalidateQueries({ queryKey: ['petty-cash-replenishments'] });
                    }}
                />
            )}
        </div>
    );
};

// Expense Modal Component
const ExpenseModal: React.FC<{
    floats: PettyCashFloat[];
    categories: { code: string; name: string }[];
    selectedFloat: string | null;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ floats, categories, selectedFloat, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        float_id: selectedFloat || '',
        category: '',
        description: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        receipt_number: '',
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/petty-cash/expenses', data),
        onSuccess,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount),
        });
    };

    return (
        <div className="pc-modal-overlay">
            <div className="pc-modal">
                <h2>Record Expense</h2>
                <form onSubmit={handleSubmit}>
                    <div className="pc-form-group">
                        <label>Branch Float</label>
                        <select
                            value={formData.float_id}
                            onChange={e => setFormData({ ...formData, float_id: e.target.value })}
                            required
                        >
                            <option value="">Select Float</option>
                            {floats.map(f => (
                                <option key={f.id} value={f.id}>{f.branch.name} ({formatCurrency(f.current_balance)})</option>
                            ))}
                        </select>
                    </div>
                    <div className="pc-form-group">
                        <label>Category</label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="pc-form-row">
                        <div className="pc-form-group">
                            <label>Amount (KES)</label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className="pc-form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                value={formData.transaction_date}
                                onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="pc-form-group">
                        <label>Description</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Purpose of expense"
                            required
                        />
                    </div>
                    <div className="pc-form-row">
                        <div className="pc-form-group">
                            <label>Vendor</label>
                            <input
                                type="text"
                                value={formData.vendor_name}
                                onChange={e => setFormData({ ...formData, vendor_name: e.target.value })}
                                placeholder="Vendor name"
                            />
                        </div>
                        <div className="pc-form-group">
                            <label>Receipt #</label>
                            <input
                                type="text"
                                value={formData.receipt_number}
                                onChange={e => setFormData({ ...formData, receipt_number: e.target.value })}
                                placeholder="Receipt number"
                            />
                        </div>
                    </div>
                    <div className="pc-modal-actions">
                        <button type="button" className="pc-btn secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="pc-btn primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Record Expense'}
                        </button>
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
    onSuccess: () => void;
}> = ({ floats, selectedFloat, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        float_id: selectedFloat || '',
        amount_requested: '',
        justification: '',
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/petty-cash/replenishments', data),
        onSuccess,
    });

    const selectedFloatData = floats.find(f => f.id === formData.float_id);
    const maxReplenishment = selectedFloatData
        ? selectedFloatData.maximum_limit - selectedFloatData.current_balance
        : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            amount_requested: parseFloat(formData.amount_requested),
        });
    };

    return (
        <div className="pc-modal-overlay">
            <div className="pc-modal">
                <h2>Request Replenishment</h2>
                <form onSubmit={handleSubmit}>
                    <div className="pc-form-group">
                        <label>Branch Float</label>
                        <select
                            value={formData.float_id}
                            onChange={e => setFormData({ ...formData, float_id: e.target.value })}
                            required
                        >
                            <option value="">Select Float</option>
                            {floats.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.branch.name} (Balance: {formatCurrency(f.current_balance)})
                                </option>
                            ))}
                        </select>
                    </div>
                    {selectedFloatData && (
                        <div className="pc-info-box">
                            <p>Current Balance: <strong>{formatCurrency(selectedFloatData.current_balance)}</strong></p>
                            <p>Maximum Limit: <strong>{formatCurrency(selectedFloatData.maximum_limit)}</strong></p>
                            <p>Max Replenishment: <strong>{formatCurrency(maxReplenishment)}</strong></p>
                        </div>
                    )}
                    <div className="pc-form-group">
                        <label>Amount Requested (KES)</label>
                        <input
                            type="number"
                            value={formData.amount_requested}
                            onChange={e => setFormData({ ...formData, amount_requested: e.target.value })}
                            max={maxReplenishment}
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>
                    <div className="pc-form-group">
                        <label>Justification</label>
                        <textarea
                            value={formData.justification}
                            onChange={e => setFormData({ ...formData, justification: e.target.value })}
                            placeholder="Reason for replenishment request"
                            rows={3}
                        />
                    </div>
                    <div className="pc-modal-actions">
                        <button type="button" className="pc-btn secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="pc-btn success" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
};

export default PettyCashPage;
