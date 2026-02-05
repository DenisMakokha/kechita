import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle, Clock, AlertTriangle, Plus, Edit2, Trash2,
    ChevronDown, ChevronRight, FileText, User, Calendar
} from 'lucide-react';
import api from '../lib/api';

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
    const queryClient = useQueryClient();

    // Fetch onboarding stats
    const { data: stats } = useQuery<OnboardingStats>({
        queryKey: ['onboarding-stats'],
        queryFn: () => api.get('/onboarding/stats').then(r => r.data),
    });

    // Fetch in-progress instances
    const { data: instances = [] } = useQuery<OnboardingInstance[]>({
        queryKey: ['onboarding-instances'],
        queryFn: () => api.get('/onboarding/instances').then(r => r.data),
    });

    // Fetch overdue instances
    const { data: overdueInstances = [] } = useQuery<OnboardingInstance[]>({
        queryKey: ['onboarding-overdue'],
        queryFn: () => api.get('/onboarding/instances/overdue').then(r => r.data),
    });

    // Fetch templates
    const { data: templates = [] } = useQuery<OnboardingTemplate[]>({
        queryKey: ['onboarding-templates'],
        queryFn: () => api.get('/onboarding/templates').then(r => r.data),
    });

    // Complete task mutation
    const completeTaskMutation = useMutation({
        mutationFn: ({ taskStatusId, notes }: { taskStatusId: string; notes?: string }) =>
            api.patch(`/onboarding/task-status/${taskStatusId}/complete`, { notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding-instances'] });
            queryClient.invalidateQueries({ queryKey: ['onboarding-stats'] });
            if (selectedInstance) {
                api.get(`/onboarding/instances/${selectedInstance.id}`).then(r => {
                    setSelectedInstance(r.data);
                });
            }
        },
    });

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
                                    instances.map((instance) => (
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
                                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
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
        </div>
    );
}
