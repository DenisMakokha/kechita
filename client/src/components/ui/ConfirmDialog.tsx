import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
    isLoading = false,
}) => {
    if (!isOpen) return null;

    const confirmColors = {
        danger: 'bg-red-500 hover:bg-red-600 text-white',
        warning: 'bg-amber-500 hover:bg-amber-600 text-white',
        info: 'bg-[#0066B3] hover:bg-[#005299] text-white',
    };

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full mx-4">
                <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-red-500" size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmColors[variant]} disabled:opacity-50`}
                    >
                        {isLoading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
