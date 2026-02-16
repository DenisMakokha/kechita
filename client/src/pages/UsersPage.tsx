import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { InputDialog } from '../components/ui/InputDialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Users, Plus, Search, Filter, MoreVertical, Edit, Trash2,
    Shield, ShieldCheck, ShieldOff, UserCheck, UserX, Mail,
    Key, ChevronLeft, ChevronRight, X, Eye, EyeOff, AlertCircle,
    CheckCircle, Clock, Building, MapPin
} from 'lucide-react';

interface User {
    id: string;
    email: string;
    is_active: boolean;
    two_factor_enabled: boolean;
    last_login_at?: string;
    created_at: string;
    roles: { id: string; code: string; name: string }[];
    staff?: {
        id: string;
        first_name: string;
        last_name: string;
        employee_number: string;
        branch?: { name: string };
        region?: { name: string };
    };
}

interface Role {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
}

export const UsersPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [showPassword, setShowPassword] = useState(false);
    const [actionMenu, setActionMenu] = useState<string | null>(null);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

    // Fetch users
    const { data: usersData, isLoading } = useQuery({
        queryKey: ['users', page, search, roleFilter, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '20');
            if (search) params.append('search', search);
            if (roleFilter) params.append('role_code', roleFilter);
            if (statusFilter) params.append('is_active', statusFilter);
            return (await api.get(`/users?${params}`)).data;
        },
    });

    // Fetch roles for dropdown
    const { data: roles } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: async () => (await api.get('/roles')).data,
    });

    // Fetch user stats by role
    const { data: roleStats } = useQuery({
        queryKey: ['users-stats-by-role'],
        queryFn: async () => (await api.get('/users/stats/by-role')).data,
    });

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/users', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['users-stats-by-role'] });
            setShowModal(false);
            setFormData({});
            showToast('User created');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create user', 'error'),
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) =>
            (await api.patch(`/users/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setShowModal(false);
            setFormData({});
            setSelectedUser(null);
            showToast('User updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update user', 'error'),
    });

    // Update user roles mutation
    const updateRolesMutation = useMutation({
        mutationFn: async ({ id, role_ids }: { id: string; role_ids: string[] }) =>
            (await api.patch(`/users/${id}/roles`, { role_ids })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['users-stats-by-role'] });
            setShowRoleModal(false);
            setSelectedUser(null);
            showToast('Roles updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update roles', 'error'),
    });

    // Activate/Deactivate user mutations
    const activateMutation = useMutation({
        mutationFn: async (id: string) => (await api.post(`/users/${id}/activate`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); showToast('User activated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to activate user', 'error'),
    });

    const deactivateMutation = useMutation({
        mutationFn: async (id: string) => (await api.post(`/users/${id}/deactivate`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); showToast('User deactivated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate user', 'error'),
    });

    // Reset password mutation
    const resetPasswordMutation = useMutation({
        mutationFn: async ({ id, password }: { id: string; password: string }) =>
            (await api.patch(`/users/${id}/password`, { password })).data,
        onSuccess: () => {
            setActionMenu(null);
            showToast('Password reset');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to reset password', 'error'),
    });

    // Delete user mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['users-stats-by-role'] });
            showToast('User deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete user', 'error'),
    });

    const users = usersData?.data || [];
    const totalPages = usersData?.meta?.totalPages || 1;
    const total = usersData?.meta?.total || 0;

    const openCreateModal = () => {
        setSelectedUser(null);
        setFormData({ is_active: true, role_ids: [] });
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            is_active: user.is_active,
        });
        setShowModal(true);
        setActionMenu(null);
    };

    const openRoleModal = (user: User) => {
        setSelectedUser(user);
        setShowRoleModal(true);
        setActionMenu(null);
    };

    const handleSave = () => {
        if (selectedUser) {
            updateUserMutation.mutate({ id: selectedUser.id, data: formData });
        } else {
            createUserMutation.mutate(formData);
        }
    };

    const handleRoleSave = (roleIds: string[]) => {
        if (selectedUser) {
            updateRolesMutation.mutate({ id: selectedUser.id, role_ids: roleIds });
        }
    };

    const handleToggleStatus = (user: User) => {
        if (user.is_active) {
            deactivateMutation.mutate(user.id);
        } else {
            activateMutation.mutate(user.id);
        }
        setActionMenu(null);
    };

    const [resetPwUserId, setResetPwUserId] = useState<string | null>(null);
    const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);

    const handleResetPassword = (userId: string) => {
        setResetPwUserId(userId);
        setActionMenu(null);
    };

    const handleDelete = (user: User) => {
        setDeleteUserTarget(user);
        setActionMenu(null);
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                        <span className="font-medium">{toast.text}</span>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500">Manage system users and their roles</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] transition-colors"
                >
                    <Plus size={20} />
                    Add User
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Users size={20} className="text-[#0066B3]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{total}</p>
                            <p className="text-xs text-slate-500">Total Users</p>
                        </div>
                    </div>
                </div>
                {roleStats?.slice(0, 5).map((stat: any) => (
                    <div key={stat.code} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Shield size={20} className="text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stat.count}</p>
                                <p className="text-xs text-slate-500 truncate">{stat.name}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by email or name..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                value={roleFilter}
                                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                                className="pl-10 pr-8 py-2.5 border border-slate-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                            >
                                <option value="">All Roles</option>
                                {roles?.map((role) => (
                                    <option key={role.id} value={role.code}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-4 py-2.5 border border-slate-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        >
                            <option value="">All Status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0066B3]"></div>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500">No users found</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">User</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Roles</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Location</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Last Login</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user: User) => (
                                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066B3] to-[#00AEEF] flex items-center justify-center text-white font-medium">
                                                    {user.staff
                                                        ? `${user.staff.first_name[0]}${user.staff.last_name[0]}`
                                                        : user.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {user.staff
                                                            ? `${user.staff.first_name} ${user.staff.last_name}`
                                                            : user.email.split('@')[0]}
                                                    </p>
                                                    <p className="text-sm text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.length === 0 ? (
                                                    <span className="text-sm text-slate-400">No roles</span>
                                                ) : (
                                                    user.roles.slice(0, 2).map((role) => (
                                                        <span
                                                            key={role.id}
                                                            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded"
                                                        >
                                                            {role.code}
                                                        </span>
                                                    ))
                                                )}
                                                {user.roles.length > 2 && (
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                        +{user.roles.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.staff?.branch || user.staff?.region ? (
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    {user.staff.branch && (
                                                        <span className="flex items-center gap-1">
                                                            <Building size={14} />
                                                            {user.staff.branch.name}
                                                        </span>
                                                    )}
                                                    {user.staff.region && (
                                                        <span className="flex items-center gap-1 text-slate-400">
                                                            <MapPin size={14} />
                                                            {user.staff.region.name}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {user.is_active ? (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                                        <CheckCircle size={12} />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                                                        <AlertCircle size={12} />
                                                        Inactive
                                                    </span>
                                                )}
                                                {user.two_factor_enabled && (
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                                                        2FA
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.last_login_at ? (
                                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    <Clock size={14} />
                                                    {new Date(user.last_login_at).toLocaleDateString('en-GB', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">Never</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 relative">
                                                <button
                                                    onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                {actionMenu === user.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                                                        <button
                                                            onClick={() => openEditModal(user)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                        >
                                                            <Edit size={16} />
                                                            Edit User
                                                        </button>
                                                        <button
                                                            onClick={() => openRoleModal(user)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                        >
                                                            <Shield size={16} />
                                                            Manage Roles
                                                        </button>
                                                        <button
                                                            onClick={() => handleResetPassword(user.id)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                        >
                                                            <Key size={16} />
                                                            Reset Password
                                                        </button>
                                                        <hr className="my-1" />
                                                        <button
                                                            onClick={() => handleToggleStatus(user)}
                                                            className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${user.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                        >
                                                            {user.is_active ? (
                                                                <>
                                                                    <UserX size={16} />
                                                                    Deactivate
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UserCheck size={16} />
                                                                    Activate
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 size={16} />
                                                            Delete User
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                            <p className="text-sm text-slate-500">
                                Showing {users.length} of {total} users
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="px-4 py-2 text-sm text-slate-600">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create/Edit User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {selectedUser ? 'Edit User' : 'Create User'}
                            </h2>
                            <button
                                onClick={() => { setShowModal(false); setSelectedUser(null); setFormData({}); }}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                        placeholder="user@company.com"
                                        disabled={!!selectedUser}
                                    />
                                </div>
                            </div>

                            {!selectedUser && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.password || ''}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                                placeholder="Minimum 8 characters"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Assign Roles
                                        </label>
                                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                                            {roles?.map((role) => (
                                                <label
                                                    key={role.id}
                                                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.role_ids?.includes(role.id) || false}
                                                        onChange={(e) => {
                                                            const ids = formData.role_ids || [];
                                                            if (e.target.checked) {
                                                                setFormData({ ...formData, role_ids: [...ids, role.id] });
                                                            } else {
                                                                setFormData({ ...formData, role_ids: ids.filter((id: string) => id !== role.id) });
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-[#0066B3] rounded"
                                                    />
                                                    <span className="text-sm text-slate-700">{role.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active ?? true}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-[#0066B3] rounded"
                                />
                                <span className="text-sm text-slate-700">User is active</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button
                                onClick={() => { setShowModal(false); setSelectedUser(null); setFormData({}); }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={createUserMutation.isPending || updateUserMutation.isPending}
                                className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50"
                            >
                                {createUserMutation.isPending || updateUserMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Roles Modal */}
            {showRoleModal && selectedUser && (
                <RoleManagementModal
                    user={selectedUser}
                    roles={roles || []}
                    onSave={handleRoleSave}
                    onClose={() => { setShowRoleModal(false); setSelectedUser(null); }}
                    isPending={updateRolesMutation.isPending}
                />
            )}

            {/* Reset Password Dialog */}
            <InputDialog
                isOpen={!!resetPwUserId}
                title="Reset Password"
                message="Enter the new password for this user (minimum 8 characters)."
                inputLabel="New Password"
                placeholder="Min 8 characters"
                confirmLabel="Reset Password"
                onConfirm={(password) => { if (password.length >= 8 && resetPwUserId) resetPasswordMutation.mutate({ id: resetPwUserId, password }); setResetPwUserId(null); }}
                onCancel={() => setResetPwUserId(null)}
                isLoading={resetPasswordMutation.isPending}
            />

            {/* Delete User Dialog */}
            <ConfirmDialog
                isOpen={!!deleteUserTarget}
                title="Delete User"
                message={`Are you sure you want to delete user ${deleteUserTarget?.email}? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { if (deleteUserTarget) deleteMutation.mutate(deleteUserTarget.id); setDeleteUserTarget(null); }}
                onCancel={() => setDeleteUserTarget(null)}
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};

