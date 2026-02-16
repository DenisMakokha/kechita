import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    MapPin, Building, Briefcase, Users, Plus, Edit, Trash2,
    X, CheckCircle, XCircle, Search, ChevronRight, ChevronDown,
    Phone, Mail, UserCheck, Building2, Network
} from 'lucide-react';

type Tab = 'regions' | 'branches' | 'departments' | 'positions' | 'chart';

interface Region {
    id: string;
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
    manager?: { id: string; first_name: string; last_name: string };
    branches?: Branch[];
}

interface Branch {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    target_disbursement?: number;
    target_collection?: number;
    target_clients?: number;
    is_active: boolean;
    region?: { id: string; name: string };
    manager?: { id: string; first_name: string; last_name: string };
}

interface Department {
    id: string;
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
    parent?: { id: string; name: string };
}

interface Position {
    id: string;
    name: string;
    code: string;
    description?: string;
    level?: number;
    is_active: boolean;
    department?: { id: string; name: string };
    reportsTo?: { id: string; name: string };
}

export const OrganizationPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('regions');
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<Tab>('regions');
    const [editItem, setEditItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

    // Fetch data
    const { data: regions } = useQuery<Region[]>({
        queryKey: ['regions', showInactive],
        queryFn: async () => (await api.get(`/org/regions?include_inactive=${showInactive}`)).data,
    });

    const { data: branches } = useQuery<Branch[]>({
        queryKey: ['branches', showInactive],
        queryFn: async () => (await api.get(`/org/branches?include_inactive=${showInactive}`)).data,
    });

    const { data: departments } = useQuery<Department[]>({
        queryKey: ['departments', showInactive],
        queryFn: async () => (await api.get(`/org/departments?include_inactive=${showInactive}`)).data,
    });

    const { data: positions } = useQuery<Position[]>({
        queryKey: ['positions', showInactive],
        queryFn: async () => (await api.get(`/org/positions?include_inactive=${showInactive}`)).data,
    });

    const { data: orgStats } = useQuery({
        queryKey: ['org-stats'],
        queryFn: async () => (await api.get('/org/stats')).data,
    });

    const { data: staff } = useQuery({
        queryKey: ['staff-for-manager'],
        queryFn: async () => (await api.get('/staff?limit=500')).data,
    });

    // Mutations
    const createRegionMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/org/regions', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regions'] });
            queryClient.invalidateQueries({ queryKey: ['org-stats'] });
            closeModal();
            showToast('Region created');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create region', 'error'),
    });

    const updateRegionMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.put(`/org/regions/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regions'] });
            closeModal();
            showToast('Region updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update region', 'error'),
    });

    const deleteRegionMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/org/regions/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regions'] });
            queryClient.invalidateQueries({ queryKey: ['org-stats'] });
            showToast('Region deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete region', 'error'),
    });

    const createBranchMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/org/branches', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            queryClient.invalidateQueries({ queryKey: ['regions'] });
            queryClient.invalidateQueries({ queryKey: ['org-stats'] });
            closeModal();
            showToast('Branch created');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create branch', 'error'),
    });

    const updateBranchMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.put(`/org/branches/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            queryClient.invalidateQueries({ queryKey: ['regions'] });
            closeModal();
            showToast('Branch updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update branch', 'error'),
    });

    const deleteBranchMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/org/branches/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            queryClient.invalidateQueries({ queryKey: ['org-stats'] });
            showToast('Branch deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete branch', 'error'),
    });

    const createDepartmentMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/org/departments', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            queryClient.invalidateQueries({ queryKey: ['org-stats'] });
            closeModal();
            showToast('Department created');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create department', 'error'),
    });

    const updateDepartmentMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.put(`/org/departments/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            closeModal();
            showToast('Department updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update department', 'error'),
    });

    const deleteDepartmentMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/org/departments/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            queryClient.invalidateQueries({ queryKey: ['org-stats'] });
            showToast('Department deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete department', 'error'),
    });

    const createPositionMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/org/positions', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['org-stats'] });
            closeModal();
            showToast('Position created');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create position', 'error'),
    });

    const updatePositionMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => (await api.put(`/org/positions/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            closeModal();
            showToast('Position updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update position', 'error'),
    });

    const deletePositionMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/org/positions/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['org-stats'] });
            showToast('Position deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete position', 'error'),
    });

    // Activate/Deactivate mutations
    const toggleStatusMutation = useMutation({
        mutationFn: async ({ type, id, activate }: { type: string; id: string; activate: boolean }) => {
            const action = activate ? 'activate' : 'deactivate';
            return (await api.post(`/org/${type}/${id}/${action}`)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regions'] });
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            queryClient.invalidateQueries({ queryKey: ['positions'] });
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update status', 'error'),
    });

    const openModal = (type: Tab, item?: any) => {
        setModalType(type);
        setEditItem(item);
        setFormData(item ? { ...item, region_id: item.region?.id, department_id: item.department?.id, parent_id: item.parent?.id, reports_to_id: item.reportsTo?.id, manager_id: item.manager?.id } : {});
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditItem(null);
        setFormData({});
    };

    const handleSave = () => {
        const data = { ...formData };
        delete data.id;
        delete data.region;
        delete data.department;
        delete data.parent;
        delete data.reportsTo;
        delete data.manager;
        delete data.branches;
        delete data.created_at;
        delete data.updated_at;

        switch (modalType) {
            case 'regions':
                editItem ? updateRegionMutation.mutate({ id: editItem.id, data }) : createRegionMutation.mutate(data);
                break;
            case 'branches':
                editItem ? updateBranchMutation.mutate({ id: editItem.id, data }) : createBranchMutation.mutate(data);
                break;
            case 'departments':
                editItem ? updateDepartmentMutation.mutate({ id: editItem.id, data }) : createDepartmentMutation.mutate(data);
                break;
            case 'positions':
                editItem ? updatePositionMutation.mutate({ id: editItem.id, data }) : createPositionMutation.mutate(data);
                break;
        }
    };

    const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

    const handleDelete = (type: string, id: string, name: string) => {
        setDeleteTarget({ type, id, name });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        switch (deleteTarget.type) {
            case 'regions': deleteRegionMutation.mutate(deleteTarget.id); break;
            case 'branches': deleteBranchMutation.mutate(deleteTarget.id); break;
            case 'departments': deleteDepartmentMutation.mutate(deleteTarget.id); break;
            case 'positions': deletePositionMutation.mutate(deleteTarget.id); break;
        }
        setDeleteTarget(null);
    };

    const handleToggleStatus = (type: string, id: string, currentlyActive: boolean) => {
        toggleStatusMutation.mutate({ type, id, activate: !currentlyActive });
    };

    const toggleRegionExpand = (regionId: string) => {
        const newExpanded = new Set(expandedRegions);
        if (newExpanded.has(regionId)) {
            newExpanded.delete(regionId);
        } else {
            newExpanded.add(regionId);
        }
        setExpandedRegions(newExpanded);
    };

    const filterItems = <T extends { name: string; code: string }>(items: T[] | undefined) => {
        if (!items) return [];
        if (!search) return items;
        const query = search.toLowerCase();
        return items.filter(item => item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query));
    };

    const tabs = [
        { key: 'regions' as Tab, label: 'Regions', icon: MapPin, count: regions?.length || 0 },
        { key: 'branches' as Tab, label: 'Branches', icon: Building, count: branches?.length || 0 },
        { key: 'departments' as Tab, label: 'Departments', icon: Briefcase, count: departments?.length || 0 },
        { key: 'positions' as Tab, label: 'Positions', icon: Users, count: positions?.length || 0 },
        { key: 'chart' as Tab, label: 'Org Chart', icon: Network, count: 0 },
    ];

    const staffList = staff?.data || [];

    const isPending = createRegionMutation.isPending || updateRegionMutation.isPending ||
        createBranchMutation.isPending || updateBranchMutation.isPending ||
        createDepartmentMutation.isPending || updateDepartmentMutation.isPending ||
        createPositionMutation.isPending || updatePositionMutation.isPending;

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
                    <h1 className="text-2xl font-bold text-slate-900">Organization Structure</h1>
                    <p className="text-slate-500">Manage regions, branches, departments, and positions</p>
                </div>
                {activeTab !== 'chart' && (
                    <button
                        onClick={() => openModal(activeTab)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] transition-colors"
                    >
                        <Plus size={20} />
                        Add {activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1)}
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
                    <MapPin className="mb-2 opacity-80" size={24} />
                    <p className="text-3xl font-bold">{orgStats?.regions || regions?.length || 0}</p>
                    <p className="text-sm opacity-80">Regions</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
                    <Building className="mb-2 opacity-80" size={24} />
                    <p className="text-3xl font-bold">{orgStats?.branches || branches?.length || 0}</p>
                    <p className="text-sm opacity-80">Branches</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
                    <Briefcase className="mb-2 opacity-80" size={24} />
                    <p className="text-3xl font-bold">{orgStats?.departments || departments?.length || 0}</p>
                    <p className="text-sm opacity-80">Departments</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
                    <Users className="mb-2 opacity-80" size={24} />
                    <p className="text-3xl font-bold">{orgStats?.positions || positions?.length || 0}</p>
                    <p className="text-sm opacity-80">Positions</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                                ? 'bg-[#0066B3] text-white shadow-lg'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-[#0066B3]'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            {activeTab !== 'chart' && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or code..."
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
                            <span className="text-sm text-slate-600">Show inactive</span>
                        </label>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Regions Tab */}
                {activeTab === 'regions' && (
                    <div className="divide-y divide-slate-100">
                        {filterItems(regions).length === 0 ? (
                            <div className="p-12 text-center">
                                <MapPin className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500">No regions found</p>
                            </div>
                        ) : (
                            filterItems(regions).map((region) => (
                                <div key={region.id}>
                                    <div className="p-4 hover:bg-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => toggleRegionExpand(region.id)}
                                                    className="p-1 hover:bg-slate-100 rounded"
                                                >
                                                    {expandedRegions.has(region.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                </button>
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white">
                                                    <MapPin size={24} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-slate-900">{region.name}</h3>
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded">{region.code}</span>
                                                        {!region.is_active && (
                                                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">Inactive</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500">
                                                        {region.branches?.length || 0} branches
                                                        {region.manager && ` • Manager: ${region.manager.first_name} ${region.manager.last_name}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openModal('regions', region)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus('regions', region.id, region.is_active)}
                                                    className={`p-2 hover:bg-slate-100 rounded-lg ${region.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'}`}
                                                    title={region.is_active ? 'Deactivate' : 'Activate'}
                                                >
                                                    {region.is_active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete('regions', region.id, region.name)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Expanded branches */}
                                    {expandedRegions.has(region.id) && region.branches && region.branches.length > 0 && (
                                        <div className="bg-slate-50 border-t border-slate-100">
                                            {region.branches.map((branch) => (
                                                <div key={branch.id} className="flex items-center justify-between px-4 py-3 pl-20 border-b border-slate-100 last:border-b-0">
                                                    <div className="flex items-center gap-3">
                                                        <Building size={16} className="text-slate-400" />
                                                        <span className="font-medium text-slate-700">{branch.name}</span>
                                                        <span className="text-xs text-slate-400">{branch.code}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => openModal('branches', branch)}
                                                        className="text-sm text-[#0066B3] hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Branches Tab */}
                {activeTab === 'branches' && (
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Branch</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Region</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Manager</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filterItems(branches).map((branch) => (
                                <tr key={branch.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                <Building size={20} className="text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{branch.name}</p>
                                                <p className="text-xs text-slate-500 font-mono">{branch.code}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">{branch.region?.name || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600">
                                            {branch.phone && <div className="flex items-center gap-1"><Phone size={12} />{branch.phone}</div>}
                                            {branch.email && <div className="flex items-center gap-1"><Mail size={12} />{branch.email}</div>}
                                            {!branch.phone && !branch.email && '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {branch.manager ? (
                                            <div className="flex items-center gap-2">
                                                <UserCheck size={14} className="text-emerald-500" />
                                                <span className="text-sm">{branch.manager.first_name} {branch.manager.last_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-400">Not assigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {branch.is_active ? (
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Active</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">Inactive</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openModal('branches', branch)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><Edit size={16} /></button>
                                            <button onClick={() => handleToggleStatus('branches', branch.id, branch.is_active)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600">{branch.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}</button>
                                            <button onClick={() => handleDelete('branches', branch.id, branch.name)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filterItems(branches).length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No branches found</td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* Departments Tab */}
                {activeTab === 'departments' && (
                    <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                        {filterItems(departments).length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <Briefcase className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500">No departments found</p>
                            </div>
                        ) : (
                            filterItems(departments).map((dept) => (
                                <div key={dept.id} className={`p-4 rounded-xl border ${dept.is_active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                                <Briefcase size={20} className="text-purple-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900">{dept.name}</h3>
                                                <p className="text-xs text-slate-500 font-mono">{dept.code}</p>
                                            </div>
                                        </div>
                                        {!dept.is_active && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">Inactive</span>}
                                    </div>
                                    {dept.description && <p className="text-sm text-slate-500 mb-3">{dept.description}</p>}
                                    {dept.parent && <p className="text-xs text-slate-400 mb-3">Parent: {dept.parent.name}</p>}
                                    <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
                                        <button onClick={() => openModal('departments', dept)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><Edit size={16} /></button>
                                        <button onClick={() => handleToggleStatus('departments', dept.id, dept.is_active)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600">{dept.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}</button>
                                        <button onClick={() => handleDelete('departments', dept.id, dept.name)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Positions Tab */}
                {activeTab === 'positions' && (
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Position</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Department</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Level</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Reports To</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filterItems(positions).map((position) => (
                                <tr key={position.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-slate-900">{position.name}</p>
                                            <p className="text-xs text-slate-500 font-mono">{position.code}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600">{position.department?.name || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {position.level ? (
                                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">Level {position.level}</span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600">{position.reportsTo?.name || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {position.is_active ? (
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Active</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">Inactive</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openModal('positions', position)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><Edit size={16} /></button>
                                            <button onClick={() => handleToggleStatus('positions', position.id, position.is_active)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600">{position.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}</button>
                                            <button onClick={() => handleDelete('positions', position.id, position.name)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filterItems(positions).length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No positions found</td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* Org Chart Tab */}
                {activeTab === 'chart' && (
                    <div className="p-6">
                        <div className="text-center mb-8">
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Organization Hierarchy</h3>
                            <p className="text-sm text-slate-500">Visual representation of regions and branches</p>
                        </div>
                        <div className="flex flex-col items-center">
                            {/* Company */}
                            <div className="px-6 py-4 bg-gradient-to-br from-[#0066B3] to-[#00AEEF] text-white rounded-xl shadow-lg mb-8">
                                <div className="flex items-center gap-3">
                                    <Building2 size={24} />
                                    <div>
                                        <p className="font-bold text-lg">Kechita Capital</p>
                                        <p className="text-sm opacity-80">{regions?.length || 0} Regions • {branches?.length || 0} Branches</p>
                                    </div>
                                </div>
                            </div>
                            {/* Regions */}
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl">
                                {regions?.filter(r => r.is_active).map((region) => (
                                    <div key={region.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={18} className="text-blue-600" />
                                                <h4 className="font-semibold text-slate-900">{region.name}</h4>
                                            </div>
                                            {region.manager && (
                                                <p className="text-xs text-slate-500 mt-1">RM: {region.manager.first_name} {region.manager.last_name}</p>
                                            )}
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {region.branches?.filter(b => b.is_active).map((branch) => (
                                                <div key={branch.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                                                    <Building size={14} className="text-slate-400" />
                                                    <span className="text-sm text-slate-700">{branch.name}</span>
                                                </div>
                                            ))}
                                            {(!region.branches || region.branches.filter(b => b.is_active).length === 0) && (
                                                <p className="text-sm text-slate-400 text-center py-2">No branches</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editItem ? 'Edit' : 'Add'} {modalType.slice(0, -1).charAt(0).toUpperCase() + modalType.slice(1, -1)}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {/* Region Form */}
                            {modalType === 'regions' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                                            <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="e.g., Nairobi Region" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                            <input type="text" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" placeholder="e.g., NRB" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Regional Manager</label>
                                        <select value={formData.manager_id || ''} onChange={(e) => setFormData({ ...formData, manager_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="">Select manager...</option>
                                            {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Branch Form */}
                            {modalType === 'branches' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                                            <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="e.g., Westlands Branch" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                            <input type="text" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" placeholder="e.g., WL" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Region *</label>
                                        <select value={formData.region_id || ''} onChange={(e) => setFormData({ ...formData, region_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="">Select region...</option>
                                            {regions?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                        <input type="text" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                            <input type="text" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                            <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Disbursement</label>
                                            <input type="number" value={formData.target_disbursement || ''} onChange={(e) => setFormData({ ...formData, target_disbursement: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Collection</label>
                                            <input type="number" value={formData.target_collection || ''} onChange={(e) => setFormData({ ...formData, target_collection: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Clients</label>
                                            <input type="number" value={formData.target_clients || ''} onChange={(e) => setFormData({ ...formData, target_clients: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Branch Manager</label>
                                        <select value={formData.manager_id || ''} onChange={(e) => setFormData({ ...formData, manager_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="">Select manager...</option>
                                            {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Department Form */}
                            {modalType === 'departments' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                                            <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="e.g., Human Resources" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                            <input type="text" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" placeholder="e.g., HR" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Parent Department</label>
                                        <select value={formData.parent_id || ''} onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="">None (Top-level)</option>
                                            {departments?.filter(d => d.id !== editItem?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Position Form */}
                            {modalType === 'positions' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                                            <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="e.g., Senior Developer" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                            <input type="text" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" placeholder="e.g., SR_DEV" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                            <select value={formData.department_id || ''} onChange={(e) => setFormData({ ...formData, department_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                                <option value="">None</option>
                                                {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                                            <input type="number" value={formData.level || ''} onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="1-10" min={1} max={10} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Reports To</label>
                                        <select value={formData.reports_to_id || ''} onChange={(e) => setFormData({ ...formData, reports_to_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                            <option value="">None</option>
                                            {positions?.filter(p => p.id !== editItem?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={handleSave} disabled={isPending || !formData.name} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">
                                {isPending ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title={`Delete ${deleteTarget?.type?.slice(0, -1) || 'Item'}`}
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};

export default OrganizationPage;
