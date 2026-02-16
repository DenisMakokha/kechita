import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { InputDialog } from '../components/ui/InputDialog';
import {
    Shield, Search, Download, Clock, User, Activity,
    CheckCircle, XCircle, Eye, Trash2, RefreshCw,
    FileText, Database, LogIn, LogOut, Edit, Plus, AlertTriangle
} from 'lucide-react';

interface AuditLog {
    id: string;
    user_id: string;
    staff_id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    description?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    is_successful: boolean;
    error_message?: string;
    created_at: string;
    user?: { email: string };
    staff?: { first_name: string; last_name: string };
}

interface AuditStats {
    totalLogs: number;
    todayLogs: number;
    failedActions: number;
    uniqueUsers: number;
    actionBreakdown: Record<string, number>;
    entityBreakdown: Record<string, number>;
}

const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return <LogIn className="text-blue-500" size={16} />;
    if (action.includes('LOGOUT')) return <LogOut className="text-slate-500" size={16} />;
    if (action.includes('CREATE')) return <Plus className="text-green-500" size={16} />;
    if (action.includes('UPDATE') || action.includes('EDIT')) return <Edit className="text-amber-500" size={16} />;
    if (action.includes('DELETE')) return <Trash2 className="text-red-500" size={16} />;
    if (action.includes('VIEW') || action.includes('READ')) return <Eye className="text-slate-500" size={16} />;
    return <Activity className="text-slate-400" size={16} />;
};

const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return 'bg-blue-100 text-blue-700';
    if (action.includes('LOGOUT')) return 'bg-slate-100 text-slate-700';
    if (action.includes('CREATE')) return 'bg-green-100 text-green-700';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-amber-100 text-amber-700';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
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

