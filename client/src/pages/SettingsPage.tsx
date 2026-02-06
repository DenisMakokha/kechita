import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Plus, MapPin, Building, Briefcase, Users, Edit, Trash2,
    Settings, Receipt, Calendar, CalendarDays, GitBranch,
    PiggyBank, X, DollarSign, ChevronRight, Save
} from 'lucide-react';

type Tab = 'organization' | 'claim-types' | 'leave-types' | 'approval-flows' | 'holidays' | 'loan-settings';
type OrgSubTab = 'regions' | 'branches' | 'departments' | 'positions';

interface ClaimType {
    id: string;
    code: string;
    name: string;
    description?: string;
    max_amount_per_claim?: number;
    max_amount_per_month?: number;
    max_amount_per_year?: number;
    requires_receipt: boolean;
    requires_approval: boolean;
    is_taxable: boolean;
    icon?: string;
    color?: string;
    display_order: number;
    is_active: boolean;
}

interface LeaveType {
    id: string;
    code: string;
    name: string;
    description?: string;
    max_days_per_year?: number;
    is_paid: boolean;
    requires_attachment: boolean;
    requires_confirmation: boolean;
    applicable_gender?: string;
    allow_carry_forward: boolean;
    max_carry_forward_days?: number;
    allow_negative: boolean;
    color?: string;
    sort_order: number;
    is_active: boolean;
}

interface ApprovalFlow {
    id: string;
    code: string;
    name: string;
    target_type: string;
    priority: number;
    is_active: boolean;
    steps?: { id: string; step_order: number; name: string; approver_type: string; approver_role_code?: string }[];
}

interface PublicHoliday {
    id: string;
    name: string;
    date: string;
    year: number;
    is_recurring: boolean;
    is_active: boolean;
}

