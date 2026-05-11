import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { InputDialog } from '../components/ui/InputDialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Target, Star, Plus, Edit, X, CheckCircle,
    Loader2, AlertTriangle, FileText, Award, Calendar, ChevronRight,
    MessageSquare, Send, Save, AlertOctagon, ThumbsUp,
} from 'lucide-react';

type Tab = 'my-reviews' | 'reviews-to-give' | 'my-goals' | 'cycles';

interface Cycle {
    id: string;
    name: string;
    type: string;
    status: string;
    period_start: string;
    period_end: string;
    self_review_due: string;
    manager_review_due: string;
    include_360: boolean;
    competency_framework?: Array<{ code: string; name: string; description?: string; weight: number }>;
    instructions?: string;
}

interface Review {
    id: string;
    cycle_id: string;
    reviewee_id: string;
    reviewer_id: string;
    reviewer_type: string;
    status: string;
    competency_ratings?: Record<string, { rating: number; comment?: string }>;
    overall_rating?: number;
    strengths?: string;
    areas_for_improvement?: string;
    achievements?: string;
    development_plan?: string;
    reviewer_comments?: string;
    reviewee_comments?: string;
    submitted_at?: string;
    cycle?: Cycle;
    reviewee?: { id: string; first_name: string; last_name: string; employee_number: string };
    reviewer?: { id: string; first_name: string; last_name: string; employee_number: string };
}

interface KeyResult {
    id: string;
    title: string;
    type: string;
    target_value?: number;
    current_value: number;
    unit?: string;
    progress_percent: number;
    is_completed: boolean;
}

interface Goal {
    id: string;
    title: string;
    description?: string;
    category: string;
    weight: number;
    status: string;
    progress_percent: number;
    start_date: string;
    due_date: string;
    completed_at?: string;
    final_rating?: number;
    manager_comments?: string;
    self_assessment?: string;
    key_results: KeyResult[];
}

