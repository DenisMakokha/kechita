import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InputDialog } from '../components/ui/InputDialog';
import {
    Clock, LogIn, LogOut, Calendar, MapPin, Users, X, AlertTriangle,
    CheckCircle, Loader2, Plus, AlertCircle, Ban,
} from 'lucide-react';

type Tab = 'my' | 'shifts' | 'roster' | 'entries';

interface Shift {
    id: string;
    code: string;
    name: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    grace_minutes: number;
    is_night_shift: boolean;
    is_active: boolean;
}

interface TimeEntry {
    id: string;
    staff_id: string;
    date: string;
    clock_in_at: string;
    clock_out_at?: string;
    clock_in_method: string;
    status: string;
    worked_minutes: number;
    overtime_minutes: number;
    late_minutes: number;
    undertime_minutes: number;
    is_holiday: boolean;
    is_weekend: boolean;
    notes?: string;
    rejection_reason?: string;
    shift?: Shift;
    staff?: { id: string; first_name: string; last_name: string; employee_number: string; branch?: { name: string } };
}

const AttendancePage: React.FC = () => {
    const queryClient = useQueryClient();
    const user = useAuthStore(s => s.user);
    const isAdmin = user?.roles?.some(r => ['CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER', 'REGIONAL_MANAGER'].includes(r.code));

    const [tab, setTab] = useState<Tab>('my');
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Geolocation
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);
    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setGeoError('Geolocation not supported by this browser');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => setGeoError(err.message),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    }, []);

    // Live clock
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Today's entry
    const { data: todayEntry } = useQuery<TimeEntry | null>({
        queryKey: ['attendance-today'],
        queryFn: async () => (await api.get('/attendance/today')).data,
        refetchInterval: 30000,
    });

    // Filters for admin
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    const [fromDate, setFromDate] = useState(firstOfMonth);
    const [toDate, setToDate] = useState(lastOfMonth);

    // My month entries
    const { data: myEntries = [] } = useQuery<TimeEntry[]>({
        queryKey: ['my-attendance', fromDate, toDate],
        queryFn: async () => (await api.get(`/attendance/my/entries?from=${fromDate}&to=${toDate}`)).data,
        enabled: tab === 'my',
    });

    // My monthly summary
    const { data: mySummary } = useQuery<any>({
        queryKey: ['my-summary', today.getFullYear(), today.getMonth() + 1],
        queryFn: async () => (await api.get(`/attendance/my/summary/${today.getFullYear()}/${today.getMonth() + 1}`)).data,
        enabled: tab === 'my',
    });

    // Admin: all entries
    const { data: allEntries = [] } = useQuery<TimeEntry[]>({
        queryKey: ['all-attendance', fromDate, toDate],
        queryFn: async () => (await api.get(`/attendance/entries?from=${fromDate}&to=${toDate}`)).data,
        enabled: tab === 'entries' && !!isAdmin,
    });

    // Shifts
    const { data: shifts = [] } = useQuery<Shift[]>({
        queryKey: ['shifts'],
        queryFn: async () => (await api.get('/attendance/shifts')).data,
    });

    // Mutations
    const clockInMutation = useMutation({
        mutationFn: async () => (await api.post('/attendance/clock-in', { method: 'mobile_gps', lat: coords?.lat, lng: coords?.lng })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); queryClient.invalidateQueries({ queryKey: ['my-attendance'] }); showToast('Clocked in successfully'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Clock-in failed', 'error'),
    });

    const clockOutMutation = useMutation({
        mutationFn: async () => (await api.post('/attendance/clock-out', { lat: coords?.lat, lng: coords?.lng })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); queryClient.invalidateQueries({ queryKey: ['my-attendance'] }); showToast('Clocked out successfully'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Clock-out failed', 'error'),
    });

    // Shift management
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shiftForm, setShiftForm] = useState({ code: '', name: '', start_time: '08:00', end_time: '17:00', break_minutes: 60, grace_minutes: 5, is_night_shift: false });
    const [approveEntryId, setApproveEntryId] = useState<string | null>(null);
    const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);

    const createShiftMutation = useMutation({
        mutationFn: async () => (await api.post('/attendance/shifts', shiftForm)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            setShowShiftModal(false);
            setShiftForm({ code: '', name: '', start_time: '08:00', end_time: '17:00', break_minutes: 60, grace_minutes: 5, is_night_shift: false });
            showToast('Shift created');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create shift', 'error'),
    });

    const approveEntryMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/attendance/entries/${id}/approve`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-attendance'] }); setApproveEntryId(null); showToast('Entry approved'); },
        onError: (e: any) => { setApproveEntryId(null); showToast(e?.response?.data?.message || 'Failed', 'error'); },
    });

    const rejectEntryMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
            (await api.patch(`/attendance/entries/${id}/reject`, { reason })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-attendance'] }); setRejectEntryId(null); showToast('Entry rejected'); },
        onError: (e: any) => { setRejectEntryId(null); showToast(e?.response?.data?.message || 'Failed', 'error'); },
    });

    // Helpers
    const fmtTime = (d: Date | string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
    const fmtMins = (m: number) => {
        const h = Math.floor(m / 60), mm = m % 60;
        return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
    };

    const statusBadge = (s: string) => {
        const map: Record<string, string> = {
            open: 'bg-blue-100 text-blue-700',
            complete: 'bg-emerald-100 text-emerald-700',
            approved: 'bg-purple-100 text-purple-700',
            rejected: 'bg-red-100 text-red-700',
            auto_closed: 'bg-amber-100 text-amber-700',
        };
        return map[s] || 'bg-slate-100 text-slate-600';
    };

    const isOpen = todayEntry?.status === 'open';

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Clock className="text-[#0066B3]" size={32} />Time & Attendance
                </h1>
                <p className="text-slate-500 mt-1">Clock in, view roster, manage attendance records</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl overflow-x-auto">
                {([
                    { id: 'my' as Tab, label: 'My Attendance', icon: Clock },
                    ...(isAdmin ? [
                        { id: 'entries' as Tab, label: 'All Entries', icon: Users },
                        { id: 'roster' as Tab, label: 'Roster', icon: Calendar },
                        { id: 'shifts' as Tab, label: 'Shifts', icon: Clock },
                    ] : []),
                ]).map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                tab === t.id ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}>
                            <Icon size={16} />{t.label}
                        </button>
                    );
                })}
            </div>

            {/* MY TAB */}
            {tab === 'my' && (
                <div className="space-y-6">
                    {/* Clock In/Out Card */}
                    <div className="bg-gradient-to-br from-[#0066B3] to-[#00AEEF] text-white rounded-2xl p-8 shadow-lg">
                        <div className="grid md:grid-cols-2 gap-6 items-center">
                            <div>
                                <p className="text-sm opacity-80 uppercase font-semibold">{now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                <p className="text-5xl font-bold mt-1 tracking-tight tabular-nums">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                {todayEntry && (
                                    <div className="mt-3 text-sm opacity-90 space-y-0.5">
                                        <p>Clocked in: <strong>{fmtTime(todayEntry.clock_in_at)}</strong>
                                            {todayEntry.late_minutes > 0 && <span className="text-amber-200 ml-2">({fmtMins(todayEntry.late_minutes)} late)</span>}
                                        </p>
                                        {todayEntry.clock_out_at && <p>Clocked out: <strong>{fmtTime(todayEntry.clock_out_at)}</strong></p>}
                                        {todayEntry.shift && <p>Shift: <strong>{todayEntry.shift.name}</strong> ({todayEntry.shift.start_time.slice(0, 5)}–{todayEntry.shift.end_time.slice(0, 5)})</p>}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                {geoError && <div className="flex items-center gap-2 text-xs bg-white/20 px-3 py-1.5 rounded-lg"><AlertCircle size={12} />Location: {geoError}</div>}
                                {coords && <div className="flex items-center gap-2 text-xs bg-white/20 px-3 py-1.5 rounded-lg"><MapPin size={12} />{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</div>}

                                {!todayEntry && (
                                    <button onClick={() => clockInMutation.mutate()} disabled={clockInMutation.isPending}
                                        className="flex items-center gap-3 px-8 py-4 bg-white text-[#0066B3] rounded-xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-60 transition-all">
                                        {clockInMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                                        Clock In
                                    </button>
                                )}
                                {isOpen && (
                                    <button onClick={() => clockOutMutation.mutate()} disabled={clockOutMutation.isPending}
                                        className="flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 disabled:opacity-60 transition-all">
                                        {clockOutMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <LogOut size={20} />}
                                        Clock Out
                                    </button>
                                )}
                                {todayEntry && todayEntry.status !== 'open' && (
                                    <div className="bg-white/20 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                                        <CheckCircle size={14} />Day complete · Worked {fmtMins(todayEntry.worked_minutes)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Monthly Summary */}
                    {mySummary && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { label: 'Days Worked', value: mySummary.days_worked, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Total Hours', value: fmtMins(mySummary.total_worked_minutes), color: 'text-[#0066B3]', bg: 'bg-blue-50' },
                                { label: 'Overtime', value: fmtMins(mySummary.total_overtime_minutes), color: 'text-purple-600', bg: 'bg-purple-50' },
                                { label: 'Late', value: fmtMins(mySummary.total_late_minutes), color: 'text-amber-600', bg: 'bg-amber-50' },
                                { label: 'Days Absent', value: mySummary.days_absent, color: 'text-red-600', bg: 'bg-red-50' },
                            ].map((s, i) => (
                                <div key={i} className={`${s.bg} rounded-xl p-4 border border-slate-100`}>
                                    <p className="text-xs uppercase font-semibold text-slate-400 mb-1">{s.label}</p>
                                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Recent Entries */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Recent Entries</h3>
                            <div className="flex items-center gap-2 text-xs">
                                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-xs" />
                                <span className="text-slate-400">to</span>
                                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-xs" />
                            </div>
                        </div>
                        {myEntries.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Clock className="mx-auto mb-2" size={32} />
                                <p>No entries in this period</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Date</th>
                                        <th className="px-4 py-2 text-left">In</th>
                                        <th className="px-4 py-2 text-left">Out</th>
                                        <th className="px-4 py-2 text-right">Worked</th>
                                        <th className="px-4 py-2 text-right">OT</th>
                                        <th className="px-4 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {myEntries.map(e => (
                                        <tr key={e.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 font-medium text-slate-700">{fmtDate(e.date)}{e.is_holiday && <span className="ml-2 text-xs text-purple-600">·HOL</span>}{e.is_weekend && <span className="ml-2 text-xs text-amber-600">·WE</span>}</td>
                                            <td className="px-4 py-2">{fmtTime(e.clock_in_at)}{e.late_minutes > 0 && <span className="ml-1 text-xs text-amber-600">+{e.late_minutes}m</span>}</td>
                                            <td className="px-4 py-2">{e.clock_out_at ? fmtTime(e.clock_out_at) : '—'}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{fmtMins(e.worked_minutes)}</td>
                                            <td className="px-4 py-2 text-right tabular-nums">{e.overtime_minutes > 0 ? fmtMins(e.overtime_minutes) : '—'}</td>
                                            <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusBadge(e.status)}`}>{e.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* SHIFTS TAB (admin) */}
            {tab === 'shifts' && isAdmin && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">{shifts.length} shift{shifts.length === 1 ? '' : 's'}</p>
                        <button onClick={() => setShowShiftModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"><Plus size={16} />New Shift</button>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                <tr><th className="px-5 py-3 text-left">Code</th><th className="px-5 py-3 text-left">Name</th><th className="px-5 py-3 text-left">Hours</th><th className="px-5 py-3 text-center">Break</th><th className="px-5 py-3 text-center">Grace</th><th className="px-5 py-3 text-center">Active</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {shifts.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="px-5 py-3 font-mono text-xs">{s.code}</td>
                                        <td className="px-5 py-3 font-medium text-slate-900">{s.name}{s.is_night_shift && <span className="ml-2 text-xs text-purple-600">NIGHT</span>}</td>
                                        <td className="px-5 py-3 tabular-nums">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</td>
                                        <td className="px-5 py-3 text-center">{s.break_minutes}m</td>
                                        <td className="px-5 py-3 text-center">{s.grace_minutes}m</td>
                                        <td className="px-5 py-3 text-center">{s.is_active ? <CheckCircle size={16} className="inline text-emerald-500" /> : <X size={16} className="inline text-slate-300" />}</td>
                                    </tr>
                                ))}
                                {shifts.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-slate-400">No shifts yet. Create one to start scheduling.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ALL ENTRIES (admin) */}
            {tab === 'entries' && isAdmin && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs">
                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-sm" />
                            <span className="text-slate-400">to</span>
                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-sm" />
                        </div>
                        <p className="text-sm text-slate-600 ml-auto">{allEntries.length} entries</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                <tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Employee</th><th className="px-4 py-2 text-left">In</th><th className="px-4 py-2 text-left">Out</th><th className="px-4 py-2 text-right">Worked</th><th className="px-4 py-2 text-right">OT</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2"></th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allEntries.map(e => (
                                    <tr key={e.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-xs text-slate-600">{fmtDate(e.date)}</td>
                                        <td className="px-4 py-2">
                                            <p className="font-medium text-slate-900">{e.staff?.first_name} {e.staff?.last_name}</p>
                                            <p className="text-xs text-slate-400">{e.staff?.employee_number} · {e.staff?.branch?.name || '—'}</p>
                                        </td>
                                        <td className="px-4 py-2">{fmtTime(e.clock_in_at)}{e.late_minutes > 0 && <span className="ml-1 text-xs text-amber-600">+{e.late_minutes}m</span>}</td>
                                        <td className="px-4 py-2">{e.clock_out_at ? fmtTime(e.clock_out_at) : '—'}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{fmtMins(e.worked_minutes)}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{e.overtime_minutes > 0 ? fmtMins(e.overtime_minutes) : '—'}</td>
                                        <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusBadge(e.status)}`}>{e.status}</span></td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {(e.status === 'complete' || e.status === 'auto_closed') && (
                                                    <>
                                                        <button onClick={() => setApproveEntryId(e.id)} className="p-1 hover:bg-emerald-100 rounded text-emerald-600" title="Approve"><CheckCircle size={14} /></button>
                                                        <button onClick={() => setRejectEntryId(e.id)} className="p-1 hover:bg-red-100 rounded text-red-600" title="Reject"><Ban size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {allEntries.length === 0 && <tr><td colSpan={8} className="text-center p-8 text-slate-400">No entries in this period</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ROSTER (admin placeholder) */}
            {tab === 'roster' && isAdmin && (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Calendar className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 font-medium">Roster planner — use API for bulk assignment</p>
                    <p className="text-sm text-slate-400 mt-1">POST /attendance/roster/assign with an array of staff_id/shift_id/date entries.</p>
                </div>
            )}

            {/* Shift Modal */}
            {showShiftModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">New Shift</h2>
                            <button onClick={() => setShowShiftModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Code</label><input type="text" value={shiftForm.code} onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })} placeholder="e.g., MORNING" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input type="text" value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} placeholder="Morning Shift" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Start</label><input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">End</label><input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Break (min)</label><input type="number" value={shiftForm.break_minutes} onChange={(e) => setShiftForm({ ...shiftForm, break_minutes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Grace (min)</label><input type="number" value={shiftForm.grace_minutes} onChange={(e) => setShiftForm({ ...shiftForm, grace_minutes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={shiftForm.is_night_shift} onChange={(e) => setShiftForm({ ...shiftForm, is_night_shift: e.target.checked })} className="w-4 h-4 text-[#0066B3]" />
                                Night shift (crosses midnight)
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowShiftModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => createShiftMutation.mutate()} disabled={!shiftForm.code || !shiftForm.name || createShiftMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">
                                {createShiftMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve dialog */}
            <ConfirmDialog
                isOpen={!!approveEntryId}
                title="Approve Time Entry"
                message="Mark this attendance entry as approved? It will count toward the staff's monthly attendance."
                confirmLabel="Approve"
                onConfirm={() => { if (approveEntryId) approveEntryMutation.mutate(approveEntryId); }}
                onCancel={() => setApproveEntryId(null)}
                isLoading={approveEntryMutation.isPending}
            />

            {/* Reject dialog */}
            <InputDialog
                isOpen={!!rejectEntryId}
                title="Reject Time Entry"
                message="Provide a reason for rejecting this entry."
                inputLabel="Reason"
                placeholder="e.g., Outside scheduled hours, no GPS match"
                confirmLabel="Reject"
                required
                minLength={3}
                onConfirm={(reason) => { if (rejectEntryId) rejectEntryMutation.mutate({ id: rejectEntryId, reason }); }}
                onCancel={() => setRejectEntryId(null)}
                isLoading={rejectEntryMutation.isPending}
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

export default AttendancePage;
