import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useFormValidation, validators } from '../hooks/useFormValidation';
import type { ValidationRules } from '../hooks/useFormValidation';
import { InputDialog } from '../components/ui/InputDialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Users, Plus, Search, MoreVertical, Edit, Trash2, X,
    Shield, ShieldCheck, ShieldOff, UserCheck, UserX, Mail, Eye,
    Key, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock,
    Building, Loader2, RefreshCw, AlertTriangle, UserPlus
} from 'lucide-react';

type Tab = 'directory' | 'users' | 'roles';

interface Staff { id: string; first_name: string; last_name: string; employee_number: string; status: string; phone?: string; position?: { id: string; name: string }; branch?: { id: string; name: string }; region?: { id: string; name: string }; department?: { id: string; name: string }; user?: { email: string }; }
interface User { id: string; email: string; is_active: boolean; two_factor_enabled: boolean; last_login_at?: string; roles: { id: string; code: string; name: string }[]; staff?: { id: string; first_name: string; last_name: string; employee_number: string; branch?: { name: string }; }; }
interface Role { id: string; code: string; name: string; description?: string; is_active: boolean; }
interface RoleStats { id: string; code: string; name: string; count: number; is_active: boolean; }

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', onboarding: 'bg-blue-100 text-blue-700', probation: 'bg-amber-100 text-amber-700', suspended: 'bg-red-100 text-red-700' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status?.replace(/_/g, ' ')}</span>;
};

