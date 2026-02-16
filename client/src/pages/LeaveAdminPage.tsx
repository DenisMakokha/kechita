import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Settings, Users, TrendingUp, Plus, Search,
    RefreshCw, AlertTriangle, CheckCircle, Clock, ChevronRight,
    BarChart3, X, Save, Minus
} from 'lucide-react';

type Tab = 'balances' | 'pending' | 'stats' | 'admin';

interface StaffBalance {
    staff: {
        id: string;
        first_name: string;
        last_name: string;
        employee_number: string;
        branch?: { name: string };
    };
    balances: {
        id: string;
        leaveType: { id: string; name: string; code: string; color?: string };
        entitled_days: number;
        used_days: number;
        pending_days: number;
        balance_days: number;
        year: number;
    }[];
}

interface PendingRequest {
    id: string;
    staff: { id: string; first_name: string; last_name: string; full_name: string; branch?: { name: string } };
    leaveType: { id: string; name: string; color?: string };
    start_date: string;
    end_date: string;
    total_days: number;
    status: string;
    reason?: string;
    requested_at: string;
}

interface LeaveStats {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    staffOnLeaveToday: number;
    averageDaysPerRequest: number;
    byType: { type: string; count: number; days: number }[];
    byMonth: { month: string; count: number }[];
}

