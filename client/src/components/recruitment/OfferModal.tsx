import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, FileText, DollarSign, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface OfferModalProps {
    applicationId: string;
    candidateName: string;
    jobTitle: string;
    onClose: () => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({ applicationId, candidateName, jobTitle, onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        offered_salary: '',
        currency: 'KES',
        start_date: '',
        expiration_date: '',
        additional_notes: '',
    });
    const [error, setError] = useState('');

    const createOfferMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post(`/recruitment/applications/${applicationId}/offer`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
            onClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to create offer');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.offered_salary || !formData.start_date) {
            setError('Please fill in required fields');
            return;
        }
        createOfferMutation.mutate({
            ...formData,
            offered_salary: Number(formData.offered_salary),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Generate Job Offer</h2>
                        <p className="text-sm text-slate-500">for {candidateName} - {jobTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Salary Amount</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="number"
                                    required
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3]/20 focus:border-[#0066B3] outline-none"
                                    value={formData.offered_salary}
                                    onChange={e => setFormData({ ...formData, offered_salary: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                            <select
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3]/20 focus:border-[#0066B3] outline-none"
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                            >
                                <option value="KES">KES</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3]/20 focus:border-[#0066B3] outline-none"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3]/20 focus:border-[#0066B3] outline-none"
                                value={formData.expiration_date}
                                onChange={e => setFormData({ ...formData, expiration_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Additional Terms / Notes</label>
                        <textarea
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3]/20 focus:border-[#0066B3] outline-none resize-none"
                            placeholder="e.g. Relocation bonus, stock options..."
                            value={formData.additional_notes}
                            onChange={e => setFormData({ ...formData, additional_notes: e.target.value })}
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createOfferMutation.isPending}
                            className="px-6 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            {createOfferMutation.isPending ? 'Generating...' : (
                                <>
                                    <FileText size={18} />
                                    Generate Offer
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