export const StaffManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore(state => state.user);
    const isAdmin = user?.roles?.some(r => ['CEO', 'HR_MANAGER'].includes(r.code)) || false;
    const [activeTab, setActiveTab] = useState<Tab>('directory');
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

    // Staff state
    const [staffSearch, setStaffSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [staffPage, setStaffPage] = useState(1);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [showAddStaffModal, setShowAddStaffModal] = useState(false);
    const [staffFormData, setStaffFormData] = useState<any>({});

    // Users state
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [userPage, setUserPage] = useState(1);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showRoleAssignModal, setShowRoleAssignModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userFormData, setUserFormData] = useState<any>({});
    const [userActionMenu, setUserActionMenu] = useState<string | null>(null);
    const [resetPwUserId, setResetPwUserId] = useState<string | null>(null);
    const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
    const [deleteRoleTarget, setDeleteRoleTarget] = useState<Role | null>(null);

    const staffRules = useMemo<ValidationRules<Record<string, any>>>(() => ({
        first_name: [v => validators.required(v, 'First name')],
        last_name: [v => validators.required(v, 'Last name')],
        email: [v => validators.required(v, 'Email'), validators.email],
        role_id: [v => validators.required(v, 'Role')],
        position_id: [v => validators.required(v, 'Position')],
    }), []);
    const staffValidation = useFormValidation(staffRules);

    // Roles state
    const [roleSearch, setRoleSearch] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [roleFormData, setRoleFormData] = useState<Partial<Role>>({});

    // Queries
    const { data: staff = [], isLoading: staffLoading, refetch: refetchStaff } = useQuery({ queryKey: ['staff'], queryFn: async () => (await api.get('/staff')).data, refetchInterval: 60000 });
    const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get('/org/branches')).data });
    const { data: positions = [] } = useQuery({ queryKey: ['positions'], queryFn: async () => (await api.get('/org/positions')).data });
    const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: async () => (await api.get('/org/regions')).data });
    const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: async () => (await api.get('/org/departments')).data });
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['users', userPage, userSearch, roleFilter],
        queryFn: async () => { const p = new URLSearchParams(); p.append('page', userPage.toString()); p.append('limit', '15'); if (userSearch) p.append('search', userSearch); if (roleFilter) p.append('role_code', roleFilter); return (await api.get(`/users?${p}`)).data; },
        enabled: activeTab === 'users',
    });
    const { data: roles = [] } = useQuery<Role[]>({ queryKey: ['roles'], queryFn: async () => (await api.get('/roles')).data });
    const { data: roleStats = [] } = useQuery<RoleStats[]>({ queryKey: ['role-stats'], queryFn: async () => (await api.get('/roles/stats')).data });

    // Mutations
    const deactivateStaffMutation = useMutation({ mutationFn: (id: string) => api.patch(`/staff/${id}/status`, { status: 'suspended' }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); showToast('Staff deactivated'); setShowDeactivateConfirm(false); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate staff', 'error') });
    const createStaffMutation = useMutation({ 
        mutationFn: async (data: any) => (await api.post('/staff', data)).data, 
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setShowAddStaffModal(false); setStaffFormData({}); showToast('Staff member created successfully'); },
        onError: (err: any) => showToast(err.response?.data?.message || 'Failed to create staff', 'error')
    });
    const createUserMutation = useMutation({ mutationFn: async (data: any) => (await api.post('/users', data)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowUserModal(false); setUserFormData({}); showToast('User created'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create user', 'error') });
    const updateRolesMutation = useMutation({ mutationFn: async ({ id, role_code }: { id: string; role_code: string }) => (await api.patch(`/users/${id}/roles`, { role_code })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowRoleAssignModal(false); showToast('Role updated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update role', 'error') });
    const activateUserMutation = useMutation({ mutationFn: async (id: string) => (await api.post(`/users/${id}/activate`)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); showToast('User activated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to activate user', 'error') });
    const deactivateUserMutation = useMutation({ mutationFn: async (id: string) => (await api.post(`/users/${id}/deactivate`)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); showToast('User deactivated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate user', 'error') });
    const resetPasswordMutation = useMutation({ mutationFn: async ({ id, password }: { id: string; password: string }) => (await api.patch(`/users/${id}/password`, { password })).data, onSuccess: () => { setUserActionMenu(null); showToast('Password reset'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to reset password', 'error') });
    const deleteUserMutation = useMutation({ mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); showToast('User deleted'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete user', 'error') });
    const createRoleMutation = useMutation({ mutationFn: async (data: Partial<Role>) => (await api.post('/roles', data)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setShowRoleModal(false); setRoleFormData({}); showToast('Role created'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create role', 'error') });
    const updateRoleMutation = useMutation({ mutationFn: async ({ id, data }: { id: string; data: Partial<Role> }) => (await api.patch(`/roles/${id}`, data)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setShowRoleModal(false); showToast('Role updated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update role', 'error') });
    const deleteRoleMutation = useMutation({ mutationFn: async (id: string) => (await api.delete(`/roles/${id}`)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); showToast('Role deleted'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete role', 'error') });
    const activateRoleMutation = useMutation({ mutationFn: async (id: string) => (await api.post(`/roles/${id}/activate`)).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }), onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to activate role', 'error') });
    const deactivateRoleMutation = useMutation({ mutationFn: async (id: string) => (await api.post(`/roles/${id}/deactivate`)).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }), onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate role', 'error') });

    // Computed
    const filteredStaff = useMemo(() => staff.filter((m: Staff) => {
        const search = staffSearch === '' || `${m.first_name} ${m.last_name}`.toLowerCase().includes(staffSearch.toLowerCase()) || m.user?.email?.toLowerCase().includes(staffSearch.toLowerCase()) || m.employee_number?.toLowerCase().includes(staffSearch.toLowerCase());
        const status = statusFilter === 'all' || m.status === statusFilter;
        const branch = branchFilter === 'all' || m.branch?.id === branchFilter;
        return search && status && branch;
    }), [staff, staffSearch, statusFilter, branchFilter]);
    const staffTotalPages = Math.ceil(filteredStaff.length / 10);
    const paginatedStaff = filteredStaff.slice((staffPage - 1) * 10, staffPage * 10);
    const users = usersData?.data || [];
    const usersTotalPages = usersData?.meta?.totalPages || 1;
    const usersTotal = usersData?.meta?.total || 0;
    const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase()) || r.code.toLowerCase().includes(roleSearch.toLowerCase()));
    const uniqueStatuses = useMemo(() => Array.from(new Set(staff.map((s: Staff) => s.status))) as string[], [staff]);

    const getRoleColor = (code: string) => ({ CEO: 'from-purple-500 to-indigo-600', HR_MANAGER: 'from-pink-500 to-rose-600', REGIONAL_MANAGER: 'from-blue-500 to-cyan-600', BRANCH_MANAGER: 'from-emerald-500 to-teal-600', ACCOUNTANT: 'from-amber-500 to-orange-600' }[code] || 'from-slate-500 to-slate-600');
    const handleUserToggleStatus = (u: User) => { if (u.is_active) deactivateUserMutation.mutate(u.id); else activateUserMutation.mutate(u.id); setUserActionMenu(null); };
    const handleResetPassword = (userId: string) => { setResetPwUserId(userId); setUserActionMenu(null); };
    const handleDeleteUser = (u: User) => { setDeleteUserTarget(u); setUserActionMenu(null); };
    const handleDeleteRole = (role: Role) => { const s = roleStats.find((x) => x.id === role.id); if (s && s.count > 0) { showToast(`Cannot delete - has ${s.count} users`, 'error'); return; } setDeleteRoleTarget(role); };

    const tabs = [{ id: 'directory' as Tab, label: 'Staff Directory', icon: Users, count: staff.length }, { id: 'users' as Tab, label: 'User Accounts', icon: UserPlus, count: usersTotal }, { id: 'roles' as Tab, label: 'Roles', icon: Shield, count: roles.length }];

    return (
        <div className="space-y-6">
            {toast && <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2"><div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>{toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-400" /> : <AlertTriangle size={18} />}<span className="font-medium">{toast.text}</span></div></div>}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-slate-900">Staff Management</h1><p className="text-slate-500">Manage staff, user accounts, and roles</p></div>
                <div className="flex items-center gap-3">
                    <button onClick={() => refetchStaff()} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw size={20} /></button>
                    {activeTab === 'directory' && <div className="flex items-center gap-2">
                        <button onClick={() => { setStaffFormData({ create_onboarding: true }); setShowAddStaffModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"><Plus size={20} />Add Staff</button>
                        <button onClick={() => navigate('/recruitment')} className="flex items-center gap-2 px-4 py-2 border border-[#0066B3] text-[#0066B3] rounded-lg font-medium hover:bg-blue-50"><UserPlus size={20} />Hire via Recruitment</button>
                    </div>}
                    {activeTab === 'users' && isAdmin && <button onClick={() => { setSelectedUser(null); setUserFormData({ is_active: true, role_code: '' }); setShowUserModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"><Plus size={20} />Add User</button>}
                    {activeTab === 'roles' && isAdmin && <button onClick={() => { setSelectedRole(null); setRoleFormData({ is_active: true }); setShowRoleModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"><Plus size={20} />Create Role</button>}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-1.5 inline-flex gap-1">
                {tabs.map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id ? 'bg-[#0066B3] text-white shadow-lg shadow-blue-500/25' : 'text-slate-600 hover:bg-slate-100'}`}><tab.icon size={18} />{tab.label}<span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'}`}>{tab.count}</span></button>))}
            </div>

            {/* STAFF DIRECTORY */}
            {activeTab === 'directory' && (<>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Users className="text-[#0066B3]" size={20} /></div><div><p className="text-2xl font-bold text-slate-900">{staff.length}</p><p className="text-xs text-slate-500">Total</p></div></div></div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200"><div className="flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><Users className="text-emerald-600" size={20} /></div><div><p className="text-2xl font-bold text-slate-900">{staff.filter((s: Staff) => s.status === 'active').length}</p><p className="text-xs text-slate-500">Active</p></div></div></div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Users className="text-blue-600" size={20} /></div><div><p className="text-2xl font-bold text-slate-900">{staff.filter((s: Staff) => s.status === 'onboarding').length}</p><p className="text-xs text-slate-500">Onboarding</p></div></div></div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200"><div className="flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-lg"><Users className="text-amber-600" size={20} /></div><div><p className="text-2xl font-bold text-slate-900">{staff.filter((s: Staff) => s.status === 'probation').length}</p><p className="text-xs text-slate-500">Probation</p></div></div></div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" value={staffSearch} onChange={(e) => { setStaffSearch(e.target.value); setStaffPage(1); }} placeholder="Search by name, email, or employee number..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setStaffPage(1); }} className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white"><option value="all">All Statuses</option>{uniqueStatuses.map((s) => <option key={s} value={s}>{String(s).charAt(0).toUpperCase() + String(s).slice(1)}</option>)}</select>
                    <select value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setStaffPage(1); }} className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white"><option value="all">All Branches</option>{branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                </div></div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Employee</th><th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Position</th><th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden md:table-cell">Branch</th><th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th><th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">
                    {staffLoading ? <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-[#0066B3] mx-auto mb-2" /><p className="text-slate-500">Loading...</p></td></tr> : paginatedStaff.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 font-medium">No staff found</p></td></tr> : paginatedStaff.map((m: Staff) => (
                        <tr key={m.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-bold">{m.first_name?.charAt(0)}{m.last_name?.charAt(0)}</div><div><p className="font-medium text-slate-900">{m.first_name} {m.last_name}</p><p className="text-sm text-slate-500">{m.user?.email}</p><p className="text-xs text-slate-400">{m.employee_number}</p></div></div></td><td className="px-6 py-4 text-slate-600">{m.position?.name || '-'}</td><td className="px-6 py-4 text-slate-600 hidden md:table-cell">{m.branch?.name || '-'}</td><td className="px-6 py-4"><StatusBadge status={m.status} /></td><td className="px-6 py-4"><div className="flex items-center justify-end gap-1"><button onClick={() => navigate(`/staff/${m.id}`)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Eye size={18} /></button><div className="relative"><button onClick={() => setActionMenuId(actionMenuId === m.id ? null : m.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><MoreVertical size={18} /></button>{actionMenuId === m.id && <><div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} /><div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"><button onClick={() => { navigate(`/staff/${m.id}`); setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Eye size={16} />View</button><button onClick={() => { navigate(`/staff/${m.id}`); setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit size={16} />Edit</button>{m.user?.email && <button onClick={() => { window.location.href = `mailto:${m.user?.email}`; setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Mail size={16} />Email</button>}<hr className="my-1" /><button onClick={() => { setSelectedStaff(m); setShowDeactivateConfirm(true); setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><UserX size={16} />Deactivate</button></div></>}</div></div></td></tr>
                    ))}
                </tbody></table></div>
                {staffTotalPages > 1 && <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50"><p className="text-sm text-slate-500">Page {staffPage} of {staffTotalPages}</p><div className="flex items-center gap-2"><button onClick={() => setStaffPage(p => Math.max(1, p - 1))} disabled={staffPage === 1} className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50"><ChevronLeft size={18} /></button><button onClick={() => setStaffPage(p => Math.min(staffTotalPages, p + 1))} disabled={staffPage === staffTotalPages} className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50"><ChevronRight size={18} /></button></div></div>}
                </div>
            </>)}

            {/* USERS */}
            {activeTab === 'users' && (<>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Users size={20} className="text-[#0066B3]" /></div><div><p className="text-2xl font-bold text-slate-900">{usersTotal}</p><p className="text-xs text-slate-500">Total</p></div></div></div>
                    {roleStats.slice(0, 5).map((stat) => <div key={stat.code} className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Shield size={20} className="text-slate-600" /></div><div><p className="text-2xl font-bold text-slate-900">{stat.count}</p><p className="text-xs text-slate-500 truncate">{stat.name}</p></div></div></div>)}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Search..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div>
                    <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setUserPage(1); }} className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white"><option value="">All Roles</option>{roles.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)}</select>
                </div></div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {usersLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0066B3]" /></div> : users.length === 0 ? <div className="text-center py-12"><Users className="mx-auto text-slate-300 mb-4" size={48} /><p className="text-slate-500">No users</p></div> : <>
                        <table className="w-full"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">User</th><th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Roles</th><th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden md:table-cell">Branch</th><th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th><th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden lg:table-cell">Last Login</th><th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th></tr></thead><tbody>
                            {users.map((u: User) => (
                                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066B3] to-[#00AEEF] flex items-center justify-center text-white font-medium">{u.staff ? `${u.staff.first_name[0]}${u.staff.last_name[0]}` : u.email[0].toUpperCase()}</div><div><p className="font-medium text-slate-900">{u.staff ? `${u.staff.first_name} ${u.staff.last_name}` : u.email.split('@')[0]}</p><p className="text-sm text-slate-500">{u.email}</p></div></div></td><td className="px-6 py-4"><div className="flex flex-wrap gap-1">{u.roles.length === 0 ? <span className="text-sm text-slate-400">None</span> : u.roles.slice(0, 2).map((r) => <span key={r.id} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">{r.code}</span>)}{u.roles.length > 2 && <span className="px-2 py-0.5 bg-slate-100 text-xs rounded">+{u.roles.length - 2}</span>}</div></td><td className="px-6 py-4 hidden md:table-cell">{u.staff?.branch ? <span className="flex items-center gap-1 text-sm text-slate-600"><Building size={14} />{u.staff.branch.name}</span> : <span className="text-slate-400">-</span>}</td><td className="px-6 py-4">{u.is_active ? <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full"><CheckCircle size={12} />Active</span> : <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full"><AlertCircle size={12} />Inactive</span>}</td><td className="px-6 py-4 hidden lg:table-cell">{u.last_login_at ? <span className="flex items-center gap-1.5 text-sm text-slate-600"><Clock size={14} />{new Date(u.last_login_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span> : <span className="text-sm text-slate-400">Never</span>}</td><td className="px-6 py-4"><div className="flex items-center justify-end relative"><button onClick={() => setUserActionMenu(userActionMenu === u.id ? null : u.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><MoreVertical size={18} /></button>{userActionMenu === u.id && <><div className="fixed inset-0 z-10" onClick={() => setUserActionMenu(null)} /><div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"><button onClick={() => { setSelectedUser(u); setShowRoleAssignModal(true); setUserActionMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><Shield size={16} />Manage Roles</button><button onClick={() => handleResetPassword(u.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><Key size={16} />Reset Password</button><hr className="my-1" /><button onClick={() => handleUserToggleStatus(u)} className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${u.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>{u.is_active ? <><UserX size={16} />Deactivate</> : <><UserCheck size={16} />Activate</>}</button><button onClick={() => handleDeleteUser(u)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={16} />Delete</button></div></>}</div></td></tr>
                            ))}
                        </tbody></table>
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200"><p className="text-sm text-slate-500">Showing {users.length} of {usersTotal}</p><div className="flex items-center gap-2"><button onClick={() => setUserPage(Math.max(1, userPage - 1))} disabled={userPage === 1} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50"><ChevronLeft size={20} /></button><span className="px-4 py-2 text-sm text-slate-600">Page {userPage} of {usersTotalPages}</span><button onClick={() => setUserPage(Math.min(usersTotalPages, userPage + 1))} disabled={userPage === usersTotalPages} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-50"><ChevronRight size={20} /></button></div></div>
                    </>}
                </div>
            </>)}

            {/* ROLES */}
            {activeTab === 'roles' && (<>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">{roleStats.slice(0, 5).map((stat) => <div key={stat.id} className={`relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br ${getRoleColor(stat.code)}`}><div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" /><Shield className="mb-2 opacity-80" size={24} /><p className="text-3xl font-bold">{stat.count}</p><p className="text-sm opacity-80">{stat.name}</p></div>)}</div>
                <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex flex-col md:flex-row gap-4 items-center"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Search roles..." value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div></div></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filteredRoles.map((role) => { const stats = roleStats.find((s) => s.id === role.id); return (
                    <div key={role.id} className={`bg-white rounded-xl border ${role.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'} overflow-hidden hover:shadow-md transition-shadow`}><div className={`h-2 bg-gradient-to-r ${getRoleColor(role.code)}`} /><div className="p-5"><div className="flex items-start justify-between mb-3"><div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRoleColor(role.code)} flex items-center justify-center`}><Shield className="text-white" size={24} /></div><div><h3 className="font-semibold text-slate-900">{role.name}</h3><p className="text-sm text-slate-500 font-mono">{role.code}</p></div></div>{role.is_active ? <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full"><CheckCircle size={12} />Active</span> : <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full"><AlertCircle size={12} />Inactive</span>}</div>{role.description && <p className="text-sm text-slate-500 mb-4 line-clamp-2">{role.description}</p>}<div className="flex items-center justify-between pt-4 border-t border-slate-100"><div className="flex items-center gap-2 text-slate-600"><Users size={16} /><span className="text-sm font-medium">{stats?.count || 0} users</span></div><div className="flex items-center gap-1"><button onClick={() => { setSelectedRole(role); setRoleFormData({ code: role.code, name: role.name, description: role.description, is_active: role.is_active }); setShowRoleModal(true); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><Edit size={16} /></button><button onClick={() => role.is_active ? deactivateRoleMutation.mutate(role.id) : activateRoleMutation.mutate(role.id)} className={`p-2 hover:bg-slate-100 rounded-lg ${role.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'}`}>{role.is_active ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}</button><button onClick={() => handleDeleteRole(role)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600" disabled={(stats?.count || 0) > 0}><Trash2 size={16} /></button></div></div></div></div>
                ); })}</div>
            </>)}

            {/* MODALS */}
            {showDeactivateConfirm && selectedStaff && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-md"><div className="p-6 text-center"><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="text-red-600" size={32} /></div><h2 className="text-xl font-bold text-slate-900 mb-2">Deactivate Staff?</h2><p className="text-slate-600">Deactivate <strong>{selectedStaff.first_name} {selectedStaff.last_name}</strong>?</p></div><div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3"><button onClick={() => setShowDeactivateConfirm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300">Cancel</button><button onClick={() => selectedStaff && deactivateStaffMutation.mutate(selectedStaff.id)} disabled={deactivateStaffMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">{deactivateStaffMutation.isPending ? 'Deactivating...' : 'Deactivate'}</button></div></div></div>}

            {showUserModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl"><div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-900">{selectedUser ? 'Edit User' : 'Create User'}</h2><button onClick={() => { setShowUserModal(false); setSelectedUser(null); setUserFormData({}); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button></div><div className="p-6 space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="email" value={userFormData.email || ''} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="user@company.com" disabled={!!selectedUser} /></div></div>{!selectedUser && <><div><label className="block text-sm font-medium text-slate-700 mb-2">Assign Role</label><select value={userFormData.role_code || ''} onChange={(e) => setUserFormData({ ...userFormData, role_code: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white"><option value="">Select a role</option>{roles.map((role) => <option key={role.id} value={role.code}>{role.name}</option>)}</select></div><div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"><Mail className="text-blue-500 mt-0.5 flex-shrink-0" size={16} /><p className="text-sm text-blue-700">A welcome email with a password setup link will be sent to the user.</p></div></>}<label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer"><input type="checkbox" checked={userFormData.is_active ?? true} onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })} className="w-4 h-4 text-[#0066B3] rounded" /><span className="text-sm text-slate-700">User is active</span></label></div><div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl"><button onClick={() => { setShowUserModal(false); setSelectedUser(null); setUserFormData({}); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button><button onClick={() => createUserMutation.mutate(userFormData)} disabled={createUserMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">{createUserMutation.isPending ? 'Saving...' : 'Save'}</button></div></div></div>}

            {showRoleAssignModal && selectedUser && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl w-full max-w-md shadow-2xl"><div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-900">Change Role for {selectedUser.staff ? `${selectedUser.staff.first_name} ${selectedUser.staff.last_name}` : selectedUser.email}</h2><button onClick={() => { setShowRoleAssignModal(false); setSelectedUser(null); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button></div><div className="p-6"><div className="space-y-2 max-h-64 overflow-y-auto">{roles.map((role) => <label key={role.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedUser.roles[0]?.code === role.code ? 'border-[#0066B3] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`} onClick={() => { setSelectedUser({ ...selectedUser, roles: [role] }); }}><input type="radio" name="staff-role" checked={selectedUser.roles[0]?.code === role.code} onChange={() => { setSelectedUser({ ...selectedUser, roles: [role] }); }} className="w-4 h-4 text-[#0066B3]" /><div><p className="font-medium text-slate-900">{role.name}</p><p className="text-xs text-slate-500">{role.code}</p></div></label>)}</div></div><div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl"><button onClick={() => { setShowRoleAssignModal(false); setSelectedUser(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button><button onClick={() => { const roleCode = selectedUser.roles[0]?.code; if (roleCode) updateRolesMutation.mutate({ id: selectedUser.id, role_code: roleCode }); }} disabled={updateRolesMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">{updateRolesMutation.isPending ? 'Saving...' : 'Save Role'}</button></div></div></div>}

            {/* ADD STAFF MODAL */}
            {showAddStaffModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Add New Staff Member</h2>
                            <button onClick={() => { setShowAddStaffModal(false); setStaffFormData({}); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                                    <input type="text" value={staffFormData.first_name || ''} onChange={(e) => setStaffFormData({ ...staffFormData, first_name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="John" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                                    <input type="text" value={staffFormData.last_name || ''} onChange={(e) => setStaffFormData({ ...staffFormData, last_name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="Doe" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Work Email *</label>
                                <input type="email" value={staffFormData.email || ''} onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="john.doe@company.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input type="tel" value={staffFormData.phone || ''} onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="+254 7XX XXX XXX" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                                    <select value={staffFormData.gender || ''} onChange={(e) => setStaffFormData({ ...staffFormData, gender: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white">
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                                    <select value={staffFormData.role_id || ''} onChange={(e) => setStaffFormData({ ...staffFormData, role_id: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white">
                                        <option value="">Select Role</option>
                                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Position *</label>
                                    <select value={staffFormData.position_id || ''} onChange={(e) => setStaffFormData({ ...staffFormData, position_id: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white">
                                        <option value="">Select Position</option>
                                        {positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                                    <select value={staffFormData.branch_id || ''} onChange={(e) => setStaffFormData({ ...staffFormData, branch_id: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white">
                                        <option value="">Select Branch</option>
                                        {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                                    <select value={staffFormData.region_id || ''} onChange={(e) => setStaffFormData({ ...staffFormData, region_id: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white">
                                        <option value="">Select Region</option>
                                        {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                    <select value={staffFormData.department_id || ''} onChange={(e) => setStaffFormData({ ...staffFormData, department_id: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white">
                                        <option value="">Select Department</option>
                                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                                    <input type="date" value={staffFormData.hire_date || ''} onChange={(e) => setStaffFormData({ ...staffFormData, hire_date: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Basic Salary</label>
                                <input type="number" value={staffFormData.basic_salary || ''} onChange={(e) => setStaffFormData({ ...staffFormData, basic_salary: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="50000" />
                            </div>
                            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={staffFormData.create_onboarding !== false} onChange={(e) => setStaffFormData({ ...staffFormData, create_onboarding: e.target.checked })} className="w-4 h-4 text-[#0066B3] rounded" />
                                <div>
                                    <p className="font-medium text-slate-900">Create Onboarding Tasks</p>
                                    <p className="text-xs text-slate-500">Automatically create onboarding checklist for this staff member</p>
                                </div>
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => { setShowAddStaffModal(false); setStaffFormData({}); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button 
                                onClick={() => { if (staffValidation.validateAll(staffFormData)) createStaffMutation.mutate(staffFormData); }} 
                                disabled={createStaffMutation.isPending} 
                                className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50"
                            >
                                {createStaffMutation.isPending ? 'Creating...' : 'Create Staff Member'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRoleModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl w-full max-w-md shadow-2xl"><div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-900">{selectedRole ? 'Edit Role' : 'Create Role'}</h2><button onClick={() => { setShowRoleModal(false); setSelectedRole(null); setRoleFormData({}); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button></div><div className="p-6 space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Role Code</label><input type="text" value={roleFormData.code || ''} onChange={(e) => setRoleFormData({ ...roleFormData, code: e.target.value.toUpperCase().replace(/[^A-Z_]/g, '') })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] font-mono" placeholder="e.g., SALES_MANAGER" disabled={!!selectedRole} /><p className="text-xs text-slate-400 mt-1">Uppercase letters and underscores only</p></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label><input type="text" value={roleFormData.name || ''} onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="e.g., Sales Manager" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={roleFormData.description || ''} onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] resize-none" rows={3} placeholder="Brief description..." /></div><label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer"><input type="checkbox" checked={roleFormData.is_active ?? true} onChange={(e) => setRoleFormData({ ...roleFormData, is_active: e.target.checked })} className="w-4 h-4 text-[#0066B3] rounded" /><span className="text-sm text-slate-700">Role is active</span></label></div><div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl"><button onClick={() => { setShowRoleModal(false); setSelectedRole(null); setRoleFormData({}); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button><button onClick={() => { if (selectedRole) updateRoleMutation.mutate({ id: selectedRole.id, data: roleFormData }); else createRoleMutation.mutate(roleFormData); }} disabled={!roleFormData.code || !roleFormData.name || createRoleMutation.isPending || updateRoleMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">{createRoleMutation.isPending || updateRoleMutation.isPending ? 'Saving...' : 'Save'}</button></div></div></div>}
            {/* Reset Password Dialog */}
            <InputDialog
                isOpen={!!resetPwUserId}
                title="Reset Password"
                message="Enter the new password for this user (minimum 8 characters)."
                inputLabel="New Password"
                placeholder="Min 8 characters"
                confirmLabel="Reset Password"
                onConfirm={(password) => {
                    if (password.length >= 8 && resetPwUserId) {
                        resetPasswordMutation.mutate({ id: resetPwUserId, password });
                    }
                    setResetPwUserId(null);
                }}
                onCancel={() => setResetPwUserId(null)}
                isLoading={resetPasswordMutation.isPending}
            />

            {/* Delete User Dialog */}
            <ConfirmDialog
                isOpen={!!deleteUserTarget}
                title="Delete User"
                message={`Are you sure you want to delete ${deleteUserTarget?.email}? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => {
                    if (deleteUserTarget) deleteUserMutation.mutate(deleteUserTarget.id);
                    setDeleteUserTarget(null);
                }}
                onCancel={() => setDeleteUserTarget(null)}
                isLoading={deleteUserMutation.isPending}
            />

            {/* Delete Role Dialog */}
            <ConfirmDialog
                isOpen={!!deleteRoleTarget}
                title="Delete Role"
                message={`Are you sure you want to delete the "${deleteRoleTarget?.name}" role? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => {
                    if (deleteRoleTarget) deleteRoleMutation.mutate(deleteRoleTarget.id);
                    setDeleteRoleTarget(null);
                }}
                onCancel={() => setDeleteRoleTarget(null)}
                isLoading={deleteRoleMutation.isPending}
            />
        </div>
    );
};

export default StaffManagementPage;
