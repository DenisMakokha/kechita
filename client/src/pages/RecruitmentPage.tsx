import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Plus, Briefcase, Users, Mail, ChevronRight, X, Search,
    Star, StarOff, Calendar, Clock, MapPin, DollarSign,
    Video, User, Eye, Phone, Filter, Tag, ExternalLink,
    Building, Globe, TrendingUp, FileText, Award
} from 'lucide-react';
import { ApplicationModal } from '../components/recruitment/ApplicationModal';
import { InterviewModal } from '../components/recruitment/InterviewModal';
import { RecruitmentMetrics } from '../components/recruitment/RecruitmentMetrics';
import { OfferModal } from '../components/recruitment/OfferModal';

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

type Tab = 'dashboard' | 'jobs' | 'pipeline' | 'candidates' | 'interviews';

export const RecruitmentPage: React.FC = () => {
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
    const queryClient = useQueryClient();

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
        },
    });

    const publishJobMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/recruitment/jobs/${id}/publish`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
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
    ];

    const renderJobs = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                    />
                </div>
            </div>

            <div className="grid gap-4">
                {jobs?.filter(j => j.title.toLowerCase().includes(searchQuery.toLowerCase())).map((job) => (
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
                                <div className="flex gap-2">
                                    {job.status === 'draft' && (
                                        <button
                                            onClick={() => publishJobMutation.mutate(job.id)}
                                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                                        >
                                            Publish
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setSelectedJob(job.id); setActiveTab('pipeline'); }}
                                        className="px-3 py-1 bg-[#0066B3] text-white text-sm rounded-lg hover:bg-[#005299]"
                                    >
                                        View Pipeline
                                    </button>
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

    const renderPipeline = () => (
        <div className="space-y-4">
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
                                            {app.candidate?.years_of_experience && (
                                                <span className="text-xs text-slate-400">
                                                    {app.candidate.years_of_experience} yrs exp
                                                </span>
                                            )}
                                        </div>

                                        {!stage.is_terminal && (
                                            <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
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
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                        <h3 className="font-semibold text-slate-800">Upcoming Interviews</h3>
                        <div className="text-sm text-slate-500">{interviews?.length || 0} Scheduled</div>
                    </div>

                    <div className="grid gap-4">
                        {interviews?.map((interview) => (
                            <div key={interview.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center w-16 h-16 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shadow-sm">
                                        <span className="text-xs font-bold uppercase">{new Date(interview.scheduled_at).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-2xl font-bold">{new Date(interview.scheduled_at).getDate()}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{interview.title}</h4>
                                        <div className="flex items-center gap-2 text-sm text-slate-600 mt-0.5">
                                            <span className="font-medium text-slate-800">
                                                {interview.application?.candidate?.first_name} {interview.application?.candidate?.last_name}
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span>{interview.application?.jobPost?.title}</span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                                                <Clock size={12} />
                                                {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({interview.duration_minutes}m)
                                            </span>
                                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                                                {interview.type === 'video' ? <Video size={12} /> : <MapPin size={12} />}
                                                {interview.type === 'video' ? 'Video Call' : interview.location}
                                            </span>
                                            {interview.interviewers?.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Users size={12} /> {interview.interviewers.length} Interviewers
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {interview.video_link && (
                                    <a
                                        href={interview.video_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
                                    >
                                        <Video size={16} /> Join
                                    </a>
                                )}
                            </div>
                        ))}
                        {interviews?.length === 0 && (
                            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                                <Calendar className="mx-auto mb-3 text-slate-300" size={48} />
                                <p className="text-slate-500">No upcoming interviews scheduled.</p>
                                <button onClick={() => setActiveTab('pipeline')} className="text-blue-600 font-medium text-sm mt-2 hover:underline">
                                    Go to pipeline to schedule one
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Job Modal */}
            {showJobModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">Create Job Post</h2>
                            <button onClick={() => setShowJobModal(false)} className="p-2 hover:bg-white rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
                                <input
                                    type="text"
                                    value={jobFormData.title || ''}
                                    onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                                    placeholder="e.g., Senior Software Engineer"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                    <select
                                        value={jobFormData.department_id || ''}
                                        onChange={(e) => setJobFormData({ ...jobFormData, department_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                    >
                                        <option value="">Select department</option>
                                        {departments?.map((dept: any) => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type</label>
                                    <select
                                        value={jobFormData.employment_type || 'full_time'}
                                        onChange={(e) => setJobFormData({ ...jobFormData, employment_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                    >
                                        <option value="full_time">Full Time</option>
                                        <option value="part_time">Part Time</option>
                                        <option value="contract">Contract</option>
                                        <option value="internship">Internship</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Salary (KES)</label>
                                    <input
                                        type="number"
                                        value={jobFormData.salary_min || ''}
                                        onChange={(e) => setJobFormData({ ...jobFormData, salary_min: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Salary (KES)</label>
                                    <input
                                        type="number"
                                        value={jobFormData.salary_max || ''}
                                        onChange={(e) => setJobFormData({ ...jobFormData, salary_max: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Job Description</label>
                                <textarea
                                    value={jobFormData.description || ''}
                                    onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills (comma-separated)</label>
                                <input
                                    type="text"
                                    value={jobFormData.required_skills?.join(', ') || ''}
                                    onChange={(e) => setJobFormData({ ...jobFormData, required_skills: e.target.value.split(',').map((s: string) => s.trim()) })}
                                    placeholder="e.g., TypeScript, React, Node.js"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={jobFormData.is_urgent || false}
                                        onChange={(e) => setJobFormData({ ...jobFormData, is_urgent: e.target.checked })}
                                        className="w-4 h-4 text-[#0066B3] rounded"
                                    />
                                    <span className="text-sm text-slate-700">Urgent Hiring</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={jobFormData.is_remote || false}
                                        onChange={(e) => setJobFormData({ ...jobFormData, is_remote: e.target.checked })}
                                        className="w-4 h-4 text-[#0066B3] rounded"
                                    />
                                    <span className="text-sm text-slate-700">Remote Position</span>
                                </label>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowJobModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => createJobMutation.mutate(jobFormData)}
                                disabled={!jobFormData.title || createJobMutation.isPending}
                                className="px-6 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50"
                            >
                                Create Job Post
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
                            <button onClick={() => setShowCandidateModal(false)} className="p-2 hover:bg-white rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Status & Source */}
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${selectedCandidate.status === 'active' ? 'bg-green-100 text-green-700' :
                                        selectedCandidate.status === 'hired' ? 'bg-blue-100 text-blue-700' :
                                            selectedCandidate.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-700'
                                    }`}>
                                    {selectedCandidate.status}
                                </span>
                                <span className="text-sm text-slate-500">
                                    Source: <span className="capitalize">{selectedCandidate.source?.replace('_', ' ')}</span>
                                </span>
                                {selectedCandidate.overall_score && (
                                    <span className={`px-2 py-0.5 rounded text-sm font-medium ${selectedCandidate.overall_score >= 80 ? 'bg-green-100 text-green-700' :
                                            selectedCandidate.overall_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-slate-100 text-slate-700'
                                        }`}>
                                        {selectedCandidate.overall_score}% match score
                                    </span>
                                )}
                            </div>

                            {/* Contact Information */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <User size={18} className="text-slate-500" />
                                    Contact Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" />
                                        <a href={`mailto:${selectedCandidate.email}`} className="text-blue-600 hover:underline">
                                            {selectedCandidate.email}
                                        </a>
                                    </div>
                                    {selectedCandidate.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-slate-400" />
                                            <a href={`tel:${selectedCandidate.phone}`} className="text-slate-700">
                                                {selectedCandidate.phone}
                                            </a>
                                        </div>
                                    )}
                                    {(selectedCandidate.city || selectedCandidate.country) && (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-400" />
                                            <span className="text-slate-700">
                                                {[selectedCandidate.city, selectedCandidate.country].filter(Boolean).join(', ')}
                                            </span>
                                        </div>
                                    )}
                                    {selectedCandidate.linkedin_url && (
                                        <div className="flex items-center gap-2">
                                            <ExternalLink size={14} className="text-slate-400" />
                                            <a href={selectedCandidate.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                                LinkedIn Profile
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Professional Information */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <Briefcase size={18} className="text-slate-500" />
                                    Professional Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {selectedCandidate.current_company && (
                                        <div>
                                            <span className="text-slate-500">Current Company</span>
                                            <p className="font-medium text-slate-800">{selectedCandidate.current_company}</p>
                                        </div>
                                    )}
                                    {selectedCandidate.years_of_experience && (
                                        <div>
                                            <span className="text-slate-500">Experience</span>
                                            <p className="font-medium text-slate-800">{selectedCandidate.years_of_experience} years</p>
                                        </div>
                                    )}
                                    {selectedCandidate.expected_salary && (
                                        <div>
                                            <span className="text-slate-500">Expected Salary</span>
                                            <p className="font-medium text-slate-800">KES {selectedCandidate.expected_salary.toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Skills */}
                            {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Award size={18} className="text-slate-500" />
                                        Skills
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCandidate.skills.map((skill) => (
                                            <span key={skill} className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {selectedCandidate.tags && selectedCandidate.tags.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Tag size={18} className="text-slate-500" />
                                        Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCandidate.tags.map((tag) => (
                                            <span key={tag} className="px-3 py-1 bg-blue-50 border border-blue-200 text-[#0066B3] text-sm rounded-lg">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resume */}
                            {selectedCandidate.resume_url && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                                        <FileText size={18} className="text-slate-500" />
                                        Resume
                                    </h3>
                                    <a
                                        href={api.defaults.baseURL + selectedCandidate.resume_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <FileText size={16} />
                                        View Resume
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowCandidateModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
