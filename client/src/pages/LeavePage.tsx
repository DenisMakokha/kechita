import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Plus, Calendar as CalendarIcon, Clock, CheckCircle, XCircle,
    ChevronDown, Filter, Download, Umbrella, Users, AlertTriangle,
    TrendingUp, X, CalendarDays, User, ChevronLeft, ChevronRight,
    Sun, Moon, Sunrise
} from 'lucide-react';

interface LeaveType {
    id: string;
    code: string;
    name: string;
    max_days_per_year?: number;
    is_emergency?: boolean;
    requires_attachment?: boolean;
    color?: string;
}

interface LeaveBalance {
    id: string;
    leaveType: LeaveType;
    entitled_days: number;
    used_days: number;
    pending_days: number;
    balance_days: number;
}

interface LeaveRequest {
    id: string;
    staff?: { id: string; first_name: string; last_name: string; full_name: string };
    leaveType?: LeaveType;
    start_date: string;
    end_date: string;
    total_days: number;
    status: string;
    is_emergency: boolean;
    reason?: string;
    reliever?: { full_name: string };
    requested_at: string;
}

interface CalendarEntry {
    id: string;
    staffId: string;
    staffName: string;
    leaveType: string;
    leaveTypeColor?: string;
    startDate: string;
    endDate: string;
    status: string;
    totalDays: number;
}