const PerformancePage: React.FC = () => {
    const queryClient = useQueryClient();
    const user = useAuthStore(s => s.user);
    const isAdmin = user?.roles?.some(r => ['CEO', 'HR_MANAGER'].includes(r.code));
    const [tab, setTab] = useState<Tab>('my-reviews');
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') =>
        { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

    const [activeReview, setActiveReview] = useState<Review | null>(null);
    const [reviewForm, setReviewForm] = useState<Partial<Review>>({});
    const [acknowledgeReviewId, setAcknowledgeReviewId] = useState<string | null>(null);
    const [disputeReviewId, setDisputeReviewId] = useState<string | null>(null);

    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [goalForm, setGoalForm] = useState<any>({ title: '', description: '', category: 'individual', weight: 0.25, start_date: new Date().toISOString().slice(0, 10), due_date: '' });

    const [showCycleModal, setShowCycleModal] = useState(false);
    const [cycleForm, setCycleForm] = useState<any>({
        name: '', type: 'annual',
        period_start: '', period_end: '',
        self_review_due: '', manager_review_due: '',
        include_360: false,
        instructions: '',
    });

    // Queries
    const { data: cycles = [] } = useQuery<Cycle[]>({
        queryKey: ['perf-cycles'],
        queryFn: async () => (await api.get('/performance/cycles')).data,
    });

    const { data: myReviewsToGive = [] } = useQuery<Review[]>({
        queryKey: ['my-reviews-to-give'],
        queryFn: async () => (await api.get('/performance/my/to-give')).data,
        enabled: tab === 'reviews-to-give',
    });

    const { data: myReviews = [] } = useQuery<Review[]>({
        queryKey: ['my-reviews-about-me'],
        queryFn: async () => (await api.get('/performance/my/about-me')).data,
        enabled: tab === 'my-reviews',
    });

    const { data: myGoals = [] } = useQuery<Goal[]>({
        queryKey: ['my-goals'],
        queryFn: async () => (await api.get('/performance/my/goals')).data,
        enabled: tab === 'my-goals',
    });

    // Mutations
    const saveDraftMutation = useMutation({
        mutationFn: async (data: { id: string; payload: Partial<Review> }) =>
            (await api.patch(`/performance/reviews/${data.id}/draft`, data.payload)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-reviews-to-give'] }); showToast('Draft saved'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to save draft', 'error'),
    });

    const submitMutation = useMutation({
        mutationFn: async (data: { id: string; payload: Partial<Review> }) =>
            (await api.patch(`/performance/reviews/${data.id}/submit`, data.payload)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-reviews-to-give'] }); setActiveReview(null); showToast('Review submitted'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to submit', 'error'),
    });

    const acknowledgeMutation = useMutation({
        mutationFn: async ({ id, comments }: { id: string; comments?: string }) =>
            (await api.patch(`/performance/reviews/${id}/acknowledge`, { comments })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-reviews-about-me'] }); setAcknowledgeReviewId(null); showToast('Acknowledged'); },
        onError: (e: any) => { setAcknowledgeReviewId(null); showToast(e?.response?.data?.message || 'Failed', 'error'); },
    });

    const disputeMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
            (await api.patch(`/performance/reviews/${id}/dispute`, { reason })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-reviews-about-me'] }); setDisputeReviewId(null); showToast('Dispute filed'); },
        onError: (e: any) => { setDisputeReviewId(null); showToast(e?.response?.data?.message || 'Failed', 'error'); },
    });

    const createGoalMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/performance/goals', { ...data, staff_id: user?.staff_id })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-goals'] }); setShowGoalModal(false); setGoalForm({ title: '', description: '', category: 'individual', weight: 0.25, start_date: new Date().toISOString().slice(0, 10), due_date: '' }); showToast('Goal created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const updateGoalMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.patch(`/performance/goals/${id}`, data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-goals'] }); setEditingGoal(null); showToast('Goal updated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const createCycleMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/performance/cycles', data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['perf-cycles'] }); setShowCycleModal(false); showToast('Cycle created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const launchCycleMutation = useMutation({
        mutationFn: async (id: string) => (await api.post(`/performance/cycles/${id}/launch`, {})).data,
        onSuccess: (data: any) => { queryClient.invalidateQueries({ queryKey: ['perf-cycles'] }); showToast(`Launched: ${data.created} reviews created`); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    // Open review for editing
    const openReview = (r: Review) => {
        setActiveReview(r);
        setReviewForm({
            strengths: r.strengths,
            areas_for_improvement: r.areas_for_improvement,
            achievements: r.achievements,
            development_plan: r.development_plan,
            reviewer_comments: r.reviewer_comments,
            competency_ratings: r.competency_ratings || {},
            overall_rating: r.overall_rating,
        });
    };

    // Helpers
    const statusBadge = (s: string) => {
        const map: Record<string, string> = {
            pending: 'bg-slate-100 text-slate-600',
            in_progress: 'bg-amber-100 text-amber-700',
            submitted: 'bg-purple-100 text-purple-700',
            acknowledged: 'bg-emerald-100 text-emerald-700',
            disputed: 'bg-red-100 text-red-700',
            draft: 'bg-slate-100 text-slate-600',
            active: 'bg-blue-100 text-blue-700',
            at_risk: 'bg-amber-100 text-amber-700',
            completed: 'bg-emerald-100 text-emerald-700',
            missed: 'bg-red-100 text-red-700',
            cancelled: 'bg-slate-100 text-slate-500',
            self_review: 'bg-blue-100 text-blue-700',
            manager_review: 'bg-purple-100 text-purple-700',
            peer_review: 'bg-pink-100 text-pink-700',
            moderation: 'bg-amber-100 text-amber-700',
            finalized: 'bg-emerald-100 text-emerald-700',
            closed: 'bg-slate-100 text-slate-500',
        };
        return map[s] || 'bg-slate-100 text-slate-600';
    };

    const StarRating: React.FC<{ value?: number; onChange?: (v: number) => void; readOnly?: boolean }> = ({ value = 0, onChange, readOnly }) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange?.(n)}
                    className={`p-0.5 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
                >
                    <Star size={18} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                </button>
            ))}
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Award className="text-[#0066B3]" size={32} />Performance
                </h1>
                <p className="text-slate-500 mt-1">Reviews, goals, OKRs, and development</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl overflow-x-auto">
                {([
                    { id: 'my-reviews' as Tab, label: 'My Reviews', icon: FileText },
                    { id: 'reviews-to-give' as Tab, label: `To Give${myReviewsToGive.length > 0 ? ` (${myReviewsToGive.length})` : ''}`, icon: MessageSquare },
                    { id: 'my-goals' as Tab, label: 'My Goals', icon: Target },
                    ...(isAdmin ? [{ id: 'cycles' as Tab, label: 'Cycles (Admin)', icon: Calendar }] : []),
                ]).map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                tab === t.id ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}>
                            <Icon size={16} />{t.label}
                        </button>
                    );
                })}
            </div>

            {/* MY REVIEWS (about me) */}
            {tab === 'my-reviews' && (
                <div className="space-y-3">
                    {myReviews.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <FileText className="mx-auto text-slate-300 mb-3" size={48} />
                            <p className="text-slate-500 font-medium">No reviews yet</p>
                            <p className="text-sm text-slate-400">Reviews about you appear here once they're submitted.</p>
                        </div>
                    ) : (
                        myReviews.map(r => (
                            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="text-xs uppercase font-semibold text-slate-400">{r.reviewer_type} review · {r.cycle?.name}</p>
                                        <p className="font-semibold text-slate-900 mt-0.5">By {r.reviewer?.first_name} {r.reviewer?.last_name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {r.overall_rating && (<div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-lg"><Star size={14} className="fill-amber-400 text-amber-400" /><span className="font-semibold text-amber-700">{r.overall_rating.toFixed(2)}</span></div>)}
                                        <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${statusBadge(r.status)}`}>{r.status}</span>
                                    </div>
                                </div>
                                {r.strengths && <div className="mt-2"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Strengths</p><p className="text-sm text-slate-700">{r.strengths}</p></div>}
                                {r.areas_for_improvement && <div className="mt-2"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Areas for Improvement</p><p className="text-sm text-slate-700">{r.areas_for_improvement}</p></div>}
                                {r.development_plan && <div className="mt-2"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Development Plan</p><p className="text-sm text-slate-700">{r.development_plan}</p></div>}
                                {r.status === 'submitted' && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 justify-end">
                                        <button onClick={() => setDisputeReviewId(r.id)} className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1"><AlertOctagon size={13} />Dispute</button>
                                        <button onClick={() => setAcknowledgeReviewId(r.id)} className="px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"><ThumbsUp size={13} />Acknowledge</button>
                                    </div>
                                )}
                                {r.reviewee_comments && (<div className="mt-3 pt-3 border-t border-slate-100"><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Your Response</p><p className="text-sm text-slate-700 italic">{r.reviewee_comments}</p></div>)}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* REVIEWS TO GIVE */}
            {tab === 'reviews-to-give' && !activeReview && (
                <div className="space-y-3">
                    {myReviewsToGive.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <MessageSquare className="mx-auto text-slate-300 mb-3" size={48} />
                            <p className="text-slate-500 font-medium">No pending reviews</p>
                        </div>
                    ) : (
                        myReviewsToGive.map(r => (
                            <div key={r.id} onClick={() => openReview(r)} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-[#0066B3] hover:shadow-md cursor-pointer transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase font-semibold text-slate-400">{r.cycle?.name} · {r.reviewer_type} review</p>
                                        <p className="font-semibold text-slate-900 mt-0.5">{r.reviewee?.first_name} {r.reviewee?.last_name}</p>
                                        <p className="text-xs text-slate-500">{r.reviewee?.employee_number}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${statusBadge(r.status)}`}>{r.status}</span>
                                        <ChevronRight size={18} className="text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Review form editor */}
            {tab === 'reviews-to-give' && activeReview && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                    <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                        <div>
                            <p className="text-xs uppercase font-semibold text-slate-400">{activeReview.cycle?.name}</p>
                            <h2 className="text-xl font-bold text-slate-900 mt-1">{activeReview.reviewer_type} review for {activeReview.reviewee?.first_name} {activeReview.reviewee?.last_name}</h2>
                        </div>
                        <button onClick={() => setActiveReview(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                    </div>

                    {/* Competency framework */}
                    {activeReview.cycle?.competency_framework && activeReview.cycle.competency_framework.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-3">Competencies</h3>
                            <div className="space-y-2">
                                {activeReview.cycle.competency_framework.map((comp: any) => (
                                    <div key={comp.code} className="bg-slate-50 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{comp.name}</p>
                                                {comp.description && <p className="text-xs text-slate-500">{comp.description}</p>}
                                            </div>
                                            <StarRating
                                                value={reviewForm.competency_ratings?.[comp.code]?.rating || 0}
                                                onChange={(v) => setReviewForm({ ...reviewForm, competency_ratings: { ...reviewForm.competency_ratings, [comp.code]: { ...(reviewForm.competency_ratings?.[comp.code] || {}), rating: v } } })}
                                            />
                                        </div>
                                        <textarea
                                            placeholder="Comment (optional)"
                                            value={reviewForm.competency_ratings?.[comp.code]?.comment || ''}
                                            onChange={(e) => setReviewForm({ ...reviewForm, competency_ratings: { ...reviewForm.competency_ratings, [comp.code]: { ...(reviewForm.competency_ratings?.[comp.code] || { rating: 0 }), comment: e.target.value } } })}
                                            rows={2}
                                            className="w-full mt-2 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Narrative fields */}
                    {[
                        { key: 'achievements', label: 'Key Achievements', placeholder: 'What did this person accomplish during the review period?' },
                        { key: 'strengths', label: 'Strengths', placeholder: 'What are this person\'s greatest strengths?' },
                        { key: 'areas_for_improvement', label: 'Areas for Improvement', placeholder: 'Where can this person grow?' },
                        { key: 'development_plan', label: 'Development Plan', placeholder: 'Concrete next steps, training, projects to assign' },
                        { key: 'reviewer_comments', label: 'Additional Comments', placeholder: 'Any other feedback' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                            <textarea
                                value={(reviewForm as any)[f.key] || ''}
                                onChange={(e) => setReviewForm({ ...reviewForm, [f.key]: e.target.value })}
                                placeholder={f.placeholder}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                            />
                        </div>
                    ))}

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <button
                            onClick={() => saveDraftMutation.mutate({ id: activeReview.id, payload: reviewForm })}
                            disabled={saveDraftMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm font-medium"
                        >
                            {saveDraftMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save Draft
                        </button>
                        <button
                            onClick={() => submitMutation.mutate({ id: activeReview.id, payload: reviewForm })}
                            disabled={submitMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg hover:bg-[#005299] text-sm font-medium"
                        >
                            {submitMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}Submit
                        </button>
                    </div>
                </div>
            )}

            {/* MY GOALS */}
            {tab === 'my-goals' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">{myGoals.length} goal{myGoals.length === 1 ? '' : 's'}</p>
                        <button onClick={() => setShowGoalModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"><Plus size={16} />New Goal</button>
                    </div>

                    {myGoals.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <Target className="mx-auto text-slate-300 mb-3" size={48} />
                            <p className="text-slate-500 font-medium">No goals yet</p>
                            <p className="text-sm text-slate-400">Set SMART goals to track your performance.</p>
                        </div>
                    ) : (
                        myGoals.map(g => (
                            <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-slate-900">{g.title}</h3>
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusBadge(g.status)}`}>{g.status}</span>
                                            <span className="text-xs text-slate-400 capitalize">{g.category}</span>
                                        </div>
                                        {g.description && <p className="text-sm text-slate-500 mt-1">{g.description}</p>}
                                    </div>
                                    <button onClick={() => { setEditingGoal(g); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit size={14} /></button>
                                </div>
                                <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                        <span>{g.progress_percent}% complete</span>
                                        <span>Due {new Date(g.due_date).toLocaleDateString('en-GB')}</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all ${g.progress_percent >= 100 ? 'bg-emerald-500' : g.status === 'at_risk' ? 'bg-amber-500' : 'bg-[#0066B3]'}`} style={{ width: `${g.progress_percent}%` }} />
                                    </div>
                                </div>
                                {g.key_results && g.key_results.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                        <p className="text-xs font-semibold text-slate-500 uppercase">Key Results</p>
                                        {g.key_results.map(kr => (
                                            <div key={kr.id} className="flex items-center justify-between text-sm">
                                                <span className={kr.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}>{kr.title}</span>
                                                <span className="text-xs font-medium text-slate-500">{kr.current_value}{kr.unit ? ` ${kr.unit}` : ''} / {kr.target_value}{kr.unit ? ` ${kr.unit}` : ''} ({kr.progress_percent}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* CYCLES (admin) */}
            {tab === 'cycles' && isAdmin && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">{cycles.length} cycle{cycles.length === 1 ? '' : 's'}</p>
                        <button onClick={() => setShowCycleModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"><Plus size={16} />New Cycle</button>
                    </div>
                    {cycles.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <Calendar className="mx-auto text-slate-300 mb-3" size={48} />
                            <p className="text-slate-500 font-medium">No review cycles</p>
                        </div>
                    ) : (
                        cycles.map(c => (
                            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-slate-900">{c.name}</h3>
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusBadge(c.status)}`}>{c.status}</span>
                                            <span className="text-xs text-slate-400 capitalize">{c.type}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">{c.period_start} → {c.period_end} · Self due {c.self_review_due} · Manager due {c.manager_review_due}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {c.status === 'draft' && (
                                            <button onClick={() => launchCycleMutation.mutate(c.id)} disabled={launchCycleMutation.isPending} className="px-3 py-1.5 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center gap-1">
                                                {launchCycleMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}Launch
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create/Edit Goal Modal */}
            {(showGoalModal || editingGoal) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">{editingGoal ? 'Edit Goal' : 'New Goal'}</h2>
                            <button onClick={() => { setShowGoalModal(false); setEditingGoal(null); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input type="text" value={editingGoal ? editingGoal.title : goalForm.title} onChange={(e) => editingGoal ? setEditingGoal({ ...editingGoal, title: e.target.value }) : setGoalForm({ ...goalForm, title: e.target.value })} placeholder="Increase loan disbursement by 20%" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea value={editingGoal ? editingGoal.description || '' : goalForm.description} onChange={(e) => editingGoal ? setEditingGoal({ ...editingGoal, description: e.target.value }) : setGoalForm({ ...goalForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                    <select value={editingGoal ? editingGoal.category : goalForm.category} onChange={(e) => editingGoal ? setEditingGoal({ ...editingGoal, category: e.target.value }) : setGoalForm({ ...goalForm, category: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                        <option value="individual">Individual</option>
                                        <option value="team">Team</option>
                                        <option value="development">Development</option>
                                        <option value="stretch">Stretch</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Weight (0-1)</label>
                                    <input type="number" step="0.05" min="0" max="1" value={editingGoal ? editingGoal.weight : goalForm.weight} onChange={(e) => editingGoal ? setEditingGoal({ ...editingGoal, weight: parseFloat(e.target.value) || 0 }) : setGoalForm({ ...goalForm, weight: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                    <input type="date" value={editingGoal ? editingGoal.start_date : goalForm.start_date} onChange={(e) => editingGoal ? setEditingGoal({ ...editingGoal, start_date: e.target.value }) : setGoalForm({ ...goalForm, start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                    <input type="date" value={editingGoal ? editingGoal.due_date : goalForm.due_date} onChange={(e) => editingGoal ? setEditingGoal({ ...editingGoal, due_date: e.target.value }) : setGoalForm({ ...goalForm, due_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                            </div>
                            {editingGoal && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Progress ({editingGoal.progress_percent}%)</label>
                                    <input type="range" min="0" max="100" value={editingGoal.progress_percent} onChange={(e) => setEditingGoal({ ...editingGoal, progress_percent: parseInt(e.target.value) })} className="w-full" />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => { setShowGoalModal(false); setEditingGoal(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button
                                onClick={() => editingGoal ? updateGoalMutation.mutate({ id: editingGoal.id, data: editingGoal }) : createGoalMutation.mutate(goalForm)}
                                disabled={!user?.staff_id || createGoalMutation.isPending || updateGoalMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">
                                {(createGoalMutation.isPending || updateGoalMutation.isPending) ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{editingGoal ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Cycle Modal */}
            {showCycleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">New Review Cycle</h2>
                            <button onClick={() => setShowCycleModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input type="text" value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} placeholder="2026 Annual Review" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                <select value={cycleForm.type} onChange={(e) => setCycleForm({ ...cycleForm, type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                    <option value="annual">Annual</option>
                                    <option value="biannual">Bi-annual</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="probation">Probation</option>
                                    <option value="ad_hoc">Ad-hoc</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Period Start</label><input type="date" value={cycleForm.period_start} onChange={(e) => setCycleForm({ ...cycleForm, period_start: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Period End</label><input type="date" value={cycleForm.period_end} onChange={(e) => setCycleForm({ ...cycleForm, period_end: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Self Review Due</label><input type="date" value={cycleForm.self_review_due} onChange={(e) => setCycleForm({ ...cycleForm, self_review_due: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Manager Due</label><input type="date" value={cycleForm.manager_review_due} onChange={(e) => setCycleForm({ ...cycleForm, manager_review_due: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={cycleForm.include_360} onChange={(e) => setCycleForm({ ...cycleForm, include_360: e.target.checked })} className="w-4 h-4 text-[#0066B3]" />
                                Include 360° (peers + direct reports)
                            </label>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Instructions</label>
                                <textarea value={cycleForm.instructions} onChange={(e) => setCycleForm({ ...cycleForm, instructions: e.target.value })} rows={2} placeholder="Optional guidance for reviewers" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowCycleModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => createCycleMutation.mutate(cycleForm)} disabled={!cycleForm.name || createCycleMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">
                                {createCycleMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!acknowledgeReviewId}
                title="Acknowledge Review"
                message="Acknowledge that you have read and accept this review? You may also add your own comments via Disputes if you disagree."
                confirmLabel="Acknowledge"
                onConfirm={() => { if (acknowledgeReviewId) acknowledgeMutation.mutate({ id: acknowledgeReviewId, comments: undefined }); }}
                onCancel={() => setAcknowledgeReviewId(null)}
                isLoading={acknowledgeMutation.isPending}
            />
            <InputDialog
                isOpen={!!disputeReviewId}
                title="Dispute Review"
                message="Provide your reasons for disputing this review. HR will be notified."
                inputLabel="Reason"
                placeholder="Explain the basis of your dispute"
                confirmLabel="File Dispute"
                required minLength={10}
                onConfirm={(reason) => { if (disputeReviewId) disputeMutation.mutate({ id: disputeReviewId, reason }); }}
                onCancel={() => setDisputeReviewId(null)}
                isLoading={disputeMutation.isPending}
            />

            {toast && (
                <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 z-[100] ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                    <span className="text-sm font-medium">{toast.text}</span>
                </div>
            )}
        </div>
    );
};

export default PerformancePage;
