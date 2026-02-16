import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Shield, Plus, Edit, Trash2, Users, CheckCircle, XCircle,
    X, AlertCircle, ShieldCheck, ShieldOff, Search, Key, Check, Loader2
} from 'lucide-react';

interface Role {
    id: string;
    code: string;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface Permission {
    id: string;
    code: string;
    name: string;
    module: string;
    action: string;
    description?: string;
}

interface RoleStats {
    id: string;
    code: string;
    name: string;
    count: number;
    is_active: boolean;
}

export const RolesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState<Partial<Role>>({});
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToastMsg({ text: msg, type }); setTimeout(() => setToastMsg(null), 3000); };
    const [permRoleId, setPermRoleId] = useState<string | null>(null);
    const [permSelections, setPermSelections] = useState<Set<string>>(new Set());

    // Fetch roles with stats
    const { data: roleStats, isLoading } = useQuery<RoleStats[]>({
        queryKey: ['role-stats'],
        queryFn: async () => (await api.get('/roles/stats')).data,
    });

    // Fetch all permissions grouped by module
    const { data: allPermissions = [] } = useQuery<Permission[]>({
        queryKey: ['permissions-all'],
        queryFn: async () => (await api.get('/roles/permissions/all')).data,
    });

    // Fetch permissions for the role being edited
    const { data: rolePermissions, isLoading: rolePermsLoading } = useQuery<Permission[]>({
        queryKey: ['role-permissions', permRoleId],
        queryFn: async () => (await api.get(`/roles/${permRoleId}/permissions`)).data,
        enabled: !!permRoleId,
    });

    // Fetch all roles
    const { data: roles } = useQuery<Role[]>({
        queryKey: ['roles', showInactive],
        queryFn: async () => (await api.get(`/roles?include_inactive=${showInactive}`)).data,
    });

    // Create role mutation
    const createMutation = useMutation({
        mutationFn: async (data: Partial<Role>) => (await api.post('/roles', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['role-stats'] });
            setShowModal(false);
            setFormData({});
            showToast('Role created successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create role', 'error'),
    });

    // Update role mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Role> }) =>
            (await api.patch(`/roles/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['role-stats'] });
            setShowModal(false);
            setFormData({});
            setSelectedRole(null);
            showToast('Role updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update role', 'error'),
    });

    // Activate/Deactivate mutations
    const activateMutation = useMutation({
        mutationFn: async (id: string) => (await api.post(`/roles/${id}/activate`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['role-stats'] });
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to activate role', 'error'),
    });

    const deactivateMutation = useMutation({
        mutationFn: async (id: string) => (await api.post(`/roles/${id}/deactivate`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['role-stats'] });
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate role', 'error'),
    });

    // Delete role mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/roles/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['role-stats'] });
            showToast('Role deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete role', 'error'),
    });

    // Set role permissions mutation
    const setPermissionsMutation = useMutation({
        mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
            (await api.post(`/roles/${roleId}/permissions`, { permissionIds })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
            showToast('Permissions updated successfully');
            setPermRoleId(null);
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update permissions', 'error'),
    });

    const openPermissionsModal = (role: Role) => {
        setPermRoleId(role.id);
    };

    // Sync selections when rolePermissions loads
    React.useEffect(() => {
        if (rolePermissions) {
            setPermSelections(new Set(rolePermissions.map(p => p.id)));
        }
    }, [rolePermissions]);

    const togglePermission = (id: string) => {
        setPermSelections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleModule = (module: string) => {
        const modulePerms = allPermissions.filter(p => p.module === module);
        const allSelected = modulePerms.every(p => permSelections.has(p.id));
        setPermSelections(prev => {
            const next = new Set(prev);
            for (const p of modulePerms) {
                if (allSelected) next.delete(p.id); else next.add(p.id);
            }
            return next;
        });
    };

    const permissionsByModule = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
    }, {});

    const MODULE_LABELS: Record<string, string> = {
        staff: 'Staff Management', leave: 'Leave', claims: 'Claims', loans: 'Loans',
        petty_cash: 'Petty Cash', recruitment: 'Recruitment', org: 'Organization',
        users: 'Users', roles: 'Roles', approvals: 'Approvals', announcements: 'Announcements',
        reports: 'Reports', audit: 'Audit', notifications: 'Notifications',
        settings: 'Settings', security: 'Security',
    };

    const filteredRoles = roles?.filter((role) =>
        role.name.toLowerCase().includes(search.toLowerCase()) ||
        role.code.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const openCreateModal = () => {
        setSelectedRole(null);
        setFormData({ is_active: true });
        setShowModal(true);
    };

    const openEditModal = (role: Role) => {
        setSelectedRole(role);
        setFormData({
            code: role.code,
            name: role.name,
            description: role.description,
            is_active: role.is_active,
        });
        setShowModal(true);
    };

    const handleSave = () => {
        if (selectedRole) {
            updateMutation.mutate({ id: selectedRole.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleToggleStatus = (role: Role) => {
        if (role.is_active) {
            deactivateMutation.mutate(role.id);
        } else {
            activateMutation.mutate(role.id);
        }
    };

    const [deleteRoleTarget, setDeleteRoleTarget] = useState<Role | null>(null);

    const handleDelete = (role: Role) => {
        const stats = roleStats?.find((s) => s.id === role.id);
        if (stats && stats.count > 0) {
            showToast(`Cannot delete role "${role.name}" \u2014 it has ${stats.count} users assigned.`);
            return;
        }
        setDeleteRoleTarget(role);
    };

    const getRoleColor = (code: string) => {
        const colors: Record<string, string> = {
            CEO: 'from-purple-500 to-indigo-600',
            HR_MANAGER: 'from-pink-500 to-rose-600',
            REGIONAL_MANAGER: 'from-blue-500 to-cyan-600',
            BRANCH_MANAGER: 'from-emerald-500 to-teal-600',
            ACCOUNTANT: 'from-amber-500 to-orange-600',
            HR_ASSISTANT: 'from-fuchsia-500 to-pink-600',
            REGIONAL_ADMIN: 'from-sky-500 to-blue-600',
            RELATIONSHIP_OFFICER: 'from-green-500 to-emerald-600',
            BDM: 'from-violet-500 to-purple-600',
        };
        return colors[code] || 'from-slate-500 to-slate-600';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
                    <p className="text-slate-500">Configure system roles and permissions</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] transition-colors"
                >
                    <Plus size={20} />
                    Create Role
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {roleStats?.slice(0, 5).map((stat) => (
                    <div
                        key={stat.id}
                        className={`relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br ${getRoleColor(stat.code)}`}
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <Shield className="mb-2 opacity-80" size={24} />
                        <p className="text-3xl font-bold">{stat.count}</p>
                        <p className="text-sm opacity-80">{stat.name}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search roles..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="w-4 h-4 text-[#0066B3] rounded"
                        />
                        <span className="text-sm text-slate-600">Show inactive roles</span>
                    </label>
                </div>
            </div>

            {/* Roles Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0066B3]"></div>
                </div>
            ) : filteredRoles.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Shield className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500">No roles found</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRoles.map((role) => {
                        const stats = roleStats?.find((s) => s.id === role.id);
                        return (
                            <div
                                key={role.id}
                                className={`bg-white rounded-xl border ${role.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'} overflow-hidden hover:shadow-md transition-shadow`}
                            >
                                <div className={`h-2 bg-gradient-to-r ${getRoleColor(role.code)}`} />
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRoleColor(role.code)} flex items-center justify-center`}>
                                                <Shield className="text-white" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900">{role.name}</h3>
                                                <p className="text-sm text-slate-500 font-mono">{role.code}</p>
                                            </div>
                                        </div>
                                        {role.is_active ? (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                                <CheckCircle size={12} />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                                                <XCircle size={12} />
                                                Inactive
                                            </span>
                                        )}
                                    </div>

                                    {role.description && (
                                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                                            {role.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Users size={16} />
                                            <span className="text-sm font-medium">{stats?.count || 0} users</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openPermissionsModal(role)}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600"
                                                title="Manage Permissions"
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(role)}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(role)}
                                                className={`p-2 hover:bg-slate-100 rounded-lg ${role.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'}`}
                                                title={role.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {role.is_active ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(role)}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"
                                                title="Delete"
                                                disabled={(stats?.count || 0) > 0}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {selectedRole ? 'Edit Role' : 'Create Role'}
                            </h2>
                            <button
                                onClick={() => { setShowModal(false); setSelectedRole(null); setFormData({}); }}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Role Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.code || ''}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z_]/g, '') })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] font-mono"
                                    placeholder="e.g., SALES_MANAGER"
                                    disabled={!!selectedRole}
                                />
                                <p className="text-xs text-slate-400 mt-1">Uppercase letters and underscores only</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Role Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                    placeholder="e.g., Sales Manager"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] resize-none"
                                    rows={3}
                                    placeholder="Brief description of this role's responsibilities..."
                                />
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active ?? true}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-[#0066B3] rounded"
                                />
                                <span className="text-sm text-slate-700">Role is active</span>
                            </label>

                            {selectedRole && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                                    <p className="text-sm text-amber-700">
                                        Role code cannot be changed after creation. To change the code, create a new role and reassign users.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button
                                onClick={() => { setShowModal(false); setSelectedRole(null); setFormData({}); }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.code || !formData.name || createMutation.isPending || updateMutation.isPending}
                                className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50"
                            >
                                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permissions Modal */}
            {permRoleId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Manage Permissions</h2>
                                <p className="text-sm text-slate-500">
                                    {roles?.find(r => r.id === permRoleId)?.name} — {permSelections.size} of {allPermissions.length} selected
                                </p>
                            </div>
                            <button onClick={() => setPermRoleId(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {rolePermsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-[#0066B3]" size={32} />
                                </div>
                            ) : (
                                Object.entries(permissionsByModule).map(([module, perms]) => {
                                    const allSelected = perms.every(p => permSelections.has(p.id));
                                    const someSelected = perms.some(p => permSelections.has(p.id));
                                    return (
                                        <div key={module} className="border border-slate-200 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => toggleModule(module)}
                                                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                            >
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                    allSelected ? 'bg-[#0066B3] border-[#0066B3]' : someSelected ? 'border-[#0066B3] bg-blue-50' : 'border-slate-300'
                                                }`}>
                                                    {allSelected && <Check size={14} className="text-white" />}
                                                    {someSelected && !allSelected && <div className="w-2 h-0.5 bg-[#0066B3] rounded" />}
                                                </div>
                                                <span className="font-semibold text-slate-800 text-sm">
                                                    {MODULE_LABELS[module] || module}
                                                </span>
                                                <span className="ml-auto text-xs text-slate-500">
                                                    {perms.filter(p => permSelections.has(p.id)).length}/{perms.length}
                                                </span>
                                            </button>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                                                {perms.map(p => (
                                                    <label
                                                        key={p.id}
                                                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50/50 cursor-pointer border-t border-slate-100"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={permSelections.has(p.id)}
                                                            onChange={() => togglePermission(p.id)}
                                                            className="mt-0.5 w-4 h-4 text-[#0066B3] rounded"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-700">{p.name}</p>
                                                            {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPermSelections(new Set(allPermissions.map(p => p.id)))}
                                    className="text-xs px-3 py-1.5 text-[#0066B3] hover:bg-blue-50 rounded-lg font-medium"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => setPermSelections(new Set())}
                                    className="text-xs px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPermRoleId(null)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (permRoleId) setPermissionsMutation.mutate({ roleId: permRoleId, permissionIds: Array.from(permSelections) });
                                    }}
                                    disabled={setPermissionsMutation.isPending}
                                    className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50"
                                >
                                    {setPermissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Role Dialog */}
            <ConfirmDialog
                isOpen={!!deleteRoleTarget}
                title="Delete Role"
                message={`Are you sure you want to delete the role "${deleteRoleTarget?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { if (deleteRoleTarget) deleteMutation.mutate(deleteRoleTarget.id); setDeleteRoleTarget(null); }}
                onCancel={() => setDeleteRoleTarget(null)}
                isLoading={deleteMutation.isPending}
            />

            {/* Toast */}
            {toastMsg && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toastMsg.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
                    {toastMsg.text}
                </div>
            )}
        </div>
    );
};

export default RolesPage;