export const AuditPage: React.FC = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        action: '',
        entityType: '',
        startDate: '',
        endDate: '',
        isSuccessful: '',
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showCleanupDialog, setShowCleanupDialog] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

    const isCEO = user?.roles?.some(r => r.code === 'CEO');
    const isHR = user?.roles?.some(r => r.code === 'HR_MANAGER');
    const canView = isCEO || isHR;

    // Fetch audit logs
    const { data: logsData, isLoading } = useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.action) params.append('action', filters.action);
            if (filters.entityType) params.append('entityType', filters.entityType);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.isSuccessful) params.append('isSuccessful', filters.isSuccessful);
            params.append('limit', '100');
            return (await api.get(`/audit?${params.toString()}`)).data;
        },
        enabled: canView,
    });

    // Fetch stats
    const { data: stats } = useQuery<AuditStats>({
        queryKey: ['audit-stats'],
        queryFn: async () => (await api.get('/audit/stats')).data,
        enabled: canView,
    });

    // Fetch recent activity
    const { data: recentActivity } = useQuery<AuditLog[]>({
        queryKey: ['audit-recent'],
        queryFn: async () => (await api.get('/audit/recent?limit=10')).data,
        enabled: canView,
    });

    // Cleanup old logs mutation (CEO only)
    const cleanupMutation = useMutation({
        mutationFn: async (days: number) => (await api.delete(`/audit/cleanup?days=${days}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
            queryClient.invalidateQueries({ queryKey: ['audit-stats'] });
            showToast('Old logs cleaned up');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to cleanup logs', 'error'),
    });

    // Export logs
    const handleExport = async () => {
        const params = new URLSearchParams();
        if (filters.action) params.append('action', filters.action);
        if (filters.entityType) params.append('entityType', filters.entityType);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        
        const response = await api.get(`/audit/export/json?${params.toString()}`);
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const logs: AuditLog[] = logsData?.logs || [];
    const filteredLogs = searchQuery
        ? logs.filter(log =>
            log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.staff?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.staff?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : logs;

    if (!canView) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <AlertTriangle className="mx-auto mb-4 text-amber-500" size={48} />
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
                    <p className="text-slate-500">You don't have permission to view audit logs.</p>
                </div>
            </div>
        );
    }

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
                        <Shield className="text-[#0066B3]" />
                        Audit Logs
                    </h1>
                    <p className="text-slate-500">System activity and security audit trail</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                    >
                        <Download size={18} />
                        Export
                    </button>
                    {isCEO && (
                        <button
                            onClick={() => setShowCleanupDialog(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={18} />
                            Cleanup
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Database className="text-[#0066B3]" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.totalLogs?.toLocaleString() || 0}</p>
                            <p className="text-sm text-slate-500">Total Logs</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Activity className="text-green-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.todayLogs || 0}</p>
                            <p className="text-sm text-slate-500">Today's Activity</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <XCircle className="text-red-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.failedActions || 0}</p>
                            <p className="text-sm text-slate-500">Failed Actions</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <User className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats?.uniqueUsers || 0}</p>
                            <p className="text-sm text-slate-500">Active Users</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            {recentActivity && recentActivity.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Clock size={18} className="text-slate-400" />
                        Recent Activity
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {recentActivity.slice(0, 6).map(log => (
                            <div
                                key={log.id}
                                onClick={() => setSelectedLog(log)}
                                className="flex-shrink-0 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 min-w-[200px]"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {getActionIcon(log.action)}
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 truncate">{log.description || log.entity_type}</p>
                                <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(log.created_at)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        />
                    </div>
                    <select
                        value={filters.action}
                        onChange={e => setFilters({ ...filters, action: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                        <option value="">All Actions</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                        <option value="VIEW">View</option>
                    </select>
                    <select
                        value={filters.entityType}
                        onChange={e => setFilters({ ...filters, entityType: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                        <option value="">All Entities</option>
                        <option value="staff">Staff</option>
                        <option value="leave">Leave</option>
                        <option value="claim">Claim</option>
                        <option value="loan">Loan</option>
                        <option value="approval">Approval</option>
                        <option value="announcement">Announcement</option>
                    </select>
                    <select
                        value={filters.isSuccessful}
                        onChange={e => setFilters({ ...filters, isSuccessful: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                        <option value="">All Status</option>
                        <option value="true">Successful</option>
                        <option value="false">Failed</option>
                    </select>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="Start date"
                    />
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="End date"
                    />
                    <button
                        onClick={() => setFilters({ action: '', entityType: '', startDate: '', endDate: '', isSuccessful: '' })}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Timestamp</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">User</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Action</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Entity</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Description</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066B3] mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr
                                        key={log.id}
                                        onClick={() => setSelectedLog(log)}
                                        className="hover:bg-slate-50 cursor-pointer"
                                    >
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-400" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                                                    {log.staff?.first_name?.charAt(0) || log.user?.email?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {log.staff ? `${log.staff.first_name} ${log.staff.last_name}` : log.user?.email || 'System'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                                {getActionIcon(log.action)}
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                                {log.entity_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                                            {log.description || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.is_successful ? (
                                                <CheckCircle className="text-green-500" size={18} />
                                            ) : (
                                                <XCircle className="text-red-500" size={18} />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400">
                                            {log.ip_address || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Log Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                <FileText size={20} />
                                Audit Log Details
                            </h3>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Timestamp</p>
                                    <p className="font-medium">{new Date(selectedLog.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">User</p>
                                    <p className="font-medium">
                                        {selectedLog.staff ? `${selectedLog.staff.first_name} ${selectedLog.staff.last_name}` : selectedLog.user?.email || 'System'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Action</p>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                                        {selectedLog.action}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Entity</p>
                                    <p className="font-medium">{selectedLog.entity_type} {selectedLog.entity_id && `(${selectedLog.entity_id.slice(0, 8)}...)`}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Status</p>
                                    <p className="font-medium flex items-center gap-2">
                                        {selectedLog.is_successful ? (
                                            <><CheckCircle className="text-green-500" size={16} /> Successful</>
                                        ) : (
                                            <><XCircle className="text-red-500" size={16} /> Failed</>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">IP Address</p>
                                    <p className="font-medium">{selectedLog.ip_address || 'N/A'}</p>
                                </div>
                            </div>
                            {selectedLog.description && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Description</p>
                                    <p className="text-slate-700">{selectedLog.description}</p>
                                </div>
                            )}
                            {selectedLog.error_message && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-xs text-red-500 uppercase mb-1">Error Message</p>
                                    <p className="text-red-700">{selectedLog.error_message}</p>
                                </div>
                            )}
                            {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Previous Values</p>
                                    <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-auto">
                                        {JSON.stringify(selectedLog.old_values, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">New Values</p>
                                    <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-auto">
                                        {JSON.stringify(selectedLog.new_values, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {selectedLog.user_agent && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">User Agent</p>
                                    <p className="text-xs text-slate-600 break-all">{selectedLog.user_agent}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Cleanup Dialog */}
            <InputDialog
                isOpen={showCleanupDialog}
                title="Cleanup Audit Logs"
                message="Delete logs older than a specified number of days."
                inputLabel="Days"
                inputType="number"
                placeholder="90"
                confirmLabel="Delete Old Logs"
                onConfirm={(days) => { if (days) cleanupMutation.mutate(parseInt(days)); setShowCleanupDialog(false); }}
                onCancel={() => setShowCleanupDialog(false)}
                isLoading={cleanupMutation.isPending}
            />
        </div>
    );
};

export default AuditPage;
