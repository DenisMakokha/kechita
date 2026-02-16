import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Bell, Check, CheckCheck, Trash2, Settings, Clock, AlertTriangle,
    FileText, Calendar, DollarSign, Users, Briefcase, X, Filter
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

interface NotificationPreference {
    type: string;
    in_app: boolean;
    email: boolean;
    push: boolean;
}

const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
        approval_required: <Clock className="text-amber-500" size={20} />,
        approval_completed: <Check className="text-green-500" size={20} />,
        approval_rejected: <X className="text-red-500" size={20} />,
        leave_request: <Calendar className="text-blue-500" size={20} />,
        claim: <DollarSign className="text-green-500" size={20} />,
        loan: <DollarSign className="text-[#0066B3]" size={20} />,
        document: <FileText className="text-slate-500" size={20} />,
        recruitment: <Users className="text-indigo-500" size={20} />,
        staff: <Briefcase className="text-teal-500" size={20} />,
        system: <Settings className="text-slate-500" size={20} />,
    };

    for (const [key, icon] of Object.entries(iconMap)) {
        if (type.includes(key)) return icon;
    }
    return <Bell className="text-slate-500" size={20} />;
};

const getPriorityBadge = (priority: string) => {
    switch (priority) {
        case 'urgent': return 'bg-red-100 text-red-700';
        case 'high': return 'bg-amber-100 text-amber-700';
        case 'medium': return 'bg-blue-100 text-blue-700';
        case 'low': return 'bg-slate-100 text-slate-600';
        default: return 'bg-slate-100 text-slate-600';
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

export const NotificationsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'preferences'>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [showClearReadConfirm, setShowClearReadConfirm] = useState(false);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Fetch notifications
    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ['all-notifications', activeTab === 'unread'],
        queryFn: async () => {
            const params = activeTab === 'unread' ? '?unreadOnly=true&limit=100' : '?limit=100';
            const response = await api.get(`/notifications${params}`);
            return response.data;
        },
        enabled: activeTab !== 'preferences',
        refetchInterval: 30000,
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['notification-stats'],
        queryFn: async () => (await api.get('/notifications/stats')).data,
        refetchInterval: 30000,
    });

    // Fetch preferences
    const { data: preferences } = useQuery<NotificationPreference[]>({
        queryKey: ['notification-preferences'],
        queryFn: async () => (await api.get('/notifications/preferences')).data,
        enabled: activeTab === 'preferences',
    });

    // Mutations
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to mark as read', 'error'),
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => api.patch('/notifications/read-all'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to mark all as read', 'error'),
    });

    const deleteNotificationMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/notifications/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete notification', 'error'),
    });

    const deleteAllReadMutation = useMutation({
        mutationFn: async () => api.delete('/notifications?readOnly=true'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to clear notifications', 'error'),
    });

    const updatePreferenceMutation = useMutation({
        mutationFn: async ({ type, updates }: { type: string; updates: Partial<NotificationPreference> }) => {
            return api.patch(`/notifications/preferences/${type}`, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update preference', 'error'),
    });

    const notifications: Notification[] = notificationsData?.notifications || [];
    const filteredNotifications = filterType === 'all'
        ? notifications
        : notifications.filter(n => n.type.includes(filterType));

    const notificationTypes = [...new Set(notifications.map(n => n.type.split('_')[0]))];

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                        <span className="font-medium">{toast.text}</span>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Bell className="text-[#0066B3]" />
                        Notifications
                    </h1>
                    <p className="text-slate-500">Manage your notifications and preferences</p>
                </div>
                <div className="flex items-center gap-3">
                    {activeTab !== 'preferences' && stats?.unread > 0 && (
                        <button
                            onClick={() => markAllAsReadMutation.mutate()}
                            disabled={markAllAsReadMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                        >
                            <CheckCheck size={18} />
                            Mark all read
                        </button>
                    )}
                    {activeTab !== 'preferences' && (
                        <button
                            onClick={() => setShowClearReadConfirm(true)}
                            disabled={deleteAllReadMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                        >
                            <Trash2 size={18} />
                            Clear read
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Bell className="text-[#0066B3]" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
                            <p className="text-sm text-slate-500">Total</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.unread || 0}</p>
                            <p className="text-sm text-slate-500">Unread</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="text-red-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.urgent || 0}</p>
                            <p className="text-sm text-slate-500">Urgent</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Check className="text-green-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.read || 0}</p>
                            <p className="text-sm text-slate-500">Read</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'all' ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    All Notifications
                </button>
                <button
                    onClick={() => setActiveTab('unread')}
                    className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'unread' ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Unread ({stats?.unread || 0})
                </button>
                <button
                    onClick={() => setActiveTab('preferences')}
                    className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'preferences' ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Settings size={16} />
                    Preferences
                </button>
            </div>

            {/* Content */}
            {activeTab !== 'preferences' ? (
                <div className="space-y-4">
                    {/* Filter */}
                    <div className="flex items-center gap-3">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                            <option value="all">All Types</option>
                            {notificationTypes.map(type => (
                                <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                            ))}
                        </select>
                    </div>

                    {/* Notifications List */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066B3] mx-auto"></div>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell className="mx-auto mb-3 text-slate-300" size={48} />
                                <p className="text-slate-500">No notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-slate-50 transition-colors ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className={`font-medium ${!notification.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-sm text-slate-600 mt-1">
                                                            {notification.body}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <span className="text-xs text-slate-400">
                                                                {formatTimeAgo(notification.created_at)}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(notification.priority)}`}>
                                                                {notification.priority}
                                                            </span>
                                                        </div>
                                                        {notification.actions && notification.actions.length > 0 && (
                                                            <div className="flex items-center gap-2 mt-3">
                                                                {notification.actions.map((action, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => {
                                                                            if (action.url) {
                                                                                if (action.url.startsWith('/')) {
                                                                                    navigate(action.url);
                                                                                } else {
                                                                                    window.location.href = action.url;
                                                                                }
                                                                            }
                                                                            if (!notification.is_read) {
                                                                                markAsReadMutation.mutate(notification.id);
                                                                            }
                                                                        }}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                                            action.style === 'primary' ? 'bg-[#0066B3] text-white hover:bg-[#005299]' :
                                                                            action.style === 'danger' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                                                            'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                        }`}
                                                                    >
                                                                        {action.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {!notification.is_read && (
                                                            <button
                                                                onClick={() => markAsReadMutation.mutate(notification.id)}
                                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                                                title="Mark as read"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => deleteNotificationMutation.mutate(notification.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Preferences Tab */
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-900">Notification Preferences</h3>
                        <p className="text-sm text-slate-500">Choose how you want to receive notifications</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                        <div className="px-6 py-3 bg-slate-50 grid grid-cols-4 gap-4 text-sm font-medium text-slate-600">
                            <div>Notification Type</div>
                            <div className="text-center">In-App</div>
                            <div className="text-center">Email</div>
                            <div className="text-center">Push</div>
                        </div>
                        {preferences?.map((pref) => (
                            <div key={pref.type} className="px-6 py-4 grid grid-cols-4 gap-4 items-center">
                                <div className="font-medium text-slate-800">
                                    {pref.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </div>
                                <div className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={pref.in_app}
                                        onChange={(e) => updatePreferenceMutation.mutate({ type: pref.type, updates: { in_app: e.target.checked } })}
                                        className="w-5 h-5 text-[#0066B3] rounded"
                                    />
                                </div>
                                <div className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={pref.email}
                                        onChange={(e) => updatePreferenceMutation.mutate({ type: pref.type, updates: { email: e.target.checked } })}
                                        className="w-5 h-5 text-[#0066B3] rounded"
                                    />
                                </div>
                                <div className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={pref.push}
                                        onChange={(e) => updatePreferenceMutation.mutate({ type: pref.type, updates: { push: e.target.checked } })}
                                        className="w-5 h-5 text-[#0066B3] rounded"
                                    />
                                </div>
                            </div>
                        ))}
                        {(!preferences || preferences.length === 0) && (
                            <div className="p-8 text-center text-slate-500">
                                No preferences configured yet
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Clear Read Notifications Dialog */}
            <ConfirmDialog
                isOpen={showClearReadConfirm}
                title="Clear Read Notifications"
                message="Delete all read notifications? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { deleteAllReadMutation.mutate(); setShowClearReadConfirm(false); }}
                onCancel={() => setShowClearReadConfirm(false)}
                isLoading={deleteAllReadMutation.isPending}
            />
        </div>
    );
};

export default NotificationsPage;
