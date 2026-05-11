import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<Size, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-3xl',
};

export interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    /** Pre-rendered header (full control over layout, gradients, avatars). */
    header: ReactNode;
    /** Optional fixed footer slot. */
    footer?: ReactNode;
    size?: Size;
    children: ReactNode;
    closeOnBackdrop?: boolean;
}

/**
 * Right-side slide-in drawer used for record details (User Detail, Manage Role, etc.).
 * Provides a consistent backdrop, sizing, scrollable body, optional footer, and Esc-to-close.
 * The caller is responsible for the header content (since drawer headers carry rich context
 * like role color gradients or user avatars).
 */
export function Drawer({
    isOpen,
    onClose,
    header,
    footer,
    size = 'lg',
    children,
    closeOnBackdrop = true,
}: DrawerProps) {
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
            className="fixed inset-0 bg-black/60 flex items-stretch justify-end z-50"
            onClick={(e) => {
                if (closeOnBackdrop && e.target === e.currentTarget) onClose();
            }}
        >
            <div className={`bg-white w-full ${SIZE_CLASS[size]} flex flex-col shadow-2xl`}>
                {header}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Convenience close button used in drawer headers.
 */
export function DrawerCloseButton({ onClick, className = 'p-2 hover:bg-white/10 rounded-lg text-white' }: { onClick: () => void; className?: string }) {
    return (
        <button onClick={onClick} className={className} aria-label="Close drawer">
            <X size={20} />
        </button>
    );
}
