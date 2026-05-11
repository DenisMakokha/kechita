import React, { useState, useMemo, useEffect } from 'react';
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
    Key, ChevronLeft, ChevronRight, CheckCircle, AlertCircle,
    Building, Loader2, RefreshCw, AlertTriangle, UserPlus,
    Upload, Download, FileSpreadsheet, SlidersHorizontal, Save,
    Copy, Link2, Link2Off, LayoutList, LayoutGrid, GitCompare, Lock, Unlock
} from 'lucide-react';

type Tab = 'directory' | 'users' | 'roles';

interface Staff { id: string; first_name: string; last_name: string; employee_number: string; status: string; phone?: string; position?: { id: string; name: string }; branch?: { id: string; name: string }; region?: { id: string; name: string }; department?: { id: string; name: string }; user?: { email: string }; }
interface User { id: string; email: string; is_active: boolean; two_factor_enabled: boolean; last_login_at?: string; roles: { id: string; code: string; name: string }[]; staff?: { id: string; first_name: string; last_name: string; employee_number: string; branch?: { name: string }; }; }
interface Role { id: string; code: string; name: string; description?: string; is_active: boolean; }
interface RoleStats { code: string; name: string; userCount: number; permissionCount: number; }
interface Permission { id: string; code: string; name: string; module: string; description?: string; }

const ROLE_HIERARCHY: Record<string, number> = {
    CEO: 1, HR_MANAGER: 2, REGIONAL_ADMIN: 3, HR_ASSISTANT: 4,
    REGIONAL_MANAGER: 5, BRANCH_MANAGER: 6, BDM: 7, ACCOUNTANT: 8, RELATIONSHIP_OFFICER: 9,
};
const getHighestRank = (roles: { code: string }[]): number => {
    if (!roles || roles.length === 0) return 999;
    return Math.min(...roles.map(r => ROLE_HIERARCHY[r.code] ?? 999));
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', onboarding: 'bg-blue-100 text-blue-700', probation: 'bg-amber-100 text-amber-700', suspended: 'bg-red-100 text-red-700' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status?.replace(/_/g, ' ')}</span>;
};

