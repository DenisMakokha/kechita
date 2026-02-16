import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
    Plus, Search, Filter, MoreVertical, X, ChevronLeft, ChevronRight,
    Eye, Edit, UserX, Mail, Loader2, Users, RefreshCw,
    CheckCircle, AlertTriangle
} from 'lucide-react';

interface Staff {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    status: string;
    phone?: string;
    position?: { id: string; name: string };
    branch?: { id: string; name: string };
    region?: { id: string; name: string };
    department?: { id: string; name: string };
    manager?: { id: string; first_name: string; last_name: string };
    user?: { email: string };
    hire_date?: string;
}

const ITEMS_PER_PAGE = 10;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-700',
        onboarding: 'bg-blue-100 text-blue-700',
        probation: 'bg-amber-100 text-amber-700',
        suspended: 'bg-red-100 text-red-700',
        resigned: 'bg-slate-100 text-slate-600',
        terminated: 'bg-red-100 text-red-700',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
};

export const StaffPage: React.FC = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [branchFilter, setBranchFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const queryClient = useQueryClient();

    // Toast helper
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Fetch staff
    const { data: staff = [], isLoading, refetch } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => {
            const response = await api.get('/staff');
            return response.data;
        },
    });

    // Fetch branches for filter
    const { data: branches = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const response = await api.get('/org/branches');
            return response.data;
        },
    });

    // Filter and search logic
    const filteredStaff = useMemo(() => {
        return staff.filter((member: Staff) => {
            const matchesSearch = search === '' ||
                `${member.first_name} ${member.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
                member.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
                member.employee_number?.toLowerCase().includes(search.toLowerCase()) ||
                member.position?.name?.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
            const matchesBranch = branchFilter === 'all' || member.branch?.id === branchFilter;

            return matchesSearch && matchesStatus && matchesBranch;
        });
    }, [staff, search, statusFilter, branchFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE);
    const paginatedStaff = filteredStaff.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, branchFilter]);

    const openProfile = (member: Staff) => {
        navigate(`/staff/${member.id}`);
        setActionMenuId(null);
    };

    const uniqueStatuses = useMemo(() => {
        const statuses = new Set(staff.map((s: Staff) => s.status));
        return Array.from(statuses) as string[];
    }, [staff]);

    // Deactivate mutation
    const deactivateMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/staff/${id}/status`, { status: 'suspended' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            showToast('Staff member deactivated successfully');
            setShowDeactivateConfirm(false);
            setSelectedStaff(null);
        },
        onError: () => {
            showToast('Failed to deactivate staff member', 'error');
        }
    });

    // Action handlers
    const handleEdit = (member: Staff) => {
        navigate(`/staff/${member.id}`);
        setActionMenuId(null);
    };

    const handleSendEmail = (member: Staff) => {
        if (member.user?.email) {
            window.location.href = `mailto:${member.user.email}`;
        } else {
            showToast('No email address available', 'error');
        }
        setActionMenuId(null);
    };

    const handleDeactivate = (member: Staff) => {
        setSelectedStaff(member);
        setShowDeactivateConfirm(true);
        setActionMenuId(null);
    };

    const confirmDeactivate = () => {
        if (selectedStaff) {
            deactivateMutation.mutate(selectedStaff.id);
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
                        toastMessage.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
                    }`}>
                        {toastMessage.type === 'success' ? (
                            <CheckCircle size={18} className="text-emerald-400" />
                        ) : (
                            <AlertTriangle size={18} className="text-white" />
                        )}
                        <span className="font-medium">{toastMessage.text}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Staff Directory</h1>
                    <p className="text-slate-500">Manage your organization's workforce</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] transition-all shadow-lg shadow-blue-500/25"
                    >
                        <Plus size={20} />
                        Add Staff
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="text-[#0066B3]" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{staff.length}</p>
                            <p className="text-xs text-slate-500">Total Staff</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Users className="text-emerald-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {staff.filter((s: Staff) => s.status === 'active').length}
                            </p>
                            <p className="text-xs text-slate-500">Active</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {staff.filter((s: Staff) => s.status === 'onboarding').length}
                            </p>
                            <p className="text-xs text-slate-500">Onboarding</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Users className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {staff.filter((s: Staff) => s.status === 'probation').length}
                            </p>
                            <p className="text-xs text-slate-500">Probation</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, employee number, or position..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${showFilters ? 'bg-blue-50 border-[#0066B3] text-[#0066B3]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Filter size={18} />
                    Filters
                    {(statusFilter !== 'all' || branchFilter !== 'all') && (
                        <span className="w-2 h-2 bg-[#0066B3] rounded-full" />
                    )}
                </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4">
                    <div className="min-w-[200px]">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        >
                            <option value="all">All Statuses</option>
                            {uniqueStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {String(status).charAt(0).toUpperCase() + String(status).slice(1).replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-[200px]">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        >
                            <option value="all">All Branches</option>
                            {branches.map((branch: any) => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => { setStatusFilter('all'); setBranchFilter('all'); }}
                            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
                        >
                            Clear filters
                        </button>
                    </div>
                </div>
            )}

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm text-slate-500">
                <p>
                    Showing {paginatedStaff.length} of {filteredStaff.length} staff members
                    {filteredStaff.length !== staff.length && ` (filtered from ${staff.length})`}
                </p>
            </div>

            {/* Staff Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Employee</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Position</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden md:table-cell">Branch</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden lg:table-cell">Department</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#0066B3] mx-auto mb-2" />
                                        <p className="text-slate-500">Loading staff...</p>
                                    </td>
                                </tr>
                            ) : paginatedStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-600 font-medium">No staff members found</p>
                                        <p className="text-sm text-slate-400 mt-1">
                                            {search || statusFilter !== 'all' || branchFilter !== 'all'
                                                ? 'Try adjusting your search or filters'
                                                : 'Add your first staff member to get started'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedStaff.map((member: Staff) => (
                                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-bold shrink-0">
                                                    {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-900 truncate">
                                                        {member.first_name} {member.last_name}
                                                    </p>
                                                    <p className="text-sm text-slate-500 truncate">{member.user?.email}</p>
                                                    <p className="text-xs text-slate-400">{member.employee_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{member.position?.name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-600 hidden md:table-cell">{member.branch?.name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-600 hidden lg:table-cell">{member.department?.name || '-'}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={member.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openProfile(member)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
                                                    title="View details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setActionMenuId(actionMenuId === member.id ? null : member.id)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {actionMenuId === member.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setActionMenuId(null)}
                                                            />
                                                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                                                                <button
                                                                    onClick={() => openProfile(member)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                >
                                                                    <Eye size={16} /> View Profile
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleEdit(member)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                >
                                                                    <Edit size={16} /> Edit
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleSendEmail(member)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                >
                                                                    <Mail size={16} /> Send Email
                                                                </button>
                                                                <hr className="my-1" />
                                                                <button 
                                                                    onClick={() => handleDeactivate(member)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                >
                                                                    <UserX size={16} /> Deactivate
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <p className="text-sm text-slate-500">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                            ? 'bg-[#0066B3] text-white'
                                            : 'border border-slate-200 hover:bg-white text-slate-600'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900">Add New Staff Member</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-4">
                                New staff members are added through the recruitment and onboarding workflow.
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <p className="text-sm text-blue-800">
                                    <strong>How it works:</strong> Post a job in Recruitment → Review applications → Make an offer → Complete onboarding. The staff record is created automatically.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setShowAddModal(false); navigate('/recruitment'); }}
                                className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] transition-colors"
                            >
                                Go to Recruitment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deactivate Confirmation Modal */}
            {showDeactivateConfirm && selectedStaff && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="text-red-600" size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Deactivate Staff Member?</h2>
                            <p className="text-slate-600">
                                Are you sure you want to deactivate <strong>{selectedStaff.first_name} {selectedStaff.last_name}</strong>? 
                                They will lose access to all systems.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeactivateConfirm(false)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeactivate}
                                disabled={deactivateMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
