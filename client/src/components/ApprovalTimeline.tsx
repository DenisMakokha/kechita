import React from 'react';
import {
    CheckCircle, XCircle, Clock, Calendar, FileText,
    AlertTriangle, User, ArrowRight, RotateCcw, MessageSquare
} from 'lucide-react';

interface ApprovalStep {
    id: string;
    step_order: number;
    name?: string;
    approver_role_code?: string;
    is_final?: boolean;
}

interface ApprovalAction {
    id: string;
    step_order: number;
    action: 'approved' | 'rejected' | 'returned' | 'delegated';
    comment?: string;
    approver?: {
        id: string;
        full_name: string;
        first_name?: string;
    };
    step?: ApprovalStep;
    acted_at: string;
}

interface ApprovalInstanceData {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    target_type: string;
    target_id: string;
    current_step_order: number;
    created_at: string;
    resolved_at?: string;
    final_comment?: string;
    is_urgent?: boolean;
    requester?: {
        id: string;
        full_name: string;
        first_name?: string;
    };
    flow?: {
        id: string;
        name: string;
        steps?: ApprovalStep[];
    };
    actions?: ApprovalAction[];
}

interface ApprovalTimelineProps {
    instance: ApprovalInstanceData;
    variant?: 'full' | 'compact' | 'minimal';
    showHeader?: boolean;
}

// ================== MAIN COMPONENT ==================
export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
    instance,
    variant = 'full',
    showHeader = true,
}) => {
    if (variant === 'minimal') {
        return <MinimalTimeline instance={instance} />;
    }

    if (variant === 'compact') {
        return <CompactTimeline instance={instance} showHeader={showHeader} />;
    }

    return <FullTimeline instance={instance} showHeader={showHeader} />;
};

