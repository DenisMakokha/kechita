import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, MapPin, Briefcase, Clock, ArrowRight, Building, Sparkles } from 'lucide-react';
import api from '../../lib/api';

// Types
interface Job {
    id: string;
    title: string;
    department?: { name: string };
    branch?: { name: string };
    location?: string;
    employment_type: string;
    is_remote: boolean;
    is_urgent: boolean;
    salary_min?: number;
    salary_max?: number;
    published_at: string;
}

export const CareersPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('All');

    const { data: jobs, isLoading } = useQuery<Job[]>({
        queryKey: ['public-jobs'],
        queryFn: async () => (await api.get('/recruitment/jobs/public')).data,
    });

    const departments = ['All', ...Array.from(new Set(jobs?.map(j => j.department?.name).filter(Boolean) || []))];

    const filteredJobs = jobs?.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.department?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === 'All' || job.department?.name === selectedDept;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="relative bg-slate-900 text-white overflow-hidden pb-8 pt-16 lg:pt-20 lg:pb-10">
                {/* Background Image & Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/hero/hero-bg.png"
                        alt="Kechita Team"
                        className="w-full h-full object-cover opacity-80"
                    />
                    {/* Gradient Masks to dissolve the image */}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/80 backdrop-blur-[1px]"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-slate-900"></div>
                </div>

                {/* Background decoration */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-600 blur-3xl opacity-20 z-0"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-600 blur-3xl opacity-20 z-0"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-6">
                        <Sparkles size={14} />
                        Hiring for 2026
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                        Join the Future of <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Digital Finance</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg text-slate-300 mb-8">
                        At Kechita, we're building the financial infrastructure for the next generation.
                        Join our mission to empower millions with accessible credit and seamless transactions.
                    </p>

                    {/* Search Bar in Hero */}
                    <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex flex-col md:flex-row gap-2">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search roles (e.g. Engineer, Analyst)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-transparent text-white placeholder-slate-400 border-none focus:ring-0 rounded-xl"
                            />
                        </div>
                        <div className="md:w-48 bg-white/5 border-l border-white/10 hidden md:block">
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="w-full h-full bg-transparent text-white border-none focus:ring-0 px-4 py-3 appearance-none cursor-pointer [&>option]:text-slate-900"
                            >
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jobs List Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Open Positions</h2>
                        <p className="text-slate-500 mt-1">Found {filteredJobs?.length || 0} roles matching your criteria</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredJobs?.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                <Briefcase className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                                <h3 className="text-lg font-medium text-slate-900">No matching jobs found</h3>
                                <p className="text-slate-500">Try adjusting your search criteria</p>
                            </div>
                        ) : filteredJobs?.map((job) => (
                            <Link
                                to={`/careers/${job.id}`}
                                key={job.id}
                                className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col h-full"
                            >
                                <div className="flex-grow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <Briefcase size={20} />
                                        </div>
                                        {job.is_urgent && (
                                            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold uppercase tracking-wider rounded-md animate-pulse">
                                                Urgent
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                                        {job.title}
                                    </h3>
                                    <div className="space-y-2 text-sm text-slate-500 mb-6">
                                        <div className="flex items-center gap-2">
                                            <Building size={16} className="text-slate-400" />
                                            {job.department?.name || 'General'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={16} className="text-slate-400" />
                                            {job.is_remote ? 'Remote' : job.location || job.branch?.name || 'Multiple Locations'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-slate-400" />
                                            <span className="capitalize">{job.employment_type?.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between text-blue-600 font-medium group-hover:translate-x-1 transition-transform origin-left">
                                    Apply Now
                                    <ArrowRight size={18} />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
