import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    Umbrella, Sun, Users, Filter, X
} from 'lucide-react';

interface LeaveCalendarEntry {
    id: string;
    staffId: string;
    staffName: string;
    staffAvatar?: string;
    leaveType: string;
    leaveTypeCode?: string;
    leaveTypeColor?: string;
    startDate: string;
    endDate: string;
    status: string;
    totalDays: number;
    isHalfDay?: boolean;
    halfDayPeriod?: 'morning' | 'afternoon';
}

interface PublicHoliday {
    id: string;
    name: string;
    date: string;
    is_recurring?: boolean;
}

interface LeaveCalendarProps {
    leaves: LeaveCalendarEntry[];
    holidays: PublicHoliday[];
    onDateClick?: (date: Date, leaves: LeaveCalendarEntry[]) => void;
    onLeaveClick?: (leave: LeaveCalendarEntry) => void;
    initialDate?: Date;
    showLegend?: boolean;
    showSidebar?: boolean;
    minHeight?: number;
}

export const LeaveCalendar: React.FC<LeaveCalendarProps> = ({
    leaves,
    holidays,
    onDateClick,
    onLeaveClick,
    initialDate = new Date(),
    showLegend = true,
    showSidebar = true,
    minHeight = 500,
}) => {
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Extract unique leave types for filtering
    const leaveTypes = useMemo(() => {
        const types = new Map<string, { code: string; name: string; color: string }>();
        leaves.forEach(l => {
            if (l.leaveTypeCode && !types.has(l.leaveTypeCode)) {
                types.set(l.leaveTypeCode, {
                    code: l.leaveTypeCode,
                    name: l.leaveType,
                    color: l.leaveTypeColor || '#6366f1'
                });
            }
        });
        return Array.from(types.values());
    }, [leaves]);

    // Filter leaves by type
    const filteredLeaves = useMemo(() => {
        if (leaveTypeFilter === 'all') return leaves;
        return leaves.filter(l => l.leaveTypeCode === leaveTypeFilter);
    }, [leaves, leaveTypeFilter]);

    // Build calendar days with leaves and holidays
    const calendarDays = useMemo(() => {
        const days: {
            date: number | null;
            fullDate: Date | null;
            isToday: boolean;
            isWeekend: boolean;
            isSelected: boolean;
            leaves: LeaveCalendarEntry[];
            holiday: PublicHoliday | null;
        }[] = [];

        // Empty cells before first day
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push({
                date: null,
                fullDate: null,
                isToday: false,
                isWeekend: false,
                isSelected: false,
                leaves: [],
                holiday: null
            });
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDay = new Date(year, month, day);
            const dayOfWeek = currentDay.getDay();
            const dateStr = currentDay.toISOString().split('T')[0];

            // Find leaves for this day
            const dayLeaves = filteredLeaves.filter(leave => {
                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                currentDay.setHours(12, 0, 0, 0);
                return currentDay >= start && currentDay <= end && leave.status !== 'cancelled' && leave.status !== 'rejected';
            });

            // Find holiday for this day
            const holiday = holidays.find(h => {
                const holidayDate = new Date(h.date).toISOString().split('T')[0];
                return holidayDate === dateStr;
            }) || null;

            days.push({
                date: day,
                fullDate: currentDay,
                isToday: currentDay.toDateString() === today.toDateString(),
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                isSelected: selectedDate?.toDateString() === currentDay.toDateString(),
                leaves: dayLeaves,
                holiday,
            });
        }

        return days;
    }, [year, month, filteredLeaves, holidays, firstDayOfMonth, daysInMonth, selectedDate]);

    // Get selected date's leaves
    const selectedDateLeaves = useMemo(() => {
        if (!selectedDate) return [];
        return filteredLeaves.filter(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            selectedDate.setHours(12, 0, 0, 0);
            return selectedDate >= start && selectedDate <= end;
        });
    }, [selectedDate, filteredLeaves]);

    const handleDateClick = (day: typeof calendarDays[0]) => {
        if (!day.date || !day.fullDate) return;
        setSelectedDate(day.fullDate);
        onDateClick?.(day.fullDate, day.leaves);
    };

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar Main */}
            <div className={`${showSidebar ? 'lg:col-span-3' : 'lg:col-span-4'} bg-white rounded-xl border border-slate-200 overflow-hidden`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={prevMonth}
                            className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-slate-900 min-w-[200px] text-center">
                            {monthNames[month]} {year}
                        </h3>
                        <button
                            onClick={nextMonth}
                            className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Leave Type Filter */}
                        {leaveTypes.length > 0 && (
                            <div className="relative">
                                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={leaveTypeFilter}
                                    onChange={(e) => setLeaveTypeFilter(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                >
                                    <option value="all">All Leave Types</option>
                                    {leaveTypes.map(t => (
                                        <option key={t.code} value={t.code}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={goToToday}
                            className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium shadow-sm"
                        >
                            Today
                        </button>
                    </div>
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
                <div className="grid grid-cols-7" style={{ minHeight }}>
                    {calendarDays.map((day, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleDateClick(day)}
                            className={`min-h-[90px] border-b border-r border-slate-100 p-1.5 cursor-pointer transition-colors ${!day.date ? 'bg-slate-50 cursor-default' :
                                    day.isSelected ? 'bg-purple-50 ring-2 ring-inset ring-purple-500' :
                                        day.isWeekend ? 'bg-red-50/30 hover:bg-red-50' :
                                            day.holiday ? 'bg-amber-50 hover:bg-amber-100' :
                                                'bg-white hover:bg-slate-50'
                                }`}
                        >
                            {day.date && (
                                <>
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors ${day.isToday
                                                    ? 'bg-purple-600 text-white shadow-sm'
                                                    : day.isSelected
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : day.isWeekend
                                                            ? 'text-red-500'
                                                            : 'text-slate-700'
                                                }`}
                                        >
                                            {day.date}
                                        </span>
                                        {day.holiday && (
                                            <Sun size={14} className="text-amber-500" title={day.holiday.name} />
                                        )}
                                    </div>

                                    {/* Leave Pills */}
                                    <div className="space-y-0.5">
                                        {day.leaves.slice(0, 3).map((leave, i) => (
                                            <div
                                                key={leave.id}
                                                onClick={(e) => { e.stopPropagation(); onLeaveClick?.(leave); }}
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate cursor-pointer hover:opacity-80 transition-opacity"
                                                style={{
                                                    backgroundColor: `${leave.leaveTypeColor || '#6366f1'}20`,
                                                    color: leave.leaveTypeColor || '#6366f1',
                                                    borderLeft: `2px solid ${leave.leaveTypeColor || '#6366f1'}`
                                                }}
                                                title={`${leave.staffName} - ${leave.leaveType}`}
                                            >
                                                <span className="truncate font-medium">
                                                    {leave.staffName.split(' ')[0]}
                                                </span>
                                                {leave.isHalfDay && (
                                                    <span className="text-[10px] opacity-75">
                                                        ({leave.halfDayPeriod === 'morning' ? 'AM' : 'PM'})
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {day.leaves.length > 3 && (
                                            <span className="text-xs text-slate-500 pl-1">
                                                +{day.leaves.length - 3} more
                                            </span>
                                        )}
                                    </div>

                                    {/* Holiday Label */}
                                    {day.holiday && day.leaves.length === 0 && (
                                        <div className="text-xs text-amber-600 font-medium truncate mt-1">
                                            {day.holiday.name}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                {showLegend && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded bg-purple-600" />
                                <span className="text-slate-600">Today</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded bg-red-100" />
                                <span className="text-slate-600">Weekend</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded bg-amber-100" />
                                <span className="text-slate-600">Public Holiday</span>
                            </div>
                            {leaveTypes.slice(0, 4).map(t => (
                                <div key={t.code} className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />
                                    <span className="text-slate-600">{t.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar */}
            {showSidebar && (
                <div className="space-y-6">
                    {/* Selected Date Details */}
                    {selectedDate && (
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <CalendarIcon size={18} className="text-purple-500" />
                                    {selectedDate.toLocaleDateString('en-GB', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long'
                                    })}
                                </h4>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {selectedDateLeaves.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    No leave scheduled for this date
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDateLeaves.map(leave => (
                                        <div
                                            key={leave.id}
                                            className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors"
                                            style={{ borderLeftWidth: 3, borderLeftColor: leave.leaveTypeColor || '#6366f1' }}
                                            onClick={() => onLeaveClick?.(leave)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                                    style={{ backgroundColor: leave.leaveTypeColor || '#6366f1' }}
                                                >
                                                    {leave.staffName.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-900 truncate">
                                                        {leave.staffName}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {leave.leaveType}
                                                        {leave.isHalfDay && ` (${leave.halfDayPeriod === 'morning' ? 'AM' : 'PM'})`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs text-slate-400">
                                                {new Date(leave.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                {' - '}
                                                {new Date(leave.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                {' '}
                                                ({leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'})
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Umbrella size={18} className="text-blue-500" />
                            This Month
                        </h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Total Leave Days</span>
                                <span className="font-semibold text-slate-900">
                                    {filteredLeaves.reduce((acc, l) => acc + l.totalDays, 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Staff on Leave</span>
                                <span className="font-semibold text-slate-900">
                                    {new Set(filteredLeaves.map(l => l.staffId)).size}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Public Holidays</span>
                                <span className="font-semibold text-slate-900">
                                    {holidays.filter(h => {
                                        const d = new Date(h.date);
                                        return d.getMonth() === month && d.getFullYear() === year;
                                    }).length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Holidays */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Sun size={18} className="text-amber-500" />
                            Upcoming Holidays
                        </h4>
                        <div className="space-y-2">
                            {holidays
                                .filter(h => new Date(h.date) >= today)
                                .slice(0, 5)
                                .map(holiday => (
                                    <div
                                        key={holiday.id}
                                        className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg"
                                    >
                                        <div className="p-1.5 bg-amber-100 rounded-lg">
                                            <Sun className="text-amber-600" size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 text-sm truncate">
                                                {holiday.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(holiday.date).toLocaleDateString('en-GB', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            {holidays.filter(h => new Date(h.date) >= today).length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-2">
                                    No upcoming holidays
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveCalendar;
