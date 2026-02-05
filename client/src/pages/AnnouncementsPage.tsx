import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Megaphone, Plus, Send, Clock, Eye, Users, Bell, CheckCircle,
    Calendar, Mail, MessageSquare, Filter, Search, MoreVertical,
    Edit, Trash2, Archive, AlertCircle, Globe, Building2
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import '../styles/announcements.css';

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
    const [activeTab, setActiveTab] = useState<'feed' | 'manage' | 'create'>('feed');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const queryClient = useQueryClient();
    const user = useAuthStore(state => state.user);
    const isAdmin = ['CEO', 'HR_MANAGER', 'HR_ASSISTANT'].includes(user?.role || '');

    // User announcements (for feed)
    const { data: myAnnouncements = [] } = useQuery<Announcement[]>({
        queryKey: ['my-announcements'],
        queryFn: () => api.get('/communications/announcements/my').then(r => r.data),
    });

    // Admin announcements (for management)
    const { data: allAnnouncements = [] } = useQuery<Announcement[]>({
        queryKey: ['all-announcements', statusFilter],
        queryFn: () => api.get('/communications/announcements', { params: { status: statusFilter || undefined } }).then(r => r.data),
        enabled: isAdmin,
    });

    const acknowledgeMutation = useMutation({
        mutationFn: (id: string) => api.post(`/communications/announcements/${id}/acknowledge`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-announcements'] });
        },
    });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'priority-urgent';
            case 'high': return 'priority-high';
            case 'normal': return 'priority-normal';
            default: return 'priority-low';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published': return { color: 'status-published', icon: <CheckCircle size={14} /> };
            case 'scheduled': return { color: 'status-scheduled', icon: <Clock size={14} /> };
            case 'draft': return { color: 'status-draft', icon: <Edit size={14} /> };
            default: return { color: 'status-archived', icon: <Archive size={14} /> };
        }
    };

    const renderFeed = () => (
        <div className="ann-feed">
            {myAnnouncements.length === 0 ? (
                <div className="ann-empty">
                    <Bell size={48} />
                    <h3>No announcements</h3>
                    <p>You're all caught up! Check back later for new updates.</p>
                </div>
            ) : (
                myAnnouncements.map(ann => (
                    <div
                        key={ann.id}
                        className={`ann-card ${getPriorityColor(ann.priority)}`}
                        onClick={() => setSelectedAnnouncement(ann)}
                    >
                        <div className="ann-card-header">
                            <div className="ann-priority-indicator" />
                            <div className="ann-card-meta">
                                <span className="ann-date">
                                    <Calendar size={14} />
                                    {new Date(ann.published_at || ann.created_at).toLocaleDateString()}
                                </span>
                                {ann.channels.includes('email') && <Mail size={14} title="Sent via email" />}
                            </div>
                        </div>
                        <h3 className="ann-title">{ann.title}</h3>
                        <p className="ann-excerpt">
                            {ann.content.substring(0, 150)}{ann.content.length > 150 ? '...' : ''}
                        </p>
                        <div className="ann-card-footer">
                            {ann.author && (
                                <span className="ann-author">
                                    By {ann.author.first_name} {ann.author.last_name}
                                </span>
                            )}
                            {ann.requires_acknowledgment && (
                                <button
                                    className="ann-ack-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        acknowledgeMutation.mutate(ann.id);
                                    }}
                                >
                                    <CheckCircle size={16} />
                                    Acknowledge
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderManage = () => (
        <div className="ann-manage">
            <div className="ann-manage-header">
                <div className="ann-filters">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="ann-select"
                    >
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                <button className="ann-btn primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} />
                    Create Announcement
                </button>
            </div>

            <div className="ann-table-container">
                <table className="ann-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Channels</th>
                            <th>Audience</th>
                            <th>Views</th>
                            <th>Acks</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allAnnouncements.map(ann => {
                            const statusInfo = getStatusBadge(ann.status);
                            return (
                                <tr key={ann.id}>
                                    <td>
                                        <div className="ann-title-cell">
                                            <span className={`ann-priority-dot ${getPriorityColor(ann.priority)}`} />
                                            {ann.title}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`ann-status-badge ${statusInfo.color}`}>
                                            {statusInfo.icon}
                                            {ann.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`ann-priority-badge ${getPriorityColor(ann.priority)}`}>
                                            {ann.priority}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="ann-channels">
                                            {ann.channels.includes('portal') && <Globe size={16} title="Portal" />}
                                            {ann.channels.includes('email') && <Mail size={16} title="Email" />}
                                            {ann.channels.includes('sms') && <MessageSquare size={16} title="SMS" />}
                                        </div>
                                    </td>
                                    <td>
                                        {ann.target_audience.all_staff ? (
                                            <span className="ann-audience-all"><Users size={14} /> All Staff</span>
                                        ) : (
                                            <span className="ann-audience-targeted"><Building2 size={14} /> Targeted</span>
                                        )}
                                    </td>
                                    <td><Eye size={14} /> {ann.view_count}</td>
                                    <td><CheckCircle size={14} /> {ann.acknowledgment_count}</td>
                                    <td>
                                        <div className="ann-actions">
                                            {ann.status === 'draft' && (
                                                <button className="ann-action-btn publish" title="Publish">
                                                    <Send size={16} />
                                                </button>
                                            )}
                                            <button className="ann-action-btn edit" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button className="ann-action-btn delete" title="Archive">
                                                <Archive size={16} />
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
    );

    return (
        <div className="announcements-page">
            <div className="ann-header">
                <div className="ann-header-content">
                    <h1><Megaphone size={28} /> Communications</h1>
                    <p>Stay informed with company announcements and updates</p>
                </div>
            </div>

            {isAdmin && (
                <div className="ann-tabs">
                    <button
                        className={activeTab === 'feed' ? 'active' : ''}
                        onClick={() => setActiveTab('feed')}
                    >
                        <Bell size={18} />
                        My Feed
                    </button>
                    <button
                        className={activeTab === 'manage' ? 'active' : ''}
                        onClick={() => setActiveTab('manage')}
                    >
                        <Megaphone size={18} />
                        Manage Announcements
                    </button>
                </div>
            )}

            <div className="ann-content">
                {activeTab === 'feed' && renderFeed()}
                {activeTab === 'manage' && isAdmin && renderManage()}
            </div>

            {/* Announcement Detail Modal */}
            {selectedAnnouncement && (
                <div className="ann-modal-overlay" onClick={() => setSelectedAnnouncement(null)}>
                    <div className="ann-modal" onClick={e => e.stopPropagation()}>
                        <div className={`ann-modal-priority ${getPriorityColor(selectedAnnouncement.priority)}`}>
                            {selectedAnnouncement.priority.toUpperCase()}
                        </div>
                        <h2>{selectedAnnouncement.title}</h2>
                        <div className="ann-modal-meta">
                            <span><Calendar size={16} /> {new Date(selectedAnnouncement.published_at || selectedAnnouncement.created_at).toLocaleString()}</span>
                            {selectedAnnouncement.author && (
                                <span><Users size={16} /> {selectedAnnouncement.author.first_name} {selectedAnnouncement.author.last_name}</span>
                            )}
                        </div>
                        <div className="ann-modal-content">
                            {selectedAnnouncement.content}
                        </div>
                        <div className="ann-modal-footer">
                            {selectedAnnouncement.requires_acknowledgment && (
                                <button
                                    className="ann-btn success"
                                    onClick={() => {
                                        acknowledgeMutation.mutate(selectedAnnouncement.id);
                                        setSelectedAnnouncement(null);
                                    }}
                                >
                                    <CheckCircle size={18} />
                                    I Acknowledge
                                </button>
                            )}
                            <button className="ann-btn secondary" onClick={() => setSelectedAnnouncement(null)}>
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
