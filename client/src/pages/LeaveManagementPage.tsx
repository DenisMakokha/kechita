import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { InputDialog } from '../components/ui/InputDialog';
import { useFormValidation, validators, fieldErrorClass } from '../hooks/useFormValidation';
import type { ValidationRules } from '../hooks/useFormValidation';
import { FieldError } from '../components/ui/FieldError';
import {
    Plus, Calendar as CalendarIcon, Clock, CheckCircle, Umbrella, Users, AlertTriangle,
    TrendingUp, X, CalendarDays, ChevronLeft, ChevronRight, Sun, Search, RefreshCw, BarChart3, Settings, Eye
} from 'lucide-react';

type Tab = 'my-leave' | 'team' | 'calendar' | 'balances' | 'stats' | 'admin';

interface LeaveType { id: string; code: string; name: string; max_days_per_year?: number; is_emergency?: boolean; requires_attachment?: boolean; color?: string; }
interface LeaveBalance { id: string; leaveType: LeaveType; entitled_days: number; used_days: number; pending_days: number; balance_days: number; }
interface LeaveRequest { id: string; staff?: { id: string; first_name: string; last_name: string; full_name: string; branch?: { name: string } }; leaveType?: LeaveType; start_date: string; end_date: string; total_days: number; status: string; is_emergency: boolean; reason?: string; reliever?: { full_name: string }; requested_at: string; }
interface LeaveStats { totalRequests: number; pendingRequests: number; approvedRequests: number; rejectedRequests: number; staffOnLeaveToday: number; averageDaysPerRequest: number; byType: { type: string; count: number; days: number }[]; byMonth: { month: string; count: number }[]; }

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-slate-100 text-slate-600' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
};