// Role Management Modal Component
const RoleManagementModal: React.FC<{
    user: User;
    roles: Role[];
    onSave: (roleIds: string[]) => void;
    onClose: () => void;
    isPending: boolean;
}> = ({ user, roles, onSave, onClose, isPending }) => {
    const [selectedRoles, setSelectedRoles] = useState<string[]>(
        user.roles.map((r) => r.id)
    );

    const toggleRole = (roleId: string) => {
        setSelectedRoles((prev) =>
            prev.includes(roleId)
                ? prev.filter((id) => id !== roleId)
                : [...prev, roleId]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Manage Roles</h2>
                        <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {roles.map((role) => (
                            <label
                                key={role.id}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                    selectedRoles.includes(role.id)
                                        ? 'border-[#0066B3] bg-blue-50'
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        selectedRoles.includes(role.id) ? 'bg-[#0066B3]' : 'bg-slate-100'
                                    }`}>
                                        {selectedRoles.includes(role.id) ? (
                                            <ShieldCheck size={16} className="text-white" />
                                        ) : (
                                            <ShieldOff size={16} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{role.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">{role.code}</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={selectedRoles.includes(role.id)}
                                    onChange={() => toggleRole(role.id)}
                                    className="w-5 h-5 text-[#0066B3] rounded"
                                />
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(selectedRoles)}
                        disabled={isPending}
                        className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50"
                    >
                        {isPending ? 'Saving...' : 'Save Roles'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UsersPage;
