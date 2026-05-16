import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Plus, Edit, Trash2,
    Settings, Receipt, Calendar, CalendarDays, GitBranch,
    PiggyBank, X, DollarSign, ChevronRight, Save, CheckCircle, AlertCircle,
    Mail, Send, Wifi, WifiOff, Loader2, MessageSquare, Smartphone,
    Umbrella, FileCheck, Wallet, Users, Building2, Briefcase, ClipboardList,
    BarChart3, ShieldCheck, Search
} from 'lucide-react';

type Tab = 'claim-types' | 'leave-types' | 'approval-flows' | 'holidays' | 'loan-settings' | 'email-settings' | 'sms-settings' | 'leave-settings' | 'claims-settings' | 'petty-cash-settings' | 'recruitment-settings' | 'onboarding-settings' | 'reports-settings' | 'org-settings' | 'hr-settings' | 'approvals-settings';

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
    const [tabSearch, setTabSearch] = useState('');
    const [showPalette, setShowPalette] = useState(false);
    const [paletteQuery, setPaletteQuery] = useState('');
    const [paletteIdx, setPaletteIdx] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [approvalFlowOriginalStepIds, setApprovalFlowOriginalStepIds] = useState<string[]>([]);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [loanSettings, setLoanSettings] = useState<Record<string, any>>({});
    const [leaveSettings, setLeaveSettings] = useState<Record<string, any>>({});
    const [claimsSettings, setClaimsSettings] = useState<Record<string, any>>({});
    const [pettyCashSettings, setPettyCashSettings] = useState<Record<string, any>>({});
    const [recruitmentSettings, setRecruitmentSettings] = useState<Record<string, any>>({});
    const [onboardingSettings, setOnboardingSettings] = useState<Record<string, any>>({});
    const [reportsSettings, setReportsSettings] = useState<Record<string, any>>({});
    const [orgSettings, setOrgSettings] = useState<Record<string, any>>({});
    const [hrSettings, setHrSettings] = useState<Record<string, any>>({});
    const [approvalsSettings, setApprovalsSettings] = useState<Record<string, any>>({});
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
    const currentYear = new Date().getFullYear();
    const { data: holidays } = useQuery<PublicHoliday[]>({
        queryKey: ['holidays', currentYear],
        queryFn: async () => (await api.get(`/leave/holidays?year=${currentYear}`)).data,
    });

    // Loan settings query
    const { data: loanSettingsData } = useQuery<Record<string, any>>({
        queryKey: ['loan-settings'],
        queryFn: async () => (await api.get('/settings/category/loans')).data,
    });

    useEffect(() => { if (loanSettingsData) setLoanSettings(loanSettingsData); }, [loanSettingsData]);

    const { data: leaveSettingsData } = useQuery<Record<string, any>>({ queryKey: ['leave-settings'], queryFn: async () => (await api.get('/settings/category/leave')).data });
    useEffect(() => { if (leaveSettingsData) setLeaveSettings(leaveSettingsData); }, [leaveSettingsData]);

    const { data: claimsSettingsData } = useQuery<Record<string, any>>({ queryKey: ['claims-settings'], queryFn: async () => (await api.get('/settings/category/claims')).data });
    useEffect(() => { if (claimsSettingsData) setClaimsSettings(claimsSettingsData); }, [claimsSettingsData]);

    const { data: pettyCashSettingsData } = useQuery<Record<string, any>>({ queryKey: ['petty-cash-settings'], queryFn: async () => (await api.get('/settings/category/petty_cash')).data });
    useEffect(() => { if (pettyCashSettingsData) setPettyCashSettings(pettyCashSettingsData); }, [pettyCashSettingsData]);

    const { data: recruitmentSettingsData } = useQuery<Record<string, any>>({ queryKey: ['recruitment-settings'], queryFn: async () => (await api.get('/settings/category/recruitment')).data });
    useEffect(() => { if (recruitmentSettingsData) setRecruitmentSettings(recruitmentSettingsData); }, [recruitmentSettingsData]);

    const { data: onboardingSettingsData } = useQuery<Record<string, any>>({ queryKey: ['onboarding-settings'], queryFn: async () => (await api.get('/settings/category/onboarding')).data });
    useEffect(() => { if (onboardingSettingsData) setOnboardingSettings(onboardingSettingsData); }, [onboardingSettingsData]);

    const { data: reportsSettingsData } = useQuery<Record<string, any>>({ queryKey: ['reports-settings'], queryFn: async () => (await api.get('/settings/category/reports')).data });
    useEffect(() => { if (reportsSettingsData) setReportsSettings(reportsSettingsData); }, [reportsSettingsData]);

    const { data: orgSettingsData } = useQuery<Record<string, any>>({ queryKey: ['org-settings'], queryFn: async () => (await api.get('/settings/category/org')).data });
    useEffect(() => { if (orgSettingsData) setOrgSettings(orgSettingsData); }, [orgSettingsData]);

    const { data: hrSettingsData } = useQuery<Record<string, any>>({ queryKey: ['hr-settings'], queryFn: async () => (await api.get('/settings/category/hr')).data });
    useEffect(() => { if (hrSettingsData) setHrSettings(hrSettingsData); }, [hrSettingsData]);

    const { data: approvalsSettingsData } = useQuery<Record<string, any>>({ queryKey: ['approvals-settings'], queryFn: async () => (await api.get('/settings/category/approvals')).data });
    useEffect(() => { if (approvalsSettingsData) setApprovalsSettings(approvalsSettingsData); }, [approvalsSettingsData]);

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
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays', currentYear] }); setShowModal(false); setFormData({}); showToast('Holiday created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create holiday', 'error'),
    });
    const updateHolidayMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<PublicHoliday> }) => (await api.put(`/leave/holidays/${id}`, data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays', currentYear] }); setShowModal(false); setFormData({}); setEditItem(null); showToast('Holiday updated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update holiday', 'error'),
    });
    const deleteHolidayMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/leave/holidays/${id}`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays', currentYear] }); showToast('Holiday deleted'); },
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

    const makeSettingsMutation = (category: string, queryKey: string, label: string) =>
        useMutation({
            mutationFn: async (settings: Record<string, any>) => {
                const entries = Object.entries(settings).map(([key, value]) => ({ key, value, category }));
                return (await api.post('/settings/bulk', { entries })).data;
            },
            onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); showToast(`${label} saved`); },
            onError: (e: any) => showToast(e?.response?.data?.message || `Failed to save ${label}`, 'error'),
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

    const saveLeaveSettingsMutation = makeSettingsMutation('leave', 'leave-settings', 'Leave settings');
    const saveClaimsSettingsMutation = makeSettingsMutation('claims', 'claims-settings', 'Claims settings');
    const savePettyCashSettingsMutation = makeSettingsMutation('petty_cash', 'petty-cash-settings', 'Petty Cash settings');
    const saveRecruitmentSettingsMutation = makeSettingsMutation('recruitment', 'recruitment-settings', 'Recruitment settings');
    const saveOnboardingSettingsMutation = makeSettingsMutation('onboarding', 'onboarding-settings', 'Onboarding settings');
    const saveReportsSettingsMutation = makeSettingsMutation('reports', 'reports-settings', 'Reports settings');
    const saveOrgSettingsMutation = makeSettingsMutation('org', 'org-settings', 'Organisation settings');
    const saveHrSettingsMutation = makeSettingsMutation('hr', 'hr-settings', 'HR settings');
    const saveApprovalsSettingsMutation = makeSettingsMutation('approvals', 'approvals-settings', 'Approvals settings');

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
        { key: 'loan-settings' as Tab, label: 'Loans & Advances', icon: PiggyBank },
        { key: 'leave-settings' as Tab, label: 'Leave Policy', icon: Umbrella },
        { key: 'claims-settings' as Tab, label: 'Claims Policy', icon: FileCheck },
        { key: 'petty-cash-settings' as Tab, label: 'Petty Cash Policy', icon: Wallet },
        { key: 'recruitment-settings' as Tab, label: 'Recruitment Policy', icon: Users },
        { key: 'onboarding-settings' as Tab, label: 'Onboarding Policy', icon: ClipboardList },
        { key: 'reports-settings' as Tab, label: 'Reports Policy', icon: BarChart3 },
        { key: 'org-settings' as Tab, label: 'Organisation', icon: Building2 },
        { key: 'hr-settings' as Tab, label: 'HR Policy', icon: Briefcase },
        { key: 'approvals-settings' as Tab, label: 'Approvals Policy', icon: ShieldCheck },
        { key: 'email-settings' as Tab, label: 'Email / SMTP', icon: Mail },
        { key: 'sms-settings' as Tab, label: 'Bulk SMS', icon: MessageSquare },
    ];

    // ⌘K / Ctrl-K command palette
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setShowPalette(prev => !prev);
                setPaletteQuery('');
                setPaletteIdx(0);
            } else if (e.key === 'Escape' && showPalette) {
                setShowPalette(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showPalette]);

    const paletteMatches = mainTabs.filter(t =>
        !paletteQuery || t.label.toLowerCase().includes(paletteQuery.toLowerCase())
    );

    const choosePaletteItem = (key: Tab) => {
        setActiveTab(key);
        setShowPalette(false);
        setPaletteQuery('');
    };

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
                                        title="Deactivate" aria-label="Deactivate"
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
                                            {new Date(`${holiday.date}T00:00:00`).toLocaleDateString('en-GB', {
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

    const renderLoanSettingsContent = () => {
        const field = (
            key: string,
            label: string,
            hint: string,
            type: 'number' | 'percent' | 'kes' = 'number',
            defaultVal: number = 0,
            min?: number,
            max?: number,
        ) => (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-0.5">{label}</label>
                <p className="text-xs text-slate-400 mb-1">{hint}</p>
                <div className="relative">
                    {type === 'kes' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">KES</span>}
                    {type === 'percent' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>}
                    <input
                        type="number"
                        value={loanSettings[key] ?? defaultVal}
                        onChange={(e) => setLoanSettings({ ...loanSettings, [key]: Number(e.target.value) })}
                        min={min}
                        max={max}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B3] text-sm ${type === 'kes' ? 'pl-12' : ''} ${type === 'percent' ? 'pr-8' : ''}`}
                    />
                </div>
            </div>
        );

        const toggle = (key: string, label: string, hint: string, defaultVal: boolean = true) => (
            <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                <input
                    type="checkbox"
                    checked={loanSettings[key] ?? defaultVal}
                    onChange={(e) => setLoanSettings({ ...loanSettings, [key]: e.target.checked })}
                    className="w-4 h-4 mt-0.5 text-[#0066B3] rounded accent-[#0066B3]"
                />
                <div>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
                </div>
            </label>
        );

        return (
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Loan & Advance Policies</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Configure rules that govern staff loans and salary advances across the organization.</p>
                    </div>
                    <button
                        onClick={() => saveLoanSettingsMutation.mutate(loanSettings)}
                        disabled={saveLoanSettingsMutation.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50 text-sm"
                    >
                        <Save size={16} />
                        {saveLoanSettingsMutation.isPending ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* ── Salary Advance ── */}
                    <div className="p-6 bg-white border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                                <DollarSign size={20} className="text-cyan-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Salary Advance</h3>
                                <p className="text-xs text-slate-400">Quick short-term advance against monthly salary</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {field('advance_max_per_month', 'Max Advances Per Month', 'How many salary advance requests a staff member can make in a single calendar month.', 'number', 1, 1, 5)}
                            {field('advance_max_salary_percent', 'Max % of Gross Salary', 'Maximum advance amount as a percentage of gross monthly salary (e.g. 20 = 20% of salary).', 'percent', 20, 5, 50)}
                            {field('advance_min_months_employed', 'Minimum Months Employed', 'Staff must have been employed for at least this many months before they can apply.', 'number', 3, 0)}
                            {field('advance_interest_rate', 'Interest Rate (% p.a.)', 'Annual interest rate applied to salary advances. Set to 0 for interest-free advances.', 'percent', 0, 0, 30)}
                            {field('advance_repayment_months', 'Repayment Period (months)', 'Number of months over which the advance will be recovered from salary.', 'number', 1, 1, 3)}
                            {field('advance_max_outstanding', 'Max Outstanding Advances', 'Maximum number of uncleared advances a staff member can have at one time.', 'number', 1, 1, 3)}
                        </div>
                    </div>

                    {/* ── Staff Loan ── */}
                    <div className="p-6 bg-white border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <PiggyBank size={20} className="text-[#0066B3]" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Staff Loan</h3>
                                <p className="text-xs text-slate-400">Medium to long-term loans repaid via monthly deductions</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {field('loan_max_amount', 'Maximum Loan Amount', 'The highest loan amount any staff member can apply for.', 'kes', 500000, 10000)}
                            {field('loan_min_amount', 'Minimum Loan Amount', 'The lowest loan amount that can be applied for.', 'kes', 10000, 1000)}
                            {field('loan_max_term_months', 'Maximum Repayment Term (months)', 'The longest period over which a loan can be repaid.', 'number', 24, 1, 60)}
                            {field('loan_min_term_months', 'Minimum Repayment Term (months)', 'The shortest repayment period allowed.', 'number', 3, 1, 12)}
                            {field('loan_interest_rate', 'Annual Interest Rate (% p.a.)', 'Interest charged on staff loans per annum, applied on reducing balance.', 'percent', 12, 0, 30)}
                            {field('loan_max_deduction_percent', 'Max Monthly Salary Deduction (%)', 'Maximum percentage of gross salary that can be deducted monthly for loan repayment (statutory limit is 33%).', 'percent', 33, 10, 50)}
                            {field('loan_min_months_employed', 'Minimum Months Employed', 'Staff must be employed for at least this many months before qualifying for a loan.', 'number', 6, 0)}
                            {field('loan_guarantor_threshold', 'Guarantor Required Above (KES)', 'Loans above this amount require a guarantor. Set to 0 to always require.', 'kes', 100000, 0)}
                        </div>
                    </div>

                    {/* ── General Policies ── */}
                    <div className="md:col-span-2 p-6 bg-white border border-slate-200 rounded-xl">
                        <h3 className="font-semibold text-slate-900 mb-1">General Policies</h3>
                        <p className="text-xs text-slate-400 mb-5">Organisation-wide rules that apply to all loan and advance types.</p>
                        <div className="grid md:grid-cols-2 gap-3">
                            {toggle('loan_require_guarantor', 'Require Guarantor', 'Staff loans above the guarantor threshold require a co-signing guarantor from within the organisation.', true)}
                            {toggle('loan_confirmed_only', 'Confirmed Staff Only', 'Only staff who have completed their probation period and been confirmed can apply for loans.', true)}
                            {toggle('advance_confirmed_only', 'Confirmed Staff for Advances', 'Only confirmed staff can apply for salary advances (unconfirmed staff are excluded).', false)}
                            {toggle('loan_auto_deduct', 'Auto-Deduct from Payroll', 'Loan repayment installments are automatically deducted from monthly payroll.', true)}
                            {toggle('loan_allow_multiple', 'Allow Multiple Active Loans', 'Staff can hold more than one active loan simultaneously. If disabled, they must clear existing loans first.', false)}
                            {toggle('advance_clear_before_loan', 'Clear Advances Before Loan', 'Any outstanding salary advances must be cleared before a staff loan can be approved.', true)}
                            {toggle('loan_allow_top_up', 'Allow Loan Top-Up', 'Staff with an active loan can apply for a top-up if they have repaid at least 50% of the original amount.', false)}
                            {toggle('loan_require_hod_approval', 'Require HOD Approval', 'All loan applications must first be approved by the Head of Department before HR/Finance review.', true)}
                            {toggle('loan_notify_hr_on_apply', 'Notify HR on Application', 'HR Manager receives an email/notification whenever a new loan or advance application is submitted.', true)}
                            {toggle('loan_notify_staff_on_status', 'Notify Staff on Status Change', 'Staff receive notifications when their loan/advance application is approved, rejected or disbursed.', true)}
                        </div>
                    </div>

                    {/* ── Eligibility Criteria ── */}
                    <div className="md:col-span-2 p-6 bg-white border border-slate-200 rounded-xl">
                        <h3 className="font-semibold text-slate-900 mb-1">Eligibility & Limits</h3>
                        <p className="text-xs text-slate-400 mb-5">Fine-grained eligibility rules and financial ceilings.</p>
                        <div className="grid md:grid-cols-3 gap-4">
                            {field('loan_max_per_staff', 'Max Active Loans Per Staff', 'Maximum number of active loans a single staff member can hold at any one time.', 'number', 1, 1, 5)}
                            {field('loan_min_salary_for_loan', 'Minimum Gross Salary for Loan (KES)', 'Staff must earn at least this amount monthly to qualify for a staff loan.', 'kes', 15000, 0)}
                            {field('advance_min_salary_for_advance', 'Minimum Gross Salary for Advance (KES)', 'Staff must earn at least this amount monthly to qualify for a salary advance.', 'kes', 10000, 0)}
                            {field('loan_max_salary_multiple', 'Max Loan as Multiple of Salary', 'Maximum loan principal expressed as a multiple of gross monthly salary (e.g. 6 = up to 6× salary).', 'number', 6, 1, 24)}
                            {field('loan_penalty_rate', 'Late Repayment Penalty Rate (%)', 'Monthly penalty rate applied when a repayment installment is overdue.', 'percent', 2, 0, 10)}
                            {field('loan_grace_days', 'Grace Period (days)', 'Number of days after the due date before a repayment is considered overdue.', 'number', 5, 0, 30)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderSettingsPanel = (
        title: string,
        subtitle: string,
        icon: React.ReactNode,
        settings: Record<string, any>,
        setSettings: React.Dispatch<React.SetStateAction<Record<string, any>>>,
        saveMutation: { mutate: (s: any) => void; isPending: boolean },
        sections: {
            title: string;
            subtitle?: string;
            fields?: { key: string; label: string; hint: string; type: 'number' | 'percent' | 'kes' | 'text' | 'select'; defaultVal?: any; min?: number; max?: number; options?: { value: string; label: string }[] }[];
            toggles?: { key: string; label: string; hint: string; defaultVal?: boolean }[];
            cols?: 2 | 3;
        }[]
    ) => (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0066B3]/10 flex items-center justify-center text-[#0066B3]">{icon}</div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                        <p className="text-sm text-slate-500">{subtitle}</p>
                    </div>
                </div>
                <button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] disabled:opacity-50 text-sm">
                    <Save size={16} />{saveMutation.isPending ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>
            {sections.map((section, si) => (
                <div key={si} className="p-6 bg-white border border-slate-200 rounded-xl">
                    <h3 className="font-semibold text-slate-900 mb-0.5">{section.title}</h3>
                    {section.subtitle && <p className="text-xs text-slate-400 mb-4">{section.subtitle}</p>}
                    {!section.subtitle && <div className="mb-4" />}
                    {section.fields && (
                        <div className={`grid md:grid-cols-${section.cols ?? 2} gap-4 ${section.toggles ? 'mb-4' : ''}`}>
                            {section.fields.map(f => (
                                <div key={f.key}>
                                    <label className="block text-sm font-medium text-slate-700 mb-0.5">{f.label}</label>
                                    <p className="text-xs text-slate-400 mb-1">{f.hint}</p>
                                    {f.type === 'select' ? (
                                        <select value={settings[f.key] ?? f.defaultVal ?? ''} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]">
                                            {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    ) : f.type === 'text' ? (
                                        <input type="text" value={settings[f.key] ?? f.defaultVal ?? ''} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3]" />
                                    ) : (
                                        <div className="relative">
                                            {f.type === 'kes' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">KES</span>}
                                            {f.type === 'percent' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>}
                                            <input type="number" value={settings[f.key] ?? f.defaultVal ?? 0} min={f.min} max={f.max}
                                                onChange={e => setSettings({ ...settings, [f.key]: Number(e.target.value) })}
                                                className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066B3] ${f.type === 'kes' ? 'pl-12' : ''} ${f.type === 'percent' ? 'pr-8' : ''}`} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {section.toggles && (
                        <div className={`grid md:grid-cols-2 gap-3`}>
                            {section.toggles.map(t => (
                                <label key={t.key} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                                    <input type="checkbox" checked={settings[t.key] ?? (t.defaultVal ?? true)}
                                        onChange={e => setSettings({ ...settings, [t.key]: e.target.checked })}
                                        className="w-4 h-4 mt-0.5 accent-[#0066B3] rounded" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">{t.label}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{t.hint}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    const renderLeaveSettingsContent = () => renderSettingsPanel(
        'Leave Policy', 'Configure rules governing leave requests and entitlements.', <Umbrella size={20} />,
        leaveSettings, setLeaveSettings, saveLeaveSettingsMutation,
        [
            {
                title: 'Request Rules', subtitle: 'Controls how and when staff can apply for leave.',
                fields: [
                    { key: 'leave_min_days_notice', label: 'Minimum Days Notice', hint: 'Staff must apply at least N days before the leave starts.', type: 'number', defaultVal: 3, min: 0 },
                    { key: 'leave_max_consecutive_days', label: 'Max Consecutive Days', hint: 'Maximum consecutive days in a single request without HR override.', type: 'number', defaultVal: 21, min: 1 },
                    { key: 'leave_min_days_per_request', label: 'Minimum Days Per Request', hint: 'The minimum number of days allowed per leave request.', type: 'number', defaultVal: 1, min: 1 },
                    { key: 'leave_cancel_days_before', label: 'Cancel Allowed Days Before', hint: 'Staff can cancel approved leave up to N days before it starts.', type: 'number', defaultVal: 1, min: 0 },
                    { key: 'leave_auto_approve_hours', label: 'Auto-Approve After (hours)', hint: 'Automatically approve leave if not actioned within N hours. Set 0 to disable.', type: 'number', defaultVal: 72, min: 0 },
                    { key: 'leave_carry_forward_max', label: 'Max Carry-Forward Days', hint: 'Global cap on days that can be carried forward to the next year.', type: 'number', defaultVal: 10, min: 0 },
                ],
                cols: 3,
            },
            {
                title: 'Accrual & Entitlement', subtitle: 'How leave is accrued and entitled.',
                fields: [
                    { key: 'leave_accrual_frequency', label: 'Accrual Frequency', hint: 'How often leave is accrued.', type: 'select', defaultVal: 'monthly', options: [{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annually', label: 'Annually' }] },
                    { key: 'leave_accrual_start_month', label: 'Accrual Start Month', hint: 'Which month (1-12) accrual begins for new staff.', type: 'number', defaultVal: 1, min: 1, max: 12 },
                    { key: 'leave_fiscal_year_start', label: 'Leave Year Start Month', hint: 'Month when the leave year resets (1=Jan, 7=Jul).', type: 'number', defaultVal: 1, min: 1, max: 12 },
                ],
            },
            {
                title: 'Eligibility & Restrictions',
                toggles: [
                    { key: 'leave_require_reliever', label: 'Require Reliever', hint: 'Staff must assign a reliever before applying for certain leave types.', defaultVal: true },
                    { key: 'leave_allow_half_days', label: 'Allow Half-Day Requests', hint: 'Staff can apply for half-day leave (morning or afternoon).', defaultVal: false },
                    { key: 'leave_probation_eligible', label: 'Probationary Staff Eligible', hint: 'Staff on probation can apply for leave.', defaultVal: false },
                    { key: 'leave_blackout_december', label: 'Blackout December', hint: 'Disallow leave in the month of December.', defaultVal: false },
                    { key: 'leave_notify_manager_on_apply', label: 'Notify Line Manager on Apply', hint: 'Line manager receives notification when a leave request is submitted.', defaultVal: true },
                    { key: 'leave_notify_hr_on_apply', label: 'Notify HR on Apply', hint: 'HR Manager receives notification on every leave application.', defaultVal: false },
                    { key: 'leave_notify_staff_on_action', label: 'Notify Staff on Approval/Rejection', hint: 'Staff receive notification when their leave is approved or rejected.', defaultVal: true },
                    { key: 'leave_allow_negative_balance', label: 'Allow Negative Leave Balance', hint: 'Staff can apply for leave even if their balance is zero.', defaultVal: false },
                ],
            },
        ]
    );

    const renderClaimsSettingsContent = () => renderSettingsPanel(
        'Claims Policy', 'Configure rules governing expense claim submissions and approvals.', <FileCheck size={20} />,
        claimsSettings, setClaimsSettings, saveClaimsSettingsMutation,
        [
            {
                title: 'Submission Limits', subtitle: 'Control how much and how often staff can claim.',
                fields: [
                    { key: 'claims_max_per_month', label: 'Max Claims Per Month', hint: 'Maximum number of separate claim submissions per staff per month.', type: 'number', defaultVal: 10, min: 1 },
                    { key: 'claims_max_single_amount', label: 'Max Single Claim Amount', hint: 'Maximum amount allowed for a single claim submission.', type: 'kes', defaultVal: 200000, min: 0 },
                    { key: 'claims_max_item_amount', label: 'Max Amount Per Item', hint: 'Maximum amount for a single line item within a claim.', type: 'kes', defaultVal: 50000, min: 0 },
                    { key: 'claims_high_value_threshold', label: 'High-Value Threshold', hint: 'Claims above this amount are routed to the high-value approval flow.', type: 'kes', defaultVal: 50000, min: 0 },
                    { key: 'claims_require_receipt_above', label: 'Receipt Required Above', hint: 'Claims with items above this amount must have a receipt attached.', type: 'kes', defaultVal: 1000, min: 0 },
                    { key: 'claims_retroactive_days', label: 'Max Retroactive Days', hint: 'Staff can only claim expenses incurred within the past N days.', type: 'number', defaultVal: 30, min: 1 },
                ],
                cols: 3,
            },
            {
                title: 'Processing Rules',
                fields: [
                    { key: 'claims_auto_approve_hours', label: 'Auto-Approve After (hours)', hint: 'Automatically approve claims not actioned within N hours. Set 0 to disable.', type: 'number', defaultVal: 48, min: 0 },
                    { key: 'claims_payment_days_sla', label: 'Payment SLA (days)', hint: 'Target number of days to process payment after approval.', type: 'number', defaultVal: 7, min: 1 },
                ],
            },
            {
                title: 'Policies & Notifications',
                toggles: [
                    { key: 'claims_require_pre_approval', label: 'Require Pre-Approval', hint: 'Staff must obtain pre-approval before incurring the expense.', defaultVal: false },
                    { key: 'claims_allow_draft_save', label: 'Allow Draft Save', hint: 'Staff can save incomplete claims as drafts before submitting.', defaultVal: true },
                    { key: 'claims_notify_finance_on_submit', label: 'Notify Finance on Submission', hint: 'Finance/Accountant receives notification when a claim is submitted.', defaultVal: true },
                    { key: 'claims_notify_staff_on_action', label: 'Notify Staff on Status Change', hint: 'Staff receive notifications when their claim status changes.', defaultVal: true },
                    { key: 'claims_require_manager_approval', label: 'Require Manager Approval', hint: 'Claims must be approved by the direct line manager.', defaultVal: true },
                    { key: 'claims_allow_resubmission', label: 'Allow Resubmission After Rejection', hint: 'Staff can edit and resubmit rejected claims.', defaultVal: true },
                ],
            },
        ]
    );

    const renderPettyCashSettingsContent = () => renderSettingsPanel(
        'Petty Cash Policy', 'Configure rules governing petty cash floats, expenses, and replenishments.', <Wallet size={20} />,
        pettyCashSettings, setPettyCashSettings, savePettyCashSettingsMutation,
        [
            {
                title: 'Float Tier Limits', subtitle: 'Maximum balances for each float tier.',
                fields: [
                    { key: 'petty_cash_small_tier_limit', label: 'Small Tier Maximum (KES)', hint: 'Maximum allowed balance for a small-tier petty cash float.', type: 'kes', defaultVal: 5000 },
                    { key: 'petty_cash_medium_tier_limit', label: 'Medium Tier Maximum (KES)', hint: 'Maximum allowed balance for a medium-tier petty cash float.', type: 'kes', defaultVal: 20000 },
                    { key: 'petty_cash_large_tier_limit', label: 'Large Tier Maximum (KES)', hint: 'Maximum allowed balance for a large-tier petty cash float.', type: 'kes', defaultVal: 50000 },
                ],
                cols: 3,
            },
            {
                title: 'Expense Controls',
                fields: [
                    { key: 'petty_cash_max_single_expense', label: 'Max Single Expense (KES)', hint: 'Maximum amount for a single petty cash disbursement.', type: 'kes', defaultVal: 5000 },
                    { key: 'petty_cash_require_receipt_above', label: 'Receipt Required Above (KES)', hint: 'Receipts must be attached for expenses above this amount.', type: 'kes', defaultVal: 500 },
                    { key: 'petty_cash_replenishment_trigger', label: 'Replenishment Trigger (%)', hint: 'Auto-flag float for replenishment when balance drops below this % of limit.', type: 'percent', defaultVal: 25, min: 5, max: 75 },
                    { key: 'petty_cash_auto_deactivate_days', label: 'Auto-Deactivate After (days)', hint: 'Automatically deactivate float after N days of inactivity. Set 0 to disable.', type: 'number', defaultVal: 90, min: 0 },
                ],
            },
            {
                title: 'Policies',
                toggles: [
                    { key: 'petty_cash_replenishment_approval_required', label: 'Approval Required for Replenishment', hint: 'Replenishment requests must go through an approval workflow.', defaultVal: true },
                    { key: 'petty_cash_notify_custodian_low', label: 'Notify Custodian on Low Balance', hint: 'Custodian receives a notification when float balance is low.', defaultVal: true },
                    { key: 'petty_cash_allow_float_transfer', label: 'Allow Balance Transfer Between Floats', hint: 'Permit transferring balance from one float to another.', defaultVal: false },
                    { key: 'petty_cash_require_witness', label: 'Require Witness for Large Expenses', hint: 'Expenses above the max require a witness/co-signer.', defaultVal: false },
                    { key: 'petty_cash_notify_finance_on_replenishment', label: 'Notify Finance on Replenishment', hint: 'Finance team is notified when a replenishment is requested or approved.', defaultVal: true },
                    { key: 'petty_cash_allow_staff_expenses', label: 'Allow Direct Staff Expenses', hint: 'Staff (non-custodians) can request petty cash expenses.', defaultVal: false },
                ],
            },
        ]
    );

    const renderRecruitmentSettingsContent = () => renderSettingsPanel(
        'Recruitment Policy', 'Configure rules governing job postings, interviews, and hiring.', <Users size={20} />,
        recruitmentSettings, setRecruitmentSettings, saveRecruitmentSettingsMutation,
        [
            {
                title: 'Job Postings & Pipeline',
                fields: [
                    { key: 'recruitment_max_active_jobs', label: 'Max Active Job Postings', hint: 'Maximum number of simultaneously active job postings.', type: 'number', defaultVal: 20, min: 1 },
                    { key: 'recruitment_shortlist_quota', label: 'Max Shortlisted Candidates', hint: 'Maximum candidates to shortlist per job posting.', type: 'number', defaultVal: 10, min: 1 },
                    { key: 'recruitment_interview_rounds', label: 'Default Interview Rounds', hint: 'Default number of interview rounds for a new job posting.', type: 'number', defaultVal: 2, min: 1, max: 5 },
                    { key: 'recruitment_offer_expiry_days', label: 'Offer Letter Expiry (days)', hint: 'Number of days a candidate has to accept an offer before it expires.', type: 'number', defaultVal: 5, min: 1 },
                    { key: 'recruitment_probation_months', label: 'Default Probation Period (months)', hint: 'Default probation period for new hires.', type: 'number', defaultVal: 3, min: 1, max: 12 },
                ],
                cols: 3,
            },
            {
                title: 'Compliance & Requirements',
                toggles: [
                    { key: 'recruitment_require_background_check', label: 'Require Background Check', hint: 'Background check must be completed before an offer is issued.', defaultVal: true },
                    { key: 'recruitment_allow_internal_applications', label: 'Allow Internal Applications', hint: 'Existing staff can apply for open positions.', defaultVal: true },
                    { key: 'recruitment_pipeline_auto_advance', label: 'Auto-Advance Pipeline', hint: 'Automatically advance candidates to the next stage when all checks pass.', defaultVal: false },
                    { key: 'recruitment_notify_hr_on_application', label: 'Notify HR on Each Application', hint: 'HR receives notification for every new application received.', defaultVal: true },
                    { key: 'recruitment_notify_applicant_on_status', label: 'Notify Applicant on Status Change', hint: 'Applicants receive email notifications when their status changes.', defaultVal: true },
                    { key: 'recruitment_require_panel_interview', label: 'Require Panel Interview', hint: 'At least one interview must be a panel interview.', defaultVal: false },
                    { key: 'recruitment_approval_before_posting', label: 'Approval Before Posting', hint: 'Job postings require CEO/HR approval before going live.', defaultVal: true },
                    { key: 'recruitment_allow_reapplication', label: 'Allow Re-Application', hint: 'Candidates rejected in the past can re-apply for the same role.', defaultVal: true },
                ],
            },
        ]
    );

    const renderOnboardingSettingsContent = () => renderSettingsPanel(
        'Onboarding Policy', 'Configure rules governing staff onboarding and probation.', <ClipboardList size={20} />,
        onboardingSettings, setOnboardingSettings, saveOnboardingSettingsMutation,
        [
            {
                title: 'Onboarding Timeline',
                fields: [
                    { key: 'onboarding_deadline_days', label: 'Onboarding Deadline (days)', hint: 'Number of days from join date to complete all onboarding tasks.', type: 'number', defaultVal: 30, min: 7 },
                    { key: 'onboarding_reminder_days_before', label: 'Reminder Days Before Deadline', hint: 'Send reminder notifications this many days before the onboarding deadline.', type: 'number', defaultVal: 5, min: 1 },
                    { key: 'onboarding_probation_months', label: 'Default Probation Period (months)', hint: 'Standard probation length for new staff.', type: 'number', defaultVal: 3, min: 1, max: 12 },
                    { key: 'onboarding_probation_extension_months', label: 'Max Probation Extension (months)', hint: 'Maximum additional months probation can be extended.', type: 'number', defaultVal: 3, min: 0, max: 6 },
                ],
            },
            {
                title: 'Completion Requirements',
                toggles: [
                    { key: 'onboarding_auto_assign_template', label: 'Auto-Assign Template on Staff Creation', hint: 'Automatically assign the default onboarding template when a new staff member is created.', defaultVal: true },
                    { key: 'onboarding_require_all_docs', label: 'Require All Documents for Confirmation', hint: 'Staff cannot be confirmed until all required documents have been uploaded and verified.', defaultVal: true },
                    { key: 'onboarding_require_all_tasks', label: 'Require All Tasks Completed', hint: 'All onboarding tasks must be marked complete before confirmation.', defaultVal: true },
                    { key: 'onboarding_notify_hr_on_complete', label: 'Notify HR on Completion', hint: 'HR receives notification when an onboarding instance is fully completed.', defaultVal: true },
                    { key: 'onboarding_notify_manager_on_complete', label: 'Notify Manager on Completion', hint: 'Line manager is notified when onboarding is complete.', defaultVal: true },
                    { key: 'onboarding_block_payroll_until_complete', label: 'Block Payroll Until Complete', hint: 'Staff member cannot be added to payroll until onboarding is complete.', defaultVal: false },
                    { key: 'onboarding_send_welcome_email', label: 'Send Welcome Email', hint: 'Automatically send a welcome email to the staff member on their first day.', defaultVal: true },
                    { key: 'onboarding_require_bank_details', label: 'Require Bank Details Before Payroll', hint: 'Bank details must be provided before the staff member can be paid.', defaultVal: true },
                ],
            },
        ]
    );

    const renderReportsSettingsContent = () => renderSettingsPanel(
        'Reports Policy', 'Configure data retention, export options, and report visibility.', <BarChart3 size={20} />,
        reportsSettings, setReportsSettings, saveReportsSettingsMutation,
        [
            {
                title: 'Data Retention & Archiving',
                fields: [
                    { key: 'reports_data_retention_months', label: 'Data Retention Period (months)', hint: 'How many months of historical data to retain in reports.', type: 'number', defaultVal: 24, min: 6 },
                    { key: 'reports_archive_after_months', label: 'Archive After (months)', hint: 'Reports older than this are moved to archive.', type: 'number', defaultVal: 12, min: 3 },
                ],
            },
            {
                title: 'KPI Targets', subtitle: 'Targets used for KPI comparison in reports.',
                fields: [
                    { key: 'reports_kpi_target_headcount', label: 'Target Headcount', hint: 'Organisation target total headcount.', type: 'number', defaultVal: 100, min: 1 },
                    { key: 'reports_kpi_target_turnover_percent', label: 'Target Turnover Rate (%)', hint: 'Acceptable staff turnover rate threshold.', type: 'percent', defaultVal: 15, min: 0, max: 100 },
                    { key: 'reports_kpi_target_leave_utilization', label: 'Target Leave Utilization (%)', hint: 'Expected % of leave days utilized per staff per year.', type: 'percent', defaultVal: 70, min: 0, max: 100 },
                    { key: 'reports_kpi_target_claims_processed_days', label: 'Claims Processing SLA (days)', hint: 'Target days to fully process a claim from submission to payment.', type: 'number', defaultVal: 7, min: 1 },
                ],
            },
            {
                title: 'Access & Distribution',
                toggles: [
                    { key: 'reports_auto_generate_monthly', label: 'Auto-Generate Monthly Summary', hint: 'Automatically generate a monthly summary report at month-end.', defaultVal: true },
                    { key: 'reports_notify_ceo_monthly', label: 'Email CEO Monthly Summary', hint: 'CEO receives the monthly summary report by email.', defaultVal: true },
                    { key: 'reports_allow_pdf_export', label: 'Allow PDF Export', hint: 'Reports can be exported as PDF.', defaultVal: true },
                    { key: 'reports_allow_excel_export', label: 'Allow Excel Export', hint: 'Reports can be exported as Excel spreadsheets.', defaultVal: true },
                    { key: 'reports_allow_csv_export', label: 'Allow CSV Export', hint: 'Reports can be exported as CSV files.', defaultVal: true },
                    { key: 'reports_require_approval_to_view', label: 'Require Approval to View Sensitive Reports', hint: 'Payroll and salary reports require explicit approval to view.', defaultVal: false },
                ],
            },
        ]
    );

    const renderOrgSettingsContent = () => renderSettingsPanel(
        'Organisation Settings', 'Core organisation configuration — locale, working hours, and structure.', <Building2 size={20} />,
        orgSettings, setOrgSettings, saveOrgSettingsMutation,
        [
            {
                title: 'Identity & Locale',
                fields: [
                    { key: 'org_name', label: 'Organisation Name', hint: 'Full legal name of the organisation.', type: 'text', defaultVal: 'Kechita Capital' },
                    { key: 'org_country', label: 'Country', hint: 'Country where the organisation is based.', type: 'text', defaultVal: 'Kenya' },
                    { key: 'org_currency', label: 'Default Currency', hint: 'Currency used across all financial modules.', type: 'select', defaultVal: 'KES', options: [{ value: 'KES', label: 'KES — Kenyan Shilling' }, { value: 'USD', label: 'USD — US Dollar' }, { value: 'GBP', label: 'GBP — British Pound' }, { value: 'EUR', label: 'EUR — Euro' }] },
                    { key: 'org_timezone', label: 'Timezone', hint: 'System timezone for dates and scheduling.', type: 'select', defaultVal: 'Africa/Nairobi', options: [{ value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT UTC+3)' }, { value: 'UTC', label: 'UTC' }, { value: 'Europe/London', label: 'Europe/London' }] },
                ],
            },
            {
                title: 'Working Hours & Calendar',
                fields: [
                    { key: 'org_working_days_per_week', label: 'Working Days Per Week', hint: '5 = Mon-Fri, 6 = Mon-Sat.', type: 'select', defaultVal: '5', options: [{ value: '5', label: '5 days (Mon–Fri)' }, { value: '6', label: '6 days (Mon–Sat)' }] },
                    { key: 'org_working_hours_start', label: 'Office Start Time', hint: 'Official working hours start (24h format e.g. 08:00).', type: 'text', defaultVal: '08:00' },
                    { key: 'org_working_hours_end', label: 'Office End Time', hint: 'Official working hours end (24h format e.g. 17:00).', type: 'text', defaultVal: '17:00' },
                    { key: 'org_fiscal_year_start_month', label: 'Fiscal Year Start Month', hint: 'Month the financial year begins (1=January, 4=April, 7=July).', type: 'number', defaultVal: 1, min: 1, max: 12 },
                ],
            },
            {
                title: 'Structure Limits',
                fields: [
                    { key: 'org_max_branches', label: 'Max Branches', hint: 'Maximum number of branches/offices.', type: 'number', defaultVal: 50, min: 1 },
                    { key: 'org_max_departments_per_branch', label: 'Max Departments Per Branch', hint: 'Maximum departments per branch.', type: 'number', defaultVal: 10, min: 1 },
                ],
                toggles: [
                    { key: 'org_require_hod', label: 'Require Head of Department', hint: 'Every department must have an assigned Head of Department.', defaultVal: false },
                    { key: 'org_allow_cross_branch_transfers', label: 'Allow Cross-Branch Transfers', hint: 'Staff can be transferred between different branches.', defaultVal: true },
                ],
            },
        ]
    );

    const renderHrSettingsContent = () => renderSettingsPanel(
        'HR Policy', 'Configure human resource management rules and staff lifecycle settings.', <Briefcase size={20} />,
        hrSettings, setHrSettings, saveHrSettingsMutation,
        [
            {
                title: 'Staff Lifecycle',
                fields: [
                    { key: 'hr_probation_default_months', label: 'Default Probation Period (months)', hint: 'Standard probation length for all new employees.', type: 'number', defaultVal: 3, min: 1, max: 12 },
                    { key: 'hr_notice_period_months', label: 'Default Notice Period (months)', hint: 'Standard notice period for resignations/terminations.', type: 'number', defaultVal: 1, min: 1, max: 6 },
                    { key: 'hr_salary_review_frequency', label: 'Salary Review Frequency', hint: 'How often salary reviews are conducted.', type: 'select', defaultVal: 'annual', options: [{ value: 'annual', label: 'Annually' }, { value: 'semi_annual', label: 'Semi-Annually' }, { value: 'quarterly', label: 'Quarterly' }] },
                    { key: 'hr_document_expiry_warning_days', label: 'Document Expiry Warning (days)', hint: 'Warn N days before a staff document expires.', type: 'number', defaultVal: 30, min: 7 },
                ],
            },
            {
                title: 'Staff Numbering',
                fields: [
                    { key: 'hr_staff_number_prefix', label: 'Staff Number Prefix', hint: 'Prefix used when auto-generating staff numbers (e.g. KEC).', type: 'text', defaultVal: 'KEC' },
                    { key: 'hr_staff_number_padding', label: 'Staff Number Padding (digits)', hint: 'Zero-pad staff numbers to this length (e.g. 4 = KEC0001).', type: 'number', defaultVal: 4, min: 2, max: 8 },
                ],
                toggles: [
                    { key: 'hr_enable_staff_numbering', label: 'Auto-Generate Staff Numbers', hint: 'Automatically assign sequential staff numbers on creation.', defaultVal: true },
                ],
            },
            {
                title: 'Compliance & Policies',
                toggles: [
                    { key: 'hr_nok_required', label: 'Require Next of Kin', hint: 'Staff must provide next-of-kin details before confirmation.', defaultVal: true },
                    { key: 'hr_allow_self_service_profile', label: 'Allow Staff Profile Self-Service', hint: 'Staff can edit their own profile details (address, phone, etc.).', defaultVal: false },
                    { key: 'hr_confirm_auto_notify', label: 'Auto-Notify on Confirmation', hint: 'Automatically send confirmation letter when staff is confirmed.', defaultVal: true },
                    { key: 'hr_require_exit_interview', label: 'Require Exit Interview', hint: 'Exit interview must be completed before termination is finalised.', defaultVal: true },
                    { key: 'hr_notify_on_contract_expiry', label: 'Notify on Contract Expiry', hint: 'HR and manager are notified when a staff contract is about to expire.', defaultVal: true },
                    { key: 'hr_allow_multiple_positions', label: 'Allow Multiple Positions', hint: 'Staff can hold more than one position simultaneously.', defaultVal: false },
                    { key: 'hr_require_medical_on_join', label: 'Require Medical Certificate on Joining', hint: 'New staff must submit a medical certificate within 30 days of joining.', defaultVal: false },
                    { key: 'hr_salary_confidential', label: 'Keep Salaries Confidential', hint: 'Staff cannot see each other\'s salary information.', defaultVal: true },
                ],
            },
        ]
    );

    const renderApprovalsSettingsContent = () => renderSettingsPanel(
        'Approvals Policy', 'Configure how approval workflows behave across all request types.', <ShieldCheck size={20} />,
        approvalsSettings, setApprovalsSettings, saveApprovalsSettingsMutation,
        [
            {
                title: 'SLA & Escalation',
                fields: [
                    { key: 'approval_default_sla_hours', label: 'Default Approval SLA (hours)', hint: 'Target hours for an approver to action a pending request.', type: 'number', defaultVal: 48, min: 1 },
                    { key: 'approval_escalation_hours', label: 'Escalation After (hours)', hint: 'Escalate to the next approver after N hours of inaction.', type: 'number', defaultVal: 72, min: 1 },
                    { key: 'approval_delegation_max_days', label: 'Max Delegation Period (days)', hint: 'Maximum number of days an approval can be delegated.', type: 'number', defaultVal: 14, min: 1, max: 30 },
                    { key: 'approval_auto_approve_leave_hours', label: 'Auto-Approve Leave After (hours)', hint: 'Leave requests auto-approve after N hours if not actioned. Set 0 to disable.', type: 'number', defaultVal: 72, min: 0 },
                ],
            },
            {
                title: 'Workflow Rules',
                toggles: [
                    { key: 'approval_allow_delegation', label: 'Allow Approval Delegation', hint: 'Approvers can delegate their approval authority to another staff member.', defaultVal: true },
                    { key: 'approval_require_comment_on_reject', label: 'Comment Required on Rejection', hint: 'Approvers must provide a reason when rejecting a request.', defaultVal: true },
                    { key: 'approval_require_comment_on_approve', label: 'Comment Required on Approval', hint: 'Approvers must add a comment when approving a request.', defaultVal: false },
                    { key: 'approval_allow_self_approval', label: 'Allow Self-Approval', hint: 'An approver can approve their own request in the absence of others.', defaultVal: false },
                    { key: 'approval_notify_on_pending', label: 'Notify Approver on Assignment', hint: 'Approver receives immediate notification when a request is assigned to them.', defaultVal: true },
                    { key: 'approval_notify_requester_on_action', label: 'Notify Requester on Every Step', hint: 'The requester is notified at each stage of the approval process.', defaultVal: true },
                    { key: 'approval_allow_parallel_steps', label: 'Allow Parallel Approval Steps', hint: 'Multiple approvers can review simultaneously rather than sequentially.', defaultVal: false },
                    { key: 'approval_retain_history', label: 'Retain Full Approval History', hint: 'Keep the complete trail of all approvals, rejections, and delegations.', defaultVal: true },
                ],
            },
        ]
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
                                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">mobulkafrica.pro</span>
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
                                    <p>• <a href="https://mobulkafrica.pro" target="_blank" rel="noreferrer" className="text-[#0066B3] hover:underline">Mobulk Africa Portal</a></p>
                                    <p>• <a href="https://www.docs.onfonmedia.co.ke" target="_blank" rel="noreferrer" className="text-[#0066B3] hover:underline">API Documentation</a></p>
                                    <p>• 3 keys required: Access Key (header), API Key + Client ID (body)</p>
                                    <p>• Sender ID must be approved by Mobulk Africa</p>
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
            case 'leave-settings': return renderLeaveSettingsContent();
            case 'claims-settings': return renderClaimsSettingsContent();
            case 'petty-cash-settings': return renderPettyCashSettingsContent();
            case 'recruitment-settings': return renderRecruitmentSettingsContent();
            case 'onboarding-settings': return renderOnboardingSettingsContent();
            case 'reports-settings': return renderReportsSettingsContent();
            case 'org-settings': return renderOrgSettingsContent();
            case 'hr-settings': return renderHrSettingsContent();
            case 'approvals-settings': return renderApprovalsSettingsContent();
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

    const settingsOnlyTabs: Tab[] = ['approval-flows', 'loan-settings', 'leave-settings', 'claims-settings', 'petty-cash-settings', 'recruitment-settings', 'onboarding-settings', 'reports-settings', 'org-settings', 'hr-settings', 'approvals-settings', 'email-settings', 'sms-settings'];
    const showAddButton = !settingsOnlyTabs.includes(activeTab);

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

            {/* Settings tab search */}
            <div className="flex items-center gap-3">
                <div className="relative max-w-md flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={tabSearch}
                        onChange={(e) => setTabSearch(e.target.value)}
                        placeholder="Filter settings…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                        aria-label="Filter settings tabs"
                    />
                </div>
                <button
                    onClick={() => { setShowPalette(true); setPaletteQuery(''); setPaletteIdx(0); }}
                    className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-[#0066B3] hover:text-[#0066B3] transition-colors"
                    title="Open command palette" aria-label="Open command palette"
                >
                    <Search size={14} />
                    Quick jump
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-500">⌘K</kbd>
                </button>
            </div>

            {/* Main Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {mainTabs.filter(t => !tabSearch || t.label.toLowerCase().includes(tabSearch.toLowerCase())).map((tab) => {
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

            {/* Command Palette (⌘K) */}
            {showPalette && (
                <div
                    className="fixed inset-0 bg-black/50 z-[70] flex items-start justify-center pt-24 px-4"
                    onClick={() => setShowPalette(false)}
                >
                    <div
                        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                            <Search size={18} className="text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                value={paletteQuery}
                                onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIdx(0); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setPaletteIdx(i => Math.min(i + 1, paletteMatches.length - 1));
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setPaletteIdx(i => Math.max(i - 1, 0));
                                    } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const m = paletteMatches[paletteIdx];
                                        if (m) choosePaletteItem(m.key);
                                    }
                                }}
                                placeholder="Jump to setting…"
                                className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400"
                            />
                            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-500">ESC</kbd>
                        </div>
                        <div className="max-h-80 overflow-y-auto py-1">
                            {paletteMatches.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-slate-400">No matching settings</div>
                            ) : paletteMatches.map((m, idx) => {
                                const Icon = m.icon;
                                const isActive = idx === paletteIdx;
                                return (
                                    <button
                                        key={m.key}
                                        onMouseEnter={() => setPaletteIdx(idx)}
                                        onClick={() => choosePaletteItem(m.key)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                                            isActive ? 'bg-blue-50 text-[#0066B3]' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Icon size={16} className={isActive ? 'text-[#0066B3]' : 'text-slate-400'} />
                                        <span className="flex-1">{m.label}</span>
                                        {isActive && <span className="text-[10px] text-slate-400">↵ Open</span>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center gap-3">
                            <span><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">↑</kbd> <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">↓</kbd> navigate</span>
                            <span><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">↵</kbd> select</span>
                            <span><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">esc</kbd> close</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export { SettingsPage };
export default SettingsPage;
