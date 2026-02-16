import React, { useState } from 'react';
import type { DragEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    Star, StarOff, Mail, GripVertical, Calendar, Phone,
    ChevronRight, User, Clock
} from 'lucide-react';

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

interface KanbanBoardProps {
    stages: Stage[];
    applications: Application[];
    onApplicationClick: (app: Application) => void;
    onScheduleInterview?: (app: Application) => void;
    onMakeOffer?: (app: Application) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
    stages,
    applications,
    onApplicationClick,
    onScheduleInterview,
    onMakeOffer,
}) => {
    const queryClient = useQueryClient();
    const [draggedApp, setDraggedApp] = useState<Application | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, stageCode }: { id: string; stageCode: string }) => {
            return api.patch(`/recruitment/applications/${id}/stage`, { stage_code: stageCode });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['recruitment-dashboard'] });
        },
        onError: (e: any) => console.error('Failed to update stage:', e),
    });

    const starMutation = useMutation({
        mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
            return api.patch(`/recruitment/applications/${id}/star`, { starred });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
        onError: (e: any) => console.error('Failed to update star:', e),
    });

    const handleDragStart = (e: DragEvent<HTMLDivElement>, app: Application) => {
        setDraggedApp(app);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', app.id);
        // Add drag styling
        const target = e.target as HTMLElement;
        setTimeout(() => {
            target.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
        setDraggedApp(null);
        setDragOverStage(null);
        const target = e.target as HTMLElement;
        target.style.opacity = '1';
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, stageCode: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStage(stageCode);
    };

    const handleDragLeave = () => {
        setDragOverStage(null);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, stageCode: string) => {
        e.preventDefault();
        setDragOverStage(null);

        if (draggedApp && draggedApp.stage?.code !== stageCode) {
            updateStageMutation.mutate({ id: draggedApp.id, stageCode });
        }
        setDraggedApp(null);
    };

    const getApplicationsByStage = (stageCode: string) => {
        return applications.filter((app) => app.stage?.code === stageCode);
    };

    const getMatchScoreColor = (score?: number) => {
        if (!score) return 'text-slate-400';
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const getMatchScoreBg = (score?: number) => {
        if (!score) return 'bg-slate-100';
        if (score >= 80) return 'bg-green-100';
        if (score >= 60) return 'bg-amber-100';
        return 'bg-red-100';
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Filter to show main pipeline stages
    const visibleStages = stages.filter(s => 
        !s.is_terminal || s.code === 'HIRED' || s.code === 'REJECTED'
    ).slice(0, 7);

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
            {visibleStages.map((stage) => {
                const stageApps = getApplicationsByStage(stage.code);
                const isDropTarget = dragOverStage === stage.code && draggedApp?.stage?.code !== stage.code;

                return (
                    <div
                        key={stage.code}
                        className={`flex-shrink-0 w-[320px] bg-slate-50 rounded-xl transition-all ${
                            isDropTarget ? 'ring-2 ring-[#0066B3] bg-blue-50' : ''
                        }`}
                        onDragOver={(e) => handleDragOver(e, stage.code)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stage.code)}
                    >
                        {/* Column Header */}
                        <div className="sticky top-0 bg-slate-50 p-4 border-b border-slate-200 rounded-t-xl z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: stage.color }}
                                    />
                                    <h3 className="font-semibold text-slate-700">{stage.name}</h3>
                                </div>
                                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {stageApps.length}
                                </span>
                            </div>
                        </div>

                        {/* Cards Container */}
                        <div className="p-3 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                            {stageApps.map((app) => (
                                <div
                                    key={app.id}
                                    draggable={!stage.is_terminal}
                                    onDragStart={(e) => handleDragStart(e, app)}
                                    onDragEnd={handleDragEnd}
                                    className={`bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group ${
                                        draggedApp?.id === app.id ? 'opacity-50' : ''
                                    } ${!stage.is_terminal ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                >
                                    {/* Drag Handle */}
                                    {!stage.is_terminal && (
                                        <div className="flex items-center justify-center py-1 border-b border-slate-100 text-slate-300 group-hover:text-slate-400">
                                            <GripVertical size={14} />
                                        </div>
                                    )}

                                    <div 
                                        className="p-4"
                                        onClick={() => onApplicationClick(app)}
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-sm font-bold">
                                                    {app.candidate?.first_name?.charAt(0)}
                                                    {app.candidate?.last_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm leading-tight">
                                                        {app.candidate?.first_name} {app.candidate?.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate max-w-[150px]">
                                                        {app.candidate?.current_title || 'No title'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    starMutation.mutate({ id: app.id, starred: !app.is_starred });
                                                }}
                                                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                                            >
                                                {app.is_starred ? (
                                                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                                ) : (
                                                    <StarOff size={16} className="text-slate-300 group-hover:text-slate-400" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Job Title */}
                                        <p className="text-xs text-[#0066B3] font-medium mb-2 truncate">
                                            {app.jobPost?.title}
                                        </p>

                                        {/* Contact Info */}
                                        <div className="space-y-1 mb-3">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Mail size={12} className="flex-shrink-0" />
                                                <span className="truncate">{app.candidate?.email}</span>
                                            </div>
                                            {app.candidate?.phone && (
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Phone size={12} className="flex-shrink-0" />
                                                    <span>{app.candidate.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMatchScoreBg(app.match_score)} ${getMatchScoreColor(app.match_score)}`}>
                                                {app.match_score || 0}% match
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                <Clock size={12} />
                                                {formatDate(app.applied_at)}
                                            </div>
                                        </div>

                                        {/* Experience & Skills */}
                                        {app.candidate?.years_of_experience && (
                                            <div className="text-xs text-slate-500 mb-2">
                                                {app.candidate.years_of_experience} years experience
                                            </div>
                                        )}

                                        {app.candidate?.skills && app.candidate.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {app.candidate.skills.slice(0, 3).map((skill) => (
                                                    <span 
                                                        key={skill} 
                                                        className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                                {app.candidate.skills.length > 3 && (
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded">
                                                        +{app.candidate.skills.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Quick Actions */}
                                        {!stage.is_terminal && (
                                            <div className="flex gap-2 pt-3 border-t border-slate-100">
                                                {stage.code === 'SHORTLISTED' && onScheduleInterview && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onScheduleInterview(app);
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        <Calendar size={12} />
                                                        Schedule
                                                    </button>
                                                )}
                                                {stage.code === 'FINAL_INTERVIEW' && onMakeOffer && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onMakeOffer(app);
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                    >
                                                        Make Offer
                                                    </button>
                                                )}
                                                {visibleStages
                                                    .filter(s => s.position > stage.position && !s.is_terminal)
                                                    .slice(0, 1)
                                                    .map((nextStage) => (
                                                        <button
                                                            key={nextStage.code}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateStageMutation.mutate({ id: app.id, stageCode: nextStage.code });
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                        >
                                                            <ChevronRight size={12} />
                                                            {nextStage.name}
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {stageApps.length === 0 && (
                                <div className={`text-center py-8 rounded-lg border-2 border-dashed ${
                                    isDropTarget ? 'border-[#0066B3] bg-blue-50' : 'border-slate-200'
                                }`}>
                                    <User className="mx-auto mb-2 text-slate-300" size={32} />
                                    <p className="text-sm text-slate-400">
                                        {isDropTarget ? 'Drop here' : 'No candidates'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default KanbanBoard;