export const LeaveAdminPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    const [searchStaff, setSearchStaff] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffBalance | null>(null);
    const [adjustData, setAdjustData] = useState({ leaveTypeId: '', adjustmentDays: 0, reason: '' });
    const [adminAction, setAdminAction] = useState<'init' | 'accrual' | 'carry' | null>(null);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

    // Fetch all staff with balances
    const { data: staffList } = useQuery({
        queryKey: ['staff-list'],
        queryFn: async () => (await api.get('/staff?limit=500')).data,
    });

    // Fetch leave types
    const { data: leaveTypes } = useQuery({
        queryKey: ['leave-types'],
        queryFn: async () => (await api.get('/leave/types')).data,
    });

    // Fetch pending team requests
    const { data: pendingRequests } = useQuery<PendingRequest[]>({
        queryKey: ['pending-leave-requests'],
        queryFn: async () => (await api.get('/leave/requests?status=pending')).data,
    });

    // Fetch leave stats
    const { data: leaveStats } = useQuery<LeaveStats>({
        queryKey: ['leave-stats', selectedYear],
        queryFn: async () => (await api.get(`/leave/stats?year=${selectedYear}`)).data,
    });

    // Fetch staff on leave today
    const { data: staffOnLeave } = useQuery({
        queryKey: ['staff-on-leave-today'],
        queryFn: async () => (await api.get('/leave/on-leave-today')).data,
    });

    // Adjust balance mutation
    const adjustBalanceMutation = useMutation({
        mutationFn: async ({ staffId, data }: { staffId: string; data: any }) =>
            (await api.post(`/leave/balance/${staffId}/adjust`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-balances'] });
            setShowAdjustModal(false);
            setSelectedStaff(null);
            setAdjustData({ leaveTypeId: '', adjustmentDays: 0, reason: '' });
            showToast('Balance adjusted successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to adjust balance', 'error'),
    });

    // Initialize yearly balances mutation
    const initBalancesMutation = useMutation({
        mutationFn: async (year: number) => (await api.post('/leave/balance/initialize', { year })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-balances'] });
            showToast('Yearly balances initialized successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to initialize balances', 'error'),
    });

    // Process monthly accrual mutation
    const processAccrualMutation = useMutation({
        mutationFn: async () => (await api.post('/leave/admin/process-accrual')).data,
        onSuccess: () => showToast('Monthly accrual processed successfully'),
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to process accrual', 'error'),
    });

    // Process carry forward mutation
    const processCarryForwardMutation = useMutation({
        mutationFn: async (fromYear: number) => (await api.post('/leave/admin/process-carry-forward', { fromYear })).data,
        onSuccess: () => showToast('Carry forward processed successfully'),
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to process carry forward', 'error'),
    });

    const openAdjustModal = async (staffId: string) => {
        try {
            const balanceData = await api.get(`/leave/balance/${staffId}?year=${selectedYear}`);
            const staffData = staffList?.data?.find((s: any) => s.id === staffId);
            setSelectedStaff({
                staff: staffData,
                balances: balanceData.data,
            });
            setShowAdjustModal(true);
        } catch (error) {
            console.error('Failed to fetch staff balance', error);
        }
    };

    const handleAdjust = () => {
        if (!selectedStaff || !adjustData.leaveTypeId || !adjustData.reason) return;
        adjustBalanceMutation.mutate({
            staffId: selectedStaff.staff.id,
            data: {
                leaveTypeId: adjustData.leaveTypeId,
                adjustmentDays: adjustData.adjustmentDays,
                reason: adjustData.reason,
                year: selectedYear,
            },
        });
    };

    const filteredStaff = staffList?.data?.filter((s: any) => {
        if (!searchStaff) return true;
        const query = searchStaff.toLowerCase();
        return (
            s.first_name?.toLowerCase().includes(query) ||
            s.last_name?.toLowerCase().includes(query) ||
            s.employee_number?.toLowerCase().includes(query)
        );
    }) || [];

    const tabs = [
        { key: 'pending' as Tab, label: 'Pending Requests', icon: Clock, count: pendingRequests?.length || 0 },
        { key: 'balances' as Tab, label: 'Staff Balances', icon: Users },
        { key: 'stats' as Tab, label: 'Statistics', icon: BarChart3 },
        { key: 'admin' as Tab, label: 'Admin Actions', icon: Settings },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Leave Administration</h1>
                    <p className="text-slate-500">Manage staff leave balances, requests, and policies</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-lg"
                    >
                        {[2024, 2025, 2026, 2027].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
                    <Clock className="mb-2 opacity-80" size={24} />
                    <p className="text-3xl font-bold">{pendingRequests?.length || 0}</p>
                    <p className="text-sm opacity-80">Pending Requests</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
                    <Users className="mb-2 opacity-80" size={24} />
                    <p className="text-3xl font-bold">{staffOnLeave?.length || 0}</p>
                    <p className="text-sm opacity-80">On Leave Today</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
                    <CheckCircle className="mb-2 opacity-80" size={24} />
                    <p className="text-3xl font-bold">{leaveStats?.approvedRequests || 0}</p>
                    <p className="text-sm opacity-80">Approved This Year</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
                    <TrendingUp className="mb-2 opacity-80" size={24} />
                    <p className="text-3xl font-bold">{leaveStats?.averageDaysPerRequest?.toFixed(1) || 0}</p>
                    <p className="text-sm opacity-80">Avg Days/Request</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                                ? 'bg-[#0066B3] text-white shadow-lg'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Pending Requests Tab */}
                {activeTab === 'pending' && (
                    <div>
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900">Pending Leave Requests</h3>
                            <p className="text-sm text-slate-500">Review and process pending requests. Approve/reject via Approvals page.</p>
                        </div>
                        {pendingRequests?.length === 0 ? (
                            <div className="p-12 text-center">
                                <CheckCircle className="mx-auto text-emerald-300 mb-4" size={48} />
                                <p className="text-slate-500">No pending requests</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Staff</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Type</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Duration</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Days</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Requested</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingRequests?.map((req) => (
                                        <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-bold">
                                                        {req.staff?.first_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{req.staff?.full_name}</p>
                                                        <p className="text-xs text-slate-500">{req.staff?.branch?.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className="px-2 py-1 rounded text-sm"
                                                    style={{ backgroundColor: `${req.leaveType?.color}20`, color: req.leaveType?.color }}
                                                >
                                                    {req.leaveType?.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {new Date(req.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                {' - '}
                                                {new Date(req.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-6 py-4 font-medium">{req.total_days}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(req.requested_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <a href="/approvals" className="text-[#0066B3] hover:underline text-sm font-medium">
                                                    Review →
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Staff Balances Tab */}
                {activeTab === 'balances' && (
                    <div>
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Staff Leave Balances</h3>
                                <p className="text-sm text-slate-500">View and adjust leave balances for {selectedYear}</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search staff..."
                                    value={searchStaff}
                                    onChange={(e) => setSearchStaff(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-64"
                                />
                            </div>
                        </div>
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Staff</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Branch</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Emp. No.</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.slice(0, 50).map((staff: any) => (
                                    <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                                    {staff.first_name?.[0]}{staff.last_name?.[0]}
                                                </div>
                                                <span className="font-medium text-slate-900">{staff.first_name} {staff.last_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{staff.branch?.name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-sm">{staff.employee_number}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openAdjustModal(staff.id)}
                                                className="text-[#0066B3] hover:underline text-sm font-medium"
                                            >
                                                View/Adjust Balance
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStaff.length > 50 && (
                            <div className="px-6 py-4 text-center text-sm text-slate-500 border-t">
                                Showing 50 of {filteredStaff.length} staff. Use search to find specific staff.
                            </div>
                        )}
                    </div>
                )}

                {/* Statistics Tab */}
                {activeTab === 'stats' && (
                    <div className="p-6">
                        <h3 className="font-semibold text-slate-900 mb-6">Leave Statistics for {selectedYear}</h3>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* By Leave Type */}
                            <div className="bg-slate-50 rounded-xl p-6">
                                <h4 className="font-medium text-slate-900 mb-4">By Leave Type</h4>
                                <div className="space-y-3">
                                    {leaveStats?.byType?.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <span className="text-slate-600">{item.type}</span>
                                            <div className="text-right">
                                                <span className="font-medium text-slate-900">{item.count} requests</span>
                                                <span className="text-slate-500 text-sm ml-2">({item.days} days)</span>
                                            </div>
                                        </div>
                                    )) || <p className="text-slate-500">No data available</p>}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-slate-50 rounded-xl p-6">
                                <h4 className="font-medium text-slate-900 mb-4">Summary</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                        <span className="text-slate-600">Total Requests</span>
                                        <span className="font-medium text-slate-900">{leaveStats?.totalRequests || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                        <span className="text-slate-600">Approved</span>
                                        <span className="font-medium text-emerald-600">{leaveStats?.approvedRequests || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                        <span className="text-slate-600">Rejected</span>
                                        <span className="font-medium text-red-600">{leaveStats?.rejectedRequests || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-slate-600">Pending</span>
                                        <span className="font-medium text-amber-600">{leaveStats?.pendingRequests || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Actions Tab */}
                {activeTab === 'admin' && (
                    <div className="p-6">
                        <h3 className="font-semibold text-slate-900 mb-6">Administrative Actions</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Initialize Yearly Balances */}
                            <div className="bg-slate-50 rounded-xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <RefreshCw className="text-blue-600" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-900">Initialize Yearly Balances</h4>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Create leave balances for all staff for the selected year based on leave type entitlements.
                                        </p>
                                        <button
                                            onClick={() => setAdminAction('init')}
                                            disabled={initBalancesMutation.isPending}
                                            className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50"
                                        >
                                            {initBalancesMutation.isPending ? 'Processing...' : `Initialize ${selectedYear} Balances`}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Process Monthly Accrual */}
                            <div className="bg-slate-50 rounded-xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="text-emerald-600" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-900">Process Monthly Accrual</h4>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Calculate and add monthly leave accruals for all eligible staff.
                                        </p>
                                        <button
                                            onClick={() => setAdminAction('accrual')}
                                            disabled={processAccrualMutation.isPending}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            {processAccrualMutation.isPending ? 'Processing...' : 'Run Accrual'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Process Carry Forward */}
                            <div className="bg-slate-50 rounded-xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <ChevronRight className="text-purple-600" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-900">Year-End Carry Forward</h4>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Carry forward unused leave balances from previous year (subject to limits).
                                        </p>
                                        <button
                                            onClick={() => setAdminAction('carry')}
                                            disabled={processCarryForwardMutation.isPending}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                                        >
                                            {processCarryForwardMutation.isPending ? 'Processing...' : `Carry Forward from ${selectedYear - 1}`}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                                <div className="flex items-start gap-4">
                                    <AlertTriangle className="text-amber-600 flex-shrink-0" size={24} />
                                    <div>
                                        <h4 className="font-semibold text-amber-800">Important Notes</h4>
                                        <ul className="text-sm text-amber-700 mt-2 space-y-1">
                                            <li>• Initialize balances at the start of each year</li>
                                            <li>• Run monthly accrual for staff who accrue leave</li>
                                            <li>• Process carry forward before initializing new year</li>
                                            <li>• These actions affect all staff records</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Adjust Balance Modal */}
            {showAdjustModal && selectedStaff && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {selectedStaff.staff.first_name} {selectedStaff.staff.last_name}
                                </h2>
                                <p className="text-sm text-slate-500">Leave Balance Adjustment - {selectedYear}</p>
                            </div>
                            <button onClick={() => setShowAdjustModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Current Balances */}
                            <div>
                                <h4 className="font-medium text-slate-900 mb-3">Current Balances</h4>
                                <div className="space-y-2">
                                    {selectedStaff.balances?.map((b) => (
                                        <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: b.leaveType.color || '#6366f1' }}
                                                />
                                                <span className="font-medium">{b.leaveType.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-slate-900">{Number(b.balance_days).toFixed(1)}</span>
                                                <span className="text-slate-500 text-sm"> / {b.entitled_days} days</span>
                                            </div>
                                        </div>
                                    )) || <p className="text-slate-500">No balances found for this year</p>}
                                </div>
                            </div>

                            {/* Adjustment Form */}
                            <div className="border-t border-slate-200 pt-6">
                                <h4 className="font-medium text-slate-900 mb-3">Make Adjustment</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                                        <select
                                            value={adjustData.leaveTypeId}
                                            onChange={(e) => setAdjustData({ ...adjustData, leaveTypeId: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                        >
                                            <option value="">Select leave type...</option>
                                            {leaveTypes?.map((lt: any) => (
                                                <option key={lt.id} value={lt.id}>{lt.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Adjustment Days</label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setAdjustData({ ...adjustData, adjustmentDays: adjustData.adjustmentDays - 1 })}
                                                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                                            >
                                                <Minus size={18} />
                                            </button>
                                            <input
                                                type="number"
                                                value={adjustData.adjustmentDays}
                                                onChange={(e) => setAdjustData({ ...adjustData, adjustmentDays: parseFloat(e.target.value) })}
                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-center font-medium"
                                                step="0.5"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setAdjustData({ ...adjustData, adjustmentDays: adjustData.adjustmentDays + 1 })}
                                                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {adjustData.adjustmentDays > 0 ? 'Adding' : adjustData.adjustmentDays < 0 ? 'Deducting' : 'No change'} {Math.abs(adjustData.adjustmentDays)} days
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                                        <textarea
                                            value={adjustData.reason}
                                            onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            placeholder="Reason for adjustment..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button
                                onClick={() => setShowAdjustModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdjust}
                                disabled={!adjustData.leaveTypeId || !adjustData.reason || adjustData.adjustmentDays === 0 || adjustBalanceMutation.isPending}
                                className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50 flex items-center gap-2"
                            >
                                <Save size={18} />
                                {adjustBalanceMutation.isPending ? 'Saving...' : 'Apply Adjustment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
                    toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-red-500" />}
                    {toast.text}
                </div>
            )}

            {/* Admin Action Confirmation */}
            <ConfirmDialog
                isOpen={!!adminAction}
                title={adminAction === 'init' ? 'Initialize Balances' : adminAction === 'accrual' ? 'Process Accrual' : 'Carry Forward'}
                message={
                    adminAction === 'init' ? `Initialize leave balances for ${selectedYear}? This will create balance records for all staff.`
                    : adminAction === 'accrual' ? 'Process monthly leave accrual for all staff?'
                    : `Carry forward balances from ${selectedYear - 1} to ${selectedYear}?`
                }
                confirmLabel="Proceed"
                variant="warning"
                onConfirm={() => {
                    if (adminAction === 'init') initBalancesMutation.mutate(selectedYear);
                    else if (adminAction === 'accrual') processAccrualMutation.mutate();
                    else if (adminAction === 'carry') processCarryForwardMutation.mutate(selectedYear - 1);
                    setAdminAction(null);
                }}
                onCancel={() => setAdminAction(null)}
            />
        </div>
    );
};

export default LeaveAdminPage;
