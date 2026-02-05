import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    Bell, Check, CheckCheck, Trash2, X, Clock, AlertTriangle,
    FileText, Calendar, DollarSign, Users, Briefcase, Settings
} from 'lucide-react';

interface NotificationAction {
    label: string;
    action: string;
    url?: string;
    style?: 'primary' | 'secondary' | 'danger';
}

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    priority: string;
    payload?: Record<string, any>;
    is_read: boolean;
    created_at: string;
    actions?: NotificationAction[];
}

const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
        approval_required: <Clock className="text-amber-500" size={18} />,
        approval_completed: <Check className="text-green-500" size={18} />,
        approval_rejected: <X className="text-red-500" size={18} />,
        leave_request: <Calendar className="text-blue-500" size={18} />,
        claim: <DollarSign className="text-green-500" size={18} />,
        loan: <DollarSign className="text-[#0066B3]" size={18} />,
        document: <FileText className="text-slate-500" size={18} />,
        recruitment: <Users className="text-indigo-500" size={18} />,
        staff: <Briefcase className="text-teal-500" size={18} />,
        system: <Settings className="text-slate-500" size={18} />,
    };

    for (const [key, icon] of Object.entries(iconMap)) {
        if (type.includes(key)) return icon;
    }
    return <Bell className="text-slate-500" size={18} />;
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'urgent': return 'border-l-red-500 bg-red-50';
        case 'high': return 'border-l-amber-500 bg-amber-50';
        case 'medium': return 'border-l-blue-500';
        case 'low': return 'border-l-slate-300';
        default: return 'border-l-slate-300';
    }
};

const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
};

export const NotificationBell: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Fetch unread count
    const { data: countData } = useQuery({
        queryKey: ['notifications-count'],
        queryFn: async () => {
            const response = await api.get('/notifications/unread-count');
            return response.data;
        },
        refetchInterval: 30000, // Poll every 30 seconds
    });

    // Fetch notifications
    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await api.get('/notifications?limit=10');
            return response.data;
        },
        enabled: isOpen,
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
    });

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            await api.patch('/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = countData?.count || 0;
    const notifications: Notification[] = notificationsData?.notifications || [];

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsReadMutation.mutate(notification.id);
        }
        // Handle navigation based on payload
        if (notification.payload?.url) {
            window.location.href = notification.payload.url;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50">
                        <div>
                            <h3 className="font-semibold text-slate-900">Notifications</h3>
                            <p className="text-xs text-slate-500">{unreadCount} unread</p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsReadMutation.mutate()}
                                className="flex items-center gap-1 text-xs text-[#0066B3] hover:text-[#003366] font-medium"
                            >
                                <CheckCheck size={14} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066B3] mx-auto"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="mx-auto mb-2 text-slate-300" size={32} />
                                <p className="text-slate-500 text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`px-4 py-3 border-l-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${getPriorityColor(notification.priority)
                                        } ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm ${!notification.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                    {notification.title}
                                                </p>
                                                {!notification.is_read && (
                                                    <span className="w-2 h-2 bg-[#0066B3] rounded-full flex-shrink-0 mt-1.5"></span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                                                {notification.body}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {formatTimeAgo(notification.created_at)}
                                            </p>
                                            {notification.actions && notification.actions.length > 0 && (
                                                <div className="flex gap-2 mt-2">
                                                    {notification.actions.map((action, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (action.url) window.location.href = action.url;
                                                            }}
                                                            className={`px-2 py-1 text-xs rounded font-medium ${action.style === 'primary'
                                                                ? 'bg-[#0066B3] text-white hover:bg-[#005599]'
                                                                : action.style === 'danger'
                                                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                        >
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
                        <a
                            href="/notifications"
                            className="text-sm text-[#0066B3] hover:text-[#003366] font-medium"
                        >
                            View all notifications →
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