export const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('organization');
    const [orgSubTab, setOrgSubTab] = useState<OrgSubTab>('regions');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const queryClient = useQueryClient();

    // Organization queries
    const { data: regions } = useQuery({
        queryKey: ['regions'],
        queryFn: async () => (await api.get('/org/regions')).data,
    });

    const { data: branches } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => (await api.get('/org/branches')).data,
    });

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => (await api.get('/org/departments')).data,
    });

    const { data: positions } = useQuery({
        queryKey: ['positions'],
        queryFn: async () => (await api.get('/org/positions')).data,
    });

    // Claim types query
    const { data: claimTypes } = useQuery<ClaimType[]>({
        queryKey: ['claim-types', 'all'],
        queryFn: async () => (await api.get('/claims/types?all=true')).data,
    });

    // Leave types query
    const { data: leaveTypes } = useQuery<LeaveType[]>({
        queryKey: ['leave-types', 'all'],
        queryFn: async () => (await api.get('/leave/types?activeOnly=false')).data,
    });

    // Approval flows query
    const { data: approvalFlows } = useQuery<ApprovalFlow[]>({
        queryKey: ['approval-flows'],
        queryFn: async () => (await api.get('/approvals/flows')).data,
    });

    // Public holidays query
    const { data: holidays } = useQuery<PublicHoliday[]>({
        queryKey: ['holidays'],
        queryFn: async () => (await api.get('/leave/holidays')).data,
    });

    // Mutations
    const createClaimTypeMutation = useMutation({
        mutationFn: async (data: Partial<ClaimType>) => (await api.post('/claims/types', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['claim-types'] });
            setShowModal(false);
            setFormData({});
        },
    });

    const updateClaimTypeMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<ClaimType> }) =>
            (await api.patch(`/claims/types/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['claim-types'] });
            setShowModal(false);
            setFormData({});
            setEditItem(null);
        },
    });

    const createHolidayMutation = useMutation({
        mutationFn: async (data: Partial<PublicHoliday>) => (await api.post('/leave/holidays', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            setShowModal(false);
            setFormData({});
        },
    });

    const deleteHolidayMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/leave/holidays/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
        },
    });

    // Leave type mutations
    const createLeaveTypeMutation = useMutation({
        mutationFn: async (data: Partial<LeaveType>) => (await api.post('/leave/types', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-types'] });
            setShowModal(false);
            setFormData({});
        },
    });

    const updateLeaveTypeMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<LeaveType> }) =>
            (await api.put(`/leave/types/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-types'] });
            setShowModal(false);
            setFormData({});
            setEditItem(null);
        },
    });

    const mainTabs = [
        { key: 'organization' as Tab, label: 'Organization', icon: Building },
        { key: 'claim-types' as Tab, label: 'Claim Types', icon: Receipt },
        { key: 'leave-types' as Tab, label: 'Leave Types', icon: Calendar },
        { key: 'approval-flows' as Tab, label: 'Approval Flows', icon: GitBranch },
        { key: 'holidays' as Tab, label: 'Public Holidays', icon: CalendarDays },
        { key: 'loan-settings' as Tab, label: 'Loan Settings', icon: PiggyBank },
    ];

    const orgSubTabs = [
        { key: 'regions' as OrgSubTab, label: 'Regions', icon: MapPin, count: regions?.length || 0 },
        { key: 'branches' as OrgSubTab, label: 'Branches', icon: Building, count: branches?.length || 0 },
        { key: 'departments' as OrgSubTab, label: 'Departments', icon: Briefcase, count: departments?.length || 0 },
        { key: 'positions' as OrgSubTab, label: 'Positions', icon: Users, count: positions?.length || 0 },
    ];

    const openModal = (_type: string, item?: any) => {
        setEditItem(item);
        setFormData(item || {});
        setShowModal(true);
    };

    const getModalTitle = () => {
        const isEdit = !!editItem;
        switch (activeTab) {
            case 'claim-types': return `${isEdit ? 'Edit' : 'Add'} Claim Type`;
            case 'leave-types': return `${isEdit ? 'Edit' : 'Add'} Leave Type`;
            case 'holidays': return `${isEdit ? 'Edit' : 'Add'} Public Holiday`;
            default: return `${isEdit ? 'Edit' : 'Add'} Item`;
        }
    };

    const handleSave = () => {
        if (activeTab === 'claim-types') {
            if (editItem) {
                updateClaimTypeMutation.mutate({ id: editItem.id, data: formData });
            } else {
                createClaimTypeMutation.mutate(formData);
            }
        } else if (activeTab === 'leave-types') {
            if (editItem) {
                updateLeaveTypeMutation.mutate({ id: editItem.id, data: formData });
            } else {
                createLeaveTypeMutation.mutate(formData);
            }
        } else if (activeTab === 'holidays') {
            if (editItem) {
                createHolidayMutation.mutate(formData); // Could add update if needed
            } else {
                createHolidayMutation.mutate(formData);
            }
        }
    };

    const renderOrganizationContent = () => {
        const getOrgData = () => {
            switch (orgSubTab) {
                case 'regions': return regions;
                case 'branches': return branches;
                case 'departments': return departments;
                case 'positions': return positions;
            }
        };

        const data = getOrgData() || [];

        return (
            <div>
                {/* Org Sub Tabs */}
                <div className="flex gap-1 p-2 border-b border-slate-200">
                    {orgSubTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setOrgSubTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${orgSubTab === tab.key
                                    ? 'bg-blue-100 text-[#0066B3]'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                                <span className={`px-2 py-0.5 rounded-full text-xs ${orgSubTab === tab.key
                                    ? 'bg-blue-200 text-[#0066B3]'
                                    : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Organization Table */}
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Code</th>
                            {orgSubTab === 'regions' && (
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Branches</th>
                            )}
                            {orgSubTab === 'branches' && (
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Region</th>
                            )}
                            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item: any) => (
                            <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">{item.code}</span>
                                </td>
                                {orgSubTab === 'regions' && (
                                    <td className="px-6 py-4 text-slate-600">{item.branches?.length || 0}</td>
                                )}
                                {orgSubTab === 'branches' && (
                                    <td className="px-6 py-4 text-slate-600">{item.region?.name || '-'}</td>
                                )}
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600">
                                            <Edit size={16} />
                                        </button>
                                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                    No {orgSubTab} found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderClaimTypesContent = () => (
        <div className="p-6">
            <div className="grid gap-4">
                {claimTypes?.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <Receipt className="text-slate-300 mx-auto mb-3" size={48} />
                        <p className="text-slate-500 mb-4">No claim types configured yet</p>
                        <button
                            onClick={() => openModal('claim-type')}
                            className="text-[#0066B3] font-medium hover:underline"
                        >
                            Add your first claim type
                        </button>
                    </div>
                ) : (
                    claimTypes?.map((type) => (
                        <div
                            key={type.id}
                            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: type.color ? `${type.color}20` : '#f1f5f9' }}
                                >
                                    <Receipt
                                        size={24}
                                        style={{ color: type.color || '#64748b' }}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-900">{type.name}</h4>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                                            {type.code}
                                        </span>
                                        {!type.is_active && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500">{type.description}</p>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                        {type.max_amount_per_claim && (
                                            <span>Max: KES {type.max_amount_per_claim.toLocaleString()}/claim</span>
                                        )}
                                        {type.requires_receipt && (
                                            <span className="text-amber-600">Receipt Required</span>
                                        )}
                                        {type.is_taxable && (
                                            <span className="text-red-600">Taxable</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openModal('claim-type', type)}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"
                                >
                                    <Edit size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderLeaveTypesContent = () => (
        <div className="p-6">
            <div className="grid gap-4">
                {leaveTypes?.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <Calendar className="text-slate-300 mx-auto mb-3" size={48} />
                        <p className="text-slate-500">No leave types configured</p>
                    </div>
                ) : (
                    leaveTypes?.map((type) => (
                        <div
                            key={type.id}
                            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: type.color ? `${type.color}20` : '#f1f5f9' }}
                                >
                                    <Calendar
                                        size={24}
                                        style={{ color: type.color || '#64748b' }}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-900">{type.name}</h4>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                                            {type.code}
                                        </span>
                                        {!type.is_active && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                        <span>{type.max_days_per_year || '∞'} days/year</span>
                                        {type.is_paid ? (
                                            <span className="text-green-600">Paid</span>
                                        ) : (
                                            <span className="text-amber-600">Unpaid</span>
                                        )}
                                        {type.allow_carry_forward && (
                                            <span>Carry Forward: {type.max_carry_forward_days || '∞'} days</span>
                                        )}
                                        {type.applicable_gender && (
                                            <span className="text-[#0066B3]">{type.applicable_gender} only</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openModal('leave-type', type)}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"
                                >
                                    <Edit size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderApprovalFlowsContent = () => (
        <div className="p-6">
            <div className="grid gap-4">
                {approvalFlows?.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <GitBranch className="text-slate-300 mx-auto mb-3" size={48} />
                        <p className="text-slate-500">No approval flows configured</p>
                    </div>
                ) : (
                    approvalFlows?.map((flow) => (
                        <div
                            key={flow.id}
                            className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                        <GitBranch size={20} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-slate-900">{flow.name}</h4>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                                                {flow.code}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">Target: {flow.target_type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${flow.is_active
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {flow.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600">
                                        <Edit size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Steps preview */}
                            {flow.steps && flow.steps.length > 0 && (
                                <div className="flex items-center gap-2 overflow-x-auto py-2">
                                    {flow.steps.sort((a, b) => a.step_order - b.step_order).map((step, idx) => (
                                        <React.Fragment key={step.id}>
                                            <div className="flex-shrink-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                                <p className="text-xs text-slate-500">Step {step.step_order}</p>
                                                <p className="text-sm font-medium text-slate-700">{step.name || step.approver_role_code}</p>
                                            </div>
                                            {idx < (flow.steps?.length || 0) - 1 && (
                                                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderHolidaysContent = () => (
        <div className="p-6">
            <div className="grid gap-4">
                {holidays?.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <CalendarDays className="text-slate-300 mx-auto mb-3" size={48} />
                        <p className="text-slate-500 mb-4">No public holidays configured</p>
                        <button
                            onClick={() => openModal('holiday')}
                            className="text-[#0066B3] font-medium hover:underline"
                        >
                            Add a public holiday
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {holidays?.map((holiday) => (
                            <div
                                key={holiday.id}
                                className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{holiday.name}</h4>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {new Date(holiday.date).toLocaleDateString('en-GB', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </p>
                                        {holiday.is_recurring && (
                                            <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                                Recurring
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                                        className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderLoanSettingsContent = () => (
        <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
                {/* Salary Advance Settings */}
                <div className="p-6 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                            <DollarSign size={20} className="text-cyan-600" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Salary Advance</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Max Advances Per Month</label>
                            <input
                                type="number"
                                defaultValue={1}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Max % of Salary</label>
                            <input
                                type="number"
                                defaultValue={50}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Interest Rate (%)</label>
                            <input
                                type="number"
                                defaultValue={0}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Staff Loan Settings */}
                <div className="p-6 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <PiggyBank size={20} className="text-[#0066B3]" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Staff Loan</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Max Loan Amount (KES)</label>
                            <input
                                type="number"
                                defaultValue={500000}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Max Term (months)</label>
                            <input
                                type="number"
                                defaultValue={24}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Interest Rate (% p.a.)</label>
                            <input
                                type="number"
                                defaultValue={12}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Max Salary Deduction (%)</label>
                            <input
                                type="number"
                                defaultValue={33}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* General Loan Policies */}
                <div className="md:col-span-2 p-6 bg-white border border-slate-200 rounded-xl">
                    <h3 className="font-semibold text-slate-900 mb-4">General Policies</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-[#0066B3] rounded" />
                            <span className="text-sm text-slate-700">Require guarantor for loans &gt; KES 100,000</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-[#0066B3] rounded" />
                            <span className="text-sm text-slate-700">Only confirmed staff can apply</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-[#0066B3] rounded" />
                            <span className="text-sm text-slate-700">Auto-deduct from payroll</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-[#0066B3] rounded" />
                            <span className="text-sm text-slate-700">Allow multiple active loans</span>
                        </label>
                    </div>
                    <button className="mt-4 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]">
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'organization': return renderOrganizationContent();
            case 'claim-types': return renderClaimTypesContent();
            case 'leave-types': return renderLeaveTypesContent();
            case 'approval-flows': return renderApprovalFlowsContent();
            case 'holidays': return renderHolidaysContent();
            case 'loan-settings': return renderLoanSettingsContent();
        }
    };

    const getAddButtonLabel = () => {
        switch (activeTab) {
            case 'organization': return `Add ${orgSubTab.slice(0, -1)}`;
            case 'claim-types': return 'Add Claim Type';
            case 'leave-types': return 'Add Leave Type';
            case 'holidays': return 'Add Holiday';
            default: return 'Add';
        }
    };

    const showAddButton = activeTab !== 'approval-flows' && activeTab !== 'loan-settings';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Settings className="text-[#0066B3]" size={28} />
                        System Settings
                    </h1>
                    <p className="text-slate-500">Configure system-wide settings and policies</p>
                </div>
                {showAddButton && (
                    <button
                        onClick={() => openModal(activeTab)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] transition-all shadow-lg"
                    >
                        <Plus size={20} />
                        {getAddButtonLabel()}
                    </button>
                )}
            </div>

            {/* Main Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {mainTabs.map((tab) => {
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
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {renderTabContent()}
            </div>

            {/* Modal for Add/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">{getModalTitle()}</h2>
                            <button onClick={() => { setShowModal(false); setEditItem(null); setFormData({}); }} className="p-2 hover:bg-white rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {activeTab === 'claim-types' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                            <input
                                                type="text"
                                                value={formData.code || ''}
                                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                placeholder="e.g., TRANSPORT"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={formData.name || ''}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g., Transport Allowance"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Max/Claim</label>
                                            <input
                                                type="number"
                                                value={formData.max_amount_per_claim || ''}
                                                onChange={(e) => setFormData({ ...formData, max_amount_per_claim: parseFloat(e.target.value) })}
                                                placeholder="0"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Max/Month</label>
                                            <input
                                                type="number"
                                                value={formData.max_amount_per_month || ''}
                                                onChange={(e) => setFormData({ ...formData, max_amount_per_month: parseFloat(e.target.value) })}
                                                placeholder="0"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                                            <input
                                                type="color"
                                                value={formData.color || '#6366F1'}
                                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                className="w-full h-10 rounded-lg cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.requires_receipt || false}
                                                onChange={(e) => setFormData({ ...formData, requires_receipt: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Requires Receipt</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.requires_approval !== false}
                                                onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Requires Approval</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_taxable || false}
                                                onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Taxable</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active !== false}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Active</span>
                                        </label>
                                    </div>
                                </>
                            )}

                            {activeTab === 'leave-types' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                            <input
                                                type="text"
                                                value={formData.code || ''}
                                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                placeholder="e.g., ANNUAL"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={formData.name || ''}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g., Annual Leave"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Days/Year</label>
                                            <input
                                                type="number"
                                                value={formData.max_days_per_year || ''}
                                                onChange={(e) => setFormData({ ...formData, max_days_per_year: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Max Carry Forward</label>
                                            <input
                                                type="number"
                                                value={formData.max_carry_forward_days || ''}
                                                onChange={(e) => setFormData({ ...formData, max_carry_forward_days: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                                            <input
                                                type="color"
                                                value={formData.color || '#10B981'}
                                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                className="w-full h-10 rounded-lg cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Applicable Gender</label>
                                        <select
                                            value={formData.applicable_gender || ''}
                                            onChange={(e) => setFormData({ ...formData, applicable_gender: e.target.value || undefined })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                        >
                                            <option value="">All Genders</option>
                                            <option value="male">Male Only</option>
                                            <option value="female">Female Only</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_paid !== false}
                                                onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Paid Leave</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.allow_carry_forward || false}
                                                onChange={(e) => setFormData({ ...formData, allow_carry_forward: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Allow Carry Forward</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.requires_attachment || false}
                                                onChange={(e) => setFormData({ ...formData, requires_attachment: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Requires Attachment</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.requires_confirmation || false}
                                                onChange={(e) => setFormData({ ...formData, requires_confirmation: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Confirmed Staff Only</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.allow_negative || false}
                                                onChange={(e) => setFormData({ ...formData, allow_negative: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Allow Negative Balance</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active !== false}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Active</span>
                                        </label>
                                    </div>
                                </>
                            )}

                            {activeTab === 'holidays' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Holiday Name</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Christmas Day"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={formData.date || ''}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_recurring || false}
                                                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                                                className="w-4 h-4 text-[#0066B3] rounded"
                                            />
                                            <span className="text-sm text-slate-700">Recurring annually</span>
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => { setShowModal(false); setEditItem(null); setFormData({}); }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={createClaimTypeMutation.isPending || updateClaimTypeMutation.isPending || createHolidayMutation.isPending || createLeaveTypeMutation.isPending || updateLeaveTypeMutation.isPending}
                                className="px-6 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50 flex items-center gap-2"
                            >
                                <Save size={18} />
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
