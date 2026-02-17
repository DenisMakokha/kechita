import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Plus, Edit, Trash2,
    Settings, Receipt, Calendar, CalendarDays, GitBranch,
    PiggyBank, X, DollarSign, ChevronRight, Save, CheckCircle, AlertCircle,
    Mail, Send, Wifi, WifiOff, Loader2, MessageSquare, Smartphone
} from 'lucide-react';

type Tab = 'claim-types' | 'leave-types' | 'approval-flows' | 'holidays' | 'loan-settings' | 'email-settings' | 'sms-settings';

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
    description?: string;
    branch_id?: string;
    region_id?: string;
    department_id?: string;
    position_id?: string;
    steps?: ApprovalFlowStep[];
}

interface ApprovalFlowStep {
    id?: string;
    step_order: number;
    name?: string;
    approver_type: 'role' | 'manager' | 'skip_manager' | 'branch_manager' | 'regional_manager' | 'department_head' | 'specific_user';
    approver_role_code?: string;
    specific_approver_id?: string;
    is_final?: boolean;
    can_skip?: boolean;
    auto_approve_hours?: number;
    escalation_role_code?: string;
    escalation_hours?: number;
    instructions?: string;
}

interface Role {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
}

interface PublicHoliday {
    id: string;
    name: string;
    date: string;
    year: number;
    is_recurring: boolean;
    is_active: boolean;
}

