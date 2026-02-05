import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, User, Mail, Phone, MapPin, Calendar, MessageSquare, Tag, Send, FileText, Briefcase, ExternalLink, Download, Clock } from 'lucide-react';
import api from '../../lib/api';

interface ApplicationModalProps {
    applicationId: string;
    onClose: () => void;
    onScheduleInterview?: () => void;
    onGenerateOffer?: () => void;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({ applicationId, onClose, onScheduleInterview, onGenerateOffer }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'notes'>('overview');
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
    });

    // Mutate Tags
    const updateTagsMutation = useMutation({
        mutationFn: async (tags: string[]) => {
            return api.put(`/recruitment/candidates/${candidateId}`, { tags });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
        }
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
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
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
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <User size={18} /> Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notes' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <MessageSquare size={18} /> Notes & Activity
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
                                className="pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs w-32 focus:w-48 transition-all focus:ring-2 focus:ring-purple-200 focus:border-purple-300 outline-none"
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
                                            <FileText className="text-purple-500" /> Resume / CV
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
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
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
                                        className="px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center transition-colors"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Press Enter to send. Only visible to team members.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