export const StaffManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const currentUser = useAuthStore(s => s.user);
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
    const [copyFromRole, setCopyFromRole] = useState<Role | null>(null);

    // User detail drawer state
    const [drawerUser, setDrawerUser] = useState<User | null>(null);
    const [drawerTab, setDrawerTab] = useState<'overview' | 'security' | 'stafflink'>('overview');
    const [drawerRoleCode, setDrawerRoleCode] = useState('');
    const [drawerPwForm, setDrawerPwForm] = useState({ newPw: '', confirm: '' });
    const [drawerPwError, setDrawerPwError] = useState('');

    // Bulk selection state
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [bulkRoleCode, setBulkRoleCode] = useState('');
    const [showBulkRoleModal, setShowBulkRoleModal] = useState(false);

    // Staff link search (inside user drawer)
    const [staffLinkSearch, setStaffLinkSearch] = useState('');

    // Duplicate role state
    const [duplicateRoleSource, setDuplicateRoleSource] = useState<Role | null>(null);
    const [duplicateForm, setDuplicateForm] = useState({ code: '', name: '' });

    // Compare roles state
    const [compareRoleA, setCompareRoleA] = useState<Role | null>(null);
    const [compareRoleB, setCompareRoleB] = useState<Role | null>(null);
    const [showCompareModal, setShowCompareModal] = useState(false);

    // Roles view mode
    const [rolesViewMode, setRolesViewMode] = useState<'cards' | 'table'>('cards');

    // Edit staff state
    const [showEditStaffModal, setShowEditStaffModal] = useState(false);
    const [editStaffData, setEditStaffData] = useState<any>({});

    // Promote state
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [promoteData, setPromoteData] = useState<any>({});

    // Transfer state
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferData, setTransferData] = useState<any>({ branch_id: '', region_id: '', effective_date: '', reason: '' });

    // Permissions panel state
    const [permRoleId, setPermRoleId] = useState<string | null>(null);
    const [permRoleName, setPermRoleName] = useState<string>('');

    // Manage Role drawer state
    const [manageRole, setManageRole] = useState<Role | null>(null);
    const [manageRoleTab, setManageRoleTab] = useState<'details' | 'permissions' | 'users'>('permissions');
    const [permSearch, setPermSearch] = useState('');
    const [pendingPermIds, setPendingPermIds] = useState<Set<string>>(new Set());
    const [permsDirty, setPermsDirty] = useState(false);
    const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
    const [editDetailsData, setEditDetailsData] = useState<Partial<Role>>({});

    // Bulk import state
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
    const [bulkImportResult, setBulkImportResult] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);

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

    // HR policy settings
    const { data: hrPolicy } = useQuery<Record<string, any>>({
        queryKey: ['hr-settings'],
        queryFn: async () => (await api.get('/settings/category/hr')).data,
    });
    const hrProbationMonths = Number(hrPolicy?.hr_probation_default_months ?? 3);
    const hrNoticePeriodMonths = Number(hrPolicy?.hr_notice_period_months ?? 1);
    const hrStaffPrefix = hrPolicy?.hr_staff_number_prefix ?? 'KEC';
    const hrRequireNok = hrPolicy?.hr_nok_required ?? true;

    // Queries
    const { data: staff = [], isLoading: staffLoading, refetch: refetchStaff } = useQuery({ queryKey: ['staff'], queryFn: async () => { const res = (await api.get('/staff')).data; return Array.isArray(res) ? res : (res?.data ?? []); }, refetchInterval: 60000 });
    const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get('/org/branches')).data });
    const { data: positions = [] } = useQuery({ queryKey: ['positions'], queryFn: async () => (await api.get('/org/positions')).data });
    const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: async () => (await api.get('/org/regions')).data });
    const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: async () => (await api.get('/org/departments')).data });
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['users', userPage, userSearch, roleFilter],
        queryFn: async () => { const p = new URLSearchParams(); p.append('page', userPage.toString()); p.append('limit', '15'); if (userSearch) p.append('search', userSearch); if (roleFilter) p.append('role_code', roleFilter); return (await api.get(`/users?${p}`)).data; },
        enabled: activeTab === 'users',
    });
    const { data: roles = [] } = useQuery<Role[]>({ queryKey: ['roles'], queryFn: async () => { const res = (await api.get('/roles?include_inactive=true')).data; return Array.isArray(res) ? res : (res?.data ?? []); } });
    const { data: roleStats = [] } = useQuery<RoleStats[]>({ queryKey: ['role-stats'], queryFn: async () => { const res = (await api.get('/roles/stats')).data; return Array.isArray(res) ? res : []; } });
    const { data: allPermissions = [] } = useQuery<Permission[]>({ queryKey: ['permissions-all'], queryFn: async () => (await api.get('/roles/permissions/all')).data, enabled: activeTab === 'roles' });
    const { data: rolePermissions = [] } = useQuery<Permission[]>({ queryKey: ['role-permissions', permRoleId], queryFn: async () => (await api.get(`/roles/${permRoleId}/permissions`)).data, enabled: !!permRoleId });
    const { data: manageRolePermsData = [], isLoading: manageRolePermsLoading } = useQuery<Permission[]>({ queryKey: ['role-perms-manage', manageRole?.id], queryFn: async () => (await api.get(`/roles/${manageRole!.id}/permissions`)).data, enabled: !!manageRole });
    useEffect(() => { if (manageRolePermsData.length > 0 && !permsDirty) { setPendingPermIds(new Set(manageRolePermsData.map((p: Permission) => p.id))); } }, [manageRolePermsData]);
    const { data: roleUsers = [], isLoading: roleUsersLoading } = useQuery<User[]>({ queryKey: ['users-by-role', manageRole?.code], queryFn: async () => (await api.get(`/users/by-role/${manageRole!.code}`)).data, enabled: !!manageRole && manageRoleTab === 'users' });
    const { data: unlinkedStaff = [] } = useQuery<any[]>({ queryKey: ['staff-unlinked'], queryFn: async () => { const res = (await api.get('/staff')).data; const all = Array.isArray(res) ? res : (res?.data ?? []); return all.filter((s: any) => !s.user); }, enabled: !!drawerUser && drawerTab === 'stafflink' && !drawerUser.staff });
    const { data: drawerUserPermsRole } = useQuery<Permission[]>({ queryKey: ['role-perms-compare-a', compareRoleA?.id], queryFn: async () => (await api.get(`/roles/${compareRoleA!.id}/permissions`)).data, enabled: !!compareRoleA && showCompareModal });
    const { data: drawerRoleBPerms } = useQuery<Permission[]>({ queryKey: ['role-perms-compare-b', compareRoleB?.id], queryFn: async () => (await api.get(`/roles/${compareRoleB!.id}/permissions`)).data, enabled: !!compareRoleB && showCompareModal });

    // Mutations
    const deactivateStaffMutation = useMutation({ mutationFn: (id: string) => api.post(`/staff/${id}/deactivate`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); showToast('Staff deactivated'); setShowDeactivateConfirm(false); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate staff', 'error') });
    const activateStaffMutation = useMutation({ mutationFn: (id: string) => api.post(`/staff/${id}/activate`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); showToast('Staff reactivated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to activate staff', 'error') });
    const updateStaffMutation = useMutation({ mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.patch(`/staff/${id}`, data)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setShowEditStaffModal(false); showToast('Staff updated successfully'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update staff', 'error') });
    const promoteStaffMutation = useMutation({ mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.post(`/staff/${id}/promote`, data)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setShowPromoteModal(false); showToast('Staff promoted successfully'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to promote staff', 'error') });
    const transferStaffMutation = useMutation({ mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.post(`/staff/${id}/transfer`, data)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setShowTransferModal(false); showToast('Staff transferred successfully'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to transfer staff', 'error') });
    const createStaffMutation = useMutation({ 
        mutationFn: async (data: any) => (await api.post('/staff', data)).data, 
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setShowAddStaffModal(false); setStaffFormData({}); showToast('Staff member created successfully'); },
        onError: (err: any) => showToast(err.response?.data?.message || 'Failed to create staff', 'error')
    });
    const createUserMutation = useMutation({ mutationFn: async (data: any) => (await api.post('/users', data)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowUserModal(false); setUserFormData({}); showToast('User created'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create user', 'error') });
    const updateRolesMutation = useMutation({ mutationFn: async ({ id, role_code }: { id: string; role_code: string }) => (await api.patch(`/users/${id}/roles`, { role_code })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowRoleAssignModal(false); showToast('Role updated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update role', 'error') });
    const activateUserMutation = useMutation({ mutationFn: async (id: string) => (await api.post(`/users/${id}/activate`)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); showToast('User activated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to activate user', 'error') });
    const deactivateUserMutation = useMutation({ mutationFn: async (id: string) => (await api.post(`/users/${id}/deactivate`)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); showToast('User deactivated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate user', 'error') });
    const resetPasswordMutation = useMutation({ mutationFn: async ({ id, password }: { id: string; password: string }) => (await api.patch(`/users/${id}/password`, { new_password: password })).data, onSuccess: () => { setUserActionMenu(null); showToast('Password reset'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to reset password', 'error') });
    const setRolePermissionsMutation = useMutation({ mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => (await api.post(`/roles/${roleId}/permissions`, { permissionIds })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['role-permissions', permRoleId] }); showToast('Permissions saved'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to save permissions', 'error') });
    const deleteUserMutation = useMutation({ mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); showToast('User deleted'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete user', 'error') });
    const createRoleMutation = useMutation({ mutationFn: async (data: Partial<Role>) => (await api.post('/roles', data)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setShowRoleModal(false); setRoleFormData({}); showToast('Role created'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create role', 'error') });
    const updateRoleMutation = useMutation({ mutationFn: async ({ id, data }: { id: string; data: Partial<Role> }) => (await api.patch(`/roles/${id}`, data)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setShowRoleModal(false); showToast('Role updated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update role', 'error') });
    const deleteRoleMutation = useMutation({ mutationFn: async (id: string) => (await api.delete(`/roles/${id}`)).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); showToast('Role deleted'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete role', 'error') });
    const activateRoleMutation = useMutation({ mutationFn: async (id: string) => (await api.post(`/roles/${id}/activate`)).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }), onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to activate role', 'error') });
    const deactivateRoleMutation = useMutation({ mutationFn: async (id: string) => (await api.post(`/roles/${id}/deactivate`)).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }), onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate role', 'error') });
    const savePermsMutation = useMutation({ mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => (await api.post(`/roles/${roleId}/permissions`, { permissionIds })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['role-perms-manage', manageRole?.id] }); setPermsDirty(false); showToast('Permissions saved'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to save permissions', 'error') });
    const updateRoleDetailsMutation = useMutation({ mutationFn: async ({ id, data }: { id: string; data: Partial<Role> }) => (await api.patch(`/roles/${id}`, data)).data, onSuccess: (updated: Role) => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setManageRole(updated); showToast('Role updated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update role', 'error') });
    const duplicateRoleMutation = useMutation({ mutationFn: async ({ id, code, name }: { id: string; code: string; name: string }) => (await api.post(`/roles/${id}/duplicate`, { code, name })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); queryClient.invalidateQueries({ queryKey: ['role-stats'] }); setDuplicateRoleSource(null); setDuplicateForm({ code: '', name: '' }); showToast('Role duplicated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to duplicate role', 'error') });
    const updateDrawerRoleMutation = useMutation({ mutationFn: async ({ id, role_code }: { id: string; role_code: string }) => (await api.patch(`/users/${id}/roles`, { role_code })).data, onSuccess: (updated: User) => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['role-stats'] }); setDrawerUser(updated); showToast('Role updated'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update role', 'error') });
    const linkStaffMutation = useMutation({ mutationFn: async ({ staffId, userId }: { staffId: string; userId: string | null }) => (await api.patch(`/staff/${staffId}`, { user_id: userId })).data, onSuccess: (_data: any, variables: { staffId: string; userId: string | null }) => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['staff'] }); queryClient.invalidateQueries({ queryKey: ['staff-unlinked'] }); showToast(variables.userId ? 'User linked to staff' : 'User unlinked from staff'); if (drawerUser) { const updated = { ...drawerUser }; if (!variables.userId) updated.staff = undefined; setDrawerUser(updated); } }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update link', 'error') });
    const bulkActivateMutation = useMutation({ mutationFn: async (ids: string[]) => Promise.allSettled(ids.map(id => api.post(`/users/${id}/activate`))), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setSelectedUserIds(new Set()); showToast(`Activated ${selectedUserIds.size} users`); } });
    const bulkDeactivateMutation = useMutation({ mutationFn: async (ids: string[]) => Promise.allSettled(ids.map(id => api.post(`/users/${id}/deactivate`))), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setSelectedUserIds(new Set()); showToast(`Deactivated ${selectedUserIds.size} users`); } });
    const bulkAssignRoleMutation = useMutation({ mutationFn: async ({ ids, role_code }: { ids: string[]; role_code: string }) => Promise.allSettled(ids.map(id => api.patch(`/users/${id}/roles`, { role_code }))), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['role-stats'] }); setSelectedUserIds(new Set()); setShowBulkRoleModal(false); showToast(`Role assigned to ${selectedUserIds.size} users`); } });

    const bulkImportMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return (await api.post('/staff/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
        },
        onSuccess: (data) => {
            setBulkImportResult(data);
            setBulkImportFile(null);
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Import failed', 'error'),
    });

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/staff/bulk-import/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `staff-import-template-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            showToast('Failed to download template', 'error');
        }
    };

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
    const usersTotalPages = usersData?.totalPages || 1;
    const usersTotal = usersData?.total || 0;
    const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase()) || r.code.toLowerCase().includes(roleSearch.toLowerCase()));
    const uniqueStatuses = useMemo(() => Array.from(new Set(staff.map((s: Staff) => s.status))) as string[], [staff]);

    const getRoleColor = (code: string) => ({ CEO: 'from-purple-500 to-indigo-600', HR_MANAGER: 'from-pink-500 to-rose-600', REGIONAL_MANAGER: 'from-blue-500 to-cyan-600', BRANCH_MANAGER: 'from-emerald-500 to-teal-600', ACCOUNTANT: 'from-amber-500 to-orange-600' }[code] || 'from-slate-500 to-slate-600');
    const handleUserToggleStatus = (u: User) => { if (u.is_active) deactivateUserMutation.mutate(u.id); else activateUserMutation.mutate(u.id); setUserActionMenu(null); };
    const handleResetPassword = (userId: string) => { setResetPwUserId(userId); setUserActionMenu(null); };
    const handleDeleteUser = (u: User) => { setDeleteUserTarget(u); setUserActionMenu(null); };
    const handleDeleteRole = (role: Role) => { const s = roleStats.find((x) => x.code === role.code); if (s && s.userCount > 0) { showToast(`Cannot delete - has ${s.userCount} users`, 'error'); return; } setDeleteRoleTarget(role); };

    const openUserDrawer = (u: User) => { setDrawerUser(u); setDrawerTab('overview'); setDrawerRoleCode(u.roles[0]?.code || ''); setDrawerPwForm({ newPw: '', confirm: '' }); setDrawerPwError(''); };
    const toggleUserSelect = (id: string) => setSelectedUserIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const selectAllUsers = () => setSelectedUserIds(new Set(users.map((u: User) => u.id)));
    const getRoleColor2 = (code: string): string => ({ CEO: 'bg-purple-100 text-purple-700', HR_MANAGER: 'bg-pink-100 text-pink-700', REGIONAL_MANAGER: 'bg-blue-100 text-blue-700', BRANCH_MANAGER: 'bg-emerald-100 text-emerald-700', ACCOUNTANT: 'bg-amber-100 text-amber-700', HR_ASSISTANT: 'bg-indigo-100 text-indigo-700', BDM: 'bg-teal-100 text-teal-700', RELATIONSHIP_OFFICER: 'bg-cyan-100 text-cyan-700' }[code] || 'bg-slate-100 text-slate-700');
    const formatRelTime = (dateStr?: string) => { if (!dateStr) return 'Never'; const diff = Date.now() - new Date(dateStr).getTime(); if (diff < 60000) return 'Just now'; if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`; return `${Math.floor(diff/86400000)}d ago`; };

    const tabs = [{ id: 'directory' as Tab, label: 'Staff Directory', icon: Users, count: staff.length }, { id: 'users' as Tab, label: 'User Accounts', icon: UserPlus, count: usersTotal }, { id: 'roles' as Tab, label: 'Roles', icon: Shield, count: roles.length }];

    return (
        <div className="space-y-6">
            {toast && <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2"><div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>{toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-400" /> : <AlertTriangle size={18} />}<span className="font-medium">{toast.text}</span></div></div>}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-slate-900">Staff Management</h1><p className="text-slate-500">Manage staff, user accounts, and roles</p></div>
                <div className="flex items-center gap-3">
                    <button onClick={() => refetchStaff()} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw size={20} /></button>
                    {activeTab === 'directory' && <div className="flex items-center gap-2">
                        <button onClick={() => { setBulkImportFile(null); setBulkImportResult(null); setShowBulkImportModal(true); }} className="flex items-center gap-2 px-4 py-2 border border-emerald-600 text-emerald-700 rounded-lg font-medium hover:bg-emerald-50"><FileSpreadsheet size={18} />Bulk Import</button>
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
                        <tr key={m.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#0066B3] flex items-center justify-center text-white font-bold">{m.first_name?.charAt(0)}{m.last_name?.charAt(0)}</div><div><p className="font-medium text-slate-900">{m.first_name} {m.last_name}</p><p className="text-sm text-slate-500">{m.user?.email}</p><p className="text-xs text-slate-400">{m.employee_number}</p></div></div></td><td className="px-6 py-4 text-slate-600">{m.position?.name || '-'}</td><td className="px-6 py-4 text-slate-600 hidden md:table-cell">{m.branch?.name || '-'}</td><td className="px-6 py-4"><StatusBadge status={m.status} /></td><td className="px-6 py-4"><div className="flex items-center justify-end gap-1"><button onClick={() => navigate(`/staff/${m.id}`)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Eye size={18} /></button><div className="relative"><button onClick={() => setActionMenuId(actionMenuId === m.id ? null : m.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><MoreVertical size={18} /></button>{actionMenuId === m.id && <><div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} /><div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"><button onClick={() => { navigate(`/staff/${m.id}`); setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Eye size={16} />View</button><button onClick={() => { setSelectedStaff(m); setEditStaffData({ first_name: m.first_name, last_name: m.last_name, phone: m.phone || '', position_id: m.position?.id || '', branch_id: m.branch?.id || '', department_id: m.department?.id || '', region_id: m.region?.id || '' }); setShowEditStaffModal(true); setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit size={16} />Edit</button><button onClick={() => { setSelectedStaff(m); setPromoteData({ new_position_id: '', new_salary: '', effective_date: new Date().toISOString().split('T')[0], reason: '' }); setShowPromoteModal(true); setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><ShieldCheck size={16} />Promote</button><button onClick={() => { setSelectedStaff(m); setTransferData({ branch_id: '', region_id: '', effective_date: new Date().toISOString().split('T')[0], reason: '' }); setShowTransferModal(true); setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Building size={16} />Transfer</button>{m.user?.email && <button onClick={() => { window.location.href = `mailto:${m.user?.email}`; setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Mail size={16} />Email</button>}<hr className="my-1" />{m.status === 'suspended' ? <button onClick={() => { activateStaffMutation.mutate(m.id); setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"><UserCheck size={16} />Reactivate</button> : <button onClick={() => { setSelectedStaff(m); setShowDeactivateConfirm(true); setActionMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><UserX size={16} />Suspend</button>}</div></>}</div></div></td></tr>
                    ))}
                </tbody></table></div>
                {staffTotalPages > 1 && <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50"><p className="text-sm text-slate-500">Page {staffPage} of {staffTotalPages}</p><div className="flex items-center gap-2"><button onClick={() => setStaffPage(p => Math.max(1, p - 1))} disabled={staffPage === 1} className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50"><ChevronLeft size={18} /></button><button onClick={() => setStaffPage(p => Math.min(staffTotalPages, p + 1))} disabled={staffPage === staffTotalPages} className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50"><ChevronRight size={18} /></button></div></div>}
                </div>
            </>)}

            {/* USERS */}
            {activeTab === 'users' && (<>
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Users size={20} className="text-[#0066B3]" /></div>
                            <div><p className="text-2xl font-bold text-slate-900">{usersTotal}</p><p className="text-xs text-slate-500">Total</p></div>
                        </div>
                    </div>
                    {roleStats.slice(0, 5).map((stat) => (
                        <div key={stat.code} className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center gap-3">
                                <div className={"w-10 h-10 rounded-lg flex items-center justify-center " + getRoleColor2(stat.code).split(' ')[0]}><Shield size={18} className={getRoleColor2(stat.code).split(' ')[1]} /></div>
                                <div><p className="text-2xl font-bold text-slate-900">{stat.userCount}</p><p className="text-xs text-slate-500 truncate">{stat.name}</p></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bulk action toolbar */}
                {selectedUserIds.size > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#0066B3] text-white rounded-xl shadow-lg">
                        <span className="font-semibold text-sm">{selectedUserIds.size} selected</span>
                        <div className="h-4 w-px bg-white/30" />
                        <button onClick={() => bulkActivateMutation.mutate(Array.from(selectedUserIds))} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium"><CheckCircle size={14} />Activate</button>
                        <button onClick={() => bulkDeactivateMutation.mutate(Array.from(selectedUserIds))} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium"><AlertCircle size={14} />Deactivate</button>
                        <button onClick={() => setShowBulkRoleModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium"><Shield size={14} />Assign Role</button>
                        <div className="ml-auto"><button onClick={() => setSelectedUserIds(new Set())} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={16} /></button></div>
                    </div>
                )}

                {/* Search + filter */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search by name or email..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div>
                        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setUserPage(1); }} className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-sm">
                            <option value="">All Roles</option>
                            {roles.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)}
                        </select>
                        <button onClick={selectAllUsers} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Select All</button>
                    </div>
                </div>

                {/* User table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {usersLoading ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0066B3]" /></div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-16"><Users className="mx-auto text-slate-300 mb-4" size={48} /><p className="text-slate-500">No users found</p></div>
                    ) : (
                        <>
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-10"><input type="checkbox" checked={selectedUserIds.size === users.length && users.length > 0} onChange={(e) => e.target.checked ? selectAllUsers() : setSelectedUserIds(new Set())} className="w-4 h-4 text-[#0066B3] rounded" /></th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">User</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Role</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 hidden md:table-cell">Branch</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 hidden lg:table-cell">2FA</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 hidden lg:table-cell">Last Login</th>
                                        <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((u: User) => {
                                        const myRank = getHighestRank(currentUser?.roles || []);
                                        const targetRank = getHighestRank(u.roles || []);
                                        const canModify = myRank < targetRank;
                                        const isSelected = selectedUserIds.has(u.id);
                                        return (
                                            <tr key={u.id} className={"border-b border-slate-100 hover:bg-slate-50 transition-colors " + (isSelected ? "bg-blue-50" : "")}>
                                                <td className="px-4 py-3"><input type="checkbox" checked={isSelected} onChange={() => toggleUserSelect(u.id)} className="w-4 h-4 text-[#0066B3] rounded" /></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => openUserDrawer(u)}>
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0066B3] to-[#00AEEF] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                                            {u.staff ? `${u.staff.first_name[0]}${u.staff.last_name[0]}` : u.email[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900 text-sm hover:text-[#0066B3]">{u.staff ? `${u.staff.first_name} ${u.staff.last_name}` : u.email.split('@')[0]}</p>
                                                            <p className="text-xs text-slate-500">{u.email}</p>
                                                            {u.staff?.employee_number && <p className="text-xs text-slate-400 font-mono">{u.staff.employee_number}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {u.roles.length === 0
                                                        ? <span className="text-xs text-slate-400 italic">No role</span>
                                                        : <span className={"px-2.5 py-1 text-xs font-semibold rounded-full " + getRoleColor2(u.roles[0].code)}>{u.roles[0].name}</span>}
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    {u.staff?.branch ? <span className="flex items-center gap-1 text-sm text-slate-600"><Building size={13} />{u.staff.branch.name}</span> : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {u.is_active
                                                        ? <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full"><CheckCircle size={10} />Active</span>
                                                        : <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-full"><AlertCircle size={10} />Inactive</span>}
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    {u.two_factor_enabled
                                                        ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><Lock size={12} />On</span>
                                                        : <span className="flex items-center gap-1 text-xs text-slate-400"><Unlock size={12} />Off</span>}
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <span className="text-xs text-slate-500">{formatRelTime(u.last_login_at)}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => openUserDrawer(u)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#0066B3]" title="Open details"><Eye size={15} /></button>
                                                        {!canModify && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Protected</span>}
                                                        <div className="relative">
                                                            <button onClick={() => setUserActionMenu(userActionMenu === u.id ? null : u.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><MoreVertical size={15} /></button>
                                                            {userActionMenu === u.id && (
                                                                <>
                                                                    <div className="fixed inset-0 z-10" onClick={() => setUserActionMenu(null)} />
                                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                                                                        <button onClick={() => { openUserDrawer(u); setUserActionMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><Eye size={15} />View Details</button>
                                                                        {canModify && <>
                                                                            <button onClick={() => { setSelectedUser(u); setShowRoleAssignModal(true); setUserActionMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><Shield size={15} />Change Role</button>
                                                                            <button onClick={() => handleResetPassword(u.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><Key size={15} />Reset Password</button>
                                                                            <hr className="my-1 border-slate-100" />
                                                                            <button onClick={() => handleUserToggleStatus(u)} className={"w-full flex items-center gap-2 px-4 py-2 text-sm " + (u.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50")}>
                                                                                {u.is_active ? <><UserX size={15} />Deactivate</> : <><UserCheck size={15} />Activate</>}
                                                                            </button>
                                                                            <button onClick={() => handleDeleteUser(u)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={15} />Delete</button>
                                                                        </>}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                                <p className="text-sm text-slate-500">Showing {users.length} of {usersTotal} users</p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setUserPage(Math.max(1, userPage - 1))} disabled={userPage === 1} className="p-2 hover:bg-white rounded-lg disabled:opacity-40 border border-slate-200"><ChevronLeft size={16} /></button>
                                    <span className="px-3 py-1 text-sm text-slate-600">Page {userPage} of {usersTotalPages}</span>
                                    <button onClick={() => setUserPage(Math.min(usersTotalPages, userPage + 1))} disabled={userPage === usersTotalPages} className="p-2 hover:bg-white rounded-lg disabled:opacity-40 border border-slate-200"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </>)}

            {/* ROLES */}
            {activeTab === 'roles' && (<>
                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Shield size={20} className="text-[#0066B3]" /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{roles.length}</p><p className="text-xs text-slate-500">Total Roles</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle size={20} className="text-emerald-600" /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{roles.filter(r => r.is_active).length}</p><p className="text-xs text-slate-500">Active</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Key size={20} className="text-purple-600" /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{allPermissions.length}</p><p className="text-xs text-slate-500">Permissions</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Users size={20} className="text-amber-600" /></div>
                        <div><p className="text-2xl font-bold text-slate-900">{roleStats.reduce((s, r) => s + r.userCount, 0)}</p><p className="text-xs text-slate-500">Users w/ Roles</p></div>
                    </div>
                </div>
                {/* Search + view toggle */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" placeholder="Search roles by name or code…" value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                        </div>
                        <p className="text-sm text-slate-500 whitespace-nowrap">{filteredRoles.length} of {roles.length} roles</p>
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                            <button onClick={() => setRolesViewMode('cards')} className={"p-1.5 rounded " + (rolesViewMode === 'cards' ? "bg-white shadow text-[#0066B3]" : "text-slate-500 hover:text-slate-700")}><LayoutGrid size={16} /></button>
                            <button onClick={() => setRolesViewMode('table')} className={"p-1.5 rounded " + (rolesViewMode === 'table' ? "bg-white shadow text-[#0066B3]" : "text-slate-500 hover:text-slate-700")}><LayoutList size={16} /></button>
                        </div>
                    </div>
                </div>
                {/* Role cards / table */}
                {rolesViewMode === 'cards' ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredRoles.map((role) => {
                            const roleStat = roleStats.find((s) => s.code === role.code);
                            const rank = ROLE_HIERARCHY[role.code];
                            return (
                                <div key={role.id} className={"bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-lg " + (role.is_active ? "border-slate-200" : "border-slate-200 opacity-60")}>
                                    <div className={"h-1.5 bg-gradient-to-r " + getRoleColor(role.code)} />
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={"w-12 h-12 rounded-xl bg-gradient-to-br " + getRoleColor(role.code) + " flex items-center justify-center shadow-sm"}>
                                                    <Shield className="text-white" size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900 leading-tight">{role.name}</h3>
                                                    <p className="text-xs text-slate-400 font-mono mt-0.5">{role.code}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                {role.is_active
                                                    ? <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full"><CheckCircle size={10} />Active</span>
                                                    : <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-full"><AlertCircle size={10} />Inactive</span>}
                                                {rank && <span className="text-xs text-slate-400 font-mono">Rank #{rank}</span>}
                                            </div>
                                        </div>
                                        {role.description && <p className="text-sm text-slate-500 mb-4 line-clamp-2">{role.description}</p>}
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                                                <Users size={14} className="text-slate-400" />
                                                <span className="text-sm font-semibold text-slate-800">{roleStat?.userCount ?? 0}</span>
                                                <span className="text-xs text-slate-500">users</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                                                <Key size={14} className="text-purple-400" />
                                                <span className="text-sm font-semibold text-slate-800">{roleStat?.permissionCount ?? 0}</span>
                                                <span className="text-xs text-slate-500">perms</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <button
                                                onClick={() => { setManageRole(role); setManageRoleTab('permissions'); setPendingPermIds(new Set()); setPermsDirty(false); setPermSearch(''); setCollapsedModules(new Set()); setEditDetailsData({ name: role.name, description: role.description }); }}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white text-sm font-medium rounded-lg hover:bg-[#005299]"
                                            >
                                                <SlidersHorizontal size={14} />Manage
                                            </button>
                                            <div className="flex items-center gap-0.5">
                                                <button onClick={() => { setCompareRoleA(role); setCompareRoleB(null); setShowCompareModal(true); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600" title="Compare"><GitCompare size={15} /></button>
                                                <button onClick={() => { setDuplicateRoleSource(role); setDuplicateForm({ code: 'COPY_OF_' + role.code, name: 'Copy of ' + role.name }); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600" title="Duplicate"><Copy size={15} /></button>
                                                <button onClick={() => { setSelectedRole(role); setRoleFormData({ code: role.code, name: role.name, description: role.description, is_active: role.is_active }); setShowRoleModal(true); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600" title="Edit"><Edit size={15} /></button>
                                                {role.is_active
                                                    ? <button onClick={() => deactivateRoleMutation.mutate(role.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600" title="Deactivate"><ShieldOff size={15} /></button>
                                                    : <button onClick={() => activateRoleMutation.mutate(role.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600" title="Activate"><ShieldCheck size={15} /></button>}
                                                <button onClick={() => handleDeleteRole(role)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600" disabled={(roleStat?.userCount ?? 0) > 0}><Trash2 size={15} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredRoles.length === 0 && (
                            <div className="col-span-3 text-center py-16">
                                <Shield className="mx-auto text-slate-300 mb-3" size={48} />
                                <p className="text-slate-500 font-medium">No roles found</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Hierarchy table view */
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Rank</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Users</th>
                                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Permissions</th>
                                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...filteredRoles].sort((a, b) => (ROLE_HIERARCHY[a.code] ?? 999) - (ROLE_HIERARCHY[b.code] ?? 999)).map((role) => {
                                    const roleStat = roleStats.find((s) => s.code === role.code);
                                    const rank = ROLE_HIERARCHY[role.code];
                                    return (
                                        <tr key={role.id} className={"hover:bg-slate-50 " + (role.is_active ? "" : "opacity-60")}>
                                            <td className="px-5 py-3">
                                                {rank ? <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">#{rank}</span> : <span className="text-xs text-slate-400">—</span>}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={"w-9 h-9 rounded-lg bg-gradient-to-br " + getRoleColor(role.code) + " flex items-center justify-center flex-shrink-0"}>
                                                        <Shield className="text-white" size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 text-sm">{role.name}</p>
                                                        {role.description && <p className="text-xs text-slate-400 truncate max-w-[200px]">{role.description}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3"><span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{role.code}</span></td>
                                            <td className="px-5 py-3 text-center">
                                                <span className="font-semibold text-slate-800">{roleStat?.userCount ?? 0}</span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className="font-semibold text-purple-700">{roleStat?.permissionCount ?? 0}</span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <button
                                                    onClick={() => role.is_active ? deactivateRoleMutation.mutate(role.id) : activateRoleMutation.mutate(role.id)}
                                                    className={"px-2.5 py-1 text-xs font-medium rounded-full " + (role.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                                                >
                                                    {role.is_active ? "Active" : "Inactive"}
                                                </button>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button onClick={() => { setManageRole(role); setManageRoleTab('permissions'); setPendingPermIds(new Set()); setPermsDirty(false); setPermSearch(''); setCollapsedModules(new Set()); setEditDetailsData({ name: role.name, description: role.description }); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-[#0066B3]" title="Manage"><SlidersHorizontal size={14} /></button>
                                                    <button onClick={() => { setCompareRoleA(role); setCompareRoleB(null); setShowCompareModal(true); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600" title="Compare"><GitCompare size={14} /></button>
                                                    <button onClick={() => { setDuplicateRoleSource(role); setDuplicateForm({ code: 'COPY_OF_' + role.code, name: 'Copy of ' + role.name }); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600" title="Duplicate"><Copy size={14} /></button>
                                                    <button onClick={() => handleDeleteRole(role)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600" disabled={(roleStat?.userCount ?? 0) > 0}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
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
                            {hrPolicy && (
                                <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs">
                                    📋 HR Policy: Staff numbers prefixed with <strong>{hrStaffPrefix}</strong> · Default probation <strong>{hrProbationMonths} months</strong> · Notice period <strong>{hrNoticePeriodMonths} month(s)</strong>{hrRequireNok ? ' · Next of Kin required' : ''}
                                </div>
                            )}
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
                inputType="password"
                minLength={8}
                placeholder="Min 8 characters"
                confirmLabel="Reset Password"
                onConfirm={(password) => {
                    if (resetPwUserId) resetPasswordMutation.mutate({ id: resetPwUserId, password });
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

            {/* Copy permissions from role */}
            <ConfirmDialog
                isOpen={!!copyFromRole}
                title="Copy Permissions"
                message={`Replace current pending selection with all permissions from "${copyFromRole?.name}"? Save afterwards to apply.`}
                confirmLabel="Copy Permissions"
                onConfirm={async () => {
                    if (!copyFromRole) return;
                    try {
                        const perms = await api.get(`/roles/${copyFromRole.id}/permissions`).then(res => res.data as Permission[]);
                        setPendingPermIds(new Set(perms.map(p => p.id)));
                        setPermsDirty(true);
                    } catch (e: any) {
                        showToast(e?.response?.data?.message || 'Failed to load permissions', 'error');
                    } finally {
                        setCopyFromRole(null);
                    }
                }}
                onCancel={() => setCopyFromRole(null)}
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

            {/* BULK IMPORT MODAL */}
            {showBulkImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <FileSpreadsheet className="text-emerald-600" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Bulk Import Staff</h2>
                                    <p className="text-xs text-slate-500">Upload an Excel file to add multiple staff at once</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowBulkImportModal(false); setBulkImportFile(null); setBulkImportResult(null); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Results view */}
                            {bulkImportResult ? (
                                <div className="space-y-4">
                                    {/* Summary */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                                            <p className="text-3xl font-bold text-slate-900">{bulkImportResult.total}</p>
                                            <p className="text-sm text-slate-500 mt-1">Total Rows</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
                                            <p className="text-3xl font-bold text-emerald-700">{bulkImportResult.succeeded}</p>
                                            <p className="text-sm text-emerald-600 mt-1">Imported</p>
                                        </div>
                                        <div className={`rounded-xl p-4 text-center border ${bulkImportResult.failed > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                            <p className={`text-3xl font-bold ${bulkImportResult.failed > 0 ? 'text-red-700' : 'text-slate-400'}`}>{bulkImportResult.failed}</p>
                                            <p className={`text-sm mt-1 ${bulkImportResult.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>Failed</p>
                                        </div>
                                    </div>

                                    {/* Success banner */}
                                    {bulkImportResult.succeeded > 0 && (
                                        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <CheckCircle className="text-emerald-600 flex-shrink-0" size={20} />
                                            <div>
                                                <p className="font-medium text-emerald-800">{bulkImportResult.succeeded} staff member{bulkImportResult.succeeded !== 1 ? 's' : ''} imported successfully</p>
                                                <p className="text-sm text-emerald-600">Each staff member will receive a welcome email to set their password.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Created list */}
                                    {bulkImportResult.created?.length > 0 && (
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                                <p className="text-sm font-semibold text-slate-700">Successfully Created</p>
                                            </div>
                                            <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                                                {bulkImportResult.created.map((c: any) => (
                                                    <div key={c.row} className="flex items-center justify-between px-4 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="text-emerald-500" size={14} />
                                                            <span className="text-sm text-slate-700">{c.email}</span>
                                                        </div>
                                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{c.employee_number}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Errors list */}
                                    {bulkImportResult.errors?.length > 0 && (
                                        <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 bg-red-50 border-b border-red-200">
                                                <p className="text-sm font-semibold text-red-700">Rows with Errors (skipped)</p>
                                            </div>
                                            <div className="divide-y divide-red-50 max-h-48 overflow-y-auto">
                                                {bulkImportResult.errors.map((e: any) => (
                                                    <div key={e.row} className="px-4 py-3">
                                                        <div className="flex items-start gap-2">
                                                            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={14} />
                                                            <div>
                                                                <p className="text-sm font-medium text-red-800">Row {e.row} — {e.email}</p>
                                                                <p className="text-xs text-red-600 mt-0.5">{e.error}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setBulkImportResult(null); setBulkImportFile(null); }}
                                            className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                                        >
                                            Import Another File
                                        </button>
                                        <button
                                            onClick={() => { setShowBulkImportModal(false); setBulkImportResult(null); }}
                                            className="flex-1 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Upload view */
                                <div className="space-y-5">
                                    {/* Step 1: Download template */}
                                    <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                        <div className="p-2 bg-[#0066B3] rounded-lg flex-shrink-0">
                                            <Download className="text-white" size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900">Step 1 — Download the Template</p>
                                            <p className="text-sm text-slate-500 mt-0.5">Fill in the Excel template with your staff data. Region, Branch, Department, and Position will be created automatically if they don't exist.</p>
                                        </div>
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] flex-shrink-0"
                                        >
                                            <Download size={16} />
                                            Download
                                        </button>
                                    </div>

                                    {/* Step 2: Upload */}
                                    <div>
                                        <p className="font-medium text-slate-900 mb-3">Step 2 — Upload Completed File</p>
                                        <label
                                            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? 'border-emerald-500 bg-emerald-50' : bulkImportFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-[#0066B3] hover:bg-blue-50'}`}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDragging(false);
                                                const f = e.dataTransfer.files[0];
                                                if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setBulkImportFile(f);
                                                else showToast('Please upload an .xlsx file', 'error');
                                            }}
                                        >
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".xlsx,.xls"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) setBulkImportFile(f);
                                                }}
                                            />
                                            {bulkImportFile ? (
                                                <div className="text-center">
                                                    <FileSpreadsheet className="mx-auto text-emerald-600 mb-2" size={40} />
                                                    <p className="font-medium text-emerald-800">{bulkImportFile.name}</p>
                                                    <p className="text-sm text-emerald-600 mt-1">{(bulkImportFile.size / 1024).toFixed(1)} KB — ready to import</p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); setBulkImportFile(null); }}
                                                        className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                                                    >
                                                        Remove file
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <Upload className="mx-auto text-slate-400 mb-3" size={40} />
                                                    <p className="font-medium text-slate-700">Drop your .xlsx file here</p>
                                                    <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                                                    <p className="text-xs text-slate-400 mt-3">Accepts .xlsx files only</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>

                                    {/* Info notes */}
                                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                                        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={14} />
                                            <span>Org entities (Region, Branch, Dept, Position) are auto-created from the file</span>
                                        </div>
                                        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={14} />
                                            <span>Each staff member gets a welcome email to set their own password</span>
                                        </div>
                                        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={14} />
                                            <span>Rows with errors are skipped — valid rows are still imported</span>
                                        </div>
                                        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={14} />
                                            <span>Employee numbers are auto-generated for each staff member</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer — only show when not showing results */}
                        {!bulkImportResult && (
                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowBulkImportModal(false); setBulkImportFile(null); }}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { if (bulkImportFile) bulkImportMutation.mutate(bulkImportFile); }}
                                    disabled={!bulkImportFile || bulkImportMutation.isPending}
                                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {bulkImportMutation.isPending ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} />
                                            Import Staff
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* EDIT STAFF MODAL */}
            {showEditStaffModal && selectedStaff && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Edit Staff — {selectedStaff.first_name} {selectedStaff.last_name}</h2>
                            <button onClick={() => { setShowEditStaffModal(false); setSelectedStaff(null); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">First Name</label><input type="text" value={editStaffData.first_name || ''} onChange={(e) => setEditStaffData({ ...editStaffData, first_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label><input type="text" value={editStaffData.last_name || ''} onChange={(e) => setEditStaffData({ ...editStaffData, last_name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="text" value={editStaffData.phone || ''} onChange={(e) => setEditStaffData({ ...editStaffData, phone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Position</label><select value={editStaffData.position_id || ''} onChange={(e) => setEditStaffData({ ...editStaffData, position_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white"><option value="">Select position</option>{positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Department</label><select value={editStaffData.department_id || ''} onChange={(e) => setEditStaffData({ ...editStaffData, department_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white"><option value="">Select department</option>{departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Region</label><select value={editStaffData.region_id || ''} onChange={(e) => setEditStaffData({ ...editStaffData, region_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white"><option value="">Select region</option>{regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Branch</label><select value={editStaffData.branch_id || ''} onChange={(e) => setEditStaffData({ ...editStaffData, branch_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white"><option value="">Select branch</option>{branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => { setShowEditStaffModal(false); setSelectedStaff(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => updateStaffMutation.mutate({ id: selectedStaff.id, data: editStaffData })} disabled={updateStaffMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">{updateStaffMutation.isPending ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROMOTE MODAL */}
            {showPromoteModal && selectedStaff && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Promote — {selectedStaff.first_name} {selectedStaff.last_name}</h2>
                            <button onClick={() => { setShowPromoteModal(false); setSelectedStaff(null); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Current Position</label><p className="px-3 py-2.5 bg-slate-50 rounded-lg text-slate-600 text-sm">{selectedStaff.position?.name || 'N/A'}</p></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">New Position <span className="text-red-500">*</span></label><select value={promoteData.new_position_id || ''} onChange={(e) => setPromoteData({ ...promoteData, new_position_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white"><option value="">Select new position</option>{positions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">New Department</label><select value={promoteData.new_department_id || ''} onChange={(e) => setPromoteData({ ...promoteData, new_department_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white"><option value="">Keep current</option>{departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">New Salary</label><input type="number" min="0" value={promoteData.new_salary || ''} onChange={(e) => setPromoteData({ ...promoteData, new_salary: e.target.value })} placeholder="Leave blank to keep current" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Effective Date <span className="text-red-500">*</span></label><input type="date" value={promoteData.effective_date || ''} onChange={(e) => setPromoteData({ ...promoteData, effective_date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Reason / Notes</label><textarea value={promoteData.reason || ''} onChange={(e) => setPromoteData({ ...promoteData, reason: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] resize-none" placeholder="Reason for promotion..." /></div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => { setShowPromoteModal(false); setSelectedStaff(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => { if (!promoteData.new_position_id) { showToast('New position is required', 'error'); return; } promoteStaffMutation.mutate({ id: selectedStaff.id, data: { new_position_id: promoteData.new_position_id, ...(promoteData.new_department_id && { new_department_id: promoteData.new_department_id }), ...(promoteData.new_salary && { new_salary: Number(promoteData.new_salary) }), effective_date: promoteData.effective_date, reason: promoteData.reason } }); }} disabled={promoteStaffMutation.isPending} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50">{promoteStaffMutation.isPending ? 'Promoting...' : 'Confirm Promotion'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TRANSFER MODAL */}
            {showTransferModal && selectedStaff && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Transfer — {selectedStaff.first_name} {selectedStaff.last_name}</h2>
                            <button onClick={() => { setShowTransferModal(false); setSelectedStaff(null); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Current Branch</label><p className="px-3 py-2.5 bg-slate-50 rounded-lg text-slate-600 text-sm">{selectedStaff.branch?.name || 'N/A'} {selectedStaff.region?.name ? `(${selectedStaff.region.name})` : ''}</p></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">New Region</label><select value={transferData.region_id || ''} onChange={(e) => setTransferData({ ...transferData, region_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white"><option value="">Keep current region</option>{regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">New Branch <span className="text-red-500">*</span></label><select value={transferData.branch_id || ''} onChange={(e) => setTransferData({ ...transferData, branch_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] bg-white"><option value="">Select new branch</option>{branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Effective Date <span className="text-red-500">*</span></label><input type="date" value={transferData.effective_date || ''} onChange={(e) => setTransferData({ ...transferData, effective_date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Reason / Notes</label><textarea value={transferData.reason || ''} onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] resize-none" placeholder="Reason for transfer..." /></div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => { setShowTransferModal(false); setSelectedStaff(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => { if (!transferData.branch_id) { showToast('New branch is required', 'error'); return; } transferStaffMutation.mutate({ id: selectedStaff.id, data: { branch_id: transferData.branch_id, ...(transferData.region_id && { region_id: transferData.region_id }), effective_date: transferData.effective_date, reason: transferData.reason } }); }} disabled={transferStaffMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{transferStaffMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MANAGE ROLE DRAWER */}
            {manageRole && (
                <div className="fixed inset-0 bg-black/60 flex items-stretch justify-end z-50">
                    <div className="bg-white w-full max-w-3xl flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className={"flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r " + getRoleColor(manageRole.code)}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Shield className="text-white" size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{manageRole.name}</h2>
                                    <p className="text-xs text-white/70 font-mono">{manageRole.code}</p>
                                </div>
                            </div>
                            <button onClick={() => { setManageRole(null); setPermsDirty(false); }} className="p-2 hover:bg-white/20 rounded-lg text-white"><X size={20} /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
                            {(['details', 'permissions', 'users'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setManageRoleTab(t)}
                                    className={"px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize " + (manageRoleTab === t ? "border-[#0066B3] text-[#0066B3]" : "border-transparent text-slate-500 hover:text-slate-700")}
                                >
                                    {t === 'details' ? 'Details' : t === 'permissions' ? `Permissions (${allPermissions.length})` : `Users (${roleStats.find(s => s.code === manageRole.code)?.userCount ?? 0})`}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="flex-1 overflow-y-auto">
                            {/* DETAILS TAB */}
                            {manageRoleTab === 'details' && (
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Role Code</p>
                                            <p className="font-mono font-semibold text-slate-800">{manageRole.code}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Status</p>
                                            {manageRole.is_active
                                                ? <span className="flex items-center gap-1 text-emerald-700 text-sm font-medium"><CheckCircle size={14} />Active</span>
                                                : <span className="flex items-center gap-1 text-slate-500 text-sm font-medium"><AlertCircle size={14} />Inactive</span>}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Users Assigned</p>
                                            <p className="font-semibold text-slate-800">{roleStats.find(s => s.code === manageRole.code)?.userCount ?? 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Hierarchy Rank</p>
                                            <p className="font-semibold text-slate-800">{ROLE_HIERARCHY[manageRole.code] ? `#${ROLE_HIERARCHY[manageRole.code]}` : 'Custom'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
                                        <input type="text" value={editDetailsData.name ?? ''} onChange={(e) => setEditDetailsData({ ...editDetailsData, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea value={editDetailsData.description ?? ''} onChange={(e) => setEditDetailsData({ ...editDetailsData, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] resize-none" placeholder="Brief description of this role..." />
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex gap-2">
                                            {manageRole.is_active
                                                ? <button onClick={() => { deactivateRoleMutation.mutate(manageRole.id); setManageRole({ ...manageRole, is_active: false }); }} className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50"><ShieldOff size={15} />Deactivate</button>
                                                : <button onClick={() => { activateRoleMutation.mutate(manageRole.id); setManageRole({ ...manageRole, is_active: true }); }} className="flex items-center gap-2 px-4 py-2 border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50"><ShieldCheck size={15} />Activate</button>}
                                        </div>
                                        <button
                                            onClick={() => updateRoleDetailsMutation.mutate({ id: manageRole.id, data: { name: editDetailsData.name, description: editDetailsData.description } })}
                                            disabled={updateRoleDetailsMutation.isPending}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50"
                                        >
                                            {updateRoleDetailsMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PERMISSIONS TAB */}
                            {manageRoleTab === 'permissions' && (
                                <div className="flex flex-col h-full">
                                    {/* Permissions search + actions */}
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-2 sticky top-0 z-10">
                                        <div className="flex-1 relative min-w-[160px]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input type="text" placeholder="Search permissions..." value={permSearch} onChange={(e) => setPermSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                                        </div>
                                        <span className="text-xs text-slate-500 whitespace-nowrap">{pendingPermIds.size} selected</span>
                                        <div className="relative group">
                                            <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 bg-white">
                                                <Copy size={13} />Copy from…
                                            </button>
                                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20 hidden group-hover:block">
                                                <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">Load permissions from:</p>
                                                {roles.filter(r => r.id !== manageRole.id).map(r => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => setCopyFromRole(r)}
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2"
                                                    >
                                                        <div className={"w-5 h-5 rounded bg-gradient-to-br " + getRoleColor(r.code) + " flex-shrink-0"} />
                                                        {r.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {permsDirty && (
                                            <button
                                                onClick={() => savePermsMutation.mutate({ roleId: manageRole.id, permissionIds: Array.from(pendingPermIds) })}
                                                disabled={savePermsMutation.isPending}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 animate-pulse"
                                            >
                                                {savePermsMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                Save
                                            </button>
                                        )}
                                    </div>
                                    {manageRolePermsLoading ? (
                                        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#0066B3]" size={32} /></div>
                                    ) : (
                                        <div className="p-5 space-y-6">
                                            {Object.entries(
                                                allPermissions
                                                    .filter(p => !permSearch || p.name.toLowerCase().includes(permSearch.toLowerCase()) || p.code.toLowerCase().includes(permSearch.toLowerCase()))
                                                    .reduce((acc: Record<string, Permission[]>, p) => { (acc[p.module] = acc[p.module] || []).push(p); return acc; }, {})
                                            ).map(([module, perms]) => {
                                                const modulePerms = perms as Permission[];
                                                const allChecked = modulePerms.every(p => pendingPermIds.has(p.id));
                                                const someChecked = modulePerms.some(p => pendingPermIds.has(p.id));
                                                const collapsed = collapsedModules.has(module);
                                                return (
                                                    <div key={module} className="border border-slate-200 rounded-xl overflow-hidden">
                                                        <div
                                                            className={"flex items-center justify-between px-4 py-3 cursor-pointer select-none " + (allChecked ? "bg-blue-50 border-b border-blue-100" : someChecked ? "bg-amber-50 border-b border-amber-100" : "bg-slate-50 border-b border-slate-100")}
                                                            onClick={() => setCollapsedModules(prev => { const next = new Set(prev); collapsed ? next.delete(module) : next.add(module); return next; })}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={allChecked}
                                                                    ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        setPendingPermIds(prev => {
                                                                            const next = new Set(prev);
                                                                            if (allChecked) { modulePerms.forEach(p => next.delete(p.id)); }
                                                                            else { modulePerms.forEach(p => next.add(p.id)); }
                                                                            return next;
                                                                        });
                                                                        setPermsDirty(true);
                                                                    }}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="w-4 h-4 text-[#0066B3] rounded"
                                                                />
                                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{module}</span>
                                                                <span className={"text-xs px-1.5 py-0.5 rounded font-medium " + (allChecked ? "bg-blue-200 text-blue-800" : someChecked ? "bg-amber-200 text-amber-800" : "bg-slate-200 text-slate-600")}>{modulePerms.filter(p => pendingPermIds.has(p.id)).length}/{modulePerms.length}</span>
                                                            </div>
                                                            <span className="text-slate-400 text-xs">{collapsed ? '▶' : '▼'}</span>
                                                        </div>
                                                        {!collapsed && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-100">
                                                                {modulePerms.map((perm) => {
                                                                    const checked = pendingPermIds.has(perm.id);
                                                                    return (
                                                                        <label key={perm.id} className={"flex items-center gap-3 p-3 cursor-pointer transition-colors bg-white " + (checked ? "bg-blue-50" : "hover:bg-slate-50")}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() => {
                                                                                    setPendingPermIds(prev => {
                                                                                        const next = new Set(prev);
                                                                                        checked ? next.delete(perm.id) : next.add(perm.id);
                                                                                        return next;
                                                                                    });
                                                                                    setPermsDirty(true);
                                                                                }}
                                                                                className="w-4 h-4 text-[#0066B3] rounded flex-shrink-0"
                                                                            />
                                                                            <div>
                                                                                <p className={"text-sm font-medium " + (checked ? "text-[#0066B3]" : "text-slate-800")}>{perm.name}</p>
                                                                                <p className="text-xs text-slate-400 font-mono">{perm.code}</p>
                                                                            </div>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {allPermissions.length === 0 && (
                                                <div className="text-center py-12 text-slate-500">
                                                    <Key className="mx-auto mb-3 text-slate-300" size={40} />
                                                    <p>No permissions defined yet</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* USERS TAB */}
                            {manageRoleTab === 'users' && (
                                <div className="p-5">
                                    {roleUsersLoading ? (
                                        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#0066B3]" size={32} /></div>
                                    ) : roleUsers.length === 0 ? (
                                        <div className="text-center py-16">
                                            <Users className="mx-auto text-slate-300 mb-3" size={48} />
                                            <p className="text-slate-500">No users assigned to this role</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm text-slate-500 mb-3">{roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''} with this role</p>
                                            {roleUsers.map((u: User) => (
                                                <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0066B3] to-[#00AEEF] flex items-center justify-center text-white text-sm font-medium">
                                                            {u.staff ? `${u.staff.first_name[0]}${u.staff.last_name[0]}` : u.email[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">{u.staff ? `${u.staff.first_name} ${u.staff.last_name}` : u.email.split('@')[0]}</p>
                                                            <p className="text-xs text-slate-500">{u.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {u.is_active
                                                            ? <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">Active</span>
                                                            : <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">Inactive</span>}
                                                        {u.staff && (
                                                            <button onClick={() => { setManageRole(null); navigate(`/staff/${u.staff!.id}`); }} className="p-1.5 hover:bg-blue-100 rounded-lg text-slate-400 hover:text-[#0066B3]" title="View profile">
                                                                <Eye size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            <p className="text-xs text-slate-400">Role ID: {manageRole.id.slice(0, 8)}…</p>
                            <button onClick={() => { setManageRole(null); setPermsDirty(false); }} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 text-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}
            {/* LEGACY PERMISSIONS PANEL (kept for backward compat, now superseded by Manage drawer) */}
            {permRoleId && !manageRole && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <div><h2 className="text-lg font-semibold text-slate-900">Permissions — {permRoleName}</h2><p className="text-sm text-slate-500">Toggle permissions assigned to this role</p></div>
                            <button onClick={() => { setPermRoleId(null); setPermRoleName(''); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {Object.entries(allPermissions.reduce((acc: Record<string, Permission[]>, p) => { (acc[p.module] = acc[p.module] || []).push(p); return acc; }, {})).map(([module, perms]) => (
                                <div key={module} className="mb-6">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{module}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {(perms as Permission[]).map((perm) => {
                                            const hasIt = rolePermissions.some((rp) => rp.id === perm.id);
                                            return (
                                                <label key={perm.id} className={"flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors " + (hasIt ? "border-[#0066B3] bg-blue-50" : "border-slate-200 hover:bg-slate-50")}>
                                                    <input type="checkbox" checked={hasIt} onChange={() => { const newIds = hasIt ? rolePermissions.filter((rp) => rp.id !== perm.id).map((rp) => rp.id) : [...rolePermissions.map((rp) => rp.id), perm.id]; setRolePermissionsMutation.mutate({ roleId: permRoleId!, permissionIds: newIds }); }} className="w-4 h-4 text-[#0066B3] rounded" />
                                                    <div><p className="text-sm font-medium text-slate-900">{perm.name}</p><p className="text-xs text-slate-500 font-mono">{perm.code}</p></div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {allPermissions.length === 0 && <div className="text-center py-12 text-slate-500"><Key className="mx-auto mb-3 text-slate-300" size={40} /><p>No permissions found</p></div>}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
                            <button onClick={() => { setPermRoleId(null); setPermRoleName(''); }} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ USER DETAIL DRAWER ══════════════ */}
            {drawerUser && (
                <div className="fixed inset-0 bg-black/60 flex items-stretch justify-end z-50">
                    <div className="bg-white w-full max-w-xl flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-[#0066B3] to-[#00AEEF]">
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                                {drawerUser.staff ? `${drawerUser.staff.first_name[0]}${drawerUser.staff.last_name[0]}` : drawerUser.email[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold text-white truncate">
                                    {drawerUser.staff ? `${drawerUser.staff.first_name} ${drawerUser.staff.last_name}` : drawerUser.email.split('@')[0]}
                                </h2>
                                <p className="text-sm text-white/70 truncate">{drawerUser.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {drawerUser.roles[0] && <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full font-medium">{drawerUser.roles[0].name}</span>}
                                    {drawerUser.is_active
                                        ? <span className="px-2 py-0.5 bg-emerald-400/30 text-white text-xs rounded-full">Active</span>
                                        : <span className="px-2 py-0.5 bg-white/10 text-white/60 text-xs rounded-full">Inactive</span>}
                                </div>
                            </div>
                            <button onClick={() => setDrawerUser(null)} className="p-2 hover:bg-white/20 rounded-lg text-white"><X size={20} /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
                            {(['overview', 'security', 'stafflink'] as const).map((t) => (
                                <button key={t} onClick={() => setDrawerTab(t)} className={"px-4 py-3 text-sm font-medium border-b-2 transition-colors " + (drawerTab === t ? "border-[#0066B3] text-[#0066B3]" : "border-transparent text-slate-500 hover:text-slate-700")}>
                                    {t === 'overview' ? 'Overview' : t === 'security' ? 'Security' : 'Staff Link'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {/* OVERVIEW */}
                            {drawerTab === 'overview' && (
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-xs text-slate-400 mb-0.5">Employee No.</p>
                                            <p className="font-mono text-sm font-semibold text-slate-700">{drawerUser.staff?.employee_number || '—'}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-xs text-slate-400 mb-0.5">Branch</p>
                                            <p className="text-sm font-semibold text-slate-700">{drawerUser.staff?.branch?.name || '—'}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-xs text-slate-400 mb-0.5">2FA</p>
                                            <p className={"text-sm font-semibold " + (drawerUser.two_factor_enabled ? "text-emerald-600" : "text-slate-400")}>{drawerUser.two_factor_enabled ? '✓ Enabled' : 'Disabled'}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-xs text-slate-400 mb-0.5">Last Login</p>
                                            <p className="text-sm font-semibold text-slate-700">{formatRelTime(drawerUser.last_login_at)}</p>
                                        </div>
                                    </div>

                                    {/* Inline role change */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Assigned Role</label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {roles.map((role) => (
                                                <label key={role.id} className={"flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors " + (drawerRoleCode === role.code ? "border-[#0066B3] bg-blue-50" : "border-slate-200 hover:bg-slate-50")}>
                                                    <input type="radio" name="drawer-role" checked={drawerRoleCode === role.code} onChange={() => setDrawerRoleCode(role.code)} className="w-4 h-4 text-[#0066B3]" />
                                                    <div className={"w-7 h-7 rounded-lg bg-gradient-to-br " + getRoleColor(role.code) + " flex items-center justify-center flex-shrink-0"}>
                                                        <Shield size={13} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">{role.name}</p>
                                                        <p className="text-xs text-slate-400 font-mono">{role.code}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => updateDrawerRoleMutation.mutate({ id: drawerUser.id, role_code: drawerRoleCode })}
                                            disabled={drawerRoleCode === drawerUser.roles[0]?.code || updateDrawerRoleMutation.isPending}
                                            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-40"
                                        >
                                            {updateDrawerRoleMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            Save Role Change
                                        </button>
                                    </div>

                                    {/* Active toggle */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div>
                                            <p className="font-medium text-slate-800">Account Active</p>
                                            <p className="text-xs text-slate-500">User can log in when active</p>
                                        </div>
                                        <button
                                            onClick={() => { handleUserToggleStatus(drawerUser); setDrawerUser({ ...drawerUser, is_active: !drawerUser.is_active }); }}
                                            className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors " + (drawerUser.is_active ? "bg-emerald-500" : "bg-slate-300")}
                                        >
                                            <span className={"inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " + (drawerUser.is_active ? "translate-x-6" : "translate-x-1")} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SECURITY */}
                            {drawerTab === 'security' && (
                                <div className="p-6 space-y-5">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                        <h3 className="font-semibold text-slate-800">Reset Password</h3>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
                                            <input type="password" value={drawerPwForm.newPw} onChange={(e) => setDrawerPwForm(f => ({ ...f, newPw: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="Min 8 characters" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password</label>
                                            <input type="password" value={drawerPwForm.confirm} onChange={(e) => setDrawerPwForm(f => ({ ...f, confirm: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="Repeat password" />
                                        </div>
                                        {drawerPwError && <p className="text-xs text-red-600">{drawerPwError}</p>}
                                        <button
                                            onClick={() => {
                                                if (drawerPwForm.newPw.length < 8) { setDrawerPwError('Minimum 8 characters'); return; }
                                                if (drawerPwForm.newPw !== drawerPwForm.confirm) { setDrawerPwError('Passwords do not match'); return; }
                                                setDrawerPwError('');
                                                resetPasswordMutation.mutate({ id: drawerUser.id, password: drawerPwForm.newPw });
                                                setDrawerPwForm({ newPw: '', confirm: '' });
                                            }}
                                            disabled={resetPasswordMutation.isPending}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-40"
                                        >
                                            {resetPasswordMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                                            Reset Password
                                        </button>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3 mb-1">
                                            {drawerUser.two_factor_enabled ? <Lock size={16} className="text-emerald-600" /> : <Unlock size={16} className="text-slate-400" />}
                                            <h3 className="font-semibold text-slate-800">Two-Factor Authentication</h3>
                                        </div>
                                        <p className="text-sm text-slate-500">{drawerUser.two_factor_enabled ? 'Enabled — user has set up 2FA.' : 'Disabled — user has not set up 2FA.'}</p>
                                    </div>

                                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                        <h3 className="font-semibold text-red-700 mb-1">Danger Zone</h3>
                                        <p className="text-sm text-red-600 mb-3">Permanently delete this user account. This cannot be undone.</p>
                                        <button
                                            onClick={() => { handleDeleteUser(drawerUser); setDrawerUser(null); }}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                                        >
                                            <Trash2 size={14} />Delete User
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STAFF LINK */}
                            {drawerTab === 'stafflink' && (
                                <div className="p-6 space-y-4">
                                    {drawerUser.staff ? (
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Link2 size={16} className="text-[#0066B3]" />Linked Staff Record</h3>
                                                <button
                                                    onClick={() => linkStaffMutation.mutate({ staffId: drawerUser.staff!.id, userId: null })}
                                                    disabled={linkStaffMutation.isPending}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50"
                                                >
                                                    <Link2Off size={13} />Unlink
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><p className="text-xs text-slate-400">Name</p><p className="font-medium text-slate-800">{drawerUser.staff.first_name} {drawerUser.staff.last_name}</p></div>
                                                <div><p className="text-xs text-slate-400">Employee No.</p><p className="font-mono text-sm font-medium text-slate-700">{drawerUser.staff.employee_number}</p></div>
                                                <div><p className="text-xs text-slate-400">Branch</p><p className="text-sm text-slate-700">{drawerUser.staff.branch?.name || '—'}</p></div>
                                            </div>
                                            <button onClick={() => { setDrawerUser(null); navigate(`/staff/${drawerUser.staff!.id}`); }} className="mt-3 flex items-center gap-2 text-sm text-[#0066B3] hover:underline"><Eye size={14} />View Staff Profile</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-sm text-slate-600">This user is not linked to a staff record. Search below to link one.</p>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input type="text" placeholder="Search unlinked staff..." value={staffLinkSearch} onChange={(e) => setStaffLinkSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                                            </div>
                                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                                {unlinkedStaff.filter((s: any) => !staffLinkSearch || `${s.first_name} ${s.last_name}`.toLowerCase().includes(staffLinkSearch.toLowerCase()) || s.employee_number?.includes(staffLinkSearch)).map((s: any) => (
                                                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200">
                                                        <div>
                                                            <p className="font-medium text-slate-900 text-sm">{s.first_name} {s.last_name}</p>
                                                            <p className="text-xs text-slate-500">{s.employee_number} · {s.branch?.name || 'No branch'}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => linkStaffMutation.mutate({ staffId: s.id, userId: drawerUser.id })}
                                                            disabled={linkStaffMutation.isPending}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"
                                                        >
                                                            <Link2 size={13} />Link
                                                        </button>
                                                    </div>
                                                ))}
                                                {unlinkedStaff.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No unlinked staff found</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            <p className="text-xs text-slate-400">ID: {drawerUser.id.slice(0, 8)}…</p>
                            <button onClick={() => setDrawerUser(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 text-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ DUPLICATE ROLE MODAL ══════════════ */}
            {duplicateRoleSource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Duplicate Role</h2>
                            <button onClick={() => setDuplicateRoleSource(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                <div className={"w-10 h-10 rounded-lg bg-gradient-to-br " + getRoleColor(duplicateRoleSource.code) + " flex items-center justify-center"}>
                                    <Shield className="text-white" size={18} />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800">{duplicateRoleSource.name}</p>
                                    <p className="text-xs text-slate-500">Source role — all permissions will be copied</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Role Code</label>
                                <input type="text" value={duplicateForm.code} onChange={(e) => setDuplicateForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z_]/g, '') }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="e.g., SENIOR_MANAGER" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Role Name</label>
                                <input type="text" value={duplicateForm.name} onChange={(e) => setDuplicateForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" placeholder="e.g., Senior Manager" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setDuplicateRoleSource(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button
                                onClick={() => duplicateRoleMutation.mutate({ id: duplicateRoleSource.id, code: duplicateForm.code, name: duplicateForm.name })}
                                disabled={!duplicateForm.code || !duplicateForm.name || duplicateRoleMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50"
                            >
                                {duplicateRoleMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />}
                                Duplicate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ COMPARE ROLES MODAL ══════════════ */}
            {showCompareModal && compareRoleA && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><GitCompare size={20} className="text-indigo-600" />Compare Roles</h2>
                            <button onClick={() => setShowCompareModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-slate-200 p-4 border-b border-slate-200">
                            <div className="bg-white p-3 rounded-l-xl flex items-center gap-3">
                                <div className={"w-10 h-10 rounded-lg bg-gradient-to-br " + getRoleColor(compareRoleA.code) + " flex items-center justify-center flex-shrink-0"}>
                                    <Shield className="text-white" size={18} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{compareRoleA.name}</p>
                                    <p className="text-xs text-slate-400 font-mono">{compareRoleA.code}</p>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-r-xl flex items-center gap-3">
                                <select
                                    value={compareRoleB?.id || ''}
                                    onChange={(e) => { const r = roles.find(r => r.id === e.target.value) || null; setCompareRoleB(r); }}
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">— Select role to compare —</option>
                                    {roles.filter(r => r.id !== compareRoleA.id).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        {compareRoleB && drawerUserPermsRole && drawerRoleBPerms ? (
                            <div className="flex-1 overflow-y-auto p-5">
                                {(() => {
                                    const setA = new Set((drawerUserPermsRole || []).map((p: Permission) => p.id));
                                    const setB = new Set((drawerRoleBPerms || []).map((p: Permission) => p.id));
                                    const aOnly = (drawerUserPermsRole || []).filter((p: Permission) => !setB.has(p.id));
                                    const bOnly = (drawerRoleBPerms || []).filter((p: Permission) => !setA.has(p.id));
                                    const shared = (drawerUserPermsRole || []).filter((p: Permission) => setB.has(p.id));
                                    return (
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-medium"><span className="w-3 h-3 rounded-full bg-blue-500" />{aOnly.length} unique to {compareRoleA.name}</span>
                                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-medium"><span className="w-3 h-3 rounded-full bg-amber-500" />{bOnly.length} unique to {compareRoleB.name}</span>
                                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-medium"><span className="w-3 h-3 rounded-full bg-slate-400" />{shared.length} shared</span>
                                            </div>
                                            {Object.entries(allPermissions.reduce((acc: Record<string, Permission[]>, p) => { (acc[p.module] = acc[p.module] || []).push(p); return acc; }, {})).map(([module, perms]) => (
                                                <div key={module} className="border border-slate-200 rounded-xl overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{module}</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {(perms as Permission[]).map((perm) => {
                                                            const inA = setA.has(perm.id);
                                                            const inB = setB.has(perm.id);
                                                            return (
                                                                <div key={perm.id} className={"flex items-center px-4 py-2.5 " + (!inA && !inB ? "opacity-30" : inA && inB ? "" : inA ? "bg-blue-50" : "bg-amber-50")}>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium text-slate-800">{perm.name}</p>
                                                                        <p className="text-xs text-slate-400 font-mono">{perm.code}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-6 ml-4">
                                                                        <span className={"w-6 h-6 rounded-full flex items-center justify-center " + (inA ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-300")}>{inA ? "✓" : "✗"}</span>
                                                                        <span className={"w-6 h-6 rounded-full flex items-center justify-center " + (inB ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-300")}>{inB ? "✓" : "✗"}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : compareRoleB ? (
                            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#0066B3]" size={32} /></div>
                        ) : (
                            <div className="flex items-center justify-center py-16 text-slate-400"><p>Select a role to compare</p></div>
                        )}
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end rounded-b-2xl">
                            <button onClick={() => setShowCompareModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 text-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ BULK ROLE ASSIGN MODAL ══════════════ */}
            {showBulkRoleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Assign Role to {selectedUserIds.size} Users</h2>
                            <button onClick={() => setShowBulkRoleModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {roles.map((role) => (
                                    <label key={role.id} className={"flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors " + (bulkRoleCode === role.code ? "border-[#0066B3] bg-blue-50" : "border-slate-200 hover:bg-slate-50")}>
                                        <input type="radio" name="bulk-role" checked={bulkRoleCode === role.code} onChange={() => setBulkRoleCode(role.code)} className="w-4 h-4 text-[#0066B3]" />
                                        <div className={"w-8 h-8 rounded-lg bg-gradient-to-br " + getRoleColor(role.code) + " flex items-center justify-center"}>
                                            <Shield size={15} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">{role.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{role.code}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowBulkRoleModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button
                                onClick={() => bulkAssignRoleMutation.mutate({ ids: Array.from(selectedUserIds), role_code: bulkRoleCode })}
                                disabled={!bulkRoleCode || bulkAssignRoleMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50"
                            >
                                {bulkAssignRoleMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
                                Assign to {selectedUserIds.size} Users
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default StaffManagementPage;
