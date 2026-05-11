import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg' | 'xl';
type Tone = 'neutral' | 'danger' | 'success' | 'warning' | 'info';

const SIZE_CLASS: Record<Size, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
};

const TONE_HEADER: Record<Tone, string> = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-800',
    danger: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
};

const TONE_HOVER: Record<Tone, string> = {
    neutral: 'hover:bg-slate-200',
    danger: 'hover:bg-red-100',
    success: 'hover:bg-emerald-100',
    warning: 'hover:bg-amber-100',
    info: 'hover:bg-blue-100',
};

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: LucideIcon;
    tone?: Tone;
    size?: Size;
    children: ReactNode;
    footer?: ReactNode;
    closeOnBackdrop?: boolean;
}

/**
 * Consistent modal shell used across the staff module. Provides:
 *  - Backdrop + centered card with rounded corners and shadow
 *  - Header with optional icon + tone-colored background
 *  - Scrollable body
 *  - Optional footer slot for primary/secondary actions
 *  - Esc-to-close + click-outside-to-close
 */
export function Modal({
    isOpen,
    onClose,
    title,
    icon: Icon,
    tone = 'neutral',
    size = 'md',
    children,
    footer,
    closeOnBackdrop = true,
}: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                if (closeOnBackdrop && e.target === e.currentTarget) onClose();
            }}
        >
            <div className={`bg-white rounded-2xl w-full ${SIZE_CLASS[size]} shadow-2xl flex flex-col max-h-[90vh]`}>
                <div className={`px-6 py-4 border-b rounded-t-2xl flex items-center justify-between ${TONE_HEADER[tone]}`}>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        {Icon && <Icon size={20} />}
                        {title}
                    </h2>
                    <button onClick={onClose} className={`p-2 rounded-lg ${TONE_HOVER[tone]}`} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
                {footer && (
                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Convenience subcomponents for consistent modal buttons.
 */
export function ModalCancelButton({ onClick, children = 'Cancel' }: { onClick: () => void; children?: ReactNode }) {
    return (
        <button onClick={onClick} className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium text-sm">
            {children}
        </button>
    );
}

export function ModalPrimaryButton({
    onClick,
    disabled,
    loading,
    tone = 'primary',
    children,
    icon: Icon,
}: {
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    tone?: 'primary' | 'danger' | 'success' | 'warning';
    children: ReactNode;
    icon?: LucideIcon;
}) {
    const toneClass = {
        primary: 'bg-[#0066B3] hover:bg-[#005299]',
        danger: 'bg-red-600 hover:bg-red-700',
        success: 'bg-emerald-600 hover:bg-emerald-700',
        warning: 'bg-amber-600 hover:bg-amber-700',
    }[tone];
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`flex items-center gap-2 px-4 py-2 ${toneClass} text-white rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed`}
        >
            {loading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            ) : Icon ? (
                <Icon size={15} />
            ) : null}
            {children}
        </button>
    );
}
