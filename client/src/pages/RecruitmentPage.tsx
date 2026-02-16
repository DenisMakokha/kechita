import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InputDialog } from '../components/ui/InputDialog';
import {
    Plus, Briefcase, Users, Mail, ChevronRight, X, Search, Edit,
    Star, StarOff, Calendar, Clock, MapPin, DollarSign,
    Video, User, Eye, Phone, Filter, Tag, ExternalLink,
    Building, Globe, TrendingUp, FileText, Award, CheckCircle, AlertTriangle, ChevronDown
} from 'lucide-react';
import { ApplicationModal } from '../components/recruitment/ApplicationModal';
import { InterviewModal } from '../components/recruitment/InterviewModal';
import { RecruitmentMetrics } from '../components/recruitment/RecruitmentMetrics';
import { OfferModal } from '../components/recruitment/OfferModal';
import { ATSManager } from '../components/recruitment/ATSManager';

interface OnboardingTask { id: string; name: string; description: string; order: number; is_required: boolean; estimated_days: number; category: string; }
interface OnboardingTemplate { id: string; name: string; description: string; is_active: boolean; tasks: OnboardingTask[]; }
interface OnboardingTaskStatus { id: string; task: OnboardingTask; status: 'pending' | 'completed' | 'skipped'; completed_at: string | null; completed_by: { first_name: string; last_name: string } | null; notes: string | null; }
interface OnboardingInstance { id: string; staff: { id: string; first_name: string; last_name: string; employee_number: string }; template: OnboardingTemplate; status: 'in_progress' | 'completed'; started_at: string; completed_at: string | null; progress_percentage: number; due_date: string; taskStatuses: OnboardingTaskStatus[]; }
interface OnboardingStats { total: number; inProgress: number; completed: number; overdue: number; averageCompletionDays: number; }

interface Job {
    id: string;
    job_code: string;
    title: string;
    status: string;
    employment_type: string;
    experience_level: string;
    location?: string;
    is_remote?: boolean;
    is_urgent?: boolean;
    is_internal_only?: boolean;
    salary_min?: number;
    salary_max?: number;
    applications_count?: number;
    views_count?: number;
    deadline?: string;
    department?: { name: string };
    branch?: { name: string };
    created_at: string;
}

interface Stage {
    id: string;
    code: string;
    name: string;
    color: string;
    position: number;
    is_terminal: boolean;
    is_success: boolean;
}

interface Application {
    id: string;
    application_number: string;
    status: string;
    match_score?: number;
    recruiter_rating?: number;
    is_starred?: boolean;
    applied_at: string;
    candidate: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        current_title?: string;
        current_company?: string;
        years_of_experience?: number;
        skills?: string[];
        photo_url?: string;
    };
    jobPost: {
        id: string;
        title: string;
    };
    stage?: Stage;
}

interface Interview {
    id: string;
    type: string;
    status: string;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    location?: string;
    video_link?: string;
    outcome: string;
    overall_rating?: number;
    feedback?: string;
    application: {
        id: string;
        candidate: {
            first_name: string;
            last_name: string;
            email: string;
            phone?: string;
        };
        jobPost: {
            title: string;
        };
    };
    interviewers: { id: string; first_name: string; last_name: string }[];
}

interface Candidate {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    current_title?: string;
    current_company?: string;
    years_of_experience?: number;
    skills?: string[];
    status: string;
    source: string;
    overall_score?: number;
    expected_salary?: number;
    city?: string;
    country?: string;
    linkedin_url?: string;
    resume_url?: string;
    tags?: string[];
    created_at: string;
    currentStage?: Stage;
}

type Tab = 'dashboard' | 'jobs' | 'pipeline' | 'candidates' | 'interviews' | 'onboarding';

const RecruitmentPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showJobModal, setShowJobModal] = useState(false);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [jobFormData, setJobFormData] = useState<any>({});
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [candidateStatusFilter, setCandidateStatusFilter] = useState<string>('all');
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [showCandidateModal, setShowCandidateModal] = useState(false);
    const [selectedOnboardingInstance, setSelectedOnboardingInstance] = useState<OnboardingInstance | null>(null);
    const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
    const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
    const [blacklistCandidateId, setBlacklistCandidateId] = useState<string | null>(null);
    const [jobStatusFilter, setJobStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [candidateModalTab, setCandidateModalTab] = useState<'profile' | 'notes' | 'applications'>('profile');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [feedbackInterviewId, setFeedbackInterviewId] = useState<string | null>(null);
    const [atsJobId, setAtsJobId] = useState<string | null>(null);
    const [atsJobTitle, setAtsJobTitle] = useState('');
    const [feedbackData, setFeedbackData] = useState<{ overall_rating: number; feedback: string; outcome: string }>({ overall_rating: 0, feedback: '', outcome: 'pending' });
    const [interviewView, setInterviewView] = useState<'upcoming' | 'past'>('upcoming');
    const [showHireModal, setShowHireModal] = useState(false);
    const [hireCandidate, setHireCandidate] = useState<Candidate | null>(null);
    const [hireFormData, setHireFormData] = useState<any>({});
    const queryClient = useQueryClient();
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

    // Queries
    const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
        queryKey: ['jobs'],
        queryFn: async () => (await api.get('/recruitment/jobs')).data,
    });

    const { data: stages } = useQuery<Stage[]>({
        queryKey: ['pipeline-stages'],
        queryFn: async () => (await api.get('/recruitment/stages')).data,
    });

    const { data: applications } = useQuery<Application[]>({
        queryKey: ['applications', selectedJob],
        queryFn: async () => {
            const url = selectedJob
                ? `/recruitment/applications?job_post_id=${selectedJob}`
                : '/recruitment/applications';
            return (await api.get(url)).data;
        },
    });

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => (await api.get('/org/departments')).data,
    });

    const { data: positions = [] } = useQuery({ queryKey: ['positions'], queryFn: async () => (await api.get('/org/positions')).data });
    const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/roles')).data });
    const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get('/org/branches')).data });
    const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: async () => (await api.get('/org/regions')).data });

    const { data: interviews } = useQuery<Interview[]>({
        queryKey: ['interviews-upcoming'],
        queryFn: async () => (await api.get('/recruitment/interviews/upcoming')).data,
    });

    // Candidates query
    const { data: candidates, isLoading: candidatesLoading } = useQuery<Candidate[]>({
        queryKey: ['candidates', candidateSearch, candidateStatusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (candidateSearch) params.append('search', candidateSearch);
            if (candidateStatusFilter !== 'all') params.append('status', candidateStatusFilter);
            const url = `/recruitment/candidates${params.toString() ? `?${params.toString()}` : ''}`;
            return (await api.get(url)).data;
        },
    });

    // Candidate detail queries (enabled when candidate modal is open)
    const { data: candidateNotes = [] } = useQuery<{ id: string; content: string; created_at: string; author?: { first_name: string; last_name: string } }[]>({
        queryKey: ['candidate-notes', selectedCandidate?.id],
        queryFn: async () => (await api.get(`/recruitment/candidates/${selectedCandidate!.id}/notes`)).data,
        enabled: !!selectedCandidate && showCandidateModal,
    });

    const { data: candidateApplications = [] } = useQuery<Application[]>({
        queryKey: ['candidate-applications', selectedCandidate?.id],
        queryFn: async () => (await api.get(`/recruitment/candidates/${selectedCandidate!.id}/applications`)).data,
        enabled: !!selectedCandidate && showCandidateModal,
    });

    // Onboarding queries
    const { data: onboardingStats } = useQuery<OnboardingStats>({ queryKey: ['onboarding-stats'], queryFn: () => api.get('/staff/onboarding/stats').then(r => r.data), enabled: activeTab === 'onboarding' });
    const { data: onboardingInstances = [] } = useQuery<OnboardingInstance[]>({ queryKey: ['onboarding-instances'], queryFn: () => api.get('/staff/onboarding/instances').then(r => r.data), enabled: activeTab === 'onboarding' });
    const { data: onboardingTemplates = [] } = useQuery<OnboardingTemplate[]>({ queryKey: ['onboarding-templates'], queryFn: () => api.get('/staff/onboarding/templates').then(r => r.data), enabled: activeTab === 'onboarding' });

    // Mutations
    const updateStageMutation = useMutation({
        mutationFn: async ({ id, stageCode }: { id: string; stageCode: string }) => {
            return api.patch(`/recruitment/applications/${id}/stage`, { stage_code: stageCode });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['recruitment-dashboard'] });
        },
    });

    const starMutation = useMutation({
        mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
            return api.patch(`/recruitment/applications/${id}/star`, { starred });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });

    const createJobMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/recruitment/jobs', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            setShowJobModal(false);
            setJobFormData({});
            showToast('Job post created successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create job', 'error'),
    });

    const updateJobMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.put(`/recruitment/jobs/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            setShowJobModal(false);
            setEditingJob(null);
            setJobFormData({});
            showToast('Job post updated successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update job', 'error'),
    });

    const publishJobMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/recruitment/jobs/${id}/publish`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            showToast('Job published successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to publish job', 'error'),
    });

    const closeJobMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/recruitment/jobs/${id}/close`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            showToast('Job closed');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to close job', 'error'),
    });

    const deleteJobMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/recruitment/jobs/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            showToast('Job deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete job', 'error'),
    });

    const rejectApplicationMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason?: string }) => 
            (await api.patch(`/recruitment/applications/${id}/reject`, { reason })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['recruitment-dashboard'] });
            showToast('Application rejected');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to reject application', 'error'),
    });

    const blacklistCandidateMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason?: string }) => 
            (await api.patch(`/recruitment/candidates/${id}/blacklist`, { reason })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
            showToast('Candidate blacklisted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to blacklist candidate', 'error'),
    });

    const addCandidateNoteMutation = useMutation({
        mutationFn: async ({ candidateId, content }: { candidateId: string; content: string }) =>
            (await api.post(`/recruitment/candidates/${candidateId}/notes`, { content })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidate-notes'] });
            setNewNoteContent('');
            showToast('Note added');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to add note', 'error'),
    });

    const submitFeedbackMutation = useMutation({
        mutationFn: async ({ interviewId, data }: { interviewId: string; data: any }) =>
            (await api.patch(`/recruitment/interviews/${interviewId}/feedback`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews-upcoming'] });
            showToast('Feedback submitted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to submit feedback', 'error'),
    });

    const hireCandidateMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/staff/hire-candidate', data)).data,
        onSuccess: () => {
            setShowHireModal(false);
            setHireCandidate(null);
            setHireFormData({});
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
            showToast('Candidate hired successfully! Staff record created.');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to hire candidate', 'error'),
    });

    const getApplicationsByStage = (stageCode: string) => {
        return applications?.filter((app) => app.stage?.code === stageCode) || [];
    };

    const getMatchScoreColor = (score?: number) => {
        if (!score) return 'text-slate-400';
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getMatchScoreBg = (score?: number) => {
        if (!score) return 'bg-slate-100';
        if (score >= 80) return 'bg-green-100';
        if (score >= 60) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    const tabs = [
        { key: 'dashboard' as Tab, label: 'Dashboard', icon: TrendingUp },
        { key: 'jobs' as Tab, label: 'Job Posts', icon: Briefcase },
        { key: 'pipeline' as Tab, label: 'Pipeline', icon: Users },
        { key: 'candidates' as Tab, label: 'Candidates', icon: User },
        { key: 'interviews' as Tab, label: 'Interviews', icon: Calendar },
        { key: 'onboarding' as Tab, label: 'Onboarding', icon: CheckCircle },
    ];

    const completeTaskMutation = useMutation({
        mutationFn: ({ taskStatusId, notes }: { taskStatusId: string; notes?: string }) => api.patch(`/staff/onboarding/tasks/${taskStatusId}/complete`, { notes }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['onboarding-instances'] }); queryClient.invalidateQueries({ queryKey: ['onboarding-stats'] }); },
    });

    const toggleTemplate = (id: string) => { const n = new Set(expandedTemplates); if (n.has(id)) n.delete(id); else n.add(id); setExpandedTemplates(n); };
    const getOnboardingStatusColor = (status: string) => status === 'completed' ? 'text-green-600 bg-green-100' : status === 'skipped' ? 'text-gray-600 bg-gray-100' : 'text-amber-600 bg-amber-100';
    const getOnboardingStatusIcon = (status: string) => status === 'completed' ? <CheckCircle className="w-4 h-4" /> : status === 'skipped' ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />;

    const renderOnboarding = () => (
        <div className="space-y-6">
            {/* Onboarding Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><div className="flex items-center gap-3"><div className="p-3 bg-blue-100 rounded-lg"><User className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-slate-800">{onboardingStats?.total || 0}</p><p className="text-sm text-slate-500">Total</p></div></div></div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><div className="flex items-center gap-3"><div className="p-3 bg-amber-100 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold text-slate-800">{onboardingStats?.inProgress || 0}</p><p className="text-sm text-slate-500">In Progress</p></div></div></div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><div className="flex items-center gap-3"><div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold text-slate-800">{onboardingStats?.completed || 0}</p><p className="text-sm text-slate-500">Completed</p></div></div></div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><div className="flex items-center gap-3"><div className="p-3 bg-red-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div><div><p className="text-2xl font-bold text-slate-800">{onboardingStats?.overdue || 0}</p><p className="text-sm text-slate-500">Overdue</p></div></div></div>
            </div>

            {/* In Progress Onboarding */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200"><h2 className="font-semibold text-slate-900">In-Progress Onboarding</h2></div>
                {onboardingInstances.length === 0 ? (
                    <div className="p-12 text-center"><User className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-600">No onboarding in progress</p></div>
                ) : (
                    <div className="divide-y divide-slate-100">{onboardingInstances.map((instance) => (
                        <div key={instance.id} className="p-4 hover:bg-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-medium">{instance.staff.first_name[0]}{instance.staff.last_name[0]}</div>
                                    <div><p className="font-medium text-slate-900">{instance.staff.first_name} {instance.staff.last_name}</p><p className="text-sm text-slate-500">{instance.template.name}</p></div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right"><p className="text-sm font-medium text-slate-900">{instance.progress_percentage}%</p><p className="text-xs text-slate-500">Complete</p></div>
                                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-[#0066B3] rounded-full" style={{ width: `${instance.progress_percentage}%` }} /></div>
                                    <button onClick={() => setSelectedOnboardingInstance(instance)} className="px-3 py-1.5 text-sm text-[#0066B3] hover:bg-blue-50 rounded-lg">View Tasks</button>
                                </div>
                            </div>
                        </div>
                    ))}</div>
                )}
            </div>

            {/* Templates */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200"><h2 className="font-semibold text-slate-900">Onboarding Templates</h2></div>
                <div className="divide-y divide-slate-100">{onboardingTemplates.map((template) => (
                    <div key={template.id} className="p-4">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleTemplate(template.id)}>
                            <div className="flex items-center gap-3"><FileText className="text-slate-400" size={20} /><div><p className="font-medium text-slate-900">{template.name}</p><p className="text-sm text-slate-500">{template.tasks.length} tasks</p></div></div>
                            <ChevronDown className={`text-slate-400 transition-transform ${expandedTemplates.has(template.id) ? 'rotate-180' : ''}`} size={20} />
                        </div>
                        {expandedTemplates.has(template.id) && (
                            <div className="mt-4 pl-9 space-y-2">{template.tasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg"><span className="w-6 h-6 flex items-center justify-center bg-slate-200 rounded-full text-xs font-medium text-slate-600">{task.order}</span><div><p className="text-sm font-medium text-slate-700">{task.name}</p><p className="text-xs text-slate-500">{task.estimated_days} day(s) - {task.category}</p></div></div>
                            ))}</div>
                        )}
                    </div>
                ))}</div>
            </div>

            {/* Task Detail Modal */}
            {selectedOnboardingInstance && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div><h2 className="text-lg font-semibold text-slate-900">{selectedOnboardingInstance.staff.first_name} {selectedOnboardingInstance.staff.last_name}</h2><p className="text-sm text-slate-500">{selectedOnboardingInstance.template.name}</p></div>
                            <button onClick={() => setSelectedOnboardingInstance(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="space-y-3">{selectedOnboardingInstance.taskStatuses.map((ts) => (
                                <div key={ts.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                                    <div className="flex items-center gap-3"><span className={`p-1.5 rounded-full ${getOnboardingStatusColor(ts.status)}`}>{getOnboardingStatusIcon(ts.status)}</span><div><p className="font-medium text-slate-900">{ts.task.name}</p><p className="text-xs text-slate-500">{ts.task.category}</p></div></div>
                                    {ts.status === 'pending' && <button onClick={() => completeTaskMutation.mutate({ taskStatusId: ts.id })} className="px-3 py-1.5 bg-[#0066B3] text-white text-sm rounded-lg hover:bg-[#005299]">Complete</button>}
                                    {ts.status === 'completed' && <span className="text-xs text-slate-500">Completed {ts.completed_at && new Date(ts.completed_at).toLocaleDateString()}</span>}
                                </div>
                            ))}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderJobs = () => {
        const publishedJobs = jobs?.filter(j => j.status === 'published') || [];
        const draftJobs = jobs?.filter(j => j.status === 'draft') || [];
        const closedJobs = jobs?.filter(j => j.status === 'closed') || [];
        const totalApplicants = jobs?.reduce((sum, j) => sum + (j.applications_count || 0), 0) || 0;

        return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg"><Briefcase className="text-green-600" size={20} /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{publishedJobs.length}</p><p className="text-xs text-slate-500">Published Jobs</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-100 rounded-lg"><FileText className="text-slate-600" size={20} /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{draftJobs.length}</p><p className="text-xs text-slate-500">Drafts</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg"><Clock className="text-amber-600" size={20} /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{closedJobs.length}</p><p className="text-xs text-slate-500">Closed</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg"><Users className="text-blue-600" size={20} /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{totalApplicants}</p><p className="text-xs text-slate-500">Total Applicants</p></div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search jobs by title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'published', 'draft', 'closed'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setJobStatusFilter(f)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${jobStatusFilter === f
                                    ? 'border-[#0066B3] bg-blue-50 text-[#0066B3]'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                {f === 'all' ? 'All' : f === 'published' ? 'Published' : f === 'draft' ? 'Drafts' : 'Closed'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Jobs List */}
            <div className="grid gap-4">
                {jobs?.filter(j => j.title.toLowerCase().includes(searchQuery.toLowerCase()) && (jobStatusFilter === 'all' || j.status === jobStatusFilter)).map((job) => (
                    <div key={job.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                                    {job.is_urgent && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">Urgent</span>
                                    )}
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${job.status === 'published' ? 'bg-green-100 text-green-700' :
                                        job.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                        {job.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                                    <span className="flex items-center gap-1">
                                        <Building size={14} />
                                        {job.department?.name || 'No department'}
                                    </span>
                                    {job.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin size={14} />
                                            {job.location}
                                        </span>
                                    )}
                                    {job.is_remote && (
                                        <span className="flex items-center gap-1 text-blue-600">
                                            <Globe size={14} />
                                            Remote
                                        </span>
                                    )}
                                    {job.is_internal_only && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                            Internal Only
                                        </span>
                                    )}
                                    <span className="capitalize">{job.employment_type?.replace('_', ' ')}</span>
                                </div>
                                {job.salary_min && job.salary_max && (
                                    <div className="flex items-center gap-1 text-sm text-slate-600">
                                        <DollarSign size={14} />
                                        KES {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                                    <span className="flex items-center gap-1">
                                        <Eye size={14} />
                                        {job.views_count || 0} views
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users size={14} />
                                        {job.applications_count || 0} applicants
                                    </span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <a
                                        href={`${api.defaults.baseURL}/recruitment/jobs/${job.id}/jd/preview`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 flex items-center gap-1"
                                    >
                                        <FileText size={14} /> JD PDF
                                    </a>
                                    {job.status === 'published' && (
                                        <button
                                            onClick={() => window.open(`/careers/${job.id}`, '_blank')}
                                            className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 flex items-center gap-1"
                                        >
                                            <ExternalLink size={14} /> View Public Page
                                        </button>
                                    )}
                                    {job.status !== 'closed' && (
                                        <button
                                            onClick={() => { setEditingJob(job); setJobFormData({ title: job.title, department_id: job.department?.name, employment_type: job.employment_type, experience_level: (job as any).experience_level, salary_min: job.salary_min, salary_max: job.salary_max, location: job.location, is_urgent: job.is_urgent, is_remote: job.is_remote, is_internal_only: job.is_internal_only, description: (job as any).description, responsibilities: (job as any).responsibilities, requirements: (job as any).requirements, benefits: (job as any).benefits, required_skills: (job as any).required_skills, preferred_skills: (job as any).preferred_skills, deadline: job.deadline?.split('T')[0] }); setShowJobModal(true); }}
                                            className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 flex items-center gap-1"
                                        >
                                            <Edit size={14} /> Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setAtsJobId(job.id); setAtsJobTitle(job.title); }}
                                        className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-lg hover:bg-purple-100 flex items-center gap-1 border border-purple-200"
                                    >
                                        <Filter size={14} /> ATS
                                    </button>
                                    {job.status === 'draft' && (
                                        <button
                                            onClick={() => publishJobMutation.mutate(job.id)}
                                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                                        >
                                            Publish
                                        </button>
                                    )}
                                    {job.status === 'published' && (
                                        <button
                                            onClick={() => closeJobMutation.mutate(job.id)}
                                            className="px-3 py-1 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600"
                                        >
                                            Close
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setSelectedJob(job.id); setActiveTab('pipeline'); }}
                                        className="px-3 py-1 bg-[#0066B3] text-white text-sm rounded-lg hover:bg-[#005299]"
                                    >
                                        View Pipeline
                                    </button>
                                    {job.status === 'draft' && (
                                        <button
                                            onClick={() => setDeleteJobId(job.id)}
                                            className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {jobsLoading && <p className="text-center text-slate-400 py-8">Loading jobs...</p>}
                {jobs?.length === 0 && !jobsLoading && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <Briefcase className="mx-auto mb-3 text-slate-300" size={48} />
                        <p className="text-slate-500">No job posts yet</p>
                        <button
                            onClick={() => setShowJobModal(true)}
                            className="mt-3 text-[#0066B3] font-medium hover:underline"
                        >
                            Create your first job post
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
    };

    const renderPipeline = () => {
        const totalInPipeline = applications?.length || 0;
        const starredApps = applications?.filter(a => a.is_starred)?.length || 0;
        const avgScore = totalInPipeline > 0 ? Math.round((applications?.reduce((sum, a) => sum + (a.match_score || 0), 0) || 0) / totalInPipeline) : 0;

        return (
        <div className="space-y-4">
            {/* Pipeline Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-lg"><Users className="text-blue-600" size={18} /></div>
                    <div><p className="text-xl font-bold text-slate-900">{totalInPipeline}</p><p className="text-xs text-slate-500">In Pipeline</p></div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-100 rounded-lg"><Star className="text-yellow-600" size={18} /></div>
                    <div><p className="text-xl font-bold text-slate-900">{starredApps}</p><p className="text-xs text-slate-500">Starred</p></div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-green-100 rounded-lg"><TrendingUp className="text-green-600" size={18} /></div>
                    <div><p className="text-xl font-bold text-slate-900">{avgScore}%</p><p className="text-xs text-slate-500">Avg Match</p></div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 rounded-lg"><Briefcase className="text-purple-600" size={18} /></div>
                    <div><p className="text-xl font-bold text-slate-900">{stages?.length || 0}</p><p className="text-xs text-slate-500">Stages</p></div>
                </div>
            </div>

            {/* Job Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Filter by Job</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedJob(null)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg border-2 transition-all ${selectedJob === null
                            ? 'border-[#0066B3] bg-blue-50 text-[#0066B3]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                    >
                        <p className="font-medium text-sm">All Jobs</p>
                        <p className="text-xs">{applications?.length || 0} apps</p>
                    </button>
                    {jobs?.filter(j => j.status === 'published').map((job) => (
                        <button
                            key={job.id}
                            onClick={() => setSelectedJob(job.id)}
                            className={`flex-shrink-0 px-4 py-2 rounded-lg border-2 transition-all min-w-[160px] ${selectedJob === job.id
                                ? 'border-[#0066B3] bg-blue-50 text-[#0066B3]'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                        >
                            <p className="font-medium text-sm truncate">{job.title}</p>
                            <p className="text-xs">{job.applications_count || 0} apps</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
                {stages?.filter(s => !s.is_terminal || s.code === 'HIRED' || s.code === 'REJECTED').slice(0, 6).map((stage) => {
                    const stageApps = getApplicationsByStage(stage.code);
                    return (
                        <div key={stage.code} className="bg-slate-50 rounded-xl p-4 min-w-[280px]">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                                <h4 className="font-semibold text-slate-700">{stage.name}</h4>
                                <span className="ml-auto bg-slate-200 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
                                    {stageApps.length}
                                </span>
                            </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {stageApps.map((app) => (
                                    <div
                                        key={app.id}
                                        className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => { setSelectedApplication(app); setShowApplicationModal(true); }}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-sm font-bold">
                                                    {app.candidate?.first_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">
                                                        {app.candidate?.first_name} {app.candidate?.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{app.candidate?.current_title || 'No title'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    starMutation.mutate({ id: app.id, starred: !app.is_starred });
                                                }}
                                                className="p-1 hover:bg-slate-100 rounded"
                                            >
                                                {app.is_starred ? (
                                                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                                ) : (
                                                    <StarOff size={16} className="text-slate-300" />
                                                )}
                                            </button>
                                        </div>

                                        <p className="text-xs text-slate-500 mb-2 truncate">{app.jobPost?.title}</p>

                                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                                            <Mail size={12} />
                                            <span className="truncate">{app.candidate?.email}</span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMatchScoreBg(app.match_score)} ${getMatchScoreColor(app.match_score)}`}>
                                                {app.match_score || 0}% match
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {app.recruiter_rating && (
                                                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                                                        <Star size={10} className="fill-amber-400" />{app.recruiter_rating}
                                                    </span>
                                                )}
                                                {app.candidate?.years_of_experience && (
                                                    <span className="text-xs text-slate-400">
                                                        {app.candidate.years_of_experience}y
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {!stage.is_terminal && (
                                            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
                                                {stages?.filter(s => s.position > stage.position && !s.is_terminal).slice(0, 2).map((nextStage) => (
                                                    <button
                                                        key={nextStage.code}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateStageMutation.mutate({ id: app.id, stageCode: nextStage.code });
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                                                    >
                                                        <ChevronRight size={12} />
                                                        {nextStage.name}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedApplication(app);
                                                        setShowInterviewModal(true);
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                >
                                                    <Calendar size={12} />
                                                    Interview
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        rejectApplicationMutation.mutate({ id: app.id });
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors ml-auto"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {stageApps.length === 0 && (
                                    <p className="text-center text-slate-400 text-sm py-6">No candidates</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Users className="text-[#0066B3]" />
                        Recruitment & ATS
                    </h1>
                    <p className="text-slate-500">Applicant Tracking System</p>
                </div>
                <button
                    onClick={() => setShowJobModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] transition-all shadow-lg"
                >
                    <Plus size={20} />
                    Post New Job
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                                ? 'bg-[#0066B3] text-white shadow-lg'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-[#0066B3]'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {activeTab === 'dashboard' && <RecruitmentMetrics />}
            {activeTab === 'jobs' && renderJobs()}
            {activeTab === 'pipeline' && renderPipeline()}
            {activeTab === 'candidates' && (
                <div className="space-y-4">
                    {/* Search and Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, skills..."
                                    value={candidateSearch}
                                    onChange={(e) => setCandidateSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={18} className="text-slate-400" />
                                <select
                                    value={candidateStatusFilter}
                                    onChange={(e) => setCandidateStatusFilter(e.target.value)}
                                    className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="hired">Hired</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="withdrawn">Withdrawn</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-3 text-sm text-slate-500">
                            {candidatesLoading ? 'Loading...' : `${candidates?.length || 0} candidates found`}
                        </div>
                    </div>

                    {/* Candidates Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {candidates?.map((candidate) => (
                            <div
                                key={candidate.id}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => { setSelectedCandidate(candidate); setShowCandidateModal(true); }}
                            >
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                        {candidate.first_name?.charAt(0)}{candidate.last_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 truncate group-hover:text-[#0066B3] transition-colors">
                                            {candidate.first_name} {candidate.last_name}
                                        </h3>
                                        <p className="text-sm text-slate-500 truncate">{candidate.current_title || 'No title'}</p>
                                        {candidate.current_company && (
                                            <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                                <Building size={12} />
                                                {candidate.current_company}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${candidate.status === 'active' ? 'bg-green-100 text-green-700' :
                                        candidate.status === 'hired' ? 'bg-blue-100 text-blue-700' :
                                            candidate.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-700'
                                        }`}>
                                        {candidate.status}
                                    </span>
                                </div>

                                {/* Contact */}
                                <div className="space-y-1.5 mb-4 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Mail size={14} className="text-slate-400 flex-shrink-0" />
                                        <span className="truncate">{candidate.email}</span>
                                    </div>
                                    {candidate.phone && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone size={14} className="text-slate-400 flex-shrink-0" />
                                            <span>{candidate.phone}</span>
                                        </div>
                                    )}
                                    {(candidate.city || candidate.country) && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                            <span className="truncate">{[candidate.city, candidate.country].filter(Boolean).join(', ')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Experience & Score */}
                                <div className="flex items-center justify-between mb-4 text-sm">
                                    {candidate.years_of_experience && (
                                        <span className="flex items-center gap-1 text-slate-600">
                                            <Award size={14} className="text-slate-400" />
                                            {candidate.years_of_experience} yrs exp
                                        </span>
                                    )}
                                    {candidate.overall_score && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${candidate.overall_score >= 80 ? 'bg-green-100 text-green-700' :
                                            candidate.overall_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                            {candidate.overall_score}% score
                                        </span>
                                    )}
                                </div>

                                {/* Skills */}
                                {candidate.skills && candidate.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {candidate.skills.slice(0, 4).map((skill) => (
                                            <span key={skill} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                                                {skill}
                                            </span>
                                        ))}
                                        {candidate.skills.length > 4 && (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                                                +{candidate.skills.length - 4}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Tags */}
                                {candidate.tags && candidate.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {candidate.tags.slice(0, 3).map((tag) => (
                                            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-[#0066B3] text-xs rounded border border-blue-100">
                                                <Tag size={10} />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Hire Button */}
                                {candidate.status === 'active' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHireCandidate(candidate);
                                            setHireFormData({
                                                candidate_first_name: candidate.first_name,
                                                candidate_last_name: candidate.last_name,
                                                candidate_email: candidate.email,
                                                candidate_phone: candidate.phone,
                                            });
                                            setShowHireModal(true);
                                        }}
                                        className="w-full mb-3 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={14} /> Hire as Staff
                                    </button>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                                    <span className="capitalize flex items-center gap-1">
                                        Source: {candidate.source?.replace('_', ' ')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {candidate.linkedin_url && (
                                            <a
                                                href={candidate.linkedin_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                        {candidate.resume_url && (
                                            <a
                                                href={api.defaults.baseURL + candidate.resume_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                                            >
                                                <FileText size={14} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {!candidatesLoading && candidates?.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                            <Users className="mx-auto mb-3 text-slate-300" size={48} />
                            <p className="text-slate-500 mb-2">No candidates found</p>
                            <p className="text-sm text-slate-400">Candidates will appear here when they apply to your job posts</p>
                        </div>
                    )}

                    {/* Loading State */}
                    {candidatesLoading && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 animate-pulse">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-200" />
                                        <div className="flex-1">
                                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-slate-200 rounded w-1/2" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 bg-slate-200 rounded w-full" />
                                        <div className="h-3 bg-slate-200 rounded w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'interviews' && (
                <div className="space-y-6">
                    {/* Interview Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-lg"><Calendar className="text-blue-600" size={20} /></div>
                                <div><p className="text-2xl font-bold text-slate-900">{interviews?.length || 0}</p><p className="text-xs text-slate-500">Total Scheduled</p></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-100 rounded-lg"><Video className="text-green-600" size={20} /></div>
                                <div><p className="text-2xl font-bold text-slate-900">{interviews?.filter(i => i.type === 'video')?.length || 0}</p><p className="text-xs text-slate-500">Video Interviews</p></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-100 rounded-lg"><MapPin className="text-purple-600" size={20} /></div>
                                <div><p className="text-2xl font-bold text-slate-900">{interviews?.filter(i => i.type !== 'video')?.length || 0}</p><p className="text-xs text-slate-500">In-Person</p></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-100 rounded-lg"><Clock className="text-amber-600" size={20} /></div>
                                <div><p className="text-2xl font-bold text-slate-900">{interviews?.filter(i => new Date(i.scheduled_at) <= new Date(Date.now() + 24*60*60*1000))?.length || 0}</p><p className="text-xs text-slate-500">Today/Tomorrow</p></div>
                            </div>
                        </div>
                    </div>

                    {/* Header with toggle */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-slate-800">Interviews</h3>
                            <div className="flex bg-slate-100 rounded-lg p-0.5">
                                <button onClick={() => setInterviewView('upcoming')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${interviewView === 'upcoming' ? 'bg-white text-[#0066B3] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Upcoming</button>
                                <button onClick={() => setInterviewView('past')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${interviewView === 'past' ? 'bg-white text-[#0066B3] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Past</button>
                            </div>
                        </div>
                        <span className="text-sm text-slate-500">{interviews?.length || 0} Total</span>
                    </div>

                    {/* Interviews List */}
                    <div className="grid gap-4">
                        {(interviews || [])
                            .filter(i => interviewView === 'upcoming'
                                ? new Date(i.scheduled_at) >= new Date()
                                : new Date(i.scheduled_at) < new Date()
                            )
                            .sort((a, b) => interviewView === 'upcoming'
                                ? new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                                : new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
                            )
                            .map((interview) => {
                                const isPast = new Date(interview.scheduled_at) < new Date();
                                const isToday = new Date(interview.scheduled_at).toDateString() === new Date().toDateString();
                                const outcomeColors: Record<string, string> = {
                                    passed: 'bg-green-100 text-green-700',
                                    failed: 'bg-red-100 text-red-700',
                                    on_hold: 'bg-amber-100 text-amber-700',
                                    pending: 'bg-slate-100 text-slate-600',
                                };
                                return (
                            <div key={interview.id} className={`bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${isToday ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border shadow-sm flex-shrink-0 ${isToday ? 'bg-blue-600 text-white border-blue-700' : isPast ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                            <span className="text-xs font-bold uppercase">{new Date(interview.scheduled_at).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-2xl font-bold">{new Date(interview.scheduled_at).getDate()}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-slate-900">{interview.title}</h4>
                                                {isToday && <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded animate-pulse">TODAY</span>}
                                                {interview.outcome && interview.outcome !== 'pending' && (
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${outcomeColors[interview.outcome] || outcomeColors.pending}`}>
                                                        {interview.outcome.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600 mt-0.5">
                                                <span className="font-medium text-slate-800">
                                                    {interview.application?.candidate?.first_name} {interview.application?.candidate?.last_name}
                                                </span>
                                                <span className="text-slate-300">•</span>
                                                <span className="truncate">{interview.application?.jobPost?.title}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                                                    <Clock size={12} />
                                                    {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({interview.duration_minutes}m)
                                                </span>
                                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                                                    {interview.type === 'video' ? <Video size={12} /> : <MapPin size={12} />}
                                                    {interview.type === 'video' ? 'Video Call' : interview.location || 'In-Person'}
                                                </span>
                                                {interview.interviewers?.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Users size={12} /> {interview.interviewers.length} Interviewer{interview.interviewers.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {interview.overall_rating && (
                                                    <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                                                        <Star size={12} className="fill-amber-400" /> {interview.overall_rating}/5
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {interview.video_link && !isPast && (
                                            <a href={interview.video_link} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2 shadow-sm transition-colors">
                                                <Video size={16} /> Join
                                            </a>
                                        )}
                                        {!interview.feedback && (
                                            <button
                                                onClick={() => { setFeedbackInterviewId(interview.id); setFeedbackData({ overall_rating: 0, feedback: '', outcome: 'pending' }); }}
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm flex items-center gap-2 shadow-sm"
                                            >
                                                <CheckCircle size={16} /> Feedback
                                            </button>
                                        )}
                                        {interview.feedback && (
                                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg flex items-center gap-1 border border-emerald-200">
                                                <CheckCircle size={14} /> Done
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                                );
                            })}
                        {(interviews || []).filter(i => interviewView === 'upcoming' ? new Date(i.scheduled_at) >= new Date() : new Date(i.scheduled_at) < new Date()).length === 0 && (
                            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                                <Calendar className="mx-auto mb-3 text-slate-300" size={48} />
                                <p className="text-slate-500">{interviewView === 'upcoming' ? 'No upcoming interviews scheduled.' : 'No past interviews found.'}</p>
                                {interviewView === 'upcoming' && (
                                    <button onClick={() => setActiveTab('pipeline')} className="text-blue-600 font-medium text-sm mt-2 hover:underline">
                                        Go to pipeline to schedule one
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Interview Feedback Modal */}
                    {feedbackInterviewId && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                                    <h2 className="text-lg font-bold text-slate-900">Submit Interview Feedback</h2>
                                    <button onClick={() => setFeedbackInterviewId(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
                                        <select value={feedbackData.outcome} onChange={(e) => setFeedbackData({ ...feedbackData, outcome: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="pending">Pending Decision</option>
                                            <option value="passed">Passed</option>
                                            <option value="failed">Failed</option>
                                            <option value="on_hold">On Hold</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((n) => (
                                                <button key={n} onClick={() => setFeedbackData({ ...feedbackData, overall_rating: n })} className={`w-10 h-10 rounded-lg border-2 text-sm font-bold transition-all ${feedbackData.overall_rating >= n ? 'border-[#0066B3] bg-blue-50 text-[#0066B3]' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Feedback</label>
                                        <textarea value={feedbackData.feedback} onChange={(e) => setFeedbackData({ ...feedbackData, feedback: e.target.value })} rows={4} placeholder="Your assessment of the candidate..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0066B3] focus:border-transparent" />
                                    </div>
                                </div>
                                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                                    <button onClick={() => setFeedbackInterviewId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                                    <button
                                        onClick={() => { submitFeedbackMutation.mutate({ interviewId: feedbackInterviewId, data: feedbackData }); setFeedbackInterviewId(null); }}
                                        disabled={!feedbackData.feedback.trim() || feedbackData.overall_rating === 0}
                                        className="px-6 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50"
                                    >
                                        Submit Feedback
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'onboarding' && renderOnboarding()}

            {/* Create Job Modal */}
            {showJobModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">{editingJob ? 'Edit Job Post' : 'Create Job Post'}</h2>
                            <button onClick={() => { setShowJobModal(false); setEditingJob(null); setJobFormData({}); }} className="p-2 hover:bg-white rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-5">
                            {/* ── SECTION 1: BASIC INFO ── */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Basic Information</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
                                    <input type="text" value={jobFormData.title || ''} onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })} placeholder="e.g., Senior Software Engineer" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:border-transparent" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                                        <select value={jobFormData.position_id || ''} onChange={(e) => setJobFormData({ ...jobFormData, position_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="">Select position...</option>
                                            {positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                        <select value={jobFormData.department_id || ''} onChange={(e) => setJobFormData({ ...jobFormData, department_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="">Select department</option>
                                            {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                                        <select value={jobFormData.branch_id || ''} onChange={(e) => setJobFormData({ ...jobFormData, branch_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="">Select branch...</option>
                                            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                                        <select value={jobFormData.region_id || ''} onChange={(e) => setJobFormData({ ...jobFormData, region_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="">Select region...</option>
                                            {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                        <input type="text" value={jobFormData.location || ''} onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })} placeholder="e.g., Nairobi CBD" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type</label>
                                        <select value={jobFormData.employment_type || 'full_time'} onChange={(e) => setJobFormData({ ...jobFormData, employment_type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="full_time">Full Time</option>
                                            <option value="part_time">Part Time</option>
                                            <option value="contract">Contract</option>
                                            <option value="internship">Internship</option>
                                            <option value="temporary">Temporary</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Experience Level</label>
                                        <select value={jobFormData.experience_level || 'mid'} onChange={(e) => setJobFormData({ ...jobFormData, experience_level: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="entry">Entry Level</option>
                                            <option value="junior">Junior</option>
                                            <option value="mid">Mid-Level</option>
                                            <option value="senior">Senior</option>
                                            <option value="lead">Lead / Principal</option>
                                            <option value="executive">Executive</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Vacancies</label>
                                        <input type="number" min="1" value={jobFormData.vacancies || 1} onChange={(e) => setJobFormData({ ...jobFormData, vacancies: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Application Deadline</label>
                                        <input type="date" value={jobFormData.deadline || ''} onChange={(e) => setJobFormData({ ...jobFormData, deadline: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Expected Start Date</label>
                                        <input type="date" value={jobFormData.expected_start_date || ''} onChange={(e) => setJobFormData({ ...jobFormData, expected_start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-5 flex-wrap">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={jobFormData.is_urgent || false} onChange={(e) => setJobFormData({ ...jobFormData, is_urgent: e.target.checked })} className="w-4 h-4 text-[#0066B3] rounded" />
                                        <span className="text-sm text-slate-700">🔴 Urgent Hiring</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={jobFormData.is_remote || false} onChange={(e) => setJobFormData({ ...jobFormData, is_remote: e.target.checked })} className="w-4 h-4 text-[#0066B3] rounded" />
                                        <span className="text-sm text-slate-700">🌍 Remote</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={jobFormData.show_salary || false} onChange={(e) => setJobFormData({ ...jobFormData, show_salary: e.target.checked })} className="w-4 h-4 text-[#0066B3] rounded" />
                                        <span className="text-sm text-slate-700">Show Salary on JD</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={jobFormData.is_internal_only || false} onChange={(e) => setJobFormData({ ...jobFormData, is_internal_only: e.target.checked })} className="w-4 h-4 text-[#0066B3] rounded" />
                                        <span className="text-sm text-slate-700">Internal Only</span>
                                    </label>
                                </div>
                            </div>

                            {/* ── SECTION 2: SALARY ── */}
                            <div className="border-t border-slate-200 pt-4 space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><DollarSign size={14} /> Compensation</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Min Salary (KES)</label>
                                        <input type="number" value={jobFormData.salary_min || ''} onChange={(e) => setJobFormData({ ...jobFormData, salary_min: parseInt(e.target.value) || undefined })} placeholder="e.g., 80000" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Salary (KES)</label>
                                        <input type="number" value={jobFormData.salary_max || ''} onChange={(e) => setJobFormData({ ...jobFormData, salary_max: parseInt(e.target.value) || undefined })} placeholder="e.g., 150000" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                </div>
                            </div>

                            {/* ── SECTION 3: JOB DESCRIPTION CONTENT ── */}
                            <div className="border-t border-slate-200 pt-4 space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><FileText size={14} /> Job Description Content</h3>
                                <p className="text-xs text-slate-500">These fields populate the JD PDF document and are shown to applicants.</p>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Overview / Summary</label>
                                    <textarea value={jobFormData.description || ''} onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })} rows={3} placeholder="Describe the role, team, and impact..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Key Responsibilities</label>
                                    <textarea value={jobFormData.responsibilities || ''} onChange={(e) => setJobFormData({ ...jobFormData, responsibilities: e.target.value })} rows={4} placeholder="Enter each responsibility on a new line:&#10;- Lead the development team&#10;- Design system architecture&#10;- Conduct code reviews" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                    <p className="text-xs text-slate-400 mt-1">One per line. They appear as bullet points in the JD.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Requirements & Qualifications</label>
                                    <textarea value={jobFormData.requirements || ''} onChange={(e) => setJobFormData({ ...jobFormData, requirements: e.target.value })} rows={4} placeholder="Enter each requirement on a new line:&#10;- Bachelor's degree in Computer Science&#10;- 5+ years of experience in backend development&#10;- Strong communication skills" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Education Requirements</label>
                                    <input type="text" value={jobFormData.education_requirements || ''} onChange={(e) => setJobFormData({ ...jobFormData, education_requirements: e.target.value })} placeholder="e.g., Bachelor's degree in relevant field" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Benefits & What We Offer</label>
                                    <textarea value={jobFormData.benefits || ''} onChange={(e) => setJobFormData({ ...jobFormData, benefits: e.target.value })} rows={3} placeholder="Enter each benefit on a new line:&#10;- Medical & dental insurance&#10;- Annual performance bonus&#10;- Professional development budget" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                            </div>

                            {/* ── SECTION 4: SKILLS ── */}
                            <div className="border-t border-slate-200 pt-4 space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Award size={14} /> Skills</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills (comma-separated)</label>
                                    <input type="text" value={jobFormData.required_skills?.join(', ') || ''} onChange={(e) => setJobFormData({ ...jobFormData, required_skills: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="e.g., TypeScript, React, Node.js" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Preferred / Nice-to-Have Skills</label>
                                    <input type="text" value={jobFormData.preferred_skills?.join(', ') || ''} onChange={(e) => setJobFormData({ ...jobFormData, preferred_skills: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="e.g., Docker, AWS, GraphQL" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                            </div>

                            {/* ── SECTION 5: ATS SCREENING ── */}
                            <div className="border-t border-slate-200 pt-4 space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Filter size={14} /> ATS Auto-Screening
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Min Experience (years)</label>
                                        <input type="number" min="0" value={jobFormData.min_experience_years || ''} onChange={(e) => setJobFormData({ ...jobFormData, min_experience_years: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Min Education Level</label>
                                        <select value={jobFormData.min_education_level || 'any'} onChange={(e) => setJobFormData({ ...jobFormData, min_education_level: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="any">Any</option>
                                            <option value="high_school">High School</option>
                                            <option value="diploma">Diploma</option>
                                            <option value="bachelors">Bachelor's Degree</option>
                                            <option value="masters">Master's Degree</option>
                                            <option value="phd">PhD</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Required Certifications</label>
                                    <input type="text" value={jobFormData.required_certifications?.join(', ') || ''} onChange={(e) => setJobFormData({ ...jobFormData, required_certifications: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="e.g., CPA, ACCA, PMP" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Screening Keywords</label>
                                    <input type="text" value={jobFormData.screening_keywords?.join(', ') || ''} onChange={(e) => setJobFormData({ ...jobFormData, screening_keywords: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="Keywords to match in resume/cover letter" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Min Screening Score (%)</label>
                                        <input type="number" min="0" max="100" value={jobFormData.min_screening_score || 60} onChange={(e) => setJobFormData({ ...jobFormData, min_screening_score: parseInt(e.target.value) || 60 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Auto-Shortlist Above (%)</label>
                                        <input type="number" min="0" max="100" value={jobFormData.auto_shortlist_threshold || 80} onChange={(e) => setJobFormData({ ...jobFormData, auto_shortlist_threshold: parseInt(e.target.value) || 80 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-5 flex-wrap">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={jobFormData.enable_auto_screening !== false} onChange={(e) => setJobFormData({ ...jobFormData, enable_auto_screening: e.target.checked })} className="w-4 h-4 text-[#0066B3] rounded" />
                                        <span className="text-sm text-slate-700">Enable Auto-Screening</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={jobFormData.auto_reject_below_threshold || false} onChange={(e) => setJobFormData({ ...jobFormData, auto_reject_below_threshold: e.target.checked })} className="w-4 h-4 text-[#0066B3] rounded" />
                                        <span className="text-sm text-slate-700">Auto-Reject Below Min Score</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => { setShowJobModal(false); setEditingJob(null); setJobFormData({}); }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => editingJob
                                    ? updateJobMutation.mutate({ id: editingJob.id, data: jobFormData })
                                    : createJobMutation.mutate(jobFormData)
                                }
                                disabled={!jobFormData.title || createJobMutation.isPending || updateJobMutation.isPending}
                                className="px-6 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50"
                            >
                                {editingJob ? 'Save Changes' : 'Create Job Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Application Detail Modal */}
            {showApplicationModal && selectedApplication && (
                <ApplicationModal
                    applicationId={selectedApplication.id}
                    onClose={() => setShowApplicationModal(false)}
                    onScheduleInterview={() => setShowInterviewModal(true)}
                    onGenerateOffer={() => setShowOfferModal(true)}
                />
            )}

            {/* Interview Schedule Modal */}
            {showInterviewModal && selectedApplication && (
                <InterviewModal
                    applicationId={selectedApplication.id}
                    candidateName={`${selectedApplication.candidate?.first_name} ${selectedApplication.candidate?.last_name}`}
                    onClose={() => setShowInterviewModal(false)}
                />
            )}

            {/* Offer Modal */}
            {showOfferModal && selectedApplication && (
                <OfferModal
                    applicationId={selectedApplication.id}
                    candidateName={`${selectedApplication.candidate?.first_name} ${selectedApplication.candidate?.last_name}`}
                    jobTitle={selectedApplication.jobPost?.title || 'Unknown Role'}
                    onClose={() => setShowOfferModal(false)}
                />
            )}

            {/* Candidate Detail Modal */}
            {showCandidateModal && selectedCandidate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-lg font-bold">
                                    {selectedCandidate.first_name?.charAt(0)}{selectedCandidate.last_name?.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">
                                        {selectedCandidate.first_name} {selectedCandidate.last_name}
                                    </h2>
                                    <p className="text-sm text-slate-500">{selectedCandidate.current_title || 'No title'}</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowCandidateModal(false); setCandidateModalTab('profile'); }} className="p-2 hover:bg-white rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 px-6">
                            {([['profile', 'Profile'], ['notes', 'Notes'], ['applications', 'Applications']] as const).map(([key, label]) => (
                                <button key={key} onClick={() => setCandidateModalTab(key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${candidateModalTab === key ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                    {label} {key === 'notes' && candidateNotes.length > 0 ? `(${candidateNotes.length})` : key === 'applications' && candidateApplications.length > 0 ? `(${candidateApplications.length})` : ''}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {candidateModalTab === 'profile' && (<>
                            {/* Status & Source */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${selectedCandidate.status === 'active' ? 'bg-green-100 text-green-700' : selectedCandidate.status === 'hired' ? 'bg-blue-100 text-blue-700' : selectedCandidate.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {selectedCandidate.status}
                                </span>
                                <span className="text-sm text-slate-500">Source: <span className="capitalize">{selectedCandidate.source?.replace('_', ' ')}</span></span>
                                {selectedCandidate.overall_score && (
                                    <span className={`px-2 py-0.5 rounded text-sm font-medium ${selectedCandidate.overall_score >= 80 ? 'bg-green-100 text-green-700' : selectedCandidate.overall_score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {selectedCandidate.overall_score}% match score
                                    </span>
                                )}
                            </div>

                            {/* Contact */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><User size={18} className="text-slate-500" />Contact Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /><a href={`mailto:${selectedCandidate.email}`} className="text-blue-600 hover:underline">{selectedCandidate.email}</a></div>
                                    {selectedCandidate.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /><a href={`tel:${selectedCandidate.phone}`} className="text-slate-700">{selectedCandidate.phone}</a></div>}
                                    {(selectedCandidate.city || selectedCandidate.country) && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /><span className="text-slate-700">{[selectedCandidate.city, selectedCandidate.country].filter(Boolean).join(', ')}</span></div>}
                                    {selectedCandidate.linkedin_url && <div className="flex items-center gap-2"><ExternalLink size={14} className="text-slate-400" /><a href={selectedCandidate.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">LinkedIn Profile</a></div>}
                                </div>
                            </div>

                            {/* Professional */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Briefcase size={18} className="text-slate-500" />Professional Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {selectedCandidate.current_company && <div><span className="text-slate-500">Current Company</span><p className="font-medium text-slate-800">{selectedCandidate.current_company}</p></div>}
                                    {selectedCandidate.years_of_experience && <div><span className="text-slate-500">Experience</span><p className="font-medium text-slate-800">{selectedCandidate.years_of_experience} years</p></div>}
                                    {selectedCandidate.expected_salary && <div><span className="text-slate-500">Expected Salary</span><p className="font-medium text-slate-800">KES {selectedCandidate.expected_salary.toLocaleString()}</p></div>}
                                </div>
                            </div>

                            {/* Skills */}
                            {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Award size={18} className="text-slate-500" />Skills</h3>
                                    <div className="flex flex-wrap gap-2">{selectedCandidate.skills.map((skill) => (<span key={skill} className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg">{skill}</span>))}</div>
                                </div>
                            )}

                            {/* Tags */}
                            {selectedCandidate.tags && selectedCandidate.tags.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Tag size={18} className="text-slate-500" />Tags</h3>
                                    <div className="flex flex-wrap gap-2">{selectedCandidate.tags.map((tag) => (<span key={tag} className="px-3 py-1 bg-blue-50 border border-blue-200 text-[#0066B3] text-sm rounded-lg">{tag}</span>))}</div>
                                </div>
                            )}

                            {/* Resume */}
                            {selectedCandidate.resume_url && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3"><FileText size={18} className="text-slate-500" />Resume</h3>
                                    <a href={api.defaults.baseURL + selectedCandidate.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"><FileText size={16} />View Resume<ExternalLink size={14} /></a>
                                </div>
                            )}
                            </>)}

                            {candidateModalTab === 'notes' && (<>
                            {/* Add Note */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h3 className="font-semibold text-slate-800 mb-3">Add Note</h3>
                                <textarea
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    placeholder="Write a note about this candidate..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={() => { if (newNoteContent.trim()) addCandidateNoteMutation.mutate({ candidateId: selectedCandidate.id, content: newNoteContent.trim() }); }}
                                        disabled={!newNoteContent.trim() || addCandidateNoteMutation.isPending}
                                        className="px-4 py-2 bg-[#0066B3] text-white text-sm rounded-lg hover:bg-[#005299] disabled:opacity-50"
                                    >
                                        {addCandidateNoteMutation.isPending ? 'Saving...' : 'Add Note'}
                                    </button>
                                </div>
                            </div>

                            {/* Notes List */}
                            <div className="space-y-3">
                                {candidateNotes.length === 0 && (
                                    <div className="text-center py-8 text-slate-400"><FileText className="mx-auto mb-2" size={32} /><p>No notes yet</p></div>
                                )}
                                {candidateNotes.map((note) => (
                                    <div key={note.id} className="bg-white border border-slate-200 rounded-lg p-4">
                                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                            {note.author && <span className="font-medium text-slate-600">{note.author.first_name} {note.author.last_name}</span>}
                                            <span>{new Date(note.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            </>)}

                            {candidateModalTab === 'applications' && (<>
                            {candidateApplications.length === 0 ? (
                                <div className="text-center py-8 text-slate-400"><Briefcase className="mx-auto mb-2" size={32} /><p>No applications found</p></div>
                            ) : (
                                <div className="space-y-3">
                                    {candidateApplications.map((app: any) => (
                                        <div key={app.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-slate-900">{app.jobPost?.title || 'Unknown Position'}</h4>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${app.status === 'active' ? 'bg-green-100 text-green-700' : app.status === 'rejected' ? 'bg-red-100 text-red-700' : app.status === 'hired' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {app.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                {app.stage && <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: app.stage.color }} />{app.stage.name}</span>}
                                                <span>Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                                                {app.match_score && <span className={`font-medium ${app.match_score >= 80 ? 'text-green-600' : app.match_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{app.match_score}% match</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            </>)}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
                            {selectedCandidate.status !== 'blacklisted' && (
                                <button onClick={() => setBlacklistCandidateId(selectedCandidate.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium">Blacklist</button>
                            )}
                            <div className="flex-1" />
                            <button onClick={() => { setShowCandidateModal(false); setCandidateModalTab('profile'); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Job Dialog */}
            <ConfirmDialog
                isOpen={!!deleteJobId}
                title="Delete Job Post"
                message="Are you sure you want to delete this job post? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { if (deleteJobId) deleteJobMutation.mutate(deleteJobId); setDeleteJobId(null); }}
                onCancel={() => setDeleteJobId(null)}
                isLoading={deleteJobMutation.isPending}
            />

            {/* Blacklist Candidate Dialog */}
            <InputDialog
                isOpen={!!blacklistCandidateId}
                title="Blacklist Candidate"
                message="Please provide a reason for blacklisting this candidate."
                inputLabel="Reason"
                inputType="textarea"
                placeholder="Enter reason..."
                confirmLabel="Blacklist"
                onConfirm={(reason) => {
                    if (blacklistCandidateId) {
                        blacklistCandidateMutation.mutate({ id: blacklistCandidateId, reason });
                        setShowCandidateModal(false);
                    }
                    setBlacklistCandidateId(null);
                }}
                onCancel={() => setBlacklistCandidateId(null)}
                isLoading={blacklistCandidateMutation.isPending}
            />

            {/* Hire Candidate Modal */}
            {showHireModal && hireCandidate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Hire Candidate as Staff</h2>
                                <p className="text-sm text-slate-500">{hireCandidate.first_name} {hireCandidate.last_name} — {hireCandidate.email}</p>
                            </div>
                            <button onClick={() => { setShowHireModal(false); setHireCandidate(null); setHireFormData({}); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                                This will create a <strong>Staff record</strong> and <strong>User account</strong> for this candidate, trigger onboarding, and set them as probationary.
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Position *</label>
                                    <select value={hireFormData.position_id || ''} onChange={(e) => setHireFormData({ ...hireFormData, position_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                        <option value="">Select position...</option>
                                        {positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                                    <select value={hireFormData.role_id || ''} onChange={(e) => setHireFormData({ ...hireFormData, role_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                        <option value="">Select role...</option>
                                        {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                                    <select value={hireFormData.branch_id || ''} onChange={(e) => setHireFormData({ ...hireFormData, branch_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                        <option value="">Select branch...</option>
                                        {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                                    <select value={hireFormData.region_id || ''} onChange={(e) => setHireFormData({ ...hireFormData, region_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                        <option value="">Select region...</option>
                                        {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                    <select value={hireFormData.department_id || ''} onChange={(e) => setHireFormData({ ...hireFormData, department_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                        <option value="">Select department...</option>
                                        {(departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Basic Salary (KES)</label>
                                    <input type="number" value={hireFormData.basic_salary || ''} onChange={(e) => setHireFormData({ ...hireFormData, basic_salary: parseFloat(e.target.value) || undefined })} placeholder="Monthly salary" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                                    <input type="date" value={hireFormData.hire_date || ''} onChange={(e) => setHireFormData({ ...hireFormData, hire_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Probation (months)</label>
                                    <input type="number" value={hireFormData.probation_months || 3} onChange={(e) => setHireFormData({ ...hireFormData, probation_months: parseInt(e.target.value) || 3 })} min={1} max={12} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => { setShowHireModal(false); setHireCandidate(null); setHireFormData({}); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button
                                onClick={() => hireCandidateMutation.mutate(hireFormData)}
                                disabled={!hireFormData.position_id || !hireFormData.role_id || hireCandidateMutation.isPending}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {hireCandidateMutation.isPending ? 'Hiring...' : 'Hire & Create Staff Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ATS Manager Modal */}
            {atsJobId && (
                <ATSManager
                    jobId={atsJobId}
                    jobTitle={atsJobTitle}
                    onClose={() => { setAtsJobId(null); setAtsJobTitle(''); }}
                />
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
    );
};

export { RecruitmentPage };
export default RecruitmentPage;