// ================== FULL TIMELINE ==================
const FullTimeline: React.FC<{ instance: ApprovalInstanceData; showHeader: boolean }> = ({ instance, showHeader }) => {
    const steps = instance.flow?.steps?.sort((a, b) => a.step_order - b.step_order) || [];
    const actions = instance.actions || [];
    const actionsMap = new Map(actions.map(a => [a.step_order, a]));

    const getStepStatus = (step: ApprovalStep): 'completed' | 'active' | 'pending' | 'skipped' => {
        const action = actionsMap.get(step.step_order);
        if (action) return 'completed';
        if (step.step_order === instance.current_step_order && instance.status === 'pending') return 'active';
        if (step.step_order > instance.current_step_order) return 'pending';
        return 'skipped';
    };

    return (
        <div className="space-y-1">
            {showHeader && (
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Clock size={18} />
                        Approval Timeline
                    </h4>
                    <StatusBadge status={instance.status} />
                </div>
            )}

            <div className="relative">
                {/* Timeline Track */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-purple-200 via-slate-200 to-slate-100" />

                <div className="space-y-0">
                    {/* Request Created */}
                    <TimelineStep
                        icon={<FileText size={16} />}
                        iconBg="bg-purple-500"
                        title="Request Submitted"
                        subtitle={instance.requester?.full_name || 'Staff'}
                        timestamp={instance.created_at}
                        isFirst
                    />

                    {/* Workflow Steps */}
                    {steps.map((step, idx) => {
                        const status = getStepStatus(step);
                        const action = actionsMap.get(step.step_order);

                        return (
                            <TimelineStep
                                key={step.id}
                                icon={getStepIcon(status, action?.action)}
                                iconBg={getStepBg(status, action?.action)}
                                title={step.name || `Step ${step.step_order}: ${step.approver_role_code}`}
                                subtitle={getStepSubtitle(status, action)}
                                timestamp={action?.acted_at}
                                comment={action?.comment}
                                status={status}
                                isActive={status === 'active'}
                            />
                        );
                    })}

                    {/* Final Resolution */}
                    {(instance.status === 'approved' || instance.status === 'rejected') && (
                        <TimelineStep
                            icon={instance.status === 'approved' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                            iconBg={instance.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}
                            title={`Request ${instance.status === 'approved' ? 'Approved' : 'Rejected'}`}
                            subtitle={instance.final_comment}
                            timestamp={instance.resolved_at}
                            isLast
                            isFinal
                            finalStatus={instance.status}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// ================== COMPACT TIMELINE ==================
const CompactTimeline: React.FC<{ instance: ApprovalInstanceData; showHeader: boolean }> = ({ instance, showHeader }) => {
    const steps = instance.flow?.steps?.sort((a, b) => a.step_order - b.step_order) || [];
    const actions = instance.actions || [];
    const actionsMap = new Map(actions.map(a => [a.step_order, a]));

    return (
        <div>
            {showHeader && (
                <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-900">Timeline</span>
                </div>
            )}

            <div className="flex items-center gap-1 flex-wrap">
                {/* Start */}
                <div className="flex items-center gap-1">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <FileText className="text-white" size={12} />
                    </div>
                </div>

                {steps.map((step, idx) => {
                    const action = actionsMap.get(step.step_order);
                    const isActive = step.step_order === instance.current_step_order && instance.status === 'pending';
                    const isPending = step.step_order > instance.current_step_order;

                    return (
                        <React.Fragment key={step.id}>
                            <ArrowRight size={14} className={`${isPending ? 'text-slate-200' : 'text-slate-400'}`} />
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center ${action?.action === 'approved' ? 'bg-emerald-500' :
                                        action?.action === 'rejected' ? 'bg-red-500' :
                                            isActive ? 'bg-amber-500 animate-pulse' :
                                                'bg-slate-200'
                                    }`}
                                title={step.name || `Step ${step.step_order}`}
                            >
                                {action?.action === 'approved' && <CheckCircle className="text-white" size={12} />}
                                {action?.action === 'rejected' && <XCircle className="text-white" size={12} />}
                                {isActive && <Clock className="text-white" size={12} />}
                                {!action && !isActive && <span className="text-slate-400 text-xs">{idx + 1}</span>}
                            </div>
                        </React.Fragment>
                    );
                })}

                {/* End */}
                {(instance.status === 'approved' || instance.status === 'rejected') && (
                    <>
                        <ArrowRight size={14} className="text-slate-400" />
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${instance.status === 'approved' ? 'bg-emerald-600' : 'bg-red-600'
                            }`}>
                            {instance.status === 'approved' ? (
                                <CheckCircle className="text-white" size={14} />
                            ) : (
                                <XCircle className="text-white" size={14} />
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Status Text */}
            <div className="mt-2 text-sm text-slate-600">
                {instance.status === 'pending' ? (
                    <span className="text-amber-600">
                        Awaiting approval at Step {instance.current_step_order}
                    </span>
                ) : instance.status === 'approved' ? (
                    <span className="text-emerald-600 font-medium">✓ Approved</span>
                ) : instance.status === 'rejected' ? (
                    <span className="text-red-600 font-medium">✗ Rejected</span>
                ) : (
                    <span className="text-slate-500">{instance.status}</span>
                )}
            </div>
        </div>
    );
};

// ================== MINIMAL TIMELINE ==================
const MinimalTimeline: React.FC<{ instance: ApprovalInstanceData }> = ({ instance }) => {
    const totalSteps = instance.flow?.steps?.length || 0;
    const completedSteps = instance.actions?.length || 0;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return (
        <div className="space-y-2">
            {/* Progress Bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all ${instance.status === 'approved' ? 'bg-emerald-500' :
                            instance.status === 'rejected' ? 'bg-red-500' :
                                'bg-purple-500'
                        }`}
                    style={{ width: instance.status === 'approved' || instance.status === 'rejected' ? '100%' : `${progress}%` }}
                />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                    {completedSteps} of {totalSteps} steps
                </span>
                <StatusBadge status={instance.status} size="sm" />
            </div>
        </div>
    );
};

// ================== HELPER COMPONENTS ==================

interface TimelineStepProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle?: string;
    timestamp?: string;
    comment?: string;
    status?: 'completed' | 'active' | 'pending' | 'skipped';
    isFirst?: boolean;
    isLast?: boolean;
    isActive?: boolean;
    isFinal?: boolean;
    finalStatus?: string;
}

const TimelineStep: React.FC<TimelineStepProps> = ({
    icon,
    iconBg,
    title,
    subtitle,
    timestamp,
    comment,
    status,
    isFirst,
    isLast,
    isActive,
    isFinal,
    finalStatus,
}) => {
    return (
        <div className={`relative flex gap-4 py-3 ${status === 'pending' ? 'opacity-50' : ''}`}>
            {/* Icon */}
            <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${iconBg} ${isActive ? 'ring-4 ring-amber-100' : ''}`}>
                <span className="text-white">{icon}</span>
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className={`font-medium ${isFinal ? (finalStatus === 'approved' ? 'text-emerald-700' : 'text-red-700') : 'text-slate-900'}`}>
                            {title}
                        </p>
                        {subtitle && (
                            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    {timestamp && (
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatTimestamp(timestamp)}
                        </span>
                    )}
                </div>

                {comment && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-start gap-2">
                            <MessageSquare className="text-slate-400 shrink-0 mt-0.5" size={14} />
                            <p className="text-sm text-slate-600 italic">"{comment}"</p>
                        </div>
                    </div>
                )}

                {isActive && (
                    <div className="mt-2 flex items-center gap-1.5 text-amber-600 text-sm font-medium">
                        <RotateCcw className="animate-spin" size={14} />
                        Awaiting action...
                    </div>
                )}
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
    const colors = {
        approved: 'bg-emerald-100 text-emerald-700',
        rejected: 'bg-red-100 text-red-700',
        pending: 'bg-amber-100 text-amber-700',
        cancelled: 'bg-slate-100 text-slate-700',
    };

    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

    return (
        <span className={`rounded-full font-medium capitalize ${sizeClasses} ${colors[status as keyof typeof colors] || colors.pending}`}>
            {status}
        </span>
    );
};

// ================== UTILITIES ==================

const getStepIcon = (status: string, action?: string) => {
    if (action === 'approved') return <CheckCircle size={16} />;
    if (action === 'rejected') return <XCircle size={16} />;
    if (action === 'returned') return <AlertTriangle size={16} />;
    if (status === 'active') return <Clock size={16} />;
    return <User size={16} />;
};

const getStepBg = (status: string, action?: string): string => {
    if (action === 'approved') return 'bg-emerald-500';
    if (action === 'rejected') return 'bg-red-500';
    if (action === 'returned') return 'bg-amber-500';
    if (status === 'active') return 'bg-amber-500';
    if (status === 'pending') return 'bg-slate-200';
    return 'bg-slate-400';
};

const getStepSubtitle = (status: string, action?: ApprovalAction): string => {
    if (action) {
        return `${action.action} by ${action.approver?.full_name || 'System'}`;
    }
    if (status === 'active') return 'Awaiting approval';
    if (status === 'pending') return 'Pending';
    return 'Skipped';
};

const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default ApprovalTimeline;