const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('claim-types');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [approvalFlowOriginalStepIds, setApprovalFlowOriginalStepIds] = useState<string[]>([]);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [loanSettings, setLoanSettings] = useState<Record<string, any>>({});
    const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
    const queryClient = useQueryClient();

    const askConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
        setConfirmDialog({ title, message, onConfirm });
    }, []);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Org data (used by approval flow scope dropdowns)
    const { data: regions } = useQuery({ queryKey: ['regions'], queryFn: async () => (await api.get('/org/regions')).data });
    const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get('/org/branches')).data });
    const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: async () => (await api.get('/org/departments')).data });
    const { data: positions } = useQuery({ queryKey: ['positions'], queryFn: async () => (await api.get('/org/positions')).data });

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

    const { data: roles } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: async () => (await api.get('/roles?include_inactive=true')).data,
    });

    // Public holidays query
    const { data: holidays } = useQuery<PublicHoliday[]>({
        queryKey: ['holidays'],
        queryFn: async () => (await api.get('/leave/holidays')).data,
    });

    // Loan settings query
    const { data: loanSettingsData } = useQuery<Record<string, any>>({
        queryKey: ['loan-settings'],
        queryFn: async () => (await api.get('/settings/category/loans')).data,
    });

    useEffect(() => {
        if (loanSettingsData) setLoanSettings(loanSettingsData);
    }, [loanSettingsData]);

    // Mutations — Claim Types
    const createClaimTypeMutation = useMutation({
        mutationFn: async (data: Partial<ClaimType>) => (await api.post('/claims/types', data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claim-types'] }); setShowModal(false); setFormData({}); showToast('Claim type created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create claim type', 'error'),
    });
    const updateClaimTypeMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<ClaimType> }) => (await api.patch(`/claims/types/${id}`, data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claim-types'] }); setShowModal(false); setFormData({}); setEditItem(null); showToast('Claim type updated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update claim type', 'error'),
    });
    const deleteClaimTypeMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/claims/types/${id}`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claim-types'] }); showToast('Claim type deleted'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete claim type', 'error'),
    });

    // Mutations — Holidays
    const createHolidayMutation = useMutation({
        mutationFn: async (data: Partial<PublicHoliday>) => (await api.post('/leave/holidays', data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); setShowModal(false); setFormData({}); showToast('Holiday created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create holiday', 'error'),
    });
    const updateHolidayMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<PublicHoliday> }) => (await api.put(`/leave/holidays/${id}`, data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); setShowModal(false); setFormData({}); setEditItem(null); showToast('Holiday updated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update holiday', 'error'),
    });
    const deleteHolidayMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/leave/holidays/${id}`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); showToast('Holiday deleted'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete holiday', 'error'),
    });

    // Mutations — Leave Types
    const createLeaveTypeMutation = useMutation({
        mutationFn: async (data: Partial<LeaveType>) => (await api.post('/leave/types', data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-types'] }); setShowModal(false); setFormData({}); showToast('Leave type created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create leave type', 'error'),
    });
    const updateLeaveTypeMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<LeaveType> }) => (await api.put(`/leave/types/${id}`, data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-types'] }); setShowModal(false); setFormData({}); setEditItem(null); showToast('Leave type updated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update leave type', 'error'),
    });
    const deactivateLeaveTypeMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/leave/types/${id}/deactivate`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-types'] }); showToast('Leave type deactivated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate leave type', 'error'),
    });

    // Mutations — Loan Settings
    const saveLoanSettingsMutation = useMutation({
        mutationFn: async (settings: Record<string, any>) => {
            const entries = Object.entries(settings).map(([key, value]) => ({
                key, value, category: 'loans',
            }));
            return (await api.post('/settings/bulk', { entries })).data;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loan-settings'] }); showToast('Loan settings saved'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to save loan settings', 'error'),
    });

    const saveApprovalFlowMutation = useMutation({
        mutationFn: async (payload: {
            flowId?: string;
            flow: Partial<ApprovalFlow> & { steps?: ApprovalFlowStep[] };
            originalStepIds: string[];
        }) => {
            const { flowId, flow, originalStepIds } = payload;

            if (!flow.code || !flow.name || !flow.target_type) {
                throw new Error('Flow code, name, and target type are required');
            }

            const flowBody: any = {
                code: flow.code,
                name: flow.name,
                target_type: flow.target_type,
                description: flow.description,
                priority: flow.priority ?? 0,
                is_active: flow.is_active !== false,
                branch_id: flow.branch_id || null,
                region_id: flow.region_id || null,
                department_id: flow.department_id || null,
                position_id: flow.position_id || null,
            };

            let savedFlow: ApprovalFlow;
            if (flowId) {
                savedFlow = (await api.put(`/approvals/flows/${flowId}`, flowBody)).data;
            } else {
                savedFlow = (await api.post('/approvals/flows', flowBody)).data;
            }

            const currentSteps: ApprovalFlowStep[] = (flow.steps || [])
                .filter((s) => s.step_order)
                .map((s) => ({
                    ...s,
                    step_order: Number(s.step_order),
                    auto_approve_hours: Number(s.auto_approve_hours || 0),
                    escalation_hours: Number(s.escalation_hours || 0),
                    is_final: !!s.is_final,
                    can_skip: !!s.can_skip,
                }));

            const currentStepIds = currentSteps.map((s) => s.id).filter(Boolean) as string[];
            const removedStepIds = originalStepIds.filter((id) => !currentStepIds.includes(id));

            await Promise.all(removedStepIds.map((id) => api.delete(`/approvals/flows/steps/${id}`)));

            for (const step of currentSteps) {
                const stepBody: any = {
                    step_order: step.step_order,
                    name: step.name,
                    approver_type: step.approver_type,
                    approver_role_code: step.approver_type === 'role' ? step.approver_role_code : undefined,
                    specific_approver_id: step.approver_type === 'specific_user' ? step.specific_approver_id : undefined,
                    is_final: step.is_final,
                    can_skip: step.can_skip,
                    auto_approve_hours: step.auto_approve_hours,
                    escalation_role_code: step.escalation_role_code,
                    escalation_hours: step.escalation_hours,
                    instructions: step.instructions,
                };

                if (step.id) {
                    await api.put(`/approvals/flows/steps/${step.id}`, stepBody);
                } else {
                    await api.post(`/approvals/flows/${savedFlow.id}/steps`, stepBody);
                }
            }

            const reordered = currentSteps
                .filter((s) => s.id)
                .map((s) => ({ stepId: s.id as string, order: s.step_order }));
            if (reordered.length > 0) {
                await api.post(`/approvals/flows/${savedFlow.id}/reorder-steps`, { steps: reordered });
            }

            return savedFlow;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approval-flows'] });
            setShowModal(false);
            setFormData({});
            setEditItem(null);
            setApprovalFlowOriginalStepIds([]);
            showToast('Approval flow saved');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to save approval flow', 'error'),
    });

    const deleteApprovalFlowMutation = useMutation({
        mutationFn: async (flowId: string) => (await api.delete(`/approvals/flows/${flowId}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approval-flows'] });
            showToast('Approval flow deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete approval flow', 'error'),
    });

    // Email settings state
    const [emailConfig, setEmailConfig] = useState<Record<string, string>>({});
    const [testEmailTo, setTestEmailTo] = useState('');

    const { data: emailConfigData } = useQuery<Record<string, string>>({
        queryKey: ['email-config'],
        queryFn: async () => (await api.get('/settings/email/config')).data,
    });

    useEffect(() => {
        if (emailConfigData) setEmailConfig(emailConfigData);
    }, [emailConfigData]);

    const saveEmailConfigMutation = useMutation({
        mutationFn: async (config: Record<string, string>) => (await api.put('/settings/email/config', config)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['email-config'] }); showToast('Email settings saved and applied'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to save email settings', 'error'),
    });

    const testConnectionMutation = useMutation({
        mutationFn: async () => (await api.post('/settings/email/test-connection')).data,
        onSuccess: (data: any) => {
            if (data.success) showToast('SMTP connection successful');
            else showToast(`Connection failed: ${data.error}`, 'error');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Connection test failed', 'error'),
    });

    const sendTestEmailMutation = useMutation({
        mutationFn: async (to: string) => (await api.post('/settings/email/send-test', { to })).data,
        onSuccess: (data: any) => {
            if (data.success) showToast(`Test email sent to ${testEmailTo}`);
            else showToast(`Send failed: ${data.error}`, 'error');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to send test email', 'error'),
    });

    // SMS settings state
    const [smsConfig, setSmsConfig] = useState<Record<string, string>>({});
    const [testSmsTo, setTestSmsTo] = useState('');

    const { data: smsConfigData } = useQuery<Record<string, string>>({
        queryKey: ['sms-config'],
        queryFn: async () => (await api.get('/settings/sms/config')).data,
    });

    useEffect(() => {
        if (smsConfigData) setSmsConfig(smsConfigData);
    }, [smsConfigData]);

    const saveSmsConfigMutation = useMutation({
        mutationFn: async (config: Record<string, string>) => (await api.put('/settings/sms/config', config)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sms-config'] }); showToast('SMS settings saved and applied'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to save SMS settings', 'error'),
    });

    const sendTestSmsMutation = useMutation({
        mutationFn: async (to: string) => (await api.post('/settings/sms/send-test', { to })).data,
        onSuccess: (data: any) => {
            if (data.success) showToast(`Test SMS sent to ${testSmsTo}`);
            else showToast(`Send failed: ${data.error}`, 'error');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to send test SMS', 'error'),
    });

    const [smsBalance, setSmsBalance] = useState<{ credits?: string; error?: string } | null>(null);
    const checkBalanceMutation = useMutation({
        mutationFn: async () => (await api.get('/settings/sms/balance')).data,
        onSuccess: (data: any) => {
            if (data.success) setSmsBalance({ credits: data.credits });
            else setSmsBalance({ error: data.error });
        },
        onError: (e: any) => setSmsBalance({ error: e?.response?.data?.message || 'Failed to check balance' }),
    });

    const mainTabs = [
        { key: 'claim-types' as Tab, label: 'Claim Types', icon: Receipt },
        { key: 'leave-types' as Tab, label: 'Leave Types', icon: Calendar },
        { key: 'approval-flows' as Tab, label: 'Approval Flows', icon: GitBranch },
        { key: 'holidays' as Tab, label: 'Public Holidays', icon: CalendarDays },
        { key: 'loan-settings' as Tab, label: 'Loan Settings', icon: PiggyBank },
        { key: 'email-settings' as Tab, label: 'Email / SMTP', icon: Mail },
        { key: 'sms-settings' as Tab, label: 'Bulk SMS', icon: MessageSquare },
    ];

    const openModal = (_type: string, item?: any) => {
        setEditItem(item);
        setFormData(item || {});
        setShowModal(true);
    };

    const openApprovalFlowModal = (flow?: ApprovalFlow) => {
        setActiveTab('approval-flows');
        const existingSteps = (flow?.steps || []).slice().sort((a, b) => a.step_order - b.step_order);
        setApprovalFlowOriginalStepIds(existingSteps.map((s) => s.id).filter(Boolean) as string[]);
        setEditItem(flow || null);
        setFormData({
            ...(flow || {
                code: '',
                name: '',
                target_type: 'leave',
                description: '',
                priority: 0,
                is_active: true,
            }),
            steps: existingSteps.length > 0
                ? existingSteps
                : [
                    {
                        step_order: 1,
                        name: 'Approval Step',
                        approver_type: 'role',
                        approver_role_code: 'HR_MANAGER',
                        is_final: true,
                        can_skip: false,
                        auto_approve_hours: 0,
                        escalation_hours: 0,
                    } satisfies ApprovalFlowStep,
                ],
        });
        setShowModal(true);
    };

    const getModalTitle = () => {
        const isEdit = !!editItem;
        switch (activeTab) {
            case 'claim-types': return `${isEdit ? 'Edit' : 'Add'} Claim Type`;
            case 'leave-types': return `${isEdit ? 'Edit' : 'Add'} Leave Type`;
            case 'holidays': return `${isEdit ? 'Edit' : 'Add'} Public Holiday`;
            case 'approval-flows': return `${isEdit ? 'Edit' : 'Add'} Approval Flow`;
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
                updateHolidayMutation.mutate({ id: editItem.id, data: formData });
            } else {
                createHolidayMutation.mutate(formData);
            }
        } else if (activeTab === 'approval-flows') {
            saveApprovalFlowMutation.mutate({
                flowId: editItem?.id,
                flow: formData,
                originalStepIds: approvalFlowOriginalStepIds,
            });
        }
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
                                <button
                                    onClick={() => askConfirm('Delete Claim Type', `Delete claim type "${type.name}"? This cannot be undone.`, () => deleteClaimTypeMutation.mutate(type.id))}
                                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
                                >
                                    <Trash2 size={18} />
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
                                {type.is_active && (
                                    <button
                                        onClick={() => askConfirm('Deactivate Leave Type', `Deactivate leave type "${type.name}"? Staff will no longer be able to request this type.`, () => deactivateLeaveTypeMutation.mutate(type.id))}
                                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
                                        title="Deactivate"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderApprovalFlowsContent = () => (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-slate-900">Approval Flows</h3>
                    <p className="text-sm text-slate-500">Configure multi-step approval rules for leave, claims, loans, and more.</p>
                </div>
                <button
                    onClick={() => openApprovalFlowModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"
                >
                    <Plus size={18} />
                    Add Flow
                </button>
            </div>
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
                                    <button
                                        onClick={() => openApprovalFlowModal(flow)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => askConfirm('Delete Approval Flow', `Delete flow "${flow.name}"? This cannot be undone.`, () => deleteApprovalFlowMutation.mutate(flow.id))}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"
                                    >
                                        <Trash2 size={18} />
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
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openModal('holiday', holiday)}
                                            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => askConfirm('Delete Holiday', `Delete holiday "${holiday.name}"? This cannot be undone.`, () => deleteHolidayMutation.mutate(holiday.id))}
                                            className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
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
                                value={loanSettings.advance_max_per_month ?? 1}
                                onChange={(e) => setLoanSettings({ ...loanSettings, advance_max_per_month: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Max % of Salary</label>
                            <input
                                type="number"
                                value={loanSettings.advance_max_salary_percent ?? 50}
                                onChange={(e) => setLoanSettings({ ...loanSettings, advance_max_salary_percent: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Interest Rate (%)</label>
                            <input
                                type="number"
                                value={loanSettings.advance_interest_rate ?? 0}
                                onChange={(e) => setLoanSettings({ ...loanSettings, advance_interest_rate: Number(e.target.value) })}
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
                                value={loanSettings.loan_max_amount ?? 500000}
                                onChange={(e) => setLoanSettings({ ...loanSettings, loan_max_amount: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Max Term (months)</label>
                            <input
                                type="number"
                                value={loanSettings.loan_max_term_months ?? 24}
                                onChange={(e) => setLoanSettings({ ...loanSettings, loan_max_term_months: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Interest Rate (% p.a.)</label>
                            <input
                                type="number"
                                value={loanSettings.loan_interest_rate ?? 12}
                                onChange={(e) => setLoanSettings({ ...loanSettings, loan_interest_rate: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Max Salary Deduction (%)</label>
                            <input
                                type="number"
                                value={loanSettings.loan_max_deduction_percent ?? 33}
                                onChange={(e) => setLoanSettings({ ...loanSettings, loan_max_deduction_percent: Number(e.target.value) })}
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
                            <input
                                type="checkbox"
                                checked={loanSettings.loan_require_guarantor ?? true}
                                onChange={(e) => setLoanSettings({ ...loanSettings, loan_require_guarantor: e.target.checked })}
                                className="w-4 h-4 text-[#0066B3] rounded"
                            />
                            <span className="text-sm text-slate-700">Require guarantor for loans &gt; KES 100,000</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={loanSettings.loan_confirmed_only ?? true}
                                onChange={(e) => setLoanSettings({ ...loanSettings, loan_confirmed_only: e.target.checked })}
                                className="w-4 h-4 text-[#0066B3] rounded"
                            />
                            <span className="text-sm text-slate-700">Only confirmed staff can apply</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={loanSettings.loan_auto_deduct ?? true}
                                onChange={(e) => setLoanSettings({ ...loanSettings, loan_auto_deduct: e.target.checked })}
                                className="w-4 h-4 text-[#0066B3] rounded"
                            />
                            <span className="text-sm text-slate-700">Auto-deduct from payroll</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={loanSettings.loan_allow_multiple ?? false}
                                onChange={(e) => setLoanSettings({ ...loanSettings, loan_allow_multiple: e.target.checked })}
                                className="w-4 h-4 text-[#0066B3] rounded"
                            />
                            <span className="text-sm text-slate-700">Allow multiple active loans</span>
                        </label>
                    </div>
                    <button
                        onClick={() => saveLoanSettingsMutation.mutate(loanSettings)}
                        disabled={saveLoanSettingsMutation.isPending}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saveLoanSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderEmailSettingsContent = () => (
        <div className="p-6 space-y-6">
            {/* Status Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${(emailConfig as any).configured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
                {(emailConfig as any).configured ? <Wifi size={20} /> : <WifiOff size={20} />}
                <span className="font-medium">
                    {(emailConfig as any).configured ? 'SMTP is configured and active' : 'SMTP not configured — emails are logged only'}
                </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* SMTP Server Settings */}
                <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Mail size={18} className="text-[#0066B3]" />
                        SMTP Server
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                        <input
                            type="text"
                            value={emailConfig.smtp_host || ''}
                            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                            placeholder="e.g., localhost, smtp.gmail.com"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
                            <input
                                type="number"
                                value={emailConfig.smtp_port || '587'}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Encryption</label>
                            <select
                                value={emailConfig.smtp_secure || 'false'}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_secure: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            >
                                <option value="false">STARTTLS (port 587)</option>
                                <option value="true">SSL/TLS (port 465)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username <span className="text-slate-400">(optional for localhost)</span></label>
                        <input
                            type="text"
                            value={emailConfig.smtp_user || ''}
                            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                            placeholder="user@example.com"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-slate-400">(optional for localhost)</span></label>
                        <input
                            type="password"
                            value={emailConfig.smtp_pass || ''}
                            onChange={(e) => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                    </div>
                </div>

                {/* Sender Settings */}
                <div className="space-y-6">
                    <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <Send size={18} className="text-[#0066B3]" />
                            Sender Identity
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">From Email</label>
                            <input
                                type="email"
                                value={emailConfig.smtp_from_email || ''}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_from_email: e.target.value })}
                                placeholder="noreply@kechita.cloud"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">From Name</label>
                            <input
                                type="text"
                                value={emailConfig.smtp_from_name || ''}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_from_name: e.target.value })}
                                placeholder="Kechita Capital"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Test Email */}
                    <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                        <h3 className="font-semibold text-slate-900">Send Test Email</h3>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={testEmailTo}
                                onChange={(e) => setTestEmailTo(e.target.value)}
                                placeholder="recipient@example.com"
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                            />
                            <button
                                onClick={() => testEmailTo && sendTestEmailMutation.mutate(testEmailTo)}
                                disabled={!testEmailTo || sendTestEmailMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {sendTestEmailMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => saveEmailConfigMutation.mutate(emailConfig)}
                    disabled={saveEmailConfigMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50"
                >
                    {saveEmailConfigMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saveEmailConfigMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                    {testConnectionMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Wifi size={18} />}
                    {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                </button>
            </div>
        </div>
    );

    const renderSmsSettingsContent = () => {
        const provider = smsConfig.sms_provider || 'africastalking';
        const enabled = smsConfig.sms_enabled === 'true';

        return (
            <div className="p-6 space-y-6">
                {/* Status Banner */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${enabled && (smsConfig as any).configured
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : !enabled
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                    {enabled && (smsConfig as any).configured
                        ? <><Smartphone size={20} /><span className="font-medium">SMS is enabled and configured</span></>
                        : !enabled
                            ? <><WifiOff size={20} /><span className="font-medium">SMS is disabled</span></>
                            : <><AlertCircle size={20} /><span className="font-medium">SMS enabled but missing credentials</span></>
                    }
                </div>

                {/* Enable Toggle + Provider */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setSmsConfig({ ...smsConfig, sms_enabled: e.target.checked ? 'true' : 'false' })}
                                className="w-5 h-5 text-[#0066B3] rounded"
                            />
                            <div>
                                <span className="font-medium text-slate-900">Enable SMS Notifications</span>
                                <p className="text-sm text-slate-500">Send SMS alerts for critical notifications</p>
                            </div>
                        </label>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl">
                        <label className="block text-sm font-medium text-slate-700 mb-2">SMS Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => setSmsConfig({ ...smsConfig, sms_provider: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        >
                            <option value="africastalking">Africa's Talking</option>
                            <option value="mobulk">Mobulk Africa</option>
                            <option value="custom">Custom HTTP API</option>
                        </select>
                    </div>
                </div>

                {/* Mobulk Africa Credit Balance */}
                {provider === 'mobulk' && enabled && (
                    <div className="p-5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-violet-900 flex items-center gap-2 mb-1">
                                    <DollarSign size={18} className="text-violet-600" />
                                    SMS Credit Balance
                                </h3>
                                {smsBalance?.credits ? (
                                    <p className="text-2xl font-bold text-violet-700">{smsBalance.credits}</p>
                                ) : smsBalance?.error ? (
                                    <p className="text-sm text-red-600">{smsBalance.error}</p>
                                ) : (
                                    <p className="text-sm text-violet-500">Click "Check Balance" to fetch your current credits</p>
                                )}
                            </div>
                            <button
                                onClick={() => checkBalanceMutation.mutate()}
                                disabled={checkBalanceMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 text-sm"
                            >
                                {checkBalanceMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                                {checkBalanceMutation.isPending ? 'Checking...' : 'Check Balance'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Provider-specific fields */}
                <div className="grid md:grid-cols-2 gap-6">
                    {provider === 'africastalking' && (
                        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                <MessageSquare size={18} className="text-green-600" />
                                Africa's Talking
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={smsConfig.at_username || ''}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, at_username: e.target.value })}
                                    placeholder="sandbox or your username"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                                <input
                                    type="password"
                                    value={smsConfig.at_api_key || ''}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, at_api_key: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sender ID <span className="text-slate-400">(optional)</span></label>
                                <input
                                    type="text"
                                    value={smsConfig.at_from || ''}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, at_from: e.target.value })}
                                    placeholder="e.g., KECHITA"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Endpoint</label>
                                <input
                                    type="text"
                                    value={smsConfig.at_endpoint || 'https://api.africastalking.com/version1/messaging'}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, at_endpoint: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                />
                                <p className="text-xs text-slate-400 mt-1">Use sandbox URL for testing: https://api.sandbox.africastalking.com/version1/messaging</p>
                            </div>
                        </div>
                    )}

                    {provider === 'mobulk' && (
                        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                <MessageSquare size={18} className="text-violet-600" />
                                Mobulk Africa
                                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">OnFon Media</span>
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Access Key</label>
                                <input
                                    type="password"
                                    value={smsConfig.mobulk_access_key || ''}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, mobulk_access_key: e.target.value })}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                                />
                                <p className="text-xs text-slate-400 mt-1">Sent as header for all API requests</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                                <input
                                    type="password"
                                    value={smsConfig.mobulk_api_key || ''}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, mobulk_api_key: e.target.value })}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Client ID</label>
                                <input
                                    type="text"
                                    value={smsConfig.mobulk_client_id || ''}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, mobulk_client_id: e.target.value })}
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sender ID</label>
                                <input
                                    type="text"
                                    value={smsConfig.mobulk_sender_id || ''}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, mobulk_sender_id: e.target.value })}
                                    placeholder="e.g., KECHITA"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                                <p className="text-xs text-slate-400 mt-1">Approved sender name displayed on recipient's phone</p>
                            </div>
                        </div>
                    )}

                    {provider === 'custom' && (
                        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                <MessageSquare size={18} className="text-purple-600" />
                                Custom HTTP API
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Endpoint</label>
                                <input
                                    type="text"
                                    value={smsConfig.custom_endpoint || ''}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, custom_endpoint: e.target.value })}
                                    placeholder="https://api.yourprovider.com/sms/send"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Key / Bearer Token <span className="text-slate-400">(optional)</span></label>
                                <input
                                    type="password"
                                    value={smsConfig.custom_api_key || ''}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, custom_api_key: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">HTTP Method</label>
                                    <select
                                        value={smsConfig.custom_method || 'POST'}
                                        onChange={(e) => setSmsConfig({ ...smsConfig, custom_method: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                    >
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Extra Headers <span className="text-slate-400">(JSON)</span></label>
                                <textarea
                                    value={smsConfig.custom_headers || '{}'}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, custom_headers: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                                    placeholder='{"X-Custom-Header": "value"}'
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Body Template <span className="text-slate-400">(JSON with {'{{to}}'} and {'{{message}}'} placeholders)</span></label>
                                <textarea
                                    value={smsConfig.custom_body_template || '{"to":"{{to}}","message":"{{message}}"}'}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, custom_body_template: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                                />
                            </div>
                        </div>
                    )}

                    {/* Test SMS + Provider Info */}
                    <div className="space-y-6">
                        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                <Smartphone size={18} className="text-[#0066B3]" />
                                Send Test SMS
                            </h3>
                            <p className="text-sm text-slate-500">Verify your SMS integration by sending a test message.</p>
                            <div className="flex gap-2">
                                <input
                                    type="tel"
                                    value={testSmsTo}
                                    onChange={(e) => setTestSmsTo(e.target.value)}
                                    placeholder="+254712345678"
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                                />
                                <button
                                    onClick={() => testSmsTo && sendTestSmsMutation.mutate(testSmsTo)}
                                    disabled={!testSmsTo || sendTestSmsMutation.isPending || !enabled}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {sendTestSmsMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Send
                                </button>
                            </div>
                            {!enabled && <p className="text-xs text-amber-600">Enable SMS first to send a test message.</p>}
                        </div>

                        {/* Provider Info */}
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                            <h3 className="font-semibold text-slate-700 text-sm">Provider Quick Links</h3>
                            {provider === 'africastalking' && (
                                <div className="text-sm text-slate-600 space-y-1">
                                    <p>• <a href="https://africastalking.com" target="_blank" rel="noreferrer" className="text-[#0066B3] hover:underline">Africa's Talking Dashboard</a></p>
                                    <p>• Use <code className="bg-white px-1.5 py-0.5 rounded text-xs">sandbox</code> as username for testing</p>
                                    <p>• Sender ID requires approval from AT</p>
                                </div>
                            )}
                            {provider === 'mobulk' && (
                                <div className="text-sm text-slate-600 space-y-1">
                                    <p>• <a href="https://www.onfonmedia.co.ke" target="_blank" rel="noreferrer" className="text-[#0066B3] hover:underline">OnFon Media Portal</a></p>
                                    <p>• <a href="https://www.docs.onfonmedia.co.ke" target="_blank" rel="noreferrer" className="text-[#0066B3] hover:underline">API Documentation</a></p>
                                    <p>• 3 keys required: Access Key (header), API Key + Client ID (body)</p>
                                    <p>• Sender ID must be approved by OnFon</p>
                                    <p>• Credit balance can be checked from the widget above</p>
                                </div>
                            )}
                            {provider === 'custom' && (
                                <div className="text-sm text-slate-600 space-y-1">
                                    <p>• Use <code className="bg-white px-1.5 py-0.5 rounded text-xs">{'{{to}}'}</code> and <code className="bg-white px-1.5 py-0.5 rounded text-xs">{'{{message}}'}</code> in the body template</p>
                                    <p>• API key is sent as <code className="bg-white px-1.5 py-0.5 rounded text-xs">Authorization: Bearer ...</code></p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => saveSmsConfigMutation.mutate(smsConfig)}
                        disabled={saveSmsConfigMutation.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50"
                    >
                        {saveSmsConfigMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saveSmsConfigMutation.isPending ? 'Saving...' : 'Save SMS Settings'}
                    </button>
                </div>
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'claim-types': return renderClaimTypesContent();
            case 'leave-types': return renderLeaveTypesContent();
            case 'approval-flows': return renderApprovalFlowsContent();
            case 'holidays': return renderHolidaysContent();
            case 'loan-settings': return renderLoanSettingsContent();
            case 'email-settings': return renderEmailSettingsContent();
            case 'sms-settings': return renderSmsSettingsContent();
        }
    };

    const getAddButtonLabel = () => {
        switch (activeTab) {
            case 'claim-types': return 'Add Claim Type';
            case 'leave-types': return 'Add Leave Type';
            case 'holidays': return 'Add Holiday';
            default: return 'Add';
        }
    };

    const showAddButton = activeTab !== 'approval-flows' && activeTab !== 'loan-settings' && activeTab !== 'email-settings' && activeTab !== 'sms-settings';

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
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditItem(null);
                                    setFormData({});
                                    setApprovalFlowOriginalStepIds([]);
                                }}
                                className="p-2 hover:bg-white rounded-lg"
                            >
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

                            {activeTab === 'approval-flows' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                            <input
                                                type="text"
                                                value={formData.code || ''}
                                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                placeholder="e.g., LEAVE_DEFAULT"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={formData.name || ''}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g., Leave Approval Flow"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Type</label>
                                            <select
                                                value={formData.target_type || 'leave'}
                                                onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            >
                                                <option value="leave">Leave</option>
                                                <option value="claim">Claim</option>
                                                <option value="staff_loan">Staff Loan</option>
                                                <option value="petty_cash_replenishment">Petty Cash Replenishment</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                            <input
                                                type="number"
                                                value={formData.priority ?? 0}
                                                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Scope: Region</label>
                                            <select
                                                value={formData.region_id || ''}
                                                onChange={(e) => setFormData({ ...formData, region_id: e.target.value || undefined })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            >
                                                <option value="">All Regions</option>
                                                {(regions || []).map((r: any) => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Scope: Branch</label>
                                            <select
                                                value={formData.branch_id || ''}
                                                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value || undefined })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            >
                                                <option value="">All Branches</option>
                                                {(branches || []).map((b: any) => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Scope: Department</label>
                                            <select
                                                value={formData.department_id || ''}
                                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value || undefined })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            >
                                                <option value="">All Departments</option>
                                                {(departments || []).map((d: any) => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Scope: Position</label>
                                            <select
                                                value={formData.position_id || ''}
                                                onChange={(e) => setFormData({ ...formData, position_id: e.target.value || undefined })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            >
                                                <option value="">All Positions</option>
                                                {(positions || []).map((p: any) => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active !== false}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-4 h-4 text-[#0066B3] rounded"
                                        />
                                        <span className="text-sm text-slate-700">Active</span>
                                    </label>

                                    <div className="pt-2 border-t border-slate-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-slate-900">Steps</h3>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const steps: ApprovalFlowStep[] = Array.isArray(formData.steps) ? formData.steps : [];
                                                    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => Number(s.step_order || 0))) + 1 : 1;
                                                    setFormData({
                                                        ...formData,
                                                        steps: [
                                                            ...steps,
                                                            {
                                                                step_order: nextOrder,
                                                                name: `Step ${nextOrder}`,
                                                                approver_type: 'role',
                                                                approver_role_code: 'HR_MANAGER',
                                                                is_final: false,
                                                                can_skip: false,
                                                                auto_approve_hours: 0,
                                                                escalation_hours: 0,
                                                            } satisfies ApprovalFlowStep,
                                                        ],
                                                    });
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
                                            >
                                                <Plus size={16} />
                                                Add Step
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {(Array.isArray(formData.steps) ? (formData.steps as ApprovalFlowStep[]) : []).map((step, idx) => (
                                                <div key={step.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-semibold text-slate-900">Step</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                setFormData({ ...formData, steps: steps.filter((_, i) => i !== idx) });
                                                            }}
                                                            className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Order</label>
                                                            <input
                                                                type="number"
                                                                value={step.step_order}
                                                                onChange={(e) => {
                                                                    const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                    steps[idx] = { ...steps[idx], step_order: Number(e.target.value) };
                                                                    setFormData({ ...formData, steps: [...steps] });
                                                                }}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                                                            <input
                                                                type="text"
                                                                value={step.name || ''}
                                                                onChange={(e) => {
                                                                    const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                    steps[idx] = { ...steps[idx], name: e.target.value };
                                                                    setFormData({ ...formData, steps: [...steps] });
                                                                }}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Approver Type</label>
                                                            <select
                                                                value={step.approver_type}
                                                                onChange={(e) => {
                                                                    const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                    const nextType = e.target.value as ApprovalFlowStep['approver_type'];
                                                                    steps[idx] = { ...steps[idx], approver_type: nextType };
                                                                    setFormData({ ...formData, steps: [...steps] });
                                                                }}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                            >
                                                                <option value="role">Role</option>
                                                                <option value="manager">Manager</option>
                                                                <option value="skip_manager">Manager's Manager</option>
                                                                <option value="branch_manager">Branch Manager</option>
                                                                <option value="regional_manager">Regional Manager</option>
                                                                <option value="department_head">Department Head</option>
                                                                <option value="specific_user">Specific User</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Approver Role</label>
                                                            <select
                                                                value={step.approver_role_code || ''}
                                                                onChange={(e) => {
                                                                    const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                    steps[idx] = { ...steps[idx], approver_role_code: e.target.value || undefined };
                                                                    setFormData({ ...formData, steps: [...steps] });
                                                                }}
                                                                disabled={step.approver_type !== 'role'}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100"
                                                            >
                                                                <option value="">Select role</option>
                                                                {(roles || []).map((r) => (
                                                                    <option key={r.id} value={r.code}>{r.name} ({r.code})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!step.is_final}
                                                                onChange={(e) => {
                                                                    const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                    steps[idx] = { ...steps[idx], is_final: e.target.checked };
                                                                    setFormData({ ...formData, steps: [...steps] });
                                                                }}
                                                                className="w-4 h-4 text-[#0066B3] rounded"
                                                            />
                                                            <span className="text-sm text-slate-700">Final Step</span>
                                                        </label>
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!step.can_skip}
                                                                onChange={(e) => {
                                                                    const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                    steps[idx] = { ...steps[idx], can_skip: e.target.checked };
                                                                    setFormData({ ...formData, steps: [...steps] });
                                                                }}
                                                                className="w-4 h-4 text-[#0066B3] rounded"
                                                            />
                                                            <span className="text-sm text-slate-700">Skippable</span>
                                                        </label>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Auto-approve (hours)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={step.auto_approve_hours || 0}
                                                                onChange={(e) => {
                                                                    const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                    steps[idx] = { ...steps[idx], auto_approve_hours: Number(e.target.value) };
                                                                    setFormData({ ...formData, steps: [...steps] });
                                                                }}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                                placeholder="0 = disabled"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Escalate after (hours)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={step.escalation_hours || 0}
                                                                onChange={(e) => {
                                                                    const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                    steps[idx] = { ...steps[idx], escalation_hours: Number(e.target.value) };
                                                                    setFormData({ ...formData, steps: [...steps] });
                                                                }}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                                placeholder="0 = disabled"
                                                            />
                                                        </div>
                                                    </div>

                                                    {(step.escalation_hours || 0) > 0 && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Escalate to Role</label>
                                                            <select
                                                                value={step.escalation_role_code || ''}
                                                                onChange={(e) => {
                                                                    const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                    steps[idx] = { ...steps[idx], escalation_role_code: e.target.value || undefined };
                                                                    setFormData({ ...formData, steps: [...steps] });
                                                                }}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                            >
                                                                <option value="">Select role</option>
                                                                {(roles || []).map((r) => (
                                                                    <option key={r.id} value={r.code}>{r.name} ({r.code})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Instructions for approver</label>
                                                        <textarea
                                                            value={step.instructions || ''}
                                                            onChange={(e) => {
                                                                const steps: ApprovalFlowStep[] = (formData.steps || []) as ApprovalFlowStep[];
                                                                steps[idx] = { ...steps[idx], instructions: e.target.value };
                                                                setFormData({ ...formData, steps: [...steps] });
                                                            }}
                                                            rows={2}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                            placeholder="Optional guidance for the approver..."
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    setEditItem(null);
                                    setFormData({});
                                    setApprovalFlowOriginalStepIds([]);
                                }}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="flex items-center gap-2 px-5 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"
                            >
                                <Save size={18} />
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={!!confirmDialog}
                title={confirmDialog?.title || ''}
                message={confirmDialog?.message || ''}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}
                onCancel={() => setConfirmDialog(null)}
            />

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all animate-in slide-in-from-bottom-4 ${
                    toast.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-red-500" />}
                    {toast.text}
                    <button onClick={() => setToast(null)} className="ml-2 p-0.5 hover:bg-white/50 rounded">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export { SettingsPage };
export default SettingsPage;