export const LeaveManagementPage: React.FC = () => {
    const queryClient = useQueryClient();
    const user = useAuthStore(state => state.user);
    const isAdmin = user?.roles?.some(r => ['CEO', 'HR_MANAGER'].includes(r.code)) || false;
    const canApproveLeave = user?.roles?.some(r => ['CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER'].includes(r.code)) || false;

    const [activeTab, setActiveTab] = useState<Tab>('my-leave');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewingLeave, setViewingLeave] = useState<LeaveRequest | null>(null);
    const [rejectDialogLeaveId, setRejectDialogLeaveId] = useState<string | null>(null);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [searchStaff, setSearchStaff] = useState('');
    const [selectedYear] = useState(new Date().getFullYear());
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

    // Form state
    const [formData, setFormData] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '', reliever_id: '', is_emergency: false });

    const leaveRules = useMemo<ValidationRules<typeof formData>>(() => ({
        leave_type_id: [v => validators.required(v, 'Leave type')],
        start_date: [v => validators.required(v, 'Start date')],
        end_date: [v => validators.required(v, 'End date'), validators.dateAfter(formData.start_date, 'End date', 'start date')],
        reason: [v => validators.required(v, 'Reason'), validators.minLength(5, 'Reason')],
    }), [formData.start_date]);
    const leaveValidation = useFormValidation(leaveRules);

    // Queries
    const { data: leaveTypes } = useQuery<LeaveType[]>({ queryKey: ['leave-types'], queryFn: async () => (await api.get('/leave/types')).data });
    const { data: myBalance } = useQuery<LeaveBalance[]>({ queryKey: ['my-leave-balance'], queryFn: async () => (await api.get('/leave/my-balance')).data });
    const { data: myRequests, isLoading: loadingMyRequests } = useQuery<LeaveRequest[]>({ queryKey: ['my-leave-requests'], queryFn: async () => (await api.get('/leave/my-requests')).data, refetchInterval: 60000 });
    const { data: allRequests, isLoading: loadingAll } = useQuery<LeaveRequest[]>({ queryKey: ['all-leave-requests', statusFilter], queryFn: async () => { const params = statusFilter !== 'all' ? { status: statusFilter } : {}; return (await api.get('/leave/requests', { params })).data; }, enabled: canApproveLeave, refetchInterval: 30000 });
    const { data: staffList } = useQuery({ queryKey: ['staff-list'], queryFn: async () => (await api.get('/staff?limit=500')).data, enabled: isAdmin || canApproveLeave });
    const { data: pendingRequests } = useQuery<LeaveRequest[]>({ queryKey: ['pending-leave-requests'], queryFn: async () => (await api.get('/leave/requests?status=pending')).data, enabled: isAdmin, refetchInterval: 30000 });
    const { data: leaveStats } = useQuery<LeaveStats>({ queryKey: ['leave-stats', selectedYear], queryFn: async () => (await api.get(`/leave/stats?year=${selectedYear}`)).data, enabled: isAdmin && activeTab === 'stats' });
    const { data: staffOnLeave } = useQuery({ queryKey: ['staff-on-leave-today'], queryFn: async () => (await api.get('/leave/on-leave-today')).data, enabled: isAdmin, refetchInterval: 60000 });

    // Mutations
    const submitRequestMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/leave/request', data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] }); queryClient.invalidateQueries({ queryKey: ['my-leave-balance'] }); setShowRequestModal(false); setFormData({ leave_type_id: '', start_date: '', end_date: '', reason: '', reliever_id: '', is_emergency: false }); showToast('Leave request submitted'); },
        onError: () => showToast('Failed to submit request', 'error'),
    });

    const cancelRequestMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/leave/requests/${id}/cancel`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] }); queryClient.invalidateQueries({ queryKey: ['my-leave-balance'] }); showToast('Leave request cancelled'); },
    });

    const approveRequestMutation = useMutation({
        mutationFn: async ({ id, comment }: { id: string; comment?: string }) => (await api.patch(`/leave/requests/${id}/approve`, { comment })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-leave-requests'] }); queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] }); showToast('Leave approved'); setViewingLeave(null); },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to approve leave', 'error'),
    });

    const rejectRequestMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => (await api.patch(`/leave/requests/${id}/reject`, { reason })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-leave-requests'] }); queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] }); showToast('Leave rejected'); setViewingLeave(null); },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to reject leave', 'error'),
    });

    const initializeBalancesMutation = useMutation({
        mutationFn: async (year: number) => (await api.post('/leave/balance/initialize', { year })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-balances'] }); showToast('Balances initialized'); },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to initialize balances', 'error'),
    });

    const processAccrualMutation = useMutation({
        mutationFn: async () => (await api.post('/leave/admin/process-accrual', { year: new Date().getFullYear(), month: new Date().getMonth() + 1 })).data,
        onSuccess: (data: any) => { queryClient.invalidateQueries({ queryKey: ['my-leave-balance'] }); showToast(data?.message || 'Accruals processed successfully'); },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to process accruals', 'error'),
    });

    const carryForwardMutation = useMutation({
        mutationFn: async () => (await api.post('/leave/admin/process-carry-forward', { fromYear: new Date().getFullYear() - 1 })).data,
        onSuccess: (data: any) => { queryClient.invalidateQueries({ queryKey: ['my-leave-balance'] }); showToast(data?.message || 'Carry forward processed successfully'); },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to process carry forward', 'error'),
    });

    // Computed
    const filteredRequests = useMemo(() => {
        let requests = activeTab === 'my-leave' ? myRequests : allRequests;
        if (statusFilter !== 'all') requests = requests?.filter(r => r.status === statusFilter);
        return requests || [];
    }, [myRequests, allRequests, activeTab, statusFilter]);

    const calendarDays = useMemo(() => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days: { date: Date; isCurrentMonth: boolean; leaves: LeaveRequest[] }[] = [];
        const startPadding = firstDay.getDay();

        // Collect all approved/pending leaves for overlay
        const leaveSource = canApproveLeave ? (allRequests || []) : (myRequests || []);
        const activeLeaves = leaveSource.filter(r => r.status === 'approved' || r.status === 'pending');

        const getLeavesForDate = (d: Date) => {
            const dateStr = d.toISOString().split('T')[0];
            return activeLeaves.filter(r => dateStr >= r.start_date.split('T')[0] && dateStr <= r.end_date.split('T')[0]);
        };

        for (let i = startPadding - 1; i >= 0; i--) { const d = new Date(year, month, -i); days.push({ date: d, isCurrentMonth: false, leaves: getLeavesForDate(d) }); }
        for (let i = 1; i <= lastDay.getDate(); i++) { const d = new Date(year, month, i); days.push({ date: d, isCurrentMonth: true, leaves: getLeavesForDate(d) }); }
        const endPadding = 42 - days.length;
        for (let i = 1; i <= endPadding; i++) { const d = new Date(year, month + 1, i); days.push({ date: d, isCurrentMonth: false, leaves: getLeavesForDate(d) }); }
        return days;
    }, [calendarDate, allRequests, myRequests, canApproveLeave]);

    const getLeaveColor = (color?: string) => color || '#0066B3';

    const tabs = [
        { id: 'my-leave' as Tab, label: 'My Leave', icon: Umbrella },
        ...(canApproveLeave ? [{ id: 'team' as Tab, label: 'Team Requests', icon: Users }] : []),
        { id: 'calendar' as Tab, label: 'Calendar', icon: CalendarIcon },
        ...(isAdmin ? [
            { id: 'balances' as Tab, label: 'Staff Balances', icon: BarChart3 },
            { id: 'stats' as Tab, label: 'Statistics', icon: TrendingUp },
            { id: 'admin' as Tab, label: 'Admin', icon: Settings },
        ] : []),
    ];

    return (
        <div className="space-y-6">
            {toast && <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2"><div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>{toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-400" /> : <AlertTriangle size={18} />}<span className="font-medium">{toast.text}</span></div></div>}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-slate-900">Leave Management</h1><p className="text-slate-500">Manage leave requests and balances</p></div>
                <div className="flex items-center gap-3">
                    <button onClick={() => queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] })} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw size={20} /></button>
                    <button onClick={() => setShowRequestModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"><Plus size={20} />Request Leave</button>
                </div>
            </div>

            {/* Leave Balance Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {myBalance?.slice(0, 6).map((balance) => (
                    <div key={balance.id} className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLeaveColor(balance.leaveType.color) }} />
                            <span className="text-sm font-medium text-slate-600 truncate">{balance.leaveType.name}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-900">{balance.balance_days}</span>
                            <span className="text-sm text-slate-400">/ {balance.entitled_days}</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${balance.entitled_days > 0 ? (balance.used_days / balance.entitled_days) * 100 : 0}%`, backgroundColor: getLeaveColor(balance.leaveType.color) }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-slate-200 p-1.5 inline-flex gap-1 flex-wrap">
                {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id ? 'bg-[#0066B3] text-white shadow-lg shadow-blue-500/25' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <tab.icon size={18} />{tab.label}
                    </button>
                ))}
            </div>

            {/* MY LEAVE TAB */}
            {activeTab === 'my-leave' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">My Leave Requests</h2>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                            <option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                        </select>
                    </div>
                    {loadingMyRequests ? <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-2 border-[#0066B3] border-t-transparent rounded-full mx-auto" /></div> : filteredRequests.length === 0 ? (
                        <div className="p-12 text-center"><Umbrella className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 font-medium">No leave requests</p><p className="text-sm text-slate-400">Click "Request Leave" to submit a new request</p></div>
                    ) : (
                        <table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Type</th><th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Period</th><th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Days</th><th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Status</th><th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">Actions</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{filteredRequests.map((request) => (
                                <tr key={request.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLeaveColor(request.leaveType?.color) }} /><span className="font-medium text-slate-900">{request.leaveType?.name}</span>{request.is_emergency && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Emergency</span>}</div></td><td className="px-6 py-4 text-slate-600">{new Date(request.start_date).toLocaleDateString('en-GB')} - {new Date(request.end_date).toLocaleDateString('en-GB')}</td><td className="px-6 py-4 text-slate-600">{request.total_days}</td><td className="px-6 py-4"><StatusBadge status={request.status} /></td><td className="px-6 py-4 text-right">{request.status === 'pending' && <button onClick={() => cancelRequestMutation.mutate(request.id)} className="text-sm text-red-600 hover:text-red-700">Cancel</button>}</td></tr>
                            ))}</tbody>
                        </table>
                    )}
                </div>
            )}

            {/* TEAM REQUESTS TAB */}
            {activeTab === 'team' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Team Leave Requests</h2>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                            <option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                        </select>
                    </div>
                    {loadingAll ? <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-2 border-[#0066B3] border-t-transparent rounded-full mx-auto" /></div> : (allRequests?.length || 0) === 0 ? (
                        <div className="p-12 text-center"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 font-medium">No team requests</p></div>
                    ) : (
                        <table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Staff</th><th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Type</th><th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Period</th><th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Days</th><th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Status</th><th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">Actions</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{allRequests?.map((request) => (
                                <tr key={request.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-medium text-sm">{request.staff?.first_name?.[0]}{request.staff?.last_name?.[0]}</div><div><p className="font-medium text-slate-900">{request.staff?.full_name}</p><p className="text-xs text-slate-500">{request.staff?.branch?.name}</p></div></div></td><td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLeaveColor(request.leaveType?.color) }} /><span className="text-slate-600">{request.leaveType?.name}</span></div></td><td className="px-6 py-4 text-slate-600">{new Date(request.start_date).toLocaleDateString('en-GB')} - {new Date(request.end_date).toLocaleDateString('en-GB')}</td><td className="px-6 py-4 text-slate-600">{request.total_days}</td><td className="px-6 py-4"><StatusBadge status={request.status} /></td><td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => setViewingLeave(request)} className="p-1.5 text-slate-500 hover:text-[#0066B3] hover:bg-blue-50 rounded-lg" title="View details"><Eye size={16} /></button>{request.status === 'pending' && canApproveLeave && <><button onClick={() => approveRequestMutation.mutate({ id: request.id })} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200">Approve</button><button onClick={() => setRejectDialogLeaveId(request.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">Reject</button></>}</div></td></tr>
                            ))}</tbody>
                        </table>
                    )}
                </div>
            )}

            {/* CALENDAR TAB */}
            {activeTab === 'calendar' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-slate-900">{calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20} /></button>
                            <button onClick={() => setCalendarDate(new Date())} className="px-3 py-1.5 text-sm font-medium text-[#0066B3] hover:bg-blue-50 rounded-lg">Today</button>
                            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={20} /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="bg-slate-50 px-2 py-3 text-center text-sm font-semibold text-slate-600">{day}</div>)}
                        {calendarDays.map((day, idx) => {
                            const isToday = day.date.toDateString() === new Date().toDateString();
                            return <div key={idx} className={`bg-white min-h-[80px] p-2 ${!day.isCurrentMonth ? 'opacity-40' : ''}`}>
                                <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm ${isToday ? 'bg-[#0066B3] text-white font-bold' : 'text-slate-700'}`}>{day.date.getDate()}</span>
                                {day.leaves.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                        {day.leaves.slice(0, 2).map((leave, lIdx) => (
                                            <div key={lIdx} className="text-xs px-1 py-0.5 rounded truncate" style={{ backgroundColor: `${getLeaveColor(leave.leaveType?.color)}20`, color: getLeaveColor(leave.leaveType?.color) }}>
                                                {leave.staff?.first_name || leave.leaveType?.name}
                                            </div>
                                        ))}
                                        {day.leaves.length > 2 && <p className="text-xs text-slate-400 pl-1">+{day.leaves.length - 2} more</p>}
                                    </div>
                                )}
                            </div>;
                        })}
                    </div>
                </div>
            )}

            {/* STAFF BALANCES TAB (Admin) */}
            {activeTab === 'balances' && isAdmin && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Staff Leave Balances</h2>
                        <div className="flex items-center gap-3">
                            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search staff..." value={searchStaff} onChange={(e) => setSearchStaff(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <button onClick={() => initializeBalancesMutation.mutate(selectedYear)} className="px-3 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium">Initialize {selectedYear}</button>
                        </div>
                    </div>
                    <div className="p-6">
                        {(Array.isArray(staffList) ? staffList : staffList?.data || []).filter((s: any) => {
                            if (!searchStaff) return true;
                            const name = (s.full_name || `${s.first_name} ${s.last_name}`).toLowerCase();
                            return name.includes(searchStaff.toLowerCase());
                        }).length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No staff found. Try a different search.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Staff</th><th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Position</th><th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Branch</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(Array.isArray(staffList) ? staffList : staffList?.data || []).filter((s: any) => {
                                            if (!searchStaff) return true;
                                            const name = (s.full_name || `${s.first_name} ${s.last_name}`).toLowerCase();
                                            return name.includes(searchStaff.toLowerCase());
                                        }).slice(0, 20).map((s: any) => (
                                            <tr key={s.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-sm font-medium">{s.first_name?.[0]}{s.last_name?.[0]}</div><span className="font-medium text-slate-900">{s.full_name || `${s.first_name} ${s.last_name}`}</span></div></td>
                                                <td className="px-4 py-3 text-slate-600 text-sm">{s.position?.name || '-'}</td>
                                                <td className="px-4 py-3 text-slate-600 text-sm">{s.branch?.name || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STATS TAB (Admin) */}
            {activeTab === 'stats' && isAdmin && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-4 border border-slate-200"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><CalendarDays className="text-[#0066B3]" size={20} /></div><div><p className="text-2xl font-bold text-slate-900">{leaveStats?.totalRequests || 0}</p><p className="text-xs text-slate-500">Total Requests</p></div></div></div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200"><div className="flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-lg"><Clock className="text-amber-600" size={20} /></div><div><p className="text-2xl font-bold text-slate-900">{leaveStats?.pendingRequests || 0}</p><p className="text-xs text-slate-500">Pending</p></div></div></div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200"><div className="flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle className="text-emerald-600" size={20} /></div><div><p className="text-2xl font-bold text-slate-900">{leaveStats?.approvedRequests || 0}</p><p className="text-xs text-slate-500">Approved</p></div></div></div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Sun className="text-purple-600" size={20} /></div><div><p className="text-2xl font-bold text-slate-900">{staffOnLeave?.length || 0}</p><p className="text-xs text-slate-500">On Leave Today</p></div></div></div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h3 className="font-semibold text-slate-900 mb-4">Leave by Type</h3>
                        <div className="space-y-3">{leaveStats?.byType?.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4"><span className="w-24 text-sm text-slate-600 truncate">{item.type}</span><div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#0066B3] rounded-full" style={{ width: `${(item.count / (leaveStats?.totalRequests || 1)) * 100}%` }} /></div><span className="text-sm font-medium text-slate-900">{item.count}</span></div>
                        ))}</div>
                    </div>
                </div>
            )}

            {/* ADMIN TAB */}
            {activeTab === 'admin' && isAdmin && (
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg"><Clock className="text-amber-600" size={20} /></div>
                                <div><p className="text-2xl font-bold text-slate-900">{pendingRequests?.length || 0}</p><p className="text-xs text-slate-500">Pending Requests</p></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg"><Sun className="text-blue-600" size={20} /></div>
                                <div><p className="text-2xl font-bold text-slate-900">{staffOnLeave?.length || 0}</p><p className="text-xs text-slate-500">On Leave Today</p></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg"><Users className="text-emerald-600" size={20} /></div>
                                <div><p className="text-2xl font-bold text-slate-900">{staffList?.data?.length || staffList?.length || 0}</p><p className="text-xs text-slate-500">Total Staff</p></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg"><CalendarDays className="text-purple-600" size={20} /></div>
                                <div><p className="text-2xl font-bold text-slate-900">{leaveTypes?.length || 0}</p><p className="text-xs text-slate-500">Leave Types</p></div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="font-semibold text-slate-900 mb-4">Leave Administration</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <button onClick={() => { initializeBalancesMutation.mutate(new Date().getFullYear()); }} disabled={initializeBalancesMutation.isPending} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 text-left transition-all group disabled:opacity-50">
                                <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors"><CalendarDays className="text-blue-600" size={20} /></div><h3 className="font-medium text-slate-900">Initialize Balances</h3></div>
                                <p className="text-sm text-slate-500">Set up leave balances for all staff for {new Date().getFullYear()}</p>
                                {initializeBalancesMutation.isPending && <p className="text-xs text-blue-600 mt-2">Processing...</p>}
                            </button>
                            <button onClick={() => processAccrualMutation.mutate()} disabled={processAccrualMutation.isPending} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-emerald-300 text-left transition-all group disabled:opacity-50">
                                <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors"><TrendingUp className="text-emerald-600" size={20} /></div><h3 className="font-medium text-slate-900">Process Accruals</h3></div>
                                <p className="text-sm text-slate-500">Run monthly leave accrual for eligible staff</p>
                                {processAccrualMutation.isPending && <p className="text-xs text-emerald-600 mt-2">Processing...</p>}
                            </button>
                            <button onClick={() => carryForwardMutation.mutate()} disabled={carryForwardMutation.isPending} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-purple-300 text-left transition-all group disabled:opacity-50">
                                <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors"><RefreshCw className="text-purple-600" size={20} /></div><h3 className="font-medium text-slate-900">Carry Forward</h3></div>
                                <p className="text-sm text-slate-500">Process year-end leave carry forward ({new Date().getFullYear() - 1} → {new Date().getFullYear()})</p>
                                {carryForwardMutation.isPending && <p className="text-xs text-purple-600 mt-2">Processing...</p>}
                            </button>
                        </div>
                    </div>

                    {/* Staff On Leave Today */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200"><h2 className="font-semibold text-slate-900">Staff On Leave Today</h2></div>
                        {!staffOnLeave || staffOnLeave.length === 0 ? (
                            <div className="p-8 text-center"><Sun className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No staff on leave today</p></div>
                        ) : (
                            <div className="divide-y divide-slate-100">{staffOnLeave.slice(0, 5).map((item: any) => (
                                <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-medium">{item.staff?.first_name?.[0]}{item.staff?.last_name?.[0]}</div>
                                        <div><p className="font-medium text-slate-900">{item.staff?.first_name} {item.staff?.last_name}</p><p className="text-xs text-slate-500">{item.leaveType?.name}</p></div>
                                    </div>
                                    <div className="text-right text-sm text-slate-500">{new Date(item.start_date).toLocaleDateString('en-GB')} - {new Date(item.end_date).toLocaleDateString('en-GB')}</div>
                                </div>
                            ))}</div>
                        )}
                    </div>

                    {/* Pending Approvals */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Pending Approvals</h2><span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{pendingRequests?.length || 0} pending</span></div>
                        {!pendingRequests || pendingRequests.length === 0 ? (
                            <div className="p-8 text-center"><CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No pending approvals</p></div>
                        ) : (
                            <div className="divide-y divide-slate-100">{pendingRequests.slice(0, 5).map((request) => (
                                <div key={request.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium">{request.staff?.first_name?.[0]}{request.staff?.last_name?.[0]}</div>
                                        <div><p className="font-medium text-slate-900">{request.staff?.full_name}</p><p className="text-xs text-slate-500">{request.leaveType?.name} • {request.total_days} day(s)</p></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => approveRequestMutation.mutate({ id: request.id })} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200">Approve</button>
                                        <button onClick={() => setRejectDialogLeaveId(request.id)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">Reject</button>
                                    </div>
                                </div>
                            ))}</div>
                        )}
                        {pendingRequests && pendingRequests.length > 5 && <div className="px-6 py-3 border-t border-slate-100 text-center"><button onClick={() => setActiveTab('team')} className="text-sm text-[#0066B3] font-medium hover:underline">View all {pendingRequests.length} pending requests →</button></div>}
                    </div>

                    {/* Leave Types Overview */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200"><h2 className="font-semibold text-slate-900">Leave Types</h2></div>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {leaveTypes?.map((type) => (
                                <div key={type.id} className="p-3 border border-slate-200 rounded-lg hover:border-blue-200 transition-colors">
                                    <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color || '#0066B3' }} /><span className="font-medium text-slate-900 text-sm">{type.name}</span></div>
                                    <p className="text-xs text-slate-500">{type.max_days_per_year || '∞'} days/year</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW LEAVE DETAIL MODAL */}
            {viewingLeave && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Leave Request Details</h2>
                            <button onClick={() => setViewingLeave(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-semibold text-lg">{viewingLeave.staff?.first_name?.[0]}{viewingLeave.staff?.last_name?.[0]}</div>
                                <div><p className="font-semibold text-slate-900">{viewingLeave.staff?.full_name}</p><p className="text-sm text-slate-500">{viewingLeave.staff?.branch?.name}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Leave Type</p><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLeaveColor(viewingLeave.leaveType?.color) }} /><span className="font-medium text-slate-900">{viewingLeave.leaveType?.name}</span></div></div>
                                <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Status</p><StatusBadge status={viewingLeave.status} /></div>
                                <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Start Date</p><p className="font-medium text-slate-900">{new Date(viewingLeave.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                                <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">End Date</p><p className="font-medium text-slate-900">{new Date(viewingLeave.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                                <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Total Days</p><p className="font-medium text-slate-900">{viewingLeave.total_days} day(s)</p></div>
                                <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Emergency</p><p className="font-medium text-slate-900">{viewingLeave.is_emergency ? 'Yes' : 'No'}</p></div>
                            </div>
                            {viewingLeave.reason && <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Reason</p><p className="text-slate-700">{viewingLeave.reason}</p></div>}
                            {viewingLeave.reliever && <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500 mb-1">Reliever</p><p className="font-medium text-slate-900">{viewingLeave.reliever.full_name}</p></div>}
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            {viewingLeave.status === 'pending' && canApproveLeave && (
                                <>
                                    <button onClick={() => setRejectDialogLeaveId(viewingLeave.id)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200">Reject</button>
                                    <button onClick={() => { approveRequestMutation.mutate({ id: viewingLeave.id }); }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Approve</button>
                                </>
                            )}
                            {(viewingLeave.status !== 'pending' || !canApproveLeave) && (
                                <button onClick={() => setViewingLeave(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300">Close</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* REQUEST LEAVE MODAL */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-900">Request Leave</h2><button onClick={() => { setShowRequestModal(false); setFormData({ leave_type_id: '', start_date: '', end_date: '', reason: '', reliever_id: '', is_emergency: false }); leaveValidation.clearErrors(); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Leave Type <span className="text-red-500">*</span></label><select value={formData.leave_type_id} onChange={(e) => { setFormData({ ...formData, leave_type_id: e.target.value }); leaveValidation.onChange('leave_type_id', e.target.value); }} onBlur={() => leaveValidation.onBlur('leave_type_id', formData.leave_type_id)} className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(leaveValidation.getFieldError('leave_type_id'))}`}><option value="">Select type...</option>{leaveTypes?.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><FieldError error={leaveValidation.getFieldError('leave_type_id')} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label><input type="date" value={formData.start_date} onChange={(e) => { setFormData({ ...formData, start_date: e.target.value }); leaveValidation.onChange('start_date', e.target.value); }} onBlur={() => leaveValidation.onBlur('start_date', formData.start_date)} className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(leaveValidation.getFieldError('start_date'))}`} /><FieldError error={leaveValidation.getFieldError('start_date')} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label><input type="date" value={formData.end_date} onChange={(e) => { setFormData({ ...formData, end_date: e.target.value }); leaveValidation.onChange('end_date', e.target.value); }} onBlur={() => leaveValidation.onBlur('end_date', formData.end_date)} className={`w-full px-4 py-2.5 border rounded-lg ${fieldErrorClass(leaveValidation.getFieldError('end_date'))}`} /><FieldError error={leaveValidation.getFieldError('end_date')} /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-red-500">*</span></label><textarea value={formData.reason} onChange={(e) => { setFormData({ ...formData, reason: e.target.value }); leaveValidation.onChange('reason', e.target.value); }} onBlur={() => leaveValidation.onBlur('reason', formData.reason)} className={`w-full px-4 py-2.5 border rounded-lg resize-none ${fieldErrorClass(leaveValidation.getFieldError('reason'))}`} rows={3} placeholder="Brief reason for leave..." /><FieldError error={leaveValidation.getFieldError('reason')} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Reliever (optional)</label><select value={formData.reliever_id} onChange={(e) => setFormData({ ...formData, reliever_id: e.target.value })} className="w-full px-4 py-2.5 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066B3]"><option value="">Select reliever...</option>{(Array.isArray(staffList) ? staffList : staffList?.data || []).map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}</select></div>
                            <label className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.is_emergency} onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })} className="w-4 h-4 text-amber-600 rounded" /><div><span className="text-sm font-medium text-amber-800">Emergency Leave</span><p className="text-xs text-amber-600">Check if this is an urgent/emergency request</p></div></label>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => { setShowRequestModal(false); setFormData({ leave_type_id: '', start_date: '', end_date: '', reason: '', reliever_id: '', is_emergency: false }); leaveValidation.clearErrors(); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => { if (leaveValidation.validateAll(formData)) submitRequestMutation.mutate(formData); }} disabled={submitRequestMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">{submitRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Leave Dialog */}
            <InputDialog
                isOpen={!!rejectDialogLeaveId}
                title="Reject Leave Request"
                message="Please provide a reason for rejecting this leave request."
                inputLabel="Rejection Reason"
                inputType="textarea"
                placeholder="Enter reason..."
                confirmLabel="Reject"
                onConfirm={(reason) => {
                    if (rejectDialogLeaveId) {
                        rejectRequestMutation.mutate({ id: rejectDialogLeaveId, reason });
                    }
                    setRejectDialogLeaveId(null);
                }}
                onCancel={() => setRejectDialogLeaveId(null)}
                isLoading={rejectRequestMutation.isPending}
            />
        </div>
    );
};

export default LeaveManagementPage;
