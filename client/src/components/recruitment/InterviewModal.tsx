import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Video, Users, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

interface InterviewModalProps {
    applicationId: string;
    candidateName: string;
    onClose: () => void;
}

export const InterviewModal: React.FC<InterviewModalProps> = ({ applicationId, candidateName, onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        title: 'Initial Interview',
        type: 'video',
        scheduled_at: '',
        duration_minutes: 60,
        location: '',
        video_link: '',
        interviewer_ids: [] as string[]
    });

    // Fetch potential interviewers (HR + Management)
    const { data: staffMembers } = useQuery({
        queryKey: ['staff', 'interviewers'],
        queryFn: async () => (await api.get('/staff?role=HR_MANAGER,HR_ASSISTANT,CEO,REGIONAL_MANAGER,BRANCH_MANAGER')).data,
    });

    const scheduleMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/recruitment/interviews', {
                ...data,
                application_id: applicationId,
                scheduled_at: new Date(data.scheduled_at).toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews-upcoming'] });
            queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
            queryClient.invalidateQueries({ queryKey: ['recruitment-dashboard'] });
            onClose();
        },
        onError: (e: any) => console.error('Failed to schedule interview:', e),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        scheduleMutation.mutate(formData);
    };

    const handleInterviewerToggle = (staffId: string) => {
        setFormData(prev => {
            const current = prev.interviewer_ids;
            if (current.includes(staffId)) {
                return { ...prev, interviewer_ids: current.filter(id => id !== staffId) };
            } else {
                return { ...prev, interviewer_ids: [...current, staffId] };
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Schedule Interview</h2>
                        <p className="text-sm text-slate-500">with {candidateName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Interview Title</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.scheduled_at}
                                    onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.duration_minutes}
                                    onChange={e => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>1 hour</option>
                                    <option value={90}>1.5 hours</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.type === 'video' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                    <input type="radio" name="type" value="video" className="hidden" checked={formData.type === 'video'} onChange={() => setFormData({ ...formData, type: 'video' })} />
                                    <Video size={18} /> Video
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.type === 'in_person' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                    <input type="radio" name="type" value="in_person" className="hidden" checked={formData.type === 'in_person'} onChange={() => setFormData({ ...formData, type: 'in_person' })} />
                                    <Users size={18} /> In Person
                                </label>
                            </div>
                        </div>

                        {formData.type === 'video' ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Video Link (Google Meet/Zoom)</label>
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.video_link}
                                    onChange={e => setFormData({ ...formData, video_link: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location / Meeting Room</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Conference Room A"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Interviewers</label>
                            <div className="border border-slate-200 rounded-lg max-h-32 overflow-y-auto divide-y divide-slate-100">
                                {staffMembers?.map((staff: any) => (
                                    <div
                                        key={staff.id}
                                        onClick={() => handleInterviewerToggle(staff.id)}
                                        className={`flex items-center justify-between p-2 cursor-pointer text-sm ${formData.interviewer_ids.includes(staff.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {staff.first_name[0]}
                                            </div>
                                            <span>{staff.first_name} {staff.last_name}</span>
                                        </div>
                                        {formData.interviewer_ids.includes(staff.id) && <CheckCircle size={16} className="text-blue-500" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={scheduleMutation.isPending}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50"
                            >
                                {scheduleMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
