import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    X, Plus, Trash2, Edit3, Shield, HelpCircle, BarChart3,
    CheckCircle, XCircle, AlertTriangle, Play, Filter, RefreshCw,
    Save
} from 'lucide-react';

interface ScreeningCriteria {
    id: string;
    criteria_type: string;
    field_name: string;
    operator: string;
    value: string;
    weight: number;
    is_knockout: boolean;
    is_active: boolean;
    display_order: number;
    description?: string;
}

interface KnockoutQuestion {
    id: string;
    question_text: string;
    expected_answer: string;
    question_type: string;
    options?: string[];
    is_active: boolean;
    display_order: number;
    disqualify_message?: string;
}

interface ScreeningResult {
    id: string;
    status: string;
    percentage: number;
    notes?: string;
    screened_at: string;
    knockout_reasons?: any[];
    is_override: boolean;
    override_reason?: string;
    application: {
        id: string;
        application_number: string;
        candidate: {
            first_name: string;
            last_name: string;
            email: string;
        };
    };
}

interface ATSManagerProps {
    jobId: string;
    jobTitle: string;
    onClose: () => void;
}

export const ATSManager: React.FC<ATSManagerProps> = ({ jobId, jobTitle, onClose }) => {
    const [activeTab, setActiveTab] = useState<'criteria' | 'knockout' | 'results'>('criteria');
    const [editingCriteria, setEditingCriteria] = useState<ScreeningCriteria | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<KnockoutQuestion | null>(null);
    const [showAddCriteria, setShowAddCriteria] = useState(false);
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [resultFilter, setResultFilter] = useState<string>('');
    const [overrideId, setOverrideId] = useState<string | null>(null);
    const [overrideData, setOverrideData] = useState({ status: 'passed', reason: '' });
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const queryClient = useQueryClient();
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

    // ==================== CRITERIA ====================
    const { data: criteria = [], isLoading: criteriaLoading } = useQuery<ScreeningCriteria[]>({
        queryKey: ['screening-criteria', jobId],
        queryFn: async () => (await api.get(`/recruitment/jobs/${jobId}/screening-criteria`)).data,
    });

    const [criteriaForm, setCriteriaForm] = useState({
        criteria_type: 'experience',
        field_name: 'years_of_experience',
        operator: 'gte',
        value: '',
        weight: 10,
        is_knockout: false,
        description: '',
    });

    const addCriteriaMutation = useMutation({
        mutationFn: async (data: any) => (await api.post(`/recruitment/jobs/${jobId}/screening-criteria`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['screening-criteria', jobId] });
            setShowAddCriteria(false);
            setCriteriaForm({ criteria_type: 'experience', field_name: 'years_of_experience', operator: 'gte', value: '', weight: 10, is_knockout: false, description: '' });
            showToast('Screening criteria added');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to add criteria', 'error'),
    });

    const updateCriteriaMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.put(`/recruitment/screening-criteria/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['screening-criteria', jobId] });
            setEditingCriteria(null);
            showToast('Criteria updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update criteria', 'error'),
    });

    const deleteCriteriaMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/recruitment/screening-criteria/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['screening-criteria', jobId] });
            showToast('Criteria deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete criteria', 'error'),
    });

    // ==================== KNOCKOUT QUESTIONS ====================
    const { data: questions = [], isLoading: questionsLoading } = useQuery<KnockoutQuestion[]>({
        queryKey: ['knockout-questions', jobId],
        queryFn: async () => (await api.get(`/recruitment/jobs/${jobId}/knockout-questions`)).data,
    });

    const [questionForm, setQuestionForm] = useState({
        question_text: '',
        expected_answer: '',
        question_type: 'yes_no',
        disqualify_message: '',
    });

    const addQuestionMutation = useMutation({
        mutationFn: async (data: any) => (await api.post(`/recruitment/jobs/${jobId}/knockout-questions`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['knockout-questions', jobId] });
            setShowAddQuestion(false);
            setQuestionForm({ question_text: '', expected_answer: '', question_type: 'yes_no', disqualify_message: '' });
            showToast('Knockout question added');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to add question', 'error'),
    });

    const updateQuestionMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.put(`/recruitment/knockout-questions/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['knockout-questions', jobId] });
            setEditingQuestion(null);
            showToast('Question updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update question', 'error'),
    });

    const deleteQuestionMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/recruitment/knockout-questions/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['knockout-questions', jobId] });
            showToast('Question deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete question', 'error'),
    });

    // ==================== SCREENING RESULTS ====================
    const { data: results = [], isLoading: resultsLoading } = useQuery<ScreeningResult[]>({
        queryKey: ['screening-results', jobId, resultFilter],
        queryFn: async () => {
            const url = resultFilter
                ? `/recruitment/jobs/${jobId}/screening-results?status=${resultFilter}`
                : `/recruitment/jobs/${jobId}/screening-results`;
            return (await api.get(url)).data;
        },
    });

    const bulkScreenMutation = useMutation({
        mutationFn: async () => (await api.post(`/recruitment/jobs/${jobId}/screen-all`)).data,
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['screening-results', jobId] });
            showToast(`Screened ${data.screened} applications: ${data.passed} passed, ${data.failed} failed`);
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Bulk screening failed', 'error'),
    });

    const overrideMutation = useMutation({
        mutationFn: async ({ id, status, reason }: { id: string; status: string; reason: string }) =>
            (await api.patch(`/recruitment/screening-results/${id}/override`, { status, reason })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['screening-results', jobId] });
            setOverrideId(null);
            setOverrideData({ status: 'passed', reason: '' });
            showToast('Screening result overridden');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to override', 'error'),
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'passed': return 'bg-green-100 text-green-700';
            case 'failed': return 'bg-red-100 text-red-700';
            case 'review': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'passed': return <CheckCircle size={16} className="text-green-600" />;
            case 'failed': return <XCircle size={16} className="text-red-600" />;
            case 'review': return <AlertTriangle size={16} className="text-amber-600" />;
            default: return <HelpCircle size={16} className="text-slate-400" />;
        }
    };

    const passedCount = results.filter(r => r.status === 'passed').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const reviewCount = results.filter(r => r.status === 'review').length;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Shield className="text-[#0066B3]" size={24} />
                            ATS Screening Manager
                        </h2>
                        <p className="text-sm text-slate-500">{jobTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-lg"><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 px-6">
                    {([
                        ['criteria', 'Screening Criteria', Filter, criteria.length],
                        ['knockout', 'Knockout Questions', HelpCircle, questions.length],
                        ['results', 'Results', BarChart3, results.length],
                    ] as const).map(([key, label, Icon, count]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key as any)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === key ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon size={16} />
                            {label}
                            {count > 0 && <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">{count}</span>}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ==================== SCREENING CRITERIA TAB ==================== */}
                    {activeTab === 'criteria' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-600">Define criteria to automatically score applications</p>
                                <button
                                    onClick={() => setShowAddCriteria(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"
                                >
                                    <Plus size={16} /> Add Criteria
                                </button>
                            </div>

                            {criteriaLoading && <div className="text-center py-8 text-slate-400">Loading...</div>}

                            {!criteriaLoading && criteria.length === 0 && (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <Filter className="mx-auto mb-3 text-slate-300" size={40} />
                                    <p className="text-slate-500 font-medium">No screening criteria configured</p>
                                    <p className="text-sm text-slate-400 mt-1">Add criteria to automatically evaluate applications</p>
                                </div>
                            )}

                            {criteria.map((c) => (
                                <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.is_knockout ? 'bg-red-100' : 'bg-blue-100'}`}>
                                                {c.is_knockout ? <XCircle size={16} className="text-red-600" /> : <Filter size={16} className="text-blue-600" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-900 capitalize">{c.criteria_type.replace('_', ' ')}</span>
                                                    {c.is_knockout && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">Knockout</span>}
                                                </div>
                                                <p className="text-sm text-slate-500">
                                                    {c.field_name} {c.operator} {c.value}
                                                    {c.description && ` — ${c.description}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-500 font-medium">Weight: {c.weight}</span>
                                            <button onClick={() => setEditingCriteria(c)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Edit3 size={16} /></button>
                                            <button onClick={() => deleteCriteriaMutation.mutate(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add/Edit Criteria Form */}
                            {(showAddCriteria || editingCriteria) && (
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                                    <h3 className="font-semibold text-slate-900">{editingCriteria ? 'Edit Criteria' : 'Add Screening Criteria'}</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                            <select
                                                value={editingCriteria?.criteria_type || criteriaForm.criteria_type}
                                                onChange={(e) => editingCriteria
                                                    ? setEditingCriteria({ ...editingCriteria, criteria_type: e.target.value })
                                                    : setCriteriaForm({ ...criteriaForm, criteria_type: e.target.value })
                                                }
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            >
                                                <option value="experience">Experience</option>
                                                <option value="education">Education</option>
                                                <option value="skills">Skills</option>
                                                <option value="certifications">Certifications</option>
                                                <option value="keywords">Keywords</option>
                                                <option value="location">Location</option>
                                                <option value="salary">Salary</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Operator</label>
                                            <select
                                                value={editingCriteria?.operator || criteriaForm.operator}
                                                onChange={(e) => editingCriteria
                                                    ? setEditingCriteria({ ...editingCriteria, operator: e.target.value })
                                                    : setCriteriaForm({ ...criteriaForm, operator: e.target.value })
                                                }
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            >
                                                <option value="gte">Greater than or equal</option>
                                                <option value="lte">Less than or equal</option>
                                                <option value="eq">Equals</option>
                                                <option value="contains">Contains</option>
                                                <option value="in">In list</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
                                            <input
                                                type="text"
                                                value={editingCriteria?.value || criteriaForm.value}
                                                onChange={(e) => editingCriteria
                                                    ? setEditingCriteria({ ...editingCriteria, value: e.target.value })
                                                    : setCriteriaForm({ ...criteriaForm, value: e.target.value })
                                                }
                                                placeholder="e.g., 3, Bachelor's, React"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Weight (1-100)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={editingCriteria?.weight || criteriaForm.weight}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 10;
                                                    editingCriteria
                                                        ? setEditingCriteria({ ...editingCriteria, weight: val })
                                                        : setCriteriaForm({ ...criteriaForm, weight: val });
                                                }}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div className="flex items-end pb-1">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={editingCriteria?.is_knockout || criteriaForm.is_knockout}
                                                    onChange={(e) => editingCriteria
                                                        ? setEditingCriteria({ ...editingCriteria, is_knockout: e.target.checked })
                                                        : setCriteriaForm({ ...criteriaForm, is_knockout: e.target.checked })
                                                    }
                                                    className="w-4 h-4 text-red-600 rounded"
                                                />
                                                <span className="text-sm text-slate-700 font-medium">Knockout (auto-reject)</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                                        <input
                                            type="text"
                                            value={editingCriteria?.description || criteriaForm.description}
                                            onChange={(e) => editingCriteria
                                                ? setEditingCriteria({ ...editingCriteria, description: e.target.value })
                                                : setCriteriaForm({ ...criteriaForm, description: e.target.value })
                                            }
                                            placeholder="Brief description of this criteria"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setShowAddCriteria(false); setEditingCriteria(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                                        <button
                                            onClick={() => {
                                                if (editingCriteria) {
                                                    updateCriteriaMutation.mutate({ id: editingCriteria.id, data: editingCriteria });
                                                } else {
                                                    addCriteriaMutation.mutate(criteriaForm);
                                                }
                                            }}
                                            disabled={!(editingCriteria?.value || criteriaForm.value)}
                                            className="px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Save size={16} /> {editingCriteria ? 'Save Changes' : 'Add Criteria'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== KNOCKOUT QUESTIONS TAB ==================== */}
                    {activeTab === 'knockout' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-600">Questions that automatically disqualify candidates with wrong answers</p>
                                <button
                                    onClick={() => setShowAddQuestion(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"
                                >
                                    <Plus size={16} /> Add Question
                                </button>
                            </div>

                            {questionsLoading && <div className="text-center py-8 text-slate-400">Loading...</div>}

                            {!questionsLoading && questions.length === 0 && (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <HelpCircle className="mx-auto mb-3 text-slate-300" size={40} />
                                    <p className="text-slate-500 font-medium">No knockout questions configured</p>
                                    <p className="text-sm text-slate-400 mt-1">Add questions to screen candidates before they proceed</p>
                                </div>
                            )}

                            {questions.map((q, idx) => (
                                <div key={q.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{q.question_text}</p>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle size={14} className="text-green-500" />
                                                        Expected: <strong className="text-slate-700">{q.expected_answer}</strong>
                                                    </span>
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded capitalize">{q.question_type.replace('_', ' ')}</span>
                                                </div>
                                                {q.disqualify_message && (
                                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                        <AlertTriangle size={12} /> {q.disqualify_message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setEditingQuestion(q)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Edit3 size={16} /></button>
                                            <button onClick={() => deleteQuestionMutation.mutate(q.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add/Edit Question Form */}
                            {(showAddQuestion || editingQuestion) && (
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                                    <h3 className="font-semibold text-slate-900">{editingQuestion ? 'Edit Question' : 'Add Knockout Question'}</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                                        <textarea
                                            value={editingQuestion?.question_text || questionForm.question_text}
                                            onChange={(e) => editingQuestion
                                                ? setEditingQuestion({ ...editingQuestion, question_text: e.target.value })
                                                : setQuestionForm({ ...questionForm, question_text: e.target.value })
                                            }
                                            rows={2}
                                            placeholder="e.g., Are you legally authorized to work in Kenya?"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
                                            <select
                                                value={editingQuestion?.question_type || questionForm.question_type}
                                                onChange={(e) => editingQuestion
                                                    ? setEditingQuestion({ ...editingQuestion, question_type: e.target.value })
                                                    : setQuestionForm({ ...questionForm, question_type: e.target.value })
                                                }
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            >
                                                <option value="yes_no">Yes / No</option>
                                                <option value="multiple_choice">Multiple Choice</option>
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Expected Answer</label>
                                            <input
                                                type="text"
                                                value={editingQuestion?.expected_answer || questionForm.expected_answer}
                                                onChange={(e) => editingQuestion
                                                    ? setEditingQuestion({ ...editingQuestion, expected_answer: e.target.value })
                                                    : setQuestionForm({ ...questionForm, expected_answer: e.target.value })
                                                }
                                                placeholder="e.g., Yes"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Disqualify Message (optional)</label>
                                        <input
                                            type="text"
                                            value={editingQuestion?.disqualify_message || questionForm.disqualify_message}
                                            onChange={(e) => editingQuestion
                                                ? setEditingQuestion({ ...editingQuestion, disqualify_message: e.target.value })
                                                : setQuestionForm({ ...questionForm, disqualify_message: e.target.value })
                                            }
                                            placeholder="Message shown when candidate is disqualified"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setShowAddQuestion(false); setEditingQuestion(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                                        <button
                                            onClick={() => {
                                                if (editingQuestion) {
                                                    updateQuestionMutation.mutate({ id: editingQuestion.id, data: editingQuestion });
                                                } else {
                                                    addQuestionMutation.mutate(questionForm);
                                                }
                                            }}
                                            disabled={!(editingQuestion?.question_text || questionForm.question_text) || !(editingQuestion?.expected_answer || questionForm.expected_answer)}
                                            className="px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Save size={16} /> {editingQuestion ? 'Save Changes' : 'Add Question'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== RESULTS TAB ==================== */}
                    {activeTab === 'results' && (
                        <div className="space-y-4">
                            {/* Stats + Actions */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                                        <CheckCircle size={14} className="text-green-600" />
                                        <span className="text-green-700 font-medium">{passedCount} Passed</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm">
                                        <XCircle size={14} className="text-red-600" />
                                        <span className="text-red-700 font-medium">{failedCount} Failed</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                                        <AlertTriangle size={14} className="text-amber-600" />
                                        <span className="text-amber-700 font-medium">{reviewCount} Review</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={resultFilter}
                                        onChange={(e) => setResultFilter(e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                    >
                                        <option value="">All Results</option>
                                        <option value="passed">Passed</option>
                                        <option value="failed">Failed</option>
                                        <option value="review">Needs Review</option>
                                    </select>
                                    <button
                                        onClick={() => bulkScreenMutation.mutate()}
                                        disabled={bulkScreenMutation.isPending}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50"
                                    >
                                        {bulkScreenMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                                        {bulkScreenMutation.isPending ? 'Screening...' : 'Screen All Applications'}
                                    </button>
                                </div>
                            </div>

                            {resultsLoading && <div className="text-center py-8 text-slate-400">Loading...</div>}

                            {!resultsLoading && results.length === 0 && (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <BarChart3 className="mx-auto mb-3 text-slate-300" size={40} />
                                    <p className="text-slate-500 font-medium">No screening results yet</p>
                                    <p className="text-sm text-slate-400 mt-1">Click "Screen All Applications" to run ATS screening</p>
                                </div>
                            )}

                            {results.map((r) => (
                                <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(r.status)}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-900">
                                                        {r.application?.candidate?.first_name} {r.application?.candidate?.last_name}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${getStatusColor(r.status)}`}>
                                                        {r.status}
                                                    </span>
                                                    {r.is_override && (
                                                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">Override</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                                                    <span>{r.application?.application_number}</span>
                                                    <span>{r.application?.candidate?.email}</span>
                                                    <span>{new Date(r.screened_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white ${
                                                r.percentage >= 80 ? 'bg-green-500' : r.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}>
                                                {Math.round(r.percentage)}%
                                            </div>
                                            <button
                                                onClick={() => { setOverrideId(r.id); setOverrideData({ status: r.status === 'passed' ? 'failed' : 'passed', reason: '' }); }}
                                                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                                            >
                                                Override
                                            </button>
                                        </div>
                                    </div>
                                    {r.knockout_reasons && r.knockout_reasons.length > 0 && (
                                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                            <p className="text-xs font-semibold text-red-700 mb-1">Knockout Reasons:</p>
                                            {r.knockout_reasons.map((ko: any, i: number) => (
                                                <p key={i} className="text-xs text-red-600">{ko.name}: {ko.reason}</p>
                                            ))}
                                        </div>
                                    )}
                                    {r.is_override && r.override_reason && (
                                        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                                            <p className="text-xs text-purple-700"><strong>Override reason:</strong> {r.override_reason}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Override Modal */}
                {overrideId && (
                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4">
                            <h3 className="font-bold text-slate-900">Override Screening Result</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Status</label>
                                <select value={overrideData.status} onChange={(e) => setOverrideData({ ...overrideData, status: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                    <option value="passed">Passed</option>
                                    <option value="failed">Failed</option>
                                    <option value="review">Needs Review</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                                <textarea value={overrideData.reason} onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })} rows={3} placeholder="Why are you overriding this result?" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setOverrideId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                                <button
                                    onClick={() => overrideMutation.mutate({ id: overrideId, status: overrideData.status, reason: overrideData.reason })}
                                    disabled={!overrideData.reason.trim()}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                                >
                                    Override
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
                        toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-red-500" />}
                        {toast.text}
                    </div>
                )}
            </div>
        </div>
    );
};
