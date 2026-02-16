import React, { useState } from 'react';
import { X } from 'lucide-react';

interface InputDialogProps {
    isOpen: boolean;
    title: string;
    message?: string;
    inputLabel: string;
    inputType?: 'text' | 'number' | 'textarea';
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    required?: boolean;
    onConfirm: (value: string) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const InputDialog: React.FC<InputDialogProps> = ({
    isOpen,
    title,
    message,
    inputLabel,
    inputType = 'text',
    placeholder = '',
    confirmLabel = 'Submit',
    cancelLabel = 'Cancel',
    required = true,
    onConfirm,
    onCancel,
    isLoading = false,
}) => {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (required && !value.trim()) {
            setError('This field is required');
            return;
        }
        onConfirm(value.trim());
        setValue('');
        setError('');
    };

    const handleCancel = () => {
        setValue('');
        setError('');
        onCancel();
    };

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full mx-4">
                <button onClick={handleCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
                {message && <p className="text-sm text-slate-500 mb-4">{message}</p>}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{inputLabel}</label>
                    {inputType === 'textarea' ? (
                        <textarea
                            value={value}
                            onChange={e => { setValue(e.target.value); setError(''); }}
                            placeholder={placeholder}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 focus:border-[#0066B3]"
                        />
                    ) : (
                        <input
                            type={inputType}
                            value={value}
                            onChange={e => { setValue(e.target.value); setError(''); }}
                            placeholder={placeholder}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 focus:border-[#0066B3]"
                        />
                    )}
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#0066B3] rounded-lg hover:bg-[#005299] transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