export const LeavePage: React.FC = () => {
    const queryClient = useQueryClient();
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'my-leave' | 'team' | 'calendar'>('my-leave');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedLeaveDetail, setSelectedLeaveDetail] = useState<LeaveRequest | null>(null);

    // Calendar state
    const [calendarDate, setCalendarDate] = useState(new Date());

    // Queries
    const { data: leaveTypes } = useQuery<LeaveType[]>({
        queryKey: ['leave-types'],
        queryFn: async () => {
            const response = await api.get('/leave/types');
            return response.data;
        },
    });

    const { data: myBalance } = useQuery<LeaveBalance[]>({
        queryKey: ['my-leave-balance'],
        queryFn: async () => {
            const response = await api.get('/leave/my-balance');
            return response.data;
        },
    });

    const { data: myRequests, isLoading: loadingMyRequests } = useQuery<LeaveRequest[]>({
        queryKey: ['my-leave-requests'],
        queryFn: async () => {
            const response = await api.get('/leave/my-requests');
            return response.data;
        },
    });

    const { data: allRequests, isLoading: loadingAll } = useQuery<LeaveRequest[]>({
        queryKey: ['all-leave-requests', statusFilter],
        queryFn: async () => {
            const params = statusFilter !== 'all' ? { status: statusFilter } : {};
            const response = await api.get('/leave/requests', { params });
            return response.data;
        },
    });

    const { data: holidays } = useQuery({
        queryKey: ['public-holidays'],
        queryFn: async () => {
            const response = await api.get('/leave/holidays');
            return response.data;
        },
    });

    const { data: leaveStats } = useQuery({
        queryKey: ['leave-stats'],
        queryFn: async () => {
            const response = await api.get('/leave/stats');
            return response.data;
        },
    });

    const { data: staffOnLeave } = useQuery({
        queryKey: ['staff-on-leave-today'],
        queryFn: async () => {
            const response = await api.get('/leave/on-leave-today');
            return response.data;
        },
    });

    // Calendar data query
    const calendarMonth = calendarDate.getMonth();
    const calendarYear = calendarDate.getFullYear();
    const startOfMonth = new Date(calendarYear, calendarMonth, 1);
    const endOfMonth = new Date(calendarYear, calendarMonth + 1, 0);

    const { data: calendarData } = useQuery<CalendarEntry[]>({
        queryKey: ['leave-calendar', calendarYear, calendarMonth],
        queryFn: async () => {
            const response = await api.get('/leave/calendar', {
                params: {
                    startDate: startOfMonth.toISOString().split('T')[0],
                    endDate: endOfMonth.toISOString().split('T')[0],
                },
            });
            return response.data;
        },
    });

    // Mutations
    const cancelMutation = useMutation({
        mutationFn: async (id: string) => api.patch(`/leave/requests/${id}/cancel`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['my-leave-balance'] });
        },
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-100 text-emerald-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            case 'cancelled': return 'bg-slate-100 text-slate-700';
            case 'recalled': return 'bg-blue-100 text-[#0066B3]';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getBalanceColor = (balance: number, total: number) => {
        const percentage = (balance / total) * 100;
        if (percentage > 50) return 'bg-emerald-500';
        if (percentage > 20) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
                    <p className="text-slate-500">Request, track, and manage your leave</p>
                </div>
                <button
                    onClick={() => setShowRequestModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0066B3] text-white rounded-xl font-medium hover:bg-[#005299] transition-all shadow-lg shadow-blue-500/25"
                >
                    <Plus size={20} />
                    Request Leave
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
                            <Umbrella className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {myBalance?.reduce((acc, b) => acc + Number(b.balance_days), 0).toFixed(1) || 0}
                            </p>
                            <p className="text-sm text-slate-500">Days Available</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                            <Clock className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {myRequests?.filter(r => r.status === 'pending').length || 0}
                            </p>
                            <p className="text-sm text-slate-500">Pending Requests</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl">
                            <TrendingUp className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {myBalance?.reduce((acc, b) => acc + Number(b.used_days), 0).toFixed(1) || 0}
                            </p>
                            <p className="text-sm text-slate-500">Days Taken</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#0066B3] rounded-xl">
                            <Users className="text-white" size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {staffOnLeave?.length || 0}
                            </p>
                            <p className="text-sm text-slate-500">On Leave Today</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Leave Balances */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">My Leave Balances</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {myBalance?.map((balance) => (
                        <div key={balance.id} className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-slate-900">{balance.leaveType.name}</span>
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: balance.leaveType.color || '#6366f1' }}
                                />
                            </div>
                            <div className="flex items-end gap-2 mb-3">
                                <span className="text-3xl font-bold text-slate-900">
                                    {Number(balance.balance_days).toFixed(1)}
                                </span>
                                <span className="text-slate-500 mb-1">
                                    / {balance.entitled_days} days
                                </span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${getBalanceColor(Number(balance.balance_days), Number(balance.entitled_days))}`}
                                    style={{ width: `${Math.min(100, (Number(balance.balance_days) / Number(balance.entitled_days)) * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-slate-500">
                                <span>Used: {Number(balance.used_days).toFixed(1)}</span>
                                <span>Pending: {Number(balance.pending_days).toFixed(1)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex gap-8">
                    {[
                        { key: 'my-leave', label: 'My Requests' },
                        { key: 'team', label: 'Team Leave' },
                        { key: 'calendar', label: 'Calendar View' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`pb-4 px-1 font-medium transition-colors relative ${activeTab === tab.key
                                    ? 'text-[#0066B3]'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.key && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066B3] rounded-full" />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'my-leave' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">My Leave Requests</h3>
                    </div>
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Type</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Duration</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Days</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Requested</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingMyRequests ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : myRequests?.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No leave requests yet</td></tr>
                            ) : (
                                myRequests?.map((leave) => (
                                    <tr
                                        key={leave.id}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedLeaveDetail(leave)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: leave.leaveType?.color || '#6366f1' }}
                                                />
                                                <span className="font-medium text-slate-900">{leave.leaveType?.name}</span>
                                                {leave.is_emergency && (
                                                    <AlertTriangle className="text-amber-500" size={14} />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div className="flex items-center gap-1">
                                                <CalendarIcon size={14} className="text-slate-400" />
                                                {new Date(leave.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                {' - '}
                                                {new Date(leave.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium">{leave.total_days}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(leave.requested_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {leave.status === 'pending' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(leave.id); }}
                                                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'team' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">Team Leave Requests</h3>
                        <div className="flex items-center gap-3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Staff</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Type</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Duration</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Days</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Reliever</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingAll ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : allRequests?.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No leave requests found</td></tr>
                            ) : (
                                allRequests?.map((leave) => (
                                    <tr key={leave.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-sm font-bold">
                                                    {leave.staff?.first_name?.charAt(0)}
                                                </div>
                                                <span className="font-medium text-slate-900">
                                                    {leave.staff?.full_name || `${leave.staff?.first_name} ${leave.staff?.last_name}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm"
                                                style={{ backgroundColor: `${leave.leaveType?.color}20`, color: leave.leaveType?.color }}
                                            >
                                                {leave.leaveType?.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(leave.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            {' - '}
                                            {new Date(leave.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 font-medium">{leave.total_days}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {leave.reliever?.full_name || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'calendar' && (
                <LeaveCalendarView
                    calendarDate={calendarDate}
                    setCalendarDate={setCalendarDate}
                    calendarData={calendarData || []}
                    holidays={holidays || []}
                    staffOnLeave={staffOnLeave || []}
                />
            )}

            {/* Leave Request Modal */}
            {showRequestModal && (
                <LeaveRequestModal
                    leaveTypes={leaveTypes || []}
                    onClose={() => setShowRequestModal(false)}
                    onSuccess={() => {
                        setShowRequestModal(false);
                        queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
                        queryClient.invalidateQueries({ queryKey: ['my-leave-balance'] });
                    }}
                />
            )}

            {/* Leave Detail Modal */}
            {selectedLeaveDetail && (
                <LeaveDetailModal
                    leave={selectedLeaveDetail}
                    onClose={() => setSelectedLeaveDetail(null)}
                />
            )}
        </div>
    );
};

// ================== LEAVE CALENDAR VIEW ==================
const LeaveCalendarView: React.FC<{
    calendarDate: Date;
    setCalendarDate: (date: Date) => void;
    calendarData: CalendarEntry[];
    holidays: any[];
    staffOnLeave: any[];
}> = ({ calendarDate, setCalendarDate, calendarData, holidays, staffOnLeave }) => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const calendarDays = useMemo(() => {
        const days: { date: number | null; isToday: boolean; isWeekend: boolean; leaves: CalendarEntry[]; holiday?: any }[] = [];

        // Empty cells before first day
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push({ date: null, isToday: false, isWeekend: false, leaves: [] });
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const dayOfWeek = currentDate.getDay();
            const dateStr = currentDate.toISOString().split('T')[0];

            // Find leaves for this day
            const dayLeaves = calendarData.filter(leave => {
                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);
                return currentDate >= start && currentDate <= end;
            });

            // Find holiday for this day
            const holiday = holidays.find(h => {
                const holidayDate = new Date(h.date).toISOString().split('T')[0];
                return holidayDate === dateStr;
            });

            days.push({
                date: day,
                isToday: currentDate.toDateString() === today.toDateString(),
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                leaves: dayLeaves,
                holiday,
            });
        }

        return days;
    }, [year, month, calendarData, holidays, firstDayOfMonth, daysInMonth]);

    const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
    const goToToday = () => setCalendarDate(new Date());

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Calendar Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={prevMonth}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-slate-900">
                            {monthNames[month]} {year}
                        </h3>
                        <button
                            onClick={nextMonth}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button
                        onClick={goToToday}
                        className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        Today
                    </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                    {dayNames.map((day, i) => (
                        <div
                            key={day}
                            className={`py-3 text-center text-sm font-semibold ${i === 0 || i === 6 ? 'text-red-500' : 'text-slate-600'
                                }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                    {calendarDays.map((day, idx) => (
                        <div
                            key={idx}
                            className={`min-h-[100px] border-b border-r border-slate-100 p-2 ${!day.date ? 'bg-slate-50' :
                                    day.isWeekend ? 'bg-red-50/30' :
                                        day.holiday ? 'bg-amber-50' :
                                            'bg-white'
                                }`}
                        >
                            {day.date && (
                                <>
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${day.isToday
                                                    ? 'bg-[#0066B3] text-white'
                                                    : day.isWeekend
                                                        ? 'text-red-500'
                                                        : 'text-slate-700'
                                                }`}
                                        >
                                            {day.date}
                                        </span>
                                        {day.holiday && (
                                            <span className="text-xs text-amber-600 font-medium truncate max-w-[60px]">
                                                {day.holiday.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {day.leaves.slice(0, 3).map((leave, i) => (
                                            <div
                                                key={leave.id + i}
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate"
                                                style={{
                                                    backgroundColor: `${leave.leaveTypeColor || '#6366f1'}20`,
                                                    color: leave.leaveTypeColor || '#6366f1',
                                                }}
                                                title={`${leave.staffName} - ${leave.leaveType}`}
                                            >
                                                <span className="truncate">{leave.staffName.split(' ')[0]}</span>
                                            </div>
                                        ))}
                                        {day.leaves.length > 3 && (
                                            <span className="text-xs text-slate-500">+{day.leaves.length - 3} more</span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
                {/* Staff On Leave Today */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Umbrella className="text-blue-500" size={18} />
                        On Leave Today
                    </h4>
                    {staffOnLeave.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">Everyone is at work! 🎉</p>
                    ) : (
                        <div className="space-y-3">
                            {staffOnLeave.map((staff: any) => (
                                <div key={staff.id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-sm font-bold">
                                        {staff.first_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate text-sm">{staff.full_name}</p>
                                        <p className="text-xs text-slate-500 truncate">{staff.position?.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming Holidays */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <CalendarDays className="text-amber-500" size={18} />
                        Upcoming Holidays
                    </h4>
                    <div className="space-y-3">
                        {holidays
                            .filter((h: any) => new Date(h.date) >= new Date())
                            .slice(0, 5)
                            .map((holiday: any) => (
                                <div key={holiday.id} className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                                    <div className="p-2 bg-amber-100 rounded-lg">
                                        <Sun className="text-amber-600" size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 text-sm truncate">{holiday.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(holiday.date).toLocaleDateString('en-GB', {
                                                weekday: 'short', day: 'numeric', month: 'short'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h4 className="font-semibold text-slate-900 mb-3">Legend</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-[#0066B3]"></span>
                            <span className="text-slate-600">Today</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-red-100"></span>
                            <span className="text-slate-600">Weekend</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-amber-100"></span>
                            <span className="text-slate-600">Public Holiday</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ================== LEAVE DETAIL MODAL ==================
const LeaveDetailModal: React.FC<{
    leave: LeaveRequest;
    onClose: () => void;
}> = ({ leave, onClose }) => {
    const { data: approvalHistory } = useQuery({
        queryKey: ['leave-approval-history', leave.id],
        queryFn: async () => {
            const response = await api.get(`/approvals/target/leave/${leave.id}`);
            return response.data;
        },
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Leave Request Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status Header */}
                    <div className={`p-4 rounded-xl border ${getStatusColor(leave.status)}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {leave.status === 'approved' && <CheckCircle size={24} />}
                                {leave.status === 'rejected' && <XCircle size={24} />}
                                {leave.status === 'pending' && <Clock size={24} />}
                                <div>
                                    <p className="font-semibold capitalize">{leave.status}</p>
                                    <p className="text-sm opacity-75">
                                        Requested on {new Date(leave.requested_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            {leave.is_emergency && (
                                <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                    <AlertTriangle size={14} />
                                    Emergency
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Leave Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-sm text-slate-500 mb-1">Leave Type</p>
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: leave.leaveType?.color || '#6366f1' }}
                                />
                                <span className="font-medium text-slate-900">{leave.leaveType?.name}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-sm text-slate-500 mb-1">Total Days</p>
                            <p className="text-2xl font-bold text-slate-900">{leave.total_days}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-sm text-slate-500 mb-1">Start Date</p>
                            <p className="font-medium text-slate-900">
                                {new Date(leave.start_date).toLocaleDateString('en-GB', {
                                    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-sm text-slate-500 mb-1">End Date</p>
                            <p className="font-medium text-slate-900">
                                {new Date(leave.end_date).toLocaleDateString('en-GB', {
                                    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Reason */}
                    {leave.reason && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-sm text-slate-500 mb-2">Reason</p>
                            <p className="text-slate-700">{leave.reason}</p>
                        </div>
                    )}

                    {/* Reliever */}
                    {leave.reliever && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-sm text-slate-500 mb-2">Reliever</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-bold">
                                    {leave.reliever.full_name?.charAt(0)}
                                </div>
                                <span className="font-medium text-slate-900">{leave.reliever.full_name}</span>
                            </div>
                        </div>
                    )}

                    {/* Approval Timeline */}
                    {approvalHistory && (
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-4">Approval Timeline</h4>
                            <ApprovalTimeline instance={approvalHistory} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ================== APPROVAL TIMELINE COMPONENT ==================
const ApprovalTimeline: React.FC<{ instance: any }> = ({ instance }) => {
    if (!instance?.actions?.length && !instance?.flow?.steps?.length) {
        return (
            <div className="text-center py-6 text-slate-500">
                <Clock className="mx-auto mb-2" size={24} />
                <p>Awaiting approval workflow initiation</p>
            </div>
        );
    }

    const steps = instance.flow?.steps?.sort((a: any, b: any) => a.step_order - b.step_order) || [];
    const actions = instance.actions || [];

    return (
        <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-6">
                {/* Request Created */}
                <div className="relative flex gap-4">
                    <div className="relative z-10 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <CalendarIcon className="text-[#0066B3]" size={18} />
                    </div>
                    <div className="flex-1 pb-4">
                        <p className="font-medium text-slate-900">Request Created</p>
                        <p className="text-sm text-slate-500">
                            {instance.requester?.full_name || 'Staff'} submitted the request
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {new Date(instance.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Actions taken */}
                {actions.map((action: any, idx: number) => (
                    <div key={action.id} className="relative flex gap-4">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${action.action === 'approved' ? 'bg-emerald-100' :
                                action.action === 'rejected' ? 'bg-red-100' :
                                    'bg-slate-100'
                            }`}>
                            {action.action === 'approved' && <CheckCircle className="text-emerald-600" size={18} />}
                            {action.action === 'rejected' && <XCircle className="text-red-600" size={18} />}
                            {action.action === 'returned' && <AlertTriangle className="text-amber-600" size={18} />}
                        </div>
                        <div className="flex-1 pb-4">
                            <p className="font-medium text-slate-900">
                                {action.step?.name || `Step ${action.step_order}`} - <span className={
                                    action.action === 'approved' ? 'text-emerald-600' :
                                        action.action === 'rejected' ? 'text-red-600' :
                                            'text-amber-600'
                                }>{action.action}</span>
                            </p>
                            <p className="text-sm text-slate-500">
                                By {action.approver?.full_name || 'System'}
                            </p>
                            {action.comment && (
                                <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic">
                                    "{action.comment}"
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                                {new Date(action.acted_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Pending steps */}
                {instance.status === 'pending' && steps
                    .filter((s: any) => s.step_order >= instance.current_step_order)
                    .map((step: any) => (
                        <div key={step.id} className="relative flex gap-4 opacity-50">
                            <div className="relative z-10 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                                <Clock className="text-slate-400" size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-slate-700">{step.name || `Step ${step.step_order}`}</p>
                                <p className="text-sm text-slate-500">
                                    {step.step_order === instance.current_step_order ? 'Awaiting action' : 'Pending'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Approver: {step.approver_role_code || 'TBD'}
                                </p>
                            </div>
                        </div>
                    ))}

                {/* Final status */}
                {(instance.status === 'approved' || instance.status === 'rejected') && (
                    <div className="relative flex gap-4">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${instance.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}>
                            {instance.status === 'approved' ? (
                                <CheckCircle className="text-white" size={20} />
                            ) : (
                                <XCircle className="text-white" size={20} />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-slate-900">
                                Request {instance.status === 'approved' ? 'Approved' : 'Rejected'}
                            </p>
                            {instance.final_comment && (
                                <p className="text-sm text-slate-600 mt-1">{instance.final_comment}</p>
                            )}
                            {instance.resolved_at && (
                                <p className="text-xs text-slate-400 mt-1">
                                    {new Date(instance.resolved_at).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ================== LEAVE REQUEST MODAL ==================
const LeaveRequestModal: React.FC<{
    leaveTypes: LeaveType[];
    onClose: () => void;
    onSuccess: () => void;
}> = ({ leaveTypes, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
        is_emergency: false,
        is_half_day: false,
        half_day_period: 'morning',
        contact_phone: '',
    });
    const [error, setError] = useState<string | null>(null);

    const submitMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await api.post('/leave/request', data);
            return response.data;
        },
        onSuccess: () => {
            onSuccess();
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to submit leave request');
        },
    });

    const calculateDays = () => {
        if (!formData.start_date || !formData.end_date) return 0;
        if (formData.is_half_day) return 0.5;
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        let days = 0;
        const current = new Date(start);
        while (current <= end) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) days++;
            current.setDate(current.getDate() + 1);
        }
        return days;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Request Leave</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(formData); }} className="p-6 space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Leave Type *</label>
                        <select
                            value={formData.leave_type_id}
                            onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                            required
                        >
                            <option value="">Select leave type</option>
                            {leaveTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name} ({type.max_days_per_year} days/year)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Start Date *</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">End Date *</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                min={formData.start_date}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_half_day}
                                onChange={(e) => setFormData({ ...formData, is_half_day: e.target.checked })}
                                className="w-4 h-4 text-[#0066B3] rounded"
                            />
                            <span className="text-sm text-slate-700">Half Day</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_emergency}
                                onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })}
                                className="w-4 h-4 text-[#0066B3] rounded"
                            />
                            <span className="text-sm text-slate-700">Emergency</span>
                        </label>
                    </div>

                    {formData.is_half_day && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Half Day Period</label>
                            <div className="flex gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="morning"
                                        checked={formData.half_day_period === 'morning'}
                                        onChange={(e) => setFormData({ ...formData, half_day_period: e.target.value })}
                                        className="hidden"
                                    />
                                    <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${formData.half_day_period === 'morning'
                                            ? 'border-[#0066B3] bg-blue-50 text-[#0066B3]'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}>
                                        <Sunrise size={18} />
                                        Morning
                                    </div>
                                </label>
                                <label className="flex-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="afternoon"
                                        checked={formData.half_day_period === 'afternoon'}
                                        onChange={(e) => setFormData({ ...formData, half_day_period: e.target.value })}
                                        className="hidden"
                                    />
                                    <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${formData.half_day_period === 'afternoon'
                                            ? 'border-[#0066B3] bg-blue-50 text-[#0066B3]'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}>
                                        <Moon size={18} />
                                        Afternoon
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Reason</label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] resize-none"
                            placeholder="Briefly describe the reason for your leave..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone (while on leave)</label>
                        <input
                            type="tel"
                            value={formData.contact_phone}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                            placeholder="+254..."
                        />
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600">Total Working Days:</span>
                            <span className="text-3xl font-bold text-[#0066B3]">
                                {calculateDays()}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitMutation.isPending}
                            className="flex-1 px-4 py-3 bg-[#0066B3] text-white rounded-xl font-medium hover:bg-[#005299] disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25"
                        >
                            {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
