import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Search, Filter, MoreVertical } from 'lucide-react';

export const StaffPage: React.FC = () => {
    const { data: staff, isLoading } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => {
            const response = await api.get('/staff');
            return response.data;
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Staff Directory</h1>
                    <p className="text-slate-500">Manage your organization's workforce</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg">
                    <Plus size={20} />
                    Add Staff
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or position..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <Filter size={18} />
                    Filters
                </button>
            </div>

            {/* Staff Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Position</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Branch</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : staff?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    No staff members found
                                </td>
                            </tr>
                        ) : (
                            staff?.map((member: any) => (
                                <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                                {member.first_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {member.first_name} {member.last_name}
                                                </p>
                                                <p className="text-sm text-slate-500">{member.user?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{member.position?.name || '-'}</td>
                                    <td className="px-6 py-4 text-slate-600">{member.branch?.name || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${member.status === 'active'
                                                    ? 'bg-green-100 text-green-700'
                                                    : member.status === 'onboarding'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}
                                        >
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                            <MoreVertical size={18} className="text-slate-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
