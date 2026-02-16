import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, User, Mail, Phone, MapPin, Calendar, MessageSquare, Tag, Send, FileText, Briefcase, ExternalLink, Download, Clock, Shield, CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import api from '../../lib/api';
import { BackgroundChecksPanel } from './BackgroundChecksPanel';

interface ApplicationModalProps {
    applicationId: string;
    onClose: () => void;
    onScheduleInterview?: () => void;
    onGenerateOffer?: () => void;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({ applicationId, onClose, onScheduleInterview, onGenerateOffer }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'screening' | 'background'>('overview');
    const [newNote, setNewNote] = useState('');
    const [newTag, setNewTag] = useState('');
    const queryClient = useQueryClient();

    // Fetch Application
    const { data: application, isLoading: appLoading } = useQuery({
        queryKey: ['application', applicationId],
        queryFn: async () => (await api.get(`/recruitment/applications/${applicationId}`)).data,
    });

    const candidateId = application?.candidate?.id;

    // Fetch Candidate (for tags)
    const { data: candidate } = useQuery({
        queryKey: ['candidate', candidateId],
        queryFn: async () => (await api.get(`/recruitment/candidates/${candidateId}`)).data,
        enabled: !!candidateId,
    });

    // Fetch Screening Result
    const { data: screeningResult, isLoading: screeningLoading } = useQuery({
        queryKey: ['screening-result', applicationId],
        queryFn: async () => (await api.get(`/recruitment/applications/${applicationId}/screening-result`)).data,
        enabled: !!applicationId,
    });

    // Screen Application Mutation
    const screenMutation = useMutation({
        mutationFn: async () => api.post(`/recruitment/applications/${applicationId}/screen`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['screening-result', applicationId] });
            queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
        },
        onError: (e: any) => console.error('Screen failed:', e),
    });

    // Fetch Notes
    const { data: notes, isLoading: notesLoading } = useQuery({
        queryKey: ['candidate-notes', candidateId],
        queryFn: async () => (await api.get(`/recruitment/candidates/${candidateId}/notes`)).data,
        enabled: !!candidateId,
    });

    // Mutate Notes
    const addNoteMutation = useMutation({
        mutationFn: async (content: string) => {
            return api.post(`/recruitment/candidates/${candidateId}/notes`, { content });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidate-notes', candidateId] });
            setNewNote('');
        },
        onError: (e: any) => console.error('Failed to add note:', e),
    });

    // Mutate Tags
    const updateTagsMutation = useMutation({
        mutationFn: async (tags: string[]) => {
            return api.put(`/recruitment/candidates/${candidateId}`, { tags });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
        },
        onError: (e: any) => console.error('Failed to update tags:', e),
    });

    const handleAddTag = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newTag.trim() || !candidate) return;
        const currentTags = candidate.tags || [];
        if (!currentTags.includes(newTag.trim())) {
            updateTagsMutation.mutate([...currentTags, newTag.trim()]);
        }
        setNewTag('');
    };

    const handleRemoveTag = (tag: string) => {
        if (!candidate) return;
        const currentTags = candidate.tags || [];
        updateTagsMutation.mutate(currentTags.filter((t: string) => t !== tag));
    };

    if (appLoading || !application) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-xl font-bold shadow-md">
                            {application.candidate?.first_name?.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">
                                {application.candidate?.first_name} {application.candidate?.last_name}
                            </h2>
                            <p className="text-slate-500 flex items-center gap-2">
                                <Briefcase size={14} />
                                {application.jobPost?.title}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${application.match_score > 80 ? 'bg-green-100 text-green-700' :
                                    application.match_score > 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                    {application.match_score}% Match
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onGenerateOffer && (
                            <button
                                onClick={onGenerateOffer}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-md transition-colors mr-2"
                            >
                                <FileText size={16} /> Generate Offer
                            </button>
                        )}
                        {onScheduleInterview && (
                            <button
                                onClick={onScheduleInterview}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-md transition-colors"
                            >
                                <Calendar size={16} /> Schedule Interview
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors ml-2">
                            <X size={24} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-slate-200 flex gap-4 bg-white">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-[#0066B3]' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <User size={18} /> Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notes' ? 'bg-blue-50 text-[#0066B3]' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <MessageSquare size={18} /> Notes & Activity
                    </button>
                    <button
                        onClick={() => setActiveTab('screening')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'screening' ? 'bg-blue-50 text-[#0066B3]' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <BarChart3 size={18} /> Screening Score
                    </button>
                    <button
                        onClick={() => setActiveTab('background')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'background' ? 'bg-blue-50 text-[#0066B3]' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Shield size={18} /> Background & References
                    </button>
                    {/* Tags Display */}
                    <div className="ml-auto flex items-center gap-2 overflow-x-auto">
                        {candidate?.tags?.map((tag: string) => (
                            <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 rounded-full"><X size={12} /></button>
                            </span>
                        ))}
                        <form onSubmit={handleAddTag} className="relative">
                            <Tag size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                className="pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs w-32 focus:w-48 transition-all focus:ring-2 focus:ring-blue-200 focus:border-[#0066B3] outline-none"
                                placeholder="Add tag..."
                                value={newTag}
                                onChange={e => setNewTag(e.target.value)}
                            />
                        </form>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    {activeTab === 'overview' && (
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                {/* Resume Section */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <FileText className="text-[#0066B3]" /> Resume / CV
                                        </h3>
                                        {application.candidate?.resume_url && (
                                            <a
                                                href={api.defaults.baseURL + application.candidate.resume_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <Download size={14} /> Download
                                            </a>
                                        )}
                                    </div>

                                    {application.candidate?.resume_url ? (
                                        <iframe
                                            src={api.defaults.baseURL + application.candidate.resume_url}
                                            className="w-full h-[500px] rounded-lg border border-slate-100 bg-slate-50"
                                            title="Resume"
                                        />
                                    ) : (
                                        <div className="h-32 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400">
                                            No resume uploaded
                                        </div>
                                    )}
                                </div>

                                {/* Experience Summary */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="font-bold text-slate-800 mb-4">Professional Background</h3>
                                    <p className="whitespace-pre-line text-slate-600">{application.candidate?.summary || "No summary provided."}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Contact Details</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <Mail size={18} className="text-slate-400" />
                                            <a href={`mailto:${application.candidate?.email}`} className="text-sm hover:text-blue-600 truncate">{application.candidate?.email}</a>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <Phone size={18} className="text-slate-400" />
                                            <span className="text-sm">{application.candidate?.phone || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <MapPin size={18} className="text-slate-400" />
                                            <span className="text-sm">{application.candidate?.address || application.candidate?.city || 'Location N/A'}</span>
                                        </div>
                                        {application.candidate?.linkedin_url && (
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <ExternalLink size={18} className="text-slate-400" />
                                                <a href={application.candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">LinkedIn Profile</a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {application.candidate?.skills?.map((skill: string) => (
                                            <span key={skill} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                                                {skill}
                                            </span>
                                        )) || <span className="text-sm text-slate-400">No skills listed</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'screening' && (
                        <div className="space-y-6">
                            {/* Screening Status Header */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Shield className="text-[#0066B3]" /> ATS Screening Result
                                    </h3>
                                    {!screeningResult && (
                                        <button
                                            onClick={() => screenMutation.mutate()}
                                            disabled={screenMutation.isPending}
                                            className="px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50"
                                        >
                                            {screenMutation.isPending ? 'Screening...' : 'Run Screening'}
                                        </button>
                                    )}
                                </div>

                                {screeningLoading ? (
                                    <div className="text-center py-8 text-slate-400">Loading screening results...</div>
                                ) : !screeningResult ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                        <AlertTriangle className="mx-auto text-amber-400 mb-2" size={32} />
                                        <p className="text-slate-600 font-medium">Not Yet Screened</p>
                                        <p className="text-slate-400 text-sm">Click "Run Screening" to evaluate this application</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Overall Score */}
                                        <div className="flex items-center gap-6 mb-6">
                                            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white ${
                                                screeningResult.percentage >= 80 ? 'bg-green-500' :
                                                screeningResult.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}>
                                                {Math.round(screeningResult.percentage)}%
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {screeningResult.status === 'passed' ? (
                                                        <CheckCircle className="text-green-500" size={24} />
                                                    ) : screeningResult.status === 'failed' ? (
                                                        <XCircle className="text-red-500" size={24} />
                                                    ) : (
                                                        <AlertTriangle className="text-amber-500" size={24} />
                                                    )}
                                                    <span className={`text-lg font-bold ${
                                                        screeningResult.status === 'passed' ? 'text-green-600' :
                                                        screeningResult.status === 'failed' ? 'text-red-600' : 'text-amber-600'
                                                    }`}>
                                                        {screeningResult.status?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600">{screeningResult.notes}</p>
                                                <p className="text-sm text-slate-400 mt-1">
                                                    Screened: {screeningResult.screened_at ? new Date(screeningResult.screened_at).toLocaleString() : 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Knockout Reasons */}
                                        {screeningResult.knockout_reasons?.length > 0 && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                                                    <XCircle size={16} /> Knockout Criteria Failed
                                                </h4>
                                                <ul className="space-y-2">
                                                    {screeningResult.knockout_reasons.map((ko: any, idx: number) => (
                                                        <li key={idx} className="text-sm text-red-700">
                                                            <strong>{ko.name}:</strong> {ko.reason}
                                                            <span className="text-red-500 ml-2">(Has: {ko.candidateValue}, Required: {ko.requiredValue})</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Score Breakdown */}
                                        {screeningResult.score_breakdown && (
                                            <div className="space-y-4">
                                                <h4 className="font-semibold text-slate-800">Score Breakdown</h4>
                                                
                                                {/* Experience */}
                                                <div className="bg-slate-50 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-slate-700">Experience</span>
                                                        <span className="text-sm text-slate-600">
                                                            {screeningResult.score_breakdown.experience?.score || 0} / {screeningResult.score_breakdown.experience?.max || 0}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-blue-500 h-2 rounded-full" 
                                                            style={{ width: `${(screeningResult.score_breakdown.experience?.score / screeningResult.score_breakdown.experience?.max) * 100 || 0}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">{screeningResult.score_breakdown.experience?.details}</p>
                                                </div>

                                                {/* Education */}
                                                <div className="bg-slate-50 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-slate-700">Education</span>
                                                        <span className="text-sm text-slate-600">
                                                            {screeningResult.score_breakdown.education?.score || 0} / {screeningResult.score_breakdown.education?.max || 0}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-purple-500 h-2 rounded-full" 
                                                            style={{ width: `${(screeningResult.score_breakdown.education?.score / screeningResult.score_breakdown.education?.max) * 100 || 0}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">{screeningResult.score_breakdown.education?.details}</p>
                                                </div>

                                                {/* Skills */}
                                                <div className="bg-slate-50 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-slate-700">Skills Match</span>
                                                        <span className="text-sm text-slate-600">
                                                            {screeningResult.score_breakdown.skills?.score || 0} / {screeningResult.score_breakdown.skills?.max || 0}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-green-500 h-2 rounded-full" 
                                                            style={{ width: `${(screeningResult.score_breakdown.skills?.score / screeningResult.score_breakdown.skills?.max) * 100 || 0}%` }}
                                                        />
                                                    </div>
                                                    {screeningResult.score_breakdown.skills?.matched?.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {screeningResult.score_breakdown.skills.matched.map((s: string) => (
                                                                <span key={s} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{s}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {screeningResult.score_breakdown.skills?.missing?.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {screeningResult.score_breakdown.skills.missing.map((s: string) => (
                                                                <span key={s} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{s}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Certifications */}
                                                <div className="bg-slate-50 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-slate-700">Certifications</span>
                                                        <span className="text-sm text-slate-600">
                                                            {screeningResult.score_breakdown.certifications?.score || 0} / {screeningResult.score_breakdown.certifications?.max || 0}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-amber-500 h-2 rounded-full" 
                                                            style={{ width: `${(screeningResult.score_breakdown.certifications?.score / screeningResult.score_breakdown.certifications?.max) * 100 || 0}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Keywords */}
                                                <div className="bg-slate-50 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-slate-700">Keywords</span>
                                                        <span className="text-sm text-slate-600">
                                                            {screeningResult.score_breakdown.keywords?.score || 0} / {screeningResult.score_breakdown.keywords?.max || 0}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div 
                                                            className="bg-cyan-500 h-2 rounded-full" 
                                                            style={{ width: `${(screeningResult.score_breakdown.keywords?.score / screeningResult.score_breakdown.keywords?.max) * 100 || 0}%` }}
                                                        />
                                                    </div>
                                                    {screeningResult.score_breakdown.keywords?.matched?.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {screeningResult.score_breakdown.keywords.matched.map((k: string) => (
                                                                <span key={k} className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full">{k}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
                                {notesLoading ? (
                                    <div className="text-center py-8 text-slate-400">Loading notes...</div>
                                ) : notes?.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                        <MessageSquare className="mx-auto text-slate-300 mb-2" size={32} />
                                        <p className="text-slate-500">No notes yet. Start the conversation!</p>
                                    </div>
                                ) : (
                                    notes?.map((note: any) => (
                                        <div key={note.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                                                {note.createdBy?.first_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-slate-900">
                                                        {note.createdBy?.first_name} {note.createdBy?.last_name}
                                                    </span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {new Date(note.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 whitespace-pre-wrap">{note.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-auto">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Add Internal Note</h4>
                                <div className="flex gap-2">
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Type your note here... (e.g. 'Good culture fit', 'Needs follow up')"
                                        rows={2}
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066B3] focus:border-transparent resize-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (newNote.trim()) addNoteMutation.mutate(newNote);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => { if (newNote.trim()) addNoteMutation.mutate(newNote); }}
                                        disabled={!newNote.trim() || addNoteMutation.isPending}
                                        className="px-4 bg-[#0066B3] text-white rounded-xl hover:bg-[#005299] disabled:opacity-50 flex items-center justify-center transition-colors"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Press Enter to send. Only visible to team members.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'background' && candidateId && (
                        <BackgroundChecksPanel
                            candidateId={candidateId}
                            candidateName={`${application.candidate?.first_name} ${application.candidate?.last_name}`}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
