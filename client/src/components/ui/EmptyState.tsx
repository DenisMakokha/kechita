import React from 'react';
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
    /** When true, renders the entire empty state inside a card with rounded border (no parent card needed). */
    card?: boolean;
}

/**
 * Standardized empty-state component for use across list views.
 * Replaces ad-hoc "no items" messages with consistent visual hierarchy.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon = Inbox,
    title,
    description,
    action,
    className = '',
    card = false,
}) => {
    const inner = (
        <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Icon className="text-slate-400" size={28} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description && (
                <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );

    if (card) {
        return (
            <div className="bg-white rounded-xl border border-slate-200">
                {inner}
            </div>
        );
    }
    return inner;
};

export default EmptyState;
