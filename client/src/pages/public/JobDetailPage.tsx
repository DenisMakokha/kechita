import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Building, Clock, Calendar, CheckCircle, UploadCloud, FileText } from 'lucide-react';
import api from '../../lib/api';

export const JobDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [applicationSent, setApplicationSent] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        cover_letter: '',
        years_of_experience: 0,
        current_company: '',
        current_title: ''
    });

    const { data: job, isLoading } = useQuery({
        queryKey: ['public-job', id],
        queryFn: async () => (await api.get(`/recruitment/jobs/public/${id}`)).data,
        enabled: !!id,
    });

    const applyMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post(`/recruitment/jobs/${id}/apply`, data);
        },
        onSuccess: () => {
            setApplicationSent(true);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            submitData.append(key, String(value));
        });

        if (resumeFile) {
            submitData.append('resume', resumeFile);
        }

        applyMutation.mutate(submitData);
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (!job) return <div className="text-center py-20">Job not found</div>;

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-slate-900 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Link to="/careers" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Jobs
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">{job.title}</h1>
                    <div className="flex flex-wrap gap-4 text-slate-300 text-sm">
                        <span className="flex items-center gap-1"><Building size={16} /> {job.department?.name}</span>
                        <span className="flex items-center gap-1"><MapPin size={16} /> {job.is_remote ? 'Remote' : job.location || 'Multiple Locations'}</span>
                        <span className="flex items-center gap-1"><Clock size={16} /> {job.employment_type?.replace('_', ' ')}</span>
                        <span className="flex items-center gap-1"><Calendar size={16} /> Posted {new Date(job.published_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Job Content */}
                    <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">About the Role</h2>
                        <div className="prose text-slate-600 whitespace-pre-line">
                            {job.description}
                        </div>

                        {job.required_skills && job.required_skills.length > 0 && (
                            <div className="mt-8">
                                <h3 className="font-bold text-slate-900 mb-3">Required Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {job.required_skills.map((skill: string) => (
                                        <span key={skill} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Application Form Side */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 sticky top-24">
                            {applicationSent ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Application Sent!</h3>
                                    <p className="text-slate-500 mb-6">Thanks for your interest. We'll be in touch soon.</p>
                                    <Link to="/careers" className="block w-full py-2 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg text-center hover:bg-slate-200">
                                        Browse More Jobs
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">Apply Now</h3>

                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            placeholder="First Name"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            value={formData.first_name}
                                            onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                            required
                                        />
                                        <input
                                            placeholder="Last Name"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            value={formData.last_name}
                                            onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />

                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />

                                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors text-center cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                            required
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            {resumeFile ? (
                                                <>
                                                    <FileText className="text-blue-600" size={24} />
                                                    <span className="text-sm font-medium text-slate-700">{resumeFile.name}</span>
                                                    <span className="text-xs text-blue-500">Click to change</span>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud className="text-slate-400" size={24} />
                                                    <span className="text-sm font-medium text-slate-600">Upload Resume</span>
                                                    <span className="text-xs text-slate-400">PDF, DOCX (Max 5MB)</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Current Title (Optional)"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                        value={formData.current_title}
                                        onChange={e => setFormData({ ...formData, current_title: e.target.value })}
                                    />

                                    <textarea
                                        placeholder="Cover Letter / Why you?"
                                        rows={4}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                        value={formData.cover_letter}
                                        onChange={e => setFormData({ ...formData, cover_letter: e.target.value })}
                                    />

                                    <button
                                        type="submit"
                                        disabled={applyMutation.isPending}
                                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {applyMutation.isPending ? 'Sending...' : 'Submit Application'}
                                    </button>
                                    <p className="text-xs text-center text-slate-400 mt-2">
                                        By applying, you agree to our Privacy Policy.
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetailPage;
