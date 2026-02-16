import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Megaphone, Plus, Send, Clock, Eye, Users, Bell, CheckCircle,
    Calendar, Mail, MessageSquare, X, Edit, Archive, AlertCircle, Globe
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'draft' | 'scheduled' | 'published' | 'archived';
    channels: string[];
    target_audience: {
        all_staff?: boolean;
        roles?: string[];
        branch_ids?: string[];
        department_ids?: string[];
    };
    scheduled_for?: string;
    published_at?: string;
    requires_acknowledgment: boolean;
    view_count: number;
    acknowledgment_count: number;
    created_at: string;
    author?: { first_name: string; last_name: string };
}


export const AnnouncementsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'feed' | 'manage'>('feed');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [deleteAnnId, setDeleteAnnId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const user = useAuthStore(state => state.user);
    const isAdmin = user?.roles?.some(r => ['CEO', 'HR_MANAGER', 'HR_ASSISTANT'].includes(r.code)) || false;

    // Show toast message
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text: message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    // User announcements (for feed)
    const { data: myAnnouncements = [] } = useQuery<Announcement[]>({
        queryKey: ['my-announcements'],
        queryFn: () => api.get('/communications/announcements/my').then(r => r.data),
        refetchInterval: 60000,
    });

    // Admin announcements (for management)
    const { data: allAnnouncements = [] } = useQuery<Announcement[]>({
        queryKey: ['all-announcements', statusFilter],
        queryFn: () => api.get('/communications/announcements', { params: { status: statusFilter || undefined } }).then(r => r.data),
        enabled: isAdmin,
        refetchInterval: 60000,
    });

    const acknowledgeMutation = useMutation({
        mutationFn: (id: string) => api.post(`/communications/announcements/${id}/acknowledge`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-announcements'] });
            showToast('Announcement acknowledged successfully!');
        },
        onError: () => {
            showToast('Failed to acknowledge. Please try again.');
        }
    });

    const publishMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/communications/announcements/${id}/publish`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
            showToast('Announcement published!');
        },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to publish announcement', 'error'),
    });

    const archiveMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/communications/announcements/${id}/archive`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
            showToast('Announcement archived');
        },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to archive announcement', 'error'),
    });

    const unarchiveMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/communications/announcements/${id}/unarchive`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
            showToast('Announcement restored');
        },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to restore announcement', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/communications/announcements/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
            showToast('Announcement deleted');
        },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to delete announcement', 'error'),
    });

    const handleAcknowledge = (id: string) => {
        acknowledgeMutation.mutate(id);
    };

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'urgent': return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' };
            case 'high': return { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' };
            case 'normal': return { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' };
            default: return { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'published': return { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle size={14} /> };
            case 'scheduled': return { bg: 'bg-amber-100 text-amber-700', icon: <Clock size={14} /> };
            case 'draft': return { bg: 'bg-slate-100 text-slate-600', icon: <Edit size={14} /> };
            default: return { bg: 'bg-slate-100 text-slate-500', icon: <Archive size={14} /> };
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const displayAnnouncements = myAnnouncements;
    const displayAllAnnouncements = allAnnouncements;

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${toastMessage.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                        <CheckCircle size={18} className={toastMessage.type === 'error' ? 'text-white' : 'text-emerald-400'} />
                        <span className="font-medium">{toastMessage.text}</span>
                    </div>
                </div>
            )}
            {/* Page Header */}
            <div className="bg-gradient-to-br from-[#0066B3] via-[#0088E0] to-[#00AEEF] rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0yaDF2NGgtMXYtNHptMi0yaDF2MWgtMXYtMXptLTIgMGgxdjFoLTF2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Megaphone size={24} />
                                </div>
                                Communications Hub
                            </h1>
                            <p className="text-blue-100 mt-2">Stay informed with company announcements, updates, and important notices</p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#0066B3] rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg"
                            >
                                <Plus size={18} />
                                New Announcement
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                        <Bell className="text-[#0066B3]" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{displayAnnouncements.length}</p>
                        <p className="text-sm text-slate-500">Active Announcements</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-xl">
                        <AlertCircle className="text-red-600" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{displayAnnouncements.filter(a => a.priority === 'urgent').length}</p>
                        <p className="text-sm text-slate-500">Urgent Updates</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl">
                        <Clock className="text-amber-600" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{displayAnnouncements.filter(a => a.requires_acknowledgment).length}</p>
                        <p className="text-sm text-slate-500">Require Action</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-xl">
                        <CheckCircle className="text-emerald-600" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{displayAnnouncements.reduce((acc, a) => acc + a.acknowledgment_count, 0)}</p>
                        <p className="text-sm text-slate-500">Total Acknowledgments</p>
                    </div>
                </div>
            </div>

            {/* Tabs for Admin */}
            {isAdmin && (
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                            activeTab === 'feed'
                                ? 'bg-white text-[#0066B3] shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Bell size={18} />
                        Announcement Feed
                    </button>
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                            activeTab === 'manage'
                                ? 'bg-white text-[#0066B3] shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Megaphone size={18} />
                        Manage
                    </button>
                </div>
            )}

            {/* Feed View */}
            {activeTab === 'feed' && (
                <div className="space-y-4">
                    {displayAnnouncements.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="text-slate-400" size={32} />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">All caught up!</h3>
                            <p className="text-slate-500 max-w-md mx-auto">
                                There are no new announcements at this time. Check back later for updates from your organization.
                            </p>
                        </div>
                    ) : (
                        displayAnnouncements.map(ann => {
                            const styles = getPriorityStyles(ann.priority);
                            return (
                                <div
                                    key={ann.id}
                                    onClick={() => setSelectedAnnouncement(ann)}
                                    className={`bg-white rounded-xl border-l-4 ${styles.border} shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden`}
                                >
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`w-2 h-2 rounded-full ${styles.dot}`}></span>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles.badge}`}>
                                                        {ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1)}
                                                    </span>
                                                    <span className="text-xs text-slate-400">•</span>
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {formatTimeAgo(ann.published_at || ann.created_at)}
                                                    </span>
                                                    {ann.channels.includes('email') && (
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Mail size={12} /> Email sent
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-semibold text-slate-900 mb-2">{ann.title}</h3>
                                                <p className="text-slate-600 text-sm line-clamp-2">
                                                    {ann.content}
                                                </p>
                                            </div>
                                            {ann.requires_acknowledgment && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAcknowledge(ann.id);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors text-sm whitespace-nowrap"
                                                >
                                                    <CheckCircle size={16} />
                                                    Acknowledge
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                                            {ann.author && (
                                                <span className="text-sm text-slate-500 flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-xs font-medium">
                                                        {ann.author.first_name.charAt(0)}
                                                    </div>
                                                    {ann.author.first_name} {ann.author.last_name}
                                                </span>
                                            )}
                                            <span className="text-sm text-slate-400 flex items-center gap-1">
                                                <Eye size={14} /> {ann.view_count} views
                                            </span>
                                            {ann.requires_acknowledgment && (
                                                <span className="text-sm text-slate-400 flex items-center gap-1">
                                                    <CheckCircle size={14} /> {ann.acknowledgment_count} acknowledged
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Manage View */}
            {activeTab === 'manage' && isAdmin && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                            >
                                <option value="">All Status</option>
                                <option value="draft">Draft</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Announcement</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Channels</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Engagement</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayAllAnnouncements.map(ann => {
                                    const styles = getPriorityStyles(ann.priority);
                                    const statusStyles = getStatusStyles(ann.status);
                                    return (
                                        <tr key={ann.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-2 h-2 rounded-full ${styles.dot}`}></span>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{ann.title}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{formatTimeAgo(ann.created_at)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusStyles.bg}`}>
                                                    {statusStyles.icon}
                                                    {ann.status.charAt(0).toUpperCase() + ann.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    {ann.channels.includes('portal') && (
                                                        <span className="p-1.5 bg-slate-100 rounded-lg" title="Portal">
                                                            <Globe size={14} className="text-slate-600" />
                                                        </span>
                                                    )}
                                                    {ann.channels.includes('email') && (
                                                        <span className="p-1.5 bg-slate-100 rounded-lg" title="Email">
                                                            <Mail size={14} className="text-slate-600" />
                                                        </span>
                                                    )}
                                                    {ann.channels.includes('sms') && (
                                                        <span className="p-1.5 bg-slate-100 rounded-lg" title="SMS">
                                                            <MessageSquare size={14} className="text-slate-600" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                                    <span className="flex items-center gap-1"><Eye size={14} /> {ann.view_count}</span>
                                                    <span className="flex items-center gap-1"><CheckCircle size={14} /> {ann.acknowledgment_count}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    {ann.status === 'draft' && (
                                                        <button
                                                            onClick={() => publishMutation.mutate(ann.id)}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="Publish"
                                                        >
                                                            <Send size={16} />
                                                        </button>
                                                    )}
                                                    <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                                                        <Edit size={16} />
                                                    </button>
                                                    {ann.status !== 'archived' ? (
                                                        <button
                                                            onClick={() => archiveMutation.mutate(ann.id)}
                                                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                                                            title="Archive"
                                                        >
                                                            <Archive size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => unarchiveMutation.mutate(ann.id)}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Restore"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setDeleteAnnId(ann.id)}
                                                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Announcement Detail Modal */}
            {selectedAnnouncement && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAnnouncement(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={`px-6 py-4 ${getPriorityStyles(selectedAnnouncement.priority).bg} border-b`}>
                            <div className="flex items-center justify-between">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityStyles(selectedAnnouncement.priority).badge}`}>
                                    {selectedAnnouncement.priority.toUpperCase()} PRIORITY
                                </span>
                                <button onClick={() => setSelectedAnnouncement(null)} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">{selectedAnnouncement.title}</h2>
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                                <span className="flex items-center gap-2">
                                    <Calendar size={16} />
                                    {new Date(selectedAnnouncement.published_at || selectedAnnouncement.created_at).toLocaleString()}
                                </span>
                                {selectedAnnouncement.author && (
                                    <span className="flex items-center gap-2">
                                        <Users size={16} />
                                        {selectedAnnouncement.author.first_name} {selectedAnnouncement.author.last_name}
                                    </span>
                                )}
                            </div>
                            <div className="prose prose-slate max-w-none">
                                <p className="text-slate-700 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            {selectedAnnouncement.requires_acknowledgment && (
                                <button
                                    onClick={() => {
                                        handleAcknowledge(selectedAnnouncement.id);
                                        setSelectedAnnouncement(null);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
                                >
                                    <CheckCircle size={18} />
                                    I Acknowledge
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedAnnouncement(null)}
                                className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateAnnouncementModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
                    }}
                />
            )}

            {/* Delete Announcement Dialog */}
            <ConfirmDialog
                isOpen={!!deleteAnnId}
                title="Delete Announcement"
                message="Are you sure you want to delete this announcement? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { if (deleteAnnId) deleteMutation.mutate(deleteAnnId); setDeleteAnnId(null); }}
                onCancel={() => setDeleteAnnId(null)}
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};

// Create Announcement Modal
const CreateAnnouncementModal: React.FC<{
    onClose: () => void;
    onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        priority: 'normal',
        channels: ['portal'],
        target_audience: { all_staff: true },
        requires_acknowledgment: false,
        scheduled_for: '',
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/communications/announcements', data),
        onSuccess,
    });

    const publishMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/communications/announcements/${id}/publish`),
        onSuccess,
    });

    const handleSubmit = async (publish: boolean) => {
        const result = await createMutation.mutateAsync(formData);
        if (publish && result.data?.id) {
            await publishMutation.mutateAsync(result.data.id);
        }
    };

    const toggleChannel = (channel: string) => {
        setFormData(prev => ({
            ...prev,
            channels: prev.channels.includes(channel)
                ? prev.channels.filter(c => c !== channel)
                : [...prev.channels, channel],
        }));
    };

    return (
        <div className="ann-modal-overlay">
            <div className="ann-modal create-modal">
                <h2><Megaphone size={24} /> Create Announcement</h2>
                <form onSubmit={e => { e.preventDefault(); handleSubmit(false); }}>
                    <div className="ann-form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Announcement title"
                            required
                        />
                    </div>

                    <div className="ann-form-group">
                        <label>Content</label>
                        <textarea
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Write your announcement..."
                            rows={6}
                            required
                        />
                    </div>

                    <div className="ann-form-row">
                        <div className="ann-form-group">
                            <label>Priority</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        <div className="ann-form-group">
                            <label>Schedule (optional)</label>
                            <input
                                type="datetime-local"
                                value={formData.scheduled_for}
                                onChange={e => setFormData({ ...formData, scheduled_for: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="ann-form-group">
                        <label>Channels</label>
                        <div className="ann-channel-options">
                            <label className={`ann-channel-opt ${formData.channels.includes('portal') ? 'selected' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={formData.channels.includes('portal')}
                                    onChange={() => toggleChannel('portal')}
                                />
                                <Globe size={18} />
                                Portal
                            </label>
                            <label className={`ann-channel-opt ${formData.channels.includes('email') ? 'selected' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={formData.channels.includes('email')}
                                    onChange={() => toggleChannel('email')}
                                />
                                <Mail size={18} />
                                Email
                            </label>
                            <label className={`ann-channel-opt ${formData.channels.includes('sms') ? 'selected' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={formData.channels.includes('sms')}
                                    onChange={() => toggleChannel('sms')}
                                />
                                <MessageSquare size={18} />
                                SMS
                            </label>
                        </div>
                    </div>

                    <div className="ann-form-group">
                        <label className="ann-checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.requires_acknowledgment}
                                onChange={e => setFormData({ ...formData, requires_acknowledgment: e.target.checked })}
                            />
                            Require acknowledgment from recipients
                        </label>
                    </div>

                    <div className="ann-modal-actions">
                        <button type="button" className="ann-btn secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="ann-btn outline" disabled={createMutation.isPending}>
                            Save as Draft
                        </button>
                        <button
                            type="button"
                            className="ann-btn primary"
                            onClick={() => handleSubmit(true)}
                            disabled={createMutation.isPending || publishMutation.isPending}
                        >
                            <Send size={18} />
                            {formData.scheduled_for ? 'Schedule' : 'Publish Now'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AnnouncementsPage;
