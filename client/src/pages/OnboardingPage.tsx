import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle, Clock, AlertTriangle, Plus,
    ChevronDown, ChevronRight, FileText, User,
    Edit, Trash2, X, Save, GripVertical
} from 'lucide-react';
import api from '../lib/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface OnboardingTask {
    id: string;
    name: string;
    description: string;
    order: number;
    is_required: boolean;
    estimated_days: number;
    category: string;
}

interface OnboardingTemplate {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
    tasks: OnboardingTask[];
}

interface OnboardingTaskStatus {
    id: string;
    task: OnboardingTask;
    status: 'pending' | 'completed' | 'skipped';
    completed_at: string | null;
    completed_by: { first_name: string; last_name: string } | null;
    notes: string | null;
}

interface OnboardingInstance {
    id: string;
    staff: { id: string; first_name: string; last_name: string; employee_number: string };
    template: OnboardingTemplate;
    status: 'in_progress' | 'completed';
    started_at: string;
    completed_at: string | null;
    progress_percentage: number;
    due_date: string;
    taskStatuses: OnboardingTaskStatus[];
}

interface OnboardingStats {
    total: number;
    inProgress: number;
    completed: number;
    overdue: number;
    averageCompletionDays: number;
}

export default function OnboardingPage() {
    const [activeTab, setActiveTab] = useState<'instances' | 'templates'>('instances');
    const [selectedInstance, setSelectedInstance] = useState<OnboardingInstance | null>(null);
    const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<OnboardingTemplate | null>(null);
    const [templateForm, setTemplateForm] = useState<{ name: string; description: string; tasks: { name: string; description: string; category: string; is_required: boolean; estimated_days: number }[] }>({ name: '', description: '', tasks: [] });
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<OnboardingTemplate | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };
    const queryClient = useQueryClient();

    // Fetch onboarding stats
    const { data: stats } = useQuery<OnboardingStats>({
        queryKey: ['onboarding-stats'],
        queryFn: () => api.get('/staff/onboarding/stats').then(r => r.data),
        refetchInterval: 60000,
    });

    // Fetch in-progress instances
    const { data: instances = [] } = useQuery<OnboardingInstance[]>({
        queryKey: ['onboarding-instances'],
        queryFn: () => api.get('/staff/onboarding/instances').then(r => r.data),
        refetchInterval: 60000,
    });

    // Fetch templates
    const { data: templates = [] } = useQuery<OnboardingTemplate[]>({
        queryKey: ['onboarding-templates'],
        queryFn: () => api.get('/staff/onboarding/templates').then(r => r.data),
    });

    // Complete task mutation
    const completeTaskMutation = useMutation({
        mutationFn: ({ taskStatusId, notes }: { taskStatusId: string; notes?: string }) =>
            api.patch(`/staff/onboarding/tasks/${taskStatusId}/complete`, { notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding-instances'] });
            queryClient.invalidateQueries({ queryKey: ['onboarding-stats'] });
            if (selectedInstance) {
                api.get(`/staff/${selectedInstance.staff.id}/onboarding`).then(r => {
                    setSelectedInstance(r.data);
                });
            }
            showToast('Task completed');
        },
    });

    // Template mutations
    const createTemplateMutation = useMutation({
        mutationFn: async (data: { name: string; description: string; tasks: any[] }) =>
            (await api.post('/staff/onboarding/templates', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
            setShowTemplateModal(false);
            setTemplateForm({ name: '', description: '', tasks: [] });
            showToast('Template created');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create template', 'error'),
    });

    const updateTemplateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) =>
            (await api.put(`/staff/onboarding/templates/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
            setShowTemplateModal(false);
            setEditingTemplate(null);
            showToast('Template updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update template', 'error'),
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/staff/onboarding/templates/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
            showToast('Template deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete template', 'error'),
    });

    const openTemplateModal = (template?: OnboardingTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setTemplateForm({
                name: template.name,
                description: template.description || '',
                tasks: (template.tasks || []).map(t => ({ name: t.name, description: t.description || '', category: t.category || 'general', is_required: t.is_required, estimated_days: t.estimated_days || 1 })),
            });
        } else {
            setEditingTemplate(null);
            setTemplateForm({ name: '', description: '', tasks: [{ name: '', description: '', category: 'general', is_required: true, estimated_days: 1 }] });
        }
        setShowTemplateModal(true);
    };

    const handleSaveTemplate = () => {
        if (!templateForm.name.trim()) return;
        const payload = { ...templateForm, tasks: templateForm.tasks.filter(t => t.name.trim()).map((t, i) => ({ ...t, order: i + 1 })) };
        if (editingTemplate) {
            updateTemplateMutation.mutate({ id: editingTemplate.id, data: payload });
        } else {
            createTemplateMutation.mutate(payload);
        }
    };

    const addTaskRow = () => setTemplateForm({ ...templateForm, tasks: [...templateForm.tasks, { name: '', description: '', category: 'general', is_required: false, estimated_days: 1 }] });
    const removeTaskRow = (idx: number) => setTemplateForm({ ...templateForm, tasks: templateForm.tasks.filter((_, i) => i !== idx) });
    const updateTaskRow = (idx: number, field: string, value: any) => { const tasks = [...templateForm.tasks]; (tasks[idx] as any)[field] = value; setTemplateForm({ ...templateForm, tasks }); };

    const toggleTemplate = (id: string) => {
        const newExpanded = new Set(expandedTemplates);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedTemplates(newExpanded);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-100';
            case 'skipped': return 'text-gray-600 bg-gray-100';
            default: return 'text-amber-600 bg-amber-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4" />;
            case 'skipped': return <AlertTriangle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Onboarding Management</h1>
                <p className="text-slate-600 mt-1">Track and manage staff onboarding checklists</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats?.total || 0}</p>
                            <p className="text-sm text-slate-500">Total</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats?.inProgress || 0}</p>
                            <p className="text-sm text-slate-500">In Progress</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats?.completed || 0}</p>
                            <p className="text-sm text-slate-500">Completed</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats?.overdue || 0}</p>
                            <p className="text-sm text-slate-500">Overdue</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('instances')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === 'instances'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Active Onboarding ({instances.length})
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === 'templates'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Templates ({templates.length})
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - List */}
                <div className="lg:col-span-1">
                    {activeTab === 'instances' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-700">Staff Onboarding</h3>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                                {instances.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p>No active onboarding</p>
                                    </div>
                                ) : (
                                    instances.filter(i => i.status === 'in_progress').map((instance) => (
                                        <button
                                            key={instance.id}
                                            onClick={() => setSelectedInstance(instance)}
                                            className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${selectedInstance?.id === instance.id ? 'bg-blue-50' : ''
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-slate-800">
                                                        {instance.staff.first_name} {instance.staff.last_name}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {instance.staff.employee_number}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-blue-600">
                                                        {instance.progress_percentage}%
                                                    </div>
                                                    <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1">
                                                        <div
                                                            className="h-full bg-blue-600 rounded-full"
                                                            style={{ width: `${instance.progress_percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-700">Templates</h3>
                                <button onClick={() => openTemplateModal()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Add Template">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {templates.map((template) => (
                                    <div key={template.id} className="p-4">
                                        <button
                                            onClick={() => toggleTemplate(template.id)}
                                            className="w-full flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                {expandedTemplates.has(template.id) ? (
                                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                )}
                                                <span className="font-medium text-slate-800">{template.name}</span>
                                            </div>
                                            <span className="text-sm text-slate-500">
                                                {template.tasks?.length || 0} tasks
                                            </span>
                                        </button>
                                        {expandedTemplates.has(template.id) && template.tasks && (
                                            <div className="mt-3 ml-6 space-y-2">
                                                {template.tasks.map((task, idx) => (
                                                    <div
                                                        key={task.id}
                                                        className="flex items-center gap-2 text-sm text-slate-600"
                                                    >
                                                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-xs">
                                                            {idx + 1}
                                                        </span>
                                                        <span>{task.name}</span>
                                                        {task.is_required && (
                                                            <span className="text-xs text-red-500">*</span>
                                                        )}
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                                                    <button onClick={() => openTemplateModal(template)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"><Edit className="w-3 h-3" />Edit</button>
                                                    <button onClick={() => setDeleteTarget(template)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Details */}
                <div className="lg:col-span-2">
                    {selectedInstance ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                <h2 className="text-xl font-bold">
                                    {selectedInstance.staff.first_name} {selectedInstance.staff.last_name}
                                </h2>
                                <p className="text-blue-100 mt-1">
                                    {selectedInstance.template?.name || 'Onboarding Checklist'}
                                </p>
                                <div className="mt-4 flex items-center gap-6">
                                    <div>
                                        <p className="text-3xl font-bold">{selectedInstance.progress_percentage}%</p>
                                        <p className="text-sm text-blue-100">Complete</p>
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-2 bg-blue-400/30 rounded-full">
                                            <div
                                                className="h-full bg-white rounded-full transition-all"
                                                style={{ width: `${selectedInstance.progress_percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="font-semibold text-slate-800 mb-4">Tasks</h3>
                                <div className="space-y-3">
                                    {selectedInstance.taskStatuses?.map((ts) => (
                                        <div
                                            key={ts.id}
                                            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${getStatusColor(ts.status)}`}>
                                                    {getStatusIcon(ts.status)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">
                                                        {ts.task.name}
                                                        {ts.task.is_required && (
                                                            <span className="text-red-500 ml-1">*</span>
                                                        )}
                                                    </p>
                                                    {ts.task.description && (
                                                        <p className="text-sm text-slate-500">{ts.task.description}</p>
                                                    )}
                                                    {ts.completed_at && ts.completed_by && (
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            Completed by {ts.completed_by.first_name} {ts.completed_by.last_name} on{' '}
                                                            {new Date(ts.completed_at).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {ts.status === 'pending' && (
                                                <button
                                                    onClick={() => completeTaskMutation.mutate({ taskStatusId: ts.id })}
                                                    disabled={completeTaskMutation.isPending}
                                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                >
                                                    {completeTaskMutation.isPending ? 'Saving...' : 'Mark Complete'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <h3 className="text-lg font-medium text-slate-700 mb-2">
                                Select onboarding to view details
                            </h3>
                            <p className="text-slate-500">
                                Click on a staff member from the list to view their onboarding progress
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
                            <button onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }} className="p-2 hover:bg-white rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                                <input type="text" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="e.g., Standard Onboarding" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="Brief description..." />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-slate-700">Tasks</label>
                                    <button onClick={addTaskRow} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus size={14} />Add Task</button>
                                </div>
                                <div className="space-y-3">
                                    {templateForm.tasks.map((task, idx) => (
                                        <div key={idx} className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg">
                                            <GripVertical size={16} className="text-slate-300 mt-2.5 flex-shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <input type="text" value={task.name} onChange={(e) => updateTaskRow(idx, 'name', e.target.value)} placeholder={`Task ${idx + 1} name`} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
                                                <div className="flex gap-2">
                                                    <select value={task.category} onChange={(e) => updateTaskRow(idx, 'category', e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-xs bg-white">
                                                        <option value="general">General</option>
                                                        <option value="documents">Documents</option>
                                                        <option value="training">Training</option>
                                                        <option value="it_setup">IT Setup</option>
                                                        <option value="compliance">Compliance</option>
                                                    </select>
                                                    <input type="number" value={task.estimated_days} onChange={(e) => updateTaskRow(idx, 'estimated_days', parseInt(e.target.value) || 1)} min={1} className="w-16 px-2 py-1 border border-slate-200 rounded text-xs" title="Est. days" />
                                                    <label className="flex items-center gap-1 text-xs text-slate-600">
                                                        <input type="checkbox" checked={task.is_required} onChange={(e) => updateTaskRow(idx, 'is_required', e.target.checked)} className="w-3 h-3 text-blue-600 rounded" />
                                                        Required
                                                    </label>
                                                </div>
                                            </div>
                                            <button onClick={() => removeTaskRow(idx)} className="p-1 text-slate-400 hover:text-red-500 flex-shrink-0"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                    {templateForm.tasks.length === 0 && (
                                        <p className="text-sm text-slate-400 text-center py-4">No tasks yet. Click "Add Task" above.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                            <button onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white">Cancel</button>
                            <button onClick={handleSaveTemplate} disabled={!templateForm.name.trim() || createTemplateMutation.isPending || updateTemplateMutation.isPending} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                                <Save size={18} />
                                {editingTemplate ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Template Confirm */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete Template"
                message={`Delete template "${deleteTarget?.name}"? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { if (deleteTarget) deleteTemplateMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
                onCancel={() => setDeleteTarget(null)}
                isLoading={deleteTemplateMutation.isPending}
            />

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
                    toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-red-500" />}
                    {toast.text}
                </div>
            )}
        </div>
    );
}
