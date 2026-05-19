import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { downloadAuthedFile } from '../lib/downloadFile';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InputDialog } from '../components/ui/InputDialog';
import { Modal, ModalCancelButton, ModalPrimaryButton } from '../components/ui/Modal';
import {
    ArrowLeft, Edit, Mail, Phone, Building2, MapPin,
    Briefcase, FileText, Clock, CheckCircle, CheckCircle2, XCircle,
    Upload, Download, Trash2, AlertTriangle, User, Users,
    CreditCard, Shield, History, Camera, RefreshCw,
    ChevronRight, AlertCircle, TrendingUp, DollarSign,
    FileCheck, Plus, RotateCcw, Ban, Play, Heart,
    KeyRound, Lock, Unlock, UserCog, Link2Off, ShieldCheck, ShieldOff, Loader2, MoreHorizontal,
    PenTool, Eye, Calendar, Target, GraduationCap, UserCircle, FileSignature, FolderOpen,
} from 'lucide-react';
import StaffPeopleTab from '../components/staff/StaffPeopleTab';

type Tab = 'overview' | 'documents' | 'contracts' | 'employment' | 'onboarding' | 'people' | 'account';

interface OnboardingTask {
    id: string;
    task?: { id: string; title: string; description?: string; task_type: string; is_required: boolean; due_days_after_start?: number };
    status: string;
    due_date?: string;
    completed_at?: string;
    completed_by_user?: { id: string; first_name: string; last_name: string };
    notes?: string;
    skipped_reason?: string;
}

interface OnboardingInstance {
    id: string;
    status: string;
    started_at?: string;
    completed_at?: string;
    template?: { id: string; name: string };
    task_statuses: OnboardingTask[];
    progress_percentage?: number;
}

interface DirectReport {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    status: string;
    position?: { name: string };
    branch?: { name: string };
}

interface StaffDetail {
    id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    employee_number: string;
    status: string;
    probation_status?: string;
    phone?: string;
    alternate_phone?: string;
    personal_email?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    date_of_birth?: string;
    gender?: string;
    national_id?: string;
    tax_pin?: string;
    nssf_number?: string;
    nhif_number?: string;
    hire_date?: string;
    confirmation_date?: string;
    probation_end_date?: string;
    probation_start_date?: string;
    probation_months?: number;
    termination_date?: string;
    termination_reason?: string;
    employment_type?: string;
    photo_url?: string;
    basic_salary?: number;
    salary_currency?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
    bank_name?: string;
    bank_branch?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    position?: { id: string; name: string };
    branch?: { id: string; name: string };
    region?: { id: string; name: string };
    department?: { id: string; name: string };
    manager?: { id: string; first_name: string; last_name: string };
    user?: { id: string; email: string; is_active: boolean };
}

interface StaffDoc {
    id: string;
    original_name?: string;
    document?: { id: string; original_name: string };
    documentType?: { id: string; name: string; code: string };
    doc_type?: string;
    status: string;
    expiry_date?: string;
    issue_date?: string;
    reference_number?: string;
    uploaded_at?: string;
    verified_at?: string;
    verified_by?: string;
    verification_notes?: string;
    rejection_reason?: string;
}

interface Contract {
    id: string;
    contract_type: string;
    status: string;
    contract_number?: string;
    title?: string;
    start_date: string;
    end_date?: string;
    salary?: number;
    salary_currency?: string;
    job_title?: string;
    terms?: string;
    special_conditions?: string;
    notice_period_days?: number;
    signed_date?: string;
    renewal_count?: number;
    termination_date?: string;
    termination_reason?: string;
    created_at: string;
}

interface EmploymentHistory {
    id: string;
    position?: { name: string };
    branch?: { name: string };
    region?: { name: string };
    department?: { name: string };
    employment_type?: string;
    change_type?: string;
    salary?: number;
    start_date: string;
    end_date?: string;
    change_reason?: string;
}

const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
    const colors: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-700',
        onboarding: 'bg-blue-100 text-blue-700',
        probation: 'bg-amber-100 text-amber-700',
        suspended: 'bg-red-100 text-red-700',
        resigned: 'bg-slate-100 text-slate-600',
        terminated: 'bg-red-100 text-red-700',
        verified: 'bg-emerald-100 text-emerald-700',
        pending: 'bg-amber-100 text-amber-700',
        rejected: 'bg-red-100 text-red-700',
        expired: 'bg-red-100 text-red-700',
    };
    const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
    return (
        <span className={`${sizeClass} rounded-full font-medium capitalize ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
};

export const StaffProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showProbationModal, setShowProbationModal] = useState(false);
    const [showTerminateModal, setShowTerminateModal] = useState(false);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadDocType, setUploadDocType] = useState('');
    const [uploadExpiryDate, setUploadExpiryDate] = useState('');
    const [uploadIssueDate, setUploadIssueDate] = useState('');
    const [uploadRefNumber, setUploadRefNumber] = useState('');
    const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
    const [skipTaskId, setSkipTaskId] = useState<string | null>(null);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [contractFormData, setContractFormData] = useState<any>({});
    const [rejectDocId, setRejectDocId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showPhotoInput, setShowPhotoInput] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [showTerminateContractModal, setShowTerminateContractModal] = useState(false);
    const [terminateContractTarget, setTerminateContractTarget] = useState<string | null>(null);
    const [terminateContractReason, setTerminateContractReason] = useState('');
    const [terminateContractDate, setTerminateContractDate] = useState('');
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [renewContractTarget, setRenewContractTarget] = useState<string | null>(null);
    const [renewEndDate, setRenewEndDate] = useState('');
    const [renewSalary, setRenewSalary] = useState('');

    // Fetch staff details
    const { data: staff, isLoading } = useQuery<StaffDetail>({
        queryKey: ['staff', id],
        queryFn: async () => (await api.get(`/staff/${id}`)).data,
        enabled: !!id,
    });

    // Fetch documents
    const { data: documents } = useQuery<StaffDoc[]>({
        queryKey: ['staff-documents', id],
        queryFn: async () => (await api.get(`/staff/${id}/documents`)).data,
        enabled: !!id && (activeTab === 'documents'),
    });

    // Fetch contracts
    const { data: contracts } = useQuery<Contract[]>({
        queryKey: ['staff-contracts', id],
        queryFn: async () => (await api.get(`/staff/${id}/contracts`)).data,
        enabled: !!id && activeTab === 'contracts',
    });

    // Fetch document types
    const { data: documentTypes } = useQuery({
        queryKey: ['document-types'],
        queryFn: async () => (await api.get('/staff/documents/types')).data,
        enabled: activeTab === 'documents',
    });

    // Fetch employment history
    const { data: employmentHistory } = useQuery<EmploymentHistory[]>({
        queryKey: ['staff-employment-history', id],
        queryFn: async () => (await api.get(`/staff/${id}/employment-history`)).data,
        enabled: !!id && activeTab === 'employment',
    });

    // Fetch onboarding
    const { data: onboarding, refetch: refetchOnboarding } = useQuery<OnboardingInstance | null>({
        queryKey: ['staff-onboarding', id],
        queryFn: async () => { try { return (await api.get(`/staff/${id}/onboarding`)).data; } catch { return null; } },
        enabled: !!id && activeTab === 'onboarding',
    });

    // Fetch direct reports (always, used in overview)
    const { data: directReports = [] } = useQuery<DirectReport[]>({
        queryKey: ['staff-direct-reports', id],
        queryFn: async () => (await api.get(`/staff/${id}/direct-reports`)).data,
        enabled: !!id && activeTab === 'overview',
    });

    // Fetch termination blockers when terminate modal opens
    const { data: terminationBlockers } = useQuery<{ active_assets: number; pending_documents: number }>({
        queryKey: ['termination-blockers', id],
        queryFn: async () => (await api.get(`/staff/${id}/termination-blockers`)).data,
        enabled: !!id && showTerminateModal,
    });

    // Fetch org data for transfer
    const { data: regions } = useQuery({
        queryKey: ['regions'],
        queryFn: async () => (await api.get('/org/regions')).data,
    });

    const { data: branches } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => (await api.get('/org/branches')).data,
    });

    const { data: positions } = useQuery({
        queryKey: ['positions'],
        queryFn: async () => (await api.get('/org/positions')).data,
    });

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => (await api.get('/org/departments')).data,
    });

    // Photo upload mutation
    const uploadPhotoMutation = useMutation({
        mutationFn: async (file: File) => {
            const fd = new FormData();
            fd.append('photo', file);
            return (await api.post(`/staff/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff', id] }); setShowPhotoInput(false); setPhotoFile(null); showToast('Photo updated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to upload photo', 'error'),
    });

    // Sanitize edit form payload before sending. The UpdateStaffDto applies
    // @IsEmail/@IsDateString/@IsNumber on optional fields, and `whitelist: true`
    // strips unknown keys. Empty strings still hit validators (e.g. ''
    // is not a valid email/date), so we must omit them entirely.
    const sanitizeStaffPayload = (data: any) => {
        const out: any = {};
        Object.entries(data || {}).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined) return;
            // basic_salary may come as a string from the API (decimal column)
            if (k === 'basic_salary') {
                const n = typeof v === 'number' ? v : parseFloat(String(v));
                if (Number.isFinite(n)) out[k] = n;
                return;
            }
            // date_of_birth: backend accepts ISO strings (@IsDateString). If
            // the original value was an ISO datetime, the date input may have
            // returned an empty string above; if it returned 'YYYY-MM-DD' use
            // it. If it's the unchanged ISO string from the API, send it.
            if (k === 'date_of_birth') {
                if (typeof v === 'string' && v.length >= 10) out[k] = v;
                return;
            }
            out[k] = v;
        });
        return out;
    };

    // Update staff mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => (await api.put(`/staff/${id}`, sanitizeStaffPayload(data))).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            setShowEditModal(false);
            showToast('Staff updated');
        },
        onError: (e: any) => {
            const msg = e?.response?.data?.message;
            const text = Array.isArray(msg) ? msg.join('; ') : msg;
            showToast(text || 'Failed to update staff', 'error');
        },
    });

    // Upload document mutation
    const uploadDocMutation = useMutation({
        mutationFn: async ({ file, documentTypeId, expiryDate, issueDate, referenceNumber }: { file: File; documentTypeId: string; expiryDate?: string; issueDate?: string; referenceNumber?: string }) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('documentTypeId', documentTypeId);
            if (expiryDate) fd.append('expiryDate', expiryDate);
            if (issueDate) fd.append('issueDate', issueDate);
            if (referenceNumber) fd.append('referenceNumber', referenceNumber);
            return (await api.post(`/staff/${id}/documents`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-documents', id] });
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadDocType('');
            setUploadExpiryDate('');
            setUploadIssueDate('');
            setUploadRefNumber('');
            showToast('Document uploaded');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Upload failed', 'error'),
    });

    // Verify document mutation
    const verifyDocMutation = useMutation({
        mutationFn: async (docId: string) => (await api.patch(`/staff/documents/${docId}/verify`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-documents', id] }); showToast('Document verified'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to verify document', 'error'),
    });

    // Reject document mutation
    const rejectDocMutation = useMutation({
        mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => (await api.patch(`/staff/documents/${docId}/reject`, { reason })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-documents', id] }); setRejectDocId(null); setRejectReason(''); showToast('Document rejected'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to reject document', 'error'),
    });

    // Contract mutations
    const createContractMutation = useMutation({
        mutationFn: async (data: any) => (await api.post(`/staff/${id}/contracts`, data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-contracts', id] }); setShowContractModal(false); setContractFormData({}); showToast('Contract created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create contract', 'error'),
    });

    const activateContractMutation = useMutation({
        mutationFn: async (contractId: string) => (await api.patch(`/staff/contracts/${contractId}/activate`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-contracts', id] }); showToast('Contract activated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    // Phase 2: send contract for e-signature (mails a magic link to staff
    // and flips status to pending_signature). The same endpoint can be
    // called again to rotate the token if needed.
    const sendForSignatureMutation = useMutation({
        mutationFn: async (contractId: string) => (await api.post(`/staff/contracts/${contractId}/send-for-signature`, {})).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-contracts', id] }); showToast('Signing link sent to employee'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to send for signature', 'error'),
    });

    const terminateContractMutation = useMutation({
        mutationFn: async ({ contractId, reason, termination_date }: { contractId: string; reason: string; termination_date?: string }) => (await api.patch(`/staff/contracts/${contractId}/terminate`, { reason, termination_date })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-contracts', id] }); setShowTerminateContractModal(false); setTerminateContractTarget(null); setTerminateContractReason(''); setTerminateContractDate(''); showToast('Contract terminated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to terminate contract', 'error'),
    });

    const renewContractMutation = useMutation({
        mutationFn: async ({ contractId, data }: { contractId: string; data: any }) => (await api.post(`/staff/contracts/${contractId}/renew`, data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-contracts', id] }); setShowRenewModal(false); setRenewContractTarget(null); setRenewEndDate(''); setRenewSalary(''); showToast('Contract renewed'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to renew contract', 'error'),
    });

    // Onboarding mutations
    const startOnboardingMutation = useMutation({
        mutationFn: async () => (await api.post(`/staff/${id}/onboarding`)).data,
        onSuccess: () => { refetchOnboarding(); showToast('Onboarding started'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to start onboarding', 'error'),
    });

    const completeTaskMutation = useMutation({
        mutationFn: async ({ taskStatusId, notes }: { taskStatusId: string; notes?: string }) => (await api.patch(`/staff/onboarding/tasks/${taskStatusId}/complete`, { notes })).data,
        onSuccess: () => { refetchOnboarding(); showToast('Task completed'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const skipTaskMutation = useMutation({
        mutationFn: async ({ taskStatusId, reason }: { taskStatusId: string; reason: string }) => (await api.patch(`/staff/onboarding/tasks/${taskStatusId}/skip`, { reason })).data,
        onSuccess: () => { refetchOnboarding(); showToast('Task skipped'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    // Delete document mutation
    const deleteDocMutation = useMutation({
        mutationFn: async (docId: string) => (await api.delete(`/staff/documents/${docId}`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-documents', id] }); showToast('Document deleted'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to delete document', 'error'),
    });

    // Transfer mutation
    const transferMutation = useMutation({
        mutationFn: async (data: any) => (await api.post(`/staff/${id}/transfer`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            queryClient.invalidateQueries({ queryKey: ['staff-employment-history', id] });
            setShowTransferModal(false);
            showToast('Staff transferred');
            setFormData({});
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to transfer', 'error'),
    });

    // Probation mutation
    const probationMutation = useMutation({
        mutationFn: async (data: any) => (await api.patch(`/staff/${id}/probation`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            setShowProbationModal(false);
            setFormData({});
            showToast('Probation updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update probation', 'error'),
    });

    // Terminate mutation
    const terminateMutation = useMutation({
        mutationFn: async (data: any) => (await api.patch(`/staff/${id}/terminate`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            setShowTerminateModal(false);
            setFormData({});
            showToast('Staff terminated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to terminate', 'error'),
    });

    // Promote mutation
    const promoteMutation = useMutation({
        mutationFn: async (data: any) => (await api.post(`/staff/${id}/promote`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            queryClient.invalidateQueries({ queryKey: ['staff-employment-history', id] });
            setShowPromoteModal(false);
            setFormData({});
            showToast('Staff promoted successfully');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to promote', 'error'),
    });

    // Activate/Deactivate mutations
    const activateMutation = useMutation({
        mutationFn: async () => (await api.patch(`/staff/${id}/activate`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff', id] }); showToast('Staff activated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to activate', 'error'),
    });

    const deactivateMutation = useMutation({
        mutationFn: async (reason?: string) => (await api.patch(`/staff/${id}/deactivate`, { reason })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff', id] }); showToast('Staff deactivated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to deactivate', 'error'),
    });

    // =========== ACCOUNT TAB ===========
    const userId = staff?.user?.id;
    const { data: account, isLoading: accountLoading } = useQuery<any>({
        queryKey: ['user-account', userId],
        queryFn: async () => (await api.get(`/users/${userId}`)).data,
        enabled: !!userId && activeTab === 'account',
    });
    const { data: allRoles = [] } = useQuery<any[]>({
        queryKey: ['roles-active'],
        queryFn: async () => { const r = (await api.get('/roles')).data; return Array.isArray(r) ? r : (r?.data ?? []); },
        enabled: activeTab === 'account',
    });
    const accountActivateMutation = useMutation({
        mutationFn: async () => (await api.post(`/users/${userId}/activate`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-account', userId] }); queryClient.invalidateQueries({ queryKey: ['staff', id] }); showToast('Login enabled'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });
    const accountDeactivateMutation = useMutation({
        mutationFn: async () => (await api.post(`/users/${userId}/deactivate`)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-account', userId] }); queryClient.invalidateQueries({ queryKey: ['staff', id] }); showToast('Login disabled'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });
    const accountUpdateRoleMutation = useMutation({
        mutationFn: async (roleCode: string) => (await api.patch(`/users/${userId}/roles`, { role_code: roleCode })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-account', userId] }); showToast('Role updated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update role', 'error'),
    });
    const accountResetPwMutation = useMutation({
        mutationFn: async (newPassword: string) => (await api.patch(`/users/${userId}/password`, { new_password: newPassword })).data,
        onSuccess: () => { setShowResetPwDialog(false); showToast('Password reset'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to reset password', 'error'),
    });
    const resendWelcomeMutation = useMutation({
        mutationFn: async () => (await api.post(`/staff/${id}/resend-welcome`)).data,
        onSuccess: (r: any) => showToast(r?.success ? 'Welcome email sent' : (r?.error || 'Could not send'), r?.success ? 'success' : 'error'),
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });
    const [showResetPwDialog, setShowResetPwDialog] = useState(false);

    const openEditModal = () => {
        setFormData({
            first_name: staff?.first_name,
            middle_name: staff?.middle_name,
            last_name: staff?.last_name,
            gender: staff?.gender,
            // <input type="date"> requires 'YYYY-MM-DD'. The API may return a
            // full ISO datetime; slice to date portion so the field renders.
            date_of_birth: staff?.date_of_birth
                ? String(staff.date_of_birth).slice(0, 10)
                : '',
            national_id: staff?.national_id,
            tax_pin: staff?.tax_pin,
            nssf_number: staff?.nssf_number,
            nhif_number: staff?.nhif_number,
            phone: staff?.phone,
            alternate_phone: staff?.alternate_phone,
            personal_email: staff?.personal_email,
            address: staff?.address,
            city: staff?.city,
            postal_code: staff?.postal_code,
            basic_salary: staff?.basic_salary,
            emergency_contact_name: staff?.emergency_contact_name,
            emergency_contact_phone: staff?.emergency_contact_phone,
            emergency_contact_relationship: staff?.emergency_contact_relationship,
            bank_name: staff?.bank_name,
            bank_branch: staff?.bank_branch,
            bank_account_number: staff?.bank_account_number,
            bank_account_name: staff?.bank_account_name,
        });
        setShowEditModal(true);
    };

    const handleUpload = () => {
        if (uploadFile && uploadDocType) {
            uploadDocMutation.mutate({
                file: uploadFile,
                documentTypeId: uploadDocType,
                expiryDate: uploadExpiryDate || undefined,
                issueDate: uploadIssueDate || undefined,
                referenceNumber: uploadRefNumber || undefined,
            });
        }
    };

    const tabs = [
        { key: 'overview' as Tab, label: 'Overview', icon: User },
        { key: 'people' as Tab, label: 'People & Comp', icon: Heart },
        { key: 'documents' as Tab, label: 'Documents', icon: FileText },
        { key: 'contracts' as Tab, label: 'Contracts', icon: FileCheck },
        { key: 'employment' as Tab, label: 'History', icon: History },
        { key: 'onboarding' as Tab, label: 'Onboarding', icon: CheckCircle },
        { key: 'account' as Tab, label: 'Account', icon: KeyRound },
    ];

    const isOnProbation = staff?.probation_status === 'on_probation';
    const isSuspended = staff?.status === 'suspended';
    const isActive = staff?.status === 'active' || staff?.status === 'probation';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <RefreshCw className="w-8 h-8 animate-spin text-[#0066B3]" />
            </div>
        );
    }

    if (!staff) {
        return (
            <div className="text-center py-24">
                <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500">Staff member not found</p>
                <Link to="/staff" className="text-[#0066B3] hover:underline mt-2 inline-block">
                    Back to Staff Directory
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with breadcrumb + actions */}
            <div>
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
                    <button onClick={() => navigate('/staff-management')} className="hover:text-slate-800">Staff Management</button>
                    <ChevronRight size={14} />
                    <button onClick={() => navigate('/staff-management')} className="hover:text-slate-800">Directory</button>
                    <ChevronRight size={14} />
                    <span className="text-slate-800 font-medium">{staff.first_name} {staff.last_name}</span>
                </nav>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/staff-management')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Back to directory" aria-label="Back to directory">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-slate-900">{staff.first_name} {staff.last_name}</h1>
                        <p className="text-slate-500 text-sm">{staff.employee_number} · {staff.position?.name || 'No position'}</p>
                    </div>
                    <button
                        onClick={openEditModal}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] shadow-sm"
                    >
                        <Edit size={18} />
                        Edit Profile
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowActionsMenu((v) => !v)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-medium text-slate-700 shadow-sm"
                        >
                            <MoreHorizontal size={18} />
                            <span className="hidden sm:inline">More actions</span>
                        </button>
                        {showActionsMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
                                <div className="absolute right-0 top-full mt-1 w-60 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20">
                                    <button onClick={() => { setShowActionsMenu(false); setFormData({}); setShowPromoteModal(true); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" />Promote</button>
                                    <button onClick={() => { setShowActionsMenu(false); setShowTransferModal(true); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Building2 size={16} className="text-blue-600" />Transfer</button>
                                    {isOnProbation && (
                                        <button onClick={() => { setShowActionsMenu(false); setShowProbationModal(true); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Clock size={16} className="text-amber-600" />Probation Review</button>
                                    )}
                                    {staff.user?.email && (
                                        <button onClick={() => { setShowActionsMenu(false); resendWelcomeMutation.mutate(); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><KeyRound size={16} className="text-slate-500" />Resend Welcome Email</button>
                                    )}
                                    <hr className="my-1" />
                                    {isSuspended ? (
                                        <button onClick={() => { setShowActionsMenu(false); activateMutation.mutate(); }} className="w-full px-4 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"><CheckCircle size={16} />Reactivate</button>
                                    ) : isActive ? (
                                        <button onClick={() => { setShowActionsMenu(false); setShowDeactivateConfirm(true); }} className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"><XCircle size={16} />Suspend</button>
                                    ) : null}
                                    {(isActive || isSuspended) && (
                                        <button onClick={() => { setShowActionsMenu(false); setShowTerminateModal(true); }} className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"><AlertTriangle size={16} />Terminate Employment</button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row items-start gap-6">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#0066B3] to-[#00AEEF] flex items-center justify-center text-white text-3xl font-bold">
                            {staff.photo_url ? (
                                <img src={staff.photo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                `${staff.first_name?.[0]}${staff.last_name?.[0]}`
                            )}
                        </div>
                        <button onClick={() => setShowPhotoInput(true)} className="absolute -bottom-2 -right-2 p-2 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50" title="Change photo" aria-label="Change photo">
                            <Camera size={14} className="text-slate-500" />
                        </button>
                    </div>
                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-slate-900">{staff.first_name} {staff.last_name}</h2>
                            <StatusBadge status={staff.status} />
                            {staff.probation_status && staff.probation_status !== 'not_applicable' && (
                                <StatusBadge status={staff.probation_status} size="sm" />
                            )}
                        </div>
                        <p className="text-slate-600 mb-4">{staff.position?.name || 'No position assigned'}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            {staff.user?.email && (
                                <a href={`mailto:${staff.user.email}`} className="flex items-center gap-1.5 hover:text-[#0066B3]">
                                    <Mail size={14} /> {staff.user.email}
                                </a>
                            )}
                            {staff.phone && (
                                <span className="flex items-center gap-1.5">
                                    <Phone size={14} /> {staff.phone}
                                </span>
                            )}
                            {staff.branch && (
                                <span className="flex items-center gap-1.5">
                                    <Building2 size={14} /> {staff.branch.name}
                                </span>
                            )}
                            {staff.region && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={14} /> {staff.region.name}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Quick Stats */}
                    <div className="flex gap-4">
                        <div className="text-center px-4 py-2 bg-slate-50 rounded-xl">
                            <p className="text-2xl font-bold text-slate-900">
                                {staff.hire_date ? Math.floor((Date.now() - new Date(staff.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365)) : '-'}
                            </p>
                            <p className="text-xs text-slate-500">Years</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-slate-50 rounded-xl">
                            <p className="text-2xl font-bold text-slate-900">{documents?.length || 0}</p>
                            <p className="text-xs text-slate-500">Documents</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-slate-50 rounded-xl">
                            <p className="text-2xl font-bold text-slate-900">{directReports.length}</p>
                            <p className="text-xs text-slate-500">Reports</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto -mx-1 px-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === tab.key
                                ? 'border-[#0066B3] text-[#0066B3]'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Info Cards Grid - Bold Design */}
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Personal Information - Vibrant Blue */}
                            <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-2xl border-2 border-blue-200 shadow-lg shadow-blue-100/50 overflow-hidden">
                                <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <User size={20} className="text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg">Personal Information</h3>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-100">
                                            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Full Name</p>
                                            <p className="text-base font-bold text-slate-900">{[staff.first_name, staff.middle_name, staff.last_name].filter(Boolean).join(' ') || '-'}</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-100">
                                            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Date of Birth</p>
                                            <p className="text-base text-slate-700">{staff.date_of_birth ? new Date(staff.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-100">
                                            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Gender</p>
                                            <p className="text-base font-bold text-slate-700 capitalize">{staff.gender || '-'}</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-100">
                                            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">National ID</p>
                                            <p className="text-base font-mono font-bold text-slate-700">{staff.national_id || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-100">
                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Phone size={12} /> Contact
                                        </p>
                                        <div className="space-y-2">
                                            {staff.phone && (
                                                <div className="flex items-center gap-2 text-slate-800">
                                                    <span className="text-blue-500 font-bold">📱</span>
                                                    <span className="font-semibold">{staff.phone}</span>
                                                </div>
                                            )}
                                            {staff.personal_email && (
                                                <div className="flex items-center gap-2 text-slate-800">
                                                    <span className="text-blue-500 font-bold">✉️</span>
                                                    <span className="font-semibold">{staff.personal_email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-100">
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Address</p>
                                        <p className="text-base text-slate-700">{[staff.address, staff.city, staff.postal_code].filter(Boolean).join(', ') || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Employment - Bold Emerald */}
                            <div className="bg-gradient-to-br from-white to-emerald-50/50 rounded-2xl border-2 border-emerald-200 shadow-lg shadow-emerald-100/50 overflow-hidden">
                                <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <Briefcase size={20} className="text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg">Employment Details</h3>
                                </div>
                                <div className="p-6 space-y-5">
                                    {/* Salary - Highlight Card */}
                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white shadow-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-emerald-100 text-sm font-semibold uppercase tracking-wider mb-1">Basic Salary</p>
                                                <p className="text-2xl font-black">
                                                    {staff.basic_salary ? `${staff.salary_currency || 'KES'} ${Number(staff.basic_salary).toLocaleString()}` : '-'}
                                                </p>
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                                                <DollarSign size={28} className="text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 rounded-xl p-3 border-2 border-emerald-100">
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Hire Date</p>
                                            <p className="text-base font-bold text-slate-800">{staff.hire_date ? new Date(staff.hire_date).toLocaleDateString('en-GB') : '-'}</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-xl p-3 border-2 border-emerald-100">
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Confirmation</p>
                                            <p className="text-base font-bold text-slate-800">{staff.confirmation_date ? new Date(staff.confirmation_date).toLocaleDateString('en-GB') : '-'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white rounded-xl p-3 shadow-sm border-2 border-emerald-100">
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Department</p>
                                            <p className="text-base font-bold text-slate-800">{staff.department?.name || '-'}</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 shadow-sm border-2 border-emerald-100">
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Reports To</p>
                                            <p className="text-base font-bold text-slate-800">{staff.manager ? `${staff.manager.first_name} ${staff.manager.last_name}` : '-'}</p>
                                        </div>
                                    </div>
                                    {staff.probation_end_date && (
                                        <div className="bg-amber-100 rounded-xl p-4 border-2 border-amber-300 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                                                <Clock size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-amber-900">Probation Period</p>
                                                <p className="text-sm text-amber-700 font-semibold">
                                                    Ends {new Date(staff.probation_end_date).toLocaleDateString('en-GB')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Statutory Info - Rich Purple */}
                            <div className="bg-gradient-to-br from-white to-violet-50/50 rounded-2xl border-2 border-violet-200 shadow-lg shadow-violet-100/50 overflow-hidden">
                                <div className="px-6 py-5 bg-gradient-to-r from-violet-600 to-purple-500 text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <Shield size={20} className="text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg">Statutory Information</h3>
                                </div>
                                <div className="p-6 space-y-3">
                                    {[ 
                                        { label: 'KRA PIN', value: staff.tax_pin, icon: '🇰🇪' },
                                        { label: 'NSSF Number', value: staff.nssf_number, icon: '🔒' },
                                        { label: 'SHIF Number', value: staff.nhif_number, icon: '🏥' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-violet-100 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{item.icon}</span>
                                                <span className="font-bold text-slate-600">{item.label}</span>
                                            </div>
                                            <span className="text-base font-mono font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-lg">{item.value || '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Emergency Contact - Bold Red */}
                            <div className="bg-gradient-to-br from-white to-red-50/50 rounded-2xl border-2 border-red-200 shadow-lg shadow-red-100/50 overflow-hidden">
                                <div className="px-6 py-5 bg-gradient-to-r from-red-600 to-rose-500 text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <Heart size={20} className="text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg">Emergency Contact</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-red-100 shadow-sm">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center text-white text-xl font-black">
                                            {staff.emergency_contact_name ? staff.emergency_contact_name[0] : '?'}
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-slate-900">{staff.emergency_contact_name || 'Not set'}</p>
                                            {staff.emergency_contact_relationship && (
                                                <p className="text-sm font-semibold text-rose-600 capitalize">{staff.emergency_contact_relationship}</p>
                                            )}
                                        </div>
                                    </div>
                                    {staff.emergency_contact_phone && (
                                        <div className="bg-gradient-to-r from-red-500 to-rose-500 rounded-xl p-4 text-white flex items-center gap-3 shadow-lg">
                                            <Phone size={24} />
                                            <span className="text-lg font-bold">{staff.emergency_contact_phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bank Information - Bold Amber */}
                            <div className="bg-gradient-to-br from-white to-amber-50/50 rounded-2xl border-2 border-amber-200 shadow-lg shadow-amber-100/50 overflow-hidden md:col-span-2">
                                <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <CreditCard size={20} className="text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg">Bank Information</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Bank Name', value: staff.bank_name },
                                            { label: 'Branch', value: staff.bank_branch },
                                            { label: 'Account Number', value: staff.bank_account_number, mono: true },
                                            { label: 'Account Name', value: staff.bank_account_name },
                                        ].map((item, idx) => (
                                            <div key={idx} className="bg-white rounded-xl p-4 border-2 border-amber-100 shadow-sm">
                                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">{item.label}</p>
                                                <p className={`text-base font-bold text-slate-800 ${item.mono ? 'font-mono' : ''}`}>{item.value || '-'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Direct Reports - Bold Indigo */}
                        {directReports.length > 0 && (
                            <div className="bg-gradient-to-br from-white to-indigo-50/50 rounded-2xl border-2 border-indigo-200 shadow-lg shadow-indigo-100/50 overflow-hidden">
                                <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                            <Users size={20} className="text-white" />
                                        </div>
                                        <h3 className="font-bold text-lg">Direct Reports</h3>
                                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">{directReports.length}</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {directReports.map((dr) => (
                                            <button 
                                                key={dr.id} 
                                                onClick={() => navigate(`/staff/${dr.id}`)} 
                                                className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-md border-2 border-transparent hover:border-indigo-300 hover:shadow-xl transition-all text-left group"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-black flex-shrink-0 group-hover:scale-110 transition-transform">
                                                    {dr.first_name[0]}{dr.last_name[0]}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-slate-900 truncate">{dr.first_name} {dr.last_name}</p>
                                                    <p className="text-sm text-indigo-600 font-semibold truncate">{dr.position?.name || 'No position'}</p>
                                                </div>
                                                <ChevronRight size={20} className="text-indigo-300 group-hover:text-indigo-500" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <div>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Staff Documents</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{documents?.length || 0} document{documents?.length !== 1 ? 's' : ''} uploaded</p>
                            </div>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] shadow-sm hover:shadow transition-all"
                            >
                                <Upload size={18} />
                                Upload Document
                            </button>
                        </div>

                        {documents?.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FolderOpen className="text-slate-400" size={28} />
                                </div>
                                <p className="text-slate-600 font-medium">No documents uploaded</p>
                                <p className="text-sm text-slate-400 mt-1">Upload ID, certificates, and other important documents</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {documents?.map((doc) => {
                                    const docStatusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
                                        verified: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle, label: 'Verified' },
                                        uploaded: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Upload, label: 'Uploaded' },
                                        pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock, label: 'Pending' },
                                        rejected: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle, label: 'Rejected' },
                                        expired: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle, label: 'Expired' },
                                        expiring_soon: { bg: 'bg-orange-50', text: 'text-orange-700', icon: Clock, label: 'Expiring Soon' },
                                    };
                                    const config = docStatusConfig[doc.status] || docStatusConfig.pending;
                                    const StatusIcon = config.icon;
                                    const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

                                    return (
                                        <div key={doc.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-sm ${
                                            doc.status === 'verified' ? 'border-emerald-200 bg-white' :
                                            doc.status === 'rejected' || isExpired ? 'border-red-200 bg-red-50/30' :
                                            doc.status === 'expiring_soon' ? 'border-orange-200 bg-orange-50/30' :
                                            'border-slate-200 bg-white'
                                        }`}>
                                            {/* Document Icon */}
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                                                doc.status === 'verified' ? 'bg-emerald-100 text-emerald-600' :
                                                doc.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                                doc.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                <FileText size={24} />
                                            </div>

                                            {/* Document Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-slate-900 truncate">
                                                        {doc.documentType?.name || doc.doc_type || 'Document'}
                                                    </h4>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
                                                        <StatusIcon size={12} />
                                                        {config.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 truncate">{doc.document?.original_name || doc.original_name}</p>
                                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                    {doc.reference_number && (
                                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Ref: {doc.reference_number}</span>
                                                    )}
                                                    {doc.issue_date && (
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            Issued {new Date(doc.issue_date).toLocaleDateString('en-GB')}
                                                        </span>
                                                    )}
                                                    {doc.expiry_date && (
                                                        <span className={`text-xs flex items-center gap-1 ${isExpired ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                                            <Clock size={10} />
                                                            {isExpired ? 'Expired' : 'Expires'} {new Date(doc.expiry_date).toLocaleDateString('en-GB')}
                                                        </span>
                                                    )}
                                                </div>
                                                {doc.rejection_reason && (
                                                    <p className="text-sm text-red-600 mt-2 bg-red-50 px-2 py-1 rounded inline-block">
                                                        Rejected: {doc.rejection_reason}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {doc.document?.id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadAuthedFile(`/staff/documents/file/${doc.document!.id}`, doc.document!.original_name || 'document')}
                                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#0066B3] transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                )}
                                                {(doc.status === 'uploaded' || doc.status === 'pending') && (
                                                    <>
                                                        <button 
                                                            onClick={() => verifyDocMutation.mutate(doc.id)} 
                                                            className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                                                            title="Verify"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => setRejectDocId(doc.id)} 
                                                            className="p-2 hover:bg-orange-50 rounded-lg text-slate-400 hover:text-orange-600 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                <button 
                                                    onClick={() => setDeleteDocId(doc.id)} 
                                                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Contracts Tab */}
                {activeTab === 'contracts' && (
                    <div>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Employment Contracts</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{contracts?.length || 0} contract{contracts?.length !== 1 ? 's' : ''} on record</p>
                            </div>
                            <button
                                onClick={() => { setContractFormData({ contract_type: 'permanent', notice_period_days: 30, salary: staff.basic_salary, job_title: staff.position?.name }); setShowContractModal(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] shadow-sm hover:shadow transition-all"
                            >
                                <Plus size={18} />
                                New Contract
                            </button>
                        </div>

                        {contracts?.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileCheck className="text-slate-400" size={28} />
                                </div>
                                <p className="text-slate-600 font-medium">No contracts found</p>
                                <p className="text-sm text-slate-400 mt-1">Create a contract to track employment terms and salary</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {contracts?.map((c) => {
                                    // Status configuration with colors and icons
                                    const statusConfig: Record<string, { bg: string; border: string; badge: string; label: string; icon: any }> = {
                                        draft: { 
                                            bg: 'bg-white', 
                                            border: 'border-slate-200',
                                            badge: 'bg-slate-100 text-slate-700 ring-slate-200',
                                            label: 'Draft',
                                            icon: FileText
                                        },
                                        pending_signature: { 
                                            bg: 'bg-white', 
                                            border: 'border-amber-300',
                                            badge: 'bg-amber-100 text-amber-700 ring-amber-200',
                                            label: 'Pending Signature',
                                            icon: PenTool
                                        },
                                        active: { 
                                            bg: 'bg-white', 
                                            border: 'border-emerald-300',
                                            badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
                                            label: 'Active',
                                            icon: CheckCircle2
                                        },
                                        expired: { 
                                            bg: 'bg-slate-50', 
                                            border: 'border-slate-300',
                                            badge: 'bg-slate-200 text-slate-700 ring-slate-300',
                                            label: 'Expired',
                                            icon: Clock
                                        },
                                        terminated: { 
                                            bg: 'bg-red-50/50', 
                                            border: 'border-red-200',
                                            badge: 'bg-red-100 text-red-700 ring-red-200',
                                            label: 'Terminated',
                                            icon: Ban
                                        },
                                        renewed: { 
                                            bg: 'bg-blue-50/30', 
                                            border: 'border-blue-200',
                                            badge: 'bg-blue-100 text-blue-700 ring-blue-200',
                                            label: 'Renewed',
                                            icon: RotateCcw
                                        },
                                        superseded: { 
                                            bg: 'bg-slate-50', 
                                            border: 'border-slate-200',
                                            badge: 'bg-slate-100 text-slate-600 ring-slate-200',
                                            label: 'Superseded',
                                            icon: FileText
                                        },
                                    };

                                    // Contract type icons
                                    const contractTypeIcons: Record<string, any> = {
                                        permanent: Briefcase,
                                        fixed_term: Calendar,
                                        probation: Target,
                                        internship: GraduationCap,
                                        casual: UserCircle,
                                        consultancy: FileSignature,
                                    };

                                    const config = statusConfig[c.status] || statusConfig.draft;
                                    const TypeIcon = contractTypeIcons[c.contract_type] || Briefcase;
                                    const StatusIcon = config.icon;

                                    const daysRemaining = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                                    const progressPercent = c.end_date && c.start_date && daysRemaining !== null
                                        ? Math.max(0, Math.min(100, (daysRemaining / Math.ceil((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / (1000 * 60 * 60 * 24))) * 100))
                                        : null;

                                    return (
                                        <div key={c.id} className={`relative overflow-hidden rounded-xl border-2 ${config.border} ${config.bg} shadow-sm hover:shadow-md transition-shadow`}>
                                            {/* Status indicator strip */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                                c.status === 'active' ? 'bg-emerald-500' :
                                                c.status === 'pending_signature' ? 'bg-amber-500' :
                                                c.status === 'terminated' ? 'bg-red-500' :
                                                c.status === 'renewed' ? 'bg-blue-500' :
                                                'bg-slate-400'
                                            }`} />

                                            <div className="p-5 pl-6">
                                                {/* Top row: Type, Status, Salary */}
                                                <div className="flex items-start justify-between gap-4 mb-4">
                                                    <div className="flex items-start gap-3">
                                                        {/* Contract Type Icon */}
                                                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                                            c.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                                                            c.status === 'pending_signature' ? 'bg-amber-100 text-amber-600' :
                                                            c.status === 'terminated' ? 'bg-red-100 text-red-600' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            <TypeIcon size={20} />
                                                        </div>

                                                        <div>
                                                            {/* Title & Status */}
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-semibold text-slate-900 text-base">
                                                                    {c.title || `${c.contract_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Contract`}
                                                                </h4>
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ring-1 ${config.badge}`}>
                                                                    <StatusIcon size={12} />
                                                                    {config.label}
                                                                </span>
                                                                {c.renewal_count ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 ring-1 ring-purple-200">
                                                                        <RotateCcw size={10} />
                                                                        Renewal #{c.renewal_count}
                                                                    </span>
                                                                ) : null}
                                                            </div>

                                                            {/* Contract Number & Type */}
                                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                                <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs">{c.contract_number}</span>
                                                                <span className="flex items-center gap-1">
                                                                    <Shield size={12} />
                                                                    Notice: {c.notice_period_days} days
                                                                </span>
                                                                {c.job_title && (
                                                                    <span className="flex items-center gap-1 text-slate-600">
                                                                        <Briefcase size={12} />
                                                                        {c.job_title}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Salary */}
                                                    {c.salary ? (
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="flex items-baseline justify-end gap-1">
                                                                <span className="text-sm font-medium text-slate-500">{c.salary_currency || 'KES'}</span>
                                                                <span className="text-xl font-bold text-slate-900">{Number(c.salary).toLocaleString()}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-400">per month</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-right flex-shrink-0">
                                                            <p className="text-sm text-slate-400 italic">Salary not set</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Date timeline */}
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span className="text-slate-600 font-medium">{new Date(c.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                    <div className="flex-1 h-px bg-slate-200 relative">
                                                        {c.end_date && progressPercent !== null && c.status === 'active' && daysRemaining !== null && (
                                                            <div 
                                                                className={`absolute left-0 top-0 bottom-0 ${daysRemaining <= 30 ? 'bg-red-400' : daysRemaining <= 90 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                                                style={{ width: `${100 - progressPercent}%` }}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        {c.end_date ? (
                                                            <>
                                                                <div className={`w-2 h-2 rounded-full ${daysRemaining !== null && daysRemaining <= 30 ? 'bg-red-500' : 'bg-slate-400'}`} />
                                                                <span className={`font-medium ${daysRemaining !== null && daysRemaining <= 30 ? 'text-red-600' : 'text-slate-600'}`}>
                                                                    {new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-emerald-600 font-medium">Ongoing</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Days remaining warning */}
                                                {daysRemaining !== null && c.status === 'active' && (
                                                    <div className={`mb-4 p-2.5 rounded-lg flex items-center gap-2 text-sm ${
                                                        daysRemaining <= 30 ? 'bg-red-50 text-red-700 border border-red-100' :
                                                        daysRemaining <= 90 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                        'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    }`}>
                                                        <AlertCircle size={16} />
                                                        <span className="font-medium">
                                                            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
                                                        </span>
                                                        {daysRemaining <= 30 && daysRemaining > 0 && (
                                                            <span className="text-xs opacity-75">— Consider renewal</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Termination reason */}
                                                {c.termination_reason && (
                                                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
                                                        <p className="text-sm text-red-700">
                                                            <span className="font-medium">Termination:</span> {c.termination_reason}
                                                        </p>
                                                        {c.termination_date && (
                                                            <p className="text-xs text-red-500 mt-1">
                                                                Effective: {new Date(c.termination_date).toLocaleDateString('en-GB')}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action buttons */}
                                                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
                                                    {/* Primary: PDF Actions */}
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadAuthedFile(`/staff/contracts/${c.id}/pdf/preview`)}
                                                        className="px-3 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 transition-colors"
                                                    >
                                                        <Eye size={16} />
                                                        Preview
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadAuthedFile(`/staff/contracts/${c.id}/pdf`, `contract-${c.contract_number || c.id}.pdf`)}
                                                        className="px-3 py-2 text-sm font-medium bg-[#0066B3] text-white rounded-lg hover:bg-[#005599] flex items-center gap-2 transition-colors shadow-sm"
                                                    >
                                                        <Download size={16} />
                                                        Download PDF
                                                    </button>

                                                    <div className="flex-1" />

                                                    {/* Status-specific actions */}
                                                    {(c.status === 'draft' || c.status === 'pending_signature') && (
                                                        <>
                                                            <button
                                                                onClick={() => sendForSignatureMutation.mutate(c.id)}
                                                                disabled={sendForSignatureMutation.isPending}
                                                                className="px-3 py-2 text-sm font-medium bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center gap-2 transition-colors disabled:opacity-50"
                                                                title={c.status === 'pending_signature' ? 'Resend signing link' : 'Send for signature'}
                                                            >
                                                                <PenTool size={16} />
                                                                {c.status === 'pending_signature' ? 'Resend' : 'Send for Signature'}
                                                            </button>
                                                            <button 
                                                                onClick={() => activateContractMutation.mutate(c.id)} 
                                                                className="px-3 py-2 text-sm font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Play size={16} />
                                                                Activate
                                                            </button>
                                                        </>
                                                    )}
                                                    {c.status === 'active' && (
                                                        <>
                                                            <button 
                                                                onClick={() => { setRenewContractTarget(c.id); setRenewEndDate(c.end_date ? new Date(new Date(c.end_date).getTime() + 365*24*60*60*1000).toISOString().split('T')[0] : ''); setRenewSalary(c.salary ? String(c.salary) : ''); setShowRenewModal(true); }} 
                                                                className="px-3 py-2 text-sm font-medium bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-2 transition-colors"
                                                            >
                                                                <RotateCcw size={16} />
                                                                Renew
                                                            </button>
                                                            <button 
                                                                onClick={() => { setTerminateContractTarget(c.id); setTerminateContractDate(new Date().toISOString().split('T')[0]); setShowTerminateContractModal(true); }} 
                                                                className="px-3 py-2 text-sm font-medium bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Ban size={16} />
                                                                Terminate
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Employment History Tab */}
                {activeTab === 'employment' && (
                    <div>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Employment History</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{employmentHistory?.length || 0} record{employmentHistory?.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>

                        {employmentHistory?.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <History className="text-slate-400" size={28} />
                                </div>
                                <p className="text-slate-600 font-medium">No employment history</p>
                                <p className="text-sm text-slate-400 mt-1">Position changes and transfers will appear here</p>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200" />
                                
                                <div className="space-y-6">
                                    {employmentHistory?.map((entry, idx) => {
                                        const changeConfig: Record<string, { dot: string; badge: string; icon: any }> = {
                                            initial: { 
                                                dot: 'bg-blue-500 border-blue-500 ring-blue-100',
                                                badge: 'bg-blue-100 text-blue-700 ring-blue-200',
                                                icon: Briefcase
                                            },
                                            promotion: { 
                                                dot: 'bg-emerald-500 border-emerald-500 ring-emerald-100',
                                                badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
                                                icon: TrendingUp
                                            },
                                            transfer: { 
                                                dot: 'bg-purple-500 border-purple-500 ring-purple-100',
                                                badge: 'bg-purple-100 text-purple-700 ring-purple-200',
                                                icon: MapPin
                                            },
                                            demotion: { 
                                                dot: 'bg-red-500 border-red-500 ring-red-100',
                                                badge: 'bg-red-100 text-red-700 ring-red-200',
                                                icon: AlertTriangle
                                            },
                                            salary_change: { 
                                                dot: 'bg-amber-500 border-amber-500 ring-amber-100',
                                                badge: 'bg-amber-100 text-amber-700 ring-amber-200',
                                                icon: DollarSign
                                            },
                                            lateral: { 
                                                dot: 'bg-slate-500 border-slate-500 ring-slate-100',
                                                badge: 'bg-slate-100 text-slate-700 ring-slate-200',
                                                icon: RefreshCw
                                            },
                                        };
                                        const config = changeConfig[entry.change_type || 'initial'] || changeConfig.initial;
                                        const ChangeIcon = config.icon;
                                        const isCurrent = idx === 0 && !entry.end_date;

                                        return (
                                            <div key={entry.id} className="relative pl-14">
                                                {/* Timeline dot */}
                                                <div className={`absolute left-3 w-7 h-7 rounded-full border-2 ${config.dot} ring-4 flex items-center justify-center z-10`}>
                                                    <ChangeIcon size={14} className="text-white" />
                                                </div>

                                                {/* Card */}
                                                <div className={`rounded-xl border p-5 ${isCurrent ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/80 border-slate-200'}`}>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                <h4 className="font-semibold text-slate-900 text-base">{entry.position?.name || 'Position'}</h4>
                                                                {entry.change_type && entry.change_type !== 'initial' && (
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ring-1 ${config.badge}`}>
                                                                        <ChangeIcon size={10} />
                                                                        {entry.change_type.replace('_', ' ')}
                                                                    </span>
                                                                )}
                                                                {isCurrent && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                                                                        <CheckCircle size={10} />
                                                                        Current
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                                                                <Building2 size={14} />
                                                                <span>{[entry.department?.name, entry.branch?.name, entry.region?.name].filter(Boolean).join(' • ') || 'N/A'}</span>
                                                            </div>

                                                            {entry.salary && (
                                                                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg w-fit">
                                                                    <DollarSign size={14} className="text-emerald-600" />
                                                                    <span className="text-sm font-semibold text-emerald-700">
                                                                        KES {Number(entry.salary).toLocaleString()}/month
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {entry.change_reason && (
                                                                <p className="text-sm text-slate-500 mt-3 italic bg-slate-100/50 p-2 rounded">
                                                                    “{entry.change_reason}”
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Date range */}
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="text-sm font-medium text-slate-700">
                                                                {new Date(entry.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                                            </div>
                                                            {entry.end_date ? (
                                                                <div className="text-sm text-slate-500">
                                                                    {new Date(entry.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-emerald-600 font-medium">Present</div>
                                                            )}
                                                            <div className="text-xs text-slate-400 mt-1">
                                                                {entry.end_date 
                                                                    ? `${Math.ceil((new Date(entry.end_date).getTime() - new Date(entry.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months`
                                                                    : `${Math.ceil((Date.now() - new Date(entry.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months`
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Onboarding Tab */}
                {activeTab === 'onboarding' && (
                    <div>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Onboarding Progress</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{onboarding ? `${onboarding.task_statuses?.length || 0} task${onboarding.task_statuses?.length !== 1 ? 's' : ''}` : 'No active onboarding'}</p>
                            </div>
                            {!onboarding && (
                                <button 
                                    onClick={() => startOnboardingMutation.mutate()} 
                                    disabled={startOnboardingMutation.isPending} 
                                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50 shadow-sm"
                                >
                                    <Plus size={18} />
                                    {startOnboardingMutation.isPending ? 'Starting...' : 'Start Onboarding'}
                                </button>
                            )}
                        </div>

                        {!onboarding ? (
                            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="text-slate-400" size={28} />
                                </div>
                                <p className="text-slate-600 font-medium">No active onboarding</p>
                                <p className="text-sm text-slate-400 mt-1">Start onboarding to track tasks and document completion</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Progress Card */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                    onboarding.status === 'completed' ? 'bg-emerald-100' :
                                                    onboarding.status === 'overdue' ? 'bg-red-100' :
                                                    'bg-blue-100'
                                                }`}>
                                                    {onboarding.status === 'completed' ? <CheckCircle size={24} className="text-emerald-600" /> :
                                                     onboarding.status === 'overdue' ? <AlertCircle size={24} className="text-red-600" /> :
                                                     <Clock size={24} className="text-blue-600" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">{onboarding.template?.name || 'Onboarding'}</h4>
                                                    <p className="text-sm text-slate-500">{onboarding.progress_percentage ?? 0}% complete</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ring-1 ${
                                                onboarding.status === 'completed' ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' :
                                                onboarding.status === 'overdue' ? 'bg-red-100 text-red-700 ring-red-200' :
                                                'bg-blue-100 text-blue-700 ring-blue-200'
                                            }`}>
                                                {onboarding.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        
                                        {/* Progress bar */}
                                        <div className="relative">
                                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                                <div 
                                                    className={`h-3 rounded-full transition-all duration-500 ${
                                                        onboarding.status === 'completed' ? 'bg-emerald-500' :
                                                        onboarding.status === 'overdue' ? 'bg-red-500' :
                                                        'bg-[#0066B3]'
                                                    }`} 
                                                    style={{ width: `${onboarding.progress_percentage ?? 0}%` }} 
                                                />
                                            </div>
                                            <div className="flex justify-between mt-2 text-xs text-slate-500">
                                                <span>0%</span>
                                                <span className="font-medium">{onboarding.progress_percentage ?? 0}%</span>
                                                <span>100%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Task List */}
                                <div className="space-y-3">
                                    <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-slate-400" />
                                        Tasks
                                    </h4>
                                    {onboarding.task_statuses?.map((ts) => {
                                        const isDone = ts.status === 'completed';
                                        const isSkipped = ts.status === 'skipped';
                                        const isOverdue = ts.due_date && !isDone && !isSkipped && new Date(ts.due_date) < new Date();
                                        
                                        return (
                                            <div key={ts.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${
                                                isDone ? 'bg-emerald-50/50 border-emerald-200' : 
                                                isSkipped ? 'bg-slate-50 border-slate-200 opacity-60' : 
                                                isOverdue ? 'bg-red-50 border-red-200' : 
                                                'bg-white border-slate-200 hover:border-slate-300'
                                            }`}>
                                                {/* Status icon */}
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                                    isDone ? 'bg-emerald-500' : 
                                                    isSkipped ? 'bg-slate-300' : 
                                                    isOverdue ? 'bg-red-500' :
                                                    'bg-slate-200'
                                                }`}>
                                                    {isDone ? <CheckCircle size={20} className="text-white" /> : 
                                                     isSkipped ? <XCircle size={20} className="text-white" /> : 
                                                     isOverdue ? <AlertCircle size={20} className="text-white" /> :
                                                     <Clock size={20} className="text-slate-500" />}
                                                </div>

                                                {/* Task info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className={`font-medium ${isDone ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>
                                                            {ts.task?.title || 'Task'}
                                                        </p>
                                                        {ts.task?.is_required && !isDone && !isSkipped && (
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">Required</span>
                                                        )}
                                                    </div>
                                                    {ts.task?.description && (
                                                        <p className={`text-sm ${isDone ? 'text-emerald-600/70' : 'text-slate-500'}`}>
                                                            {ts.task.description}
                                                        </p>
                                                    )}
                                                    
                                                    {/* Due date */}
                                                    {ts.due_date && (
                                                        <div className={`flex items-center gap-1 mt-2 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                                            <Calendar size={14} />
                                                            {isOverdue ? 'Overdue: ' : 'Due: '}
                                                            {new Date(ts.due_date).toLocaleDateString('en-GB')}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Notes */}
                                                    {ts.notes && (
                                                        <p className="text-sm text-slate-500 italic mt-2 bg-slate-100/50 p-2 rounded">
                                                            {ts.notes}
                                                        </p>
                                                    )}
                                                    {ts.skipped_reason && (
                                                        <p className="text-sm text-amber-600 italic mt-2">
                                                            Skipped: {ts.skipped_reason}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {!isDone && !isSkipped && (
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <button 
                                                            onClick={() => completeTaskMutation.mutate({ taskStatusId: ts.id })} 
                                                            disabled={completeTaskMutation.isPending} 
                                                            className="px-4 py-2 text-sm font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 flex items-center gap-2 transition-colors disabled:opacity-50"
                                                        >
                                                            <CheckCircle size={16} /> Complete
                                                        </button>
                                                        {!ts.task?.is_required && (
                                                            <button 
                                                                onClick={() => setSkipTaskId(ts.id)} 
                                                                disabled={skipTaskMutation.isPending} 
                                                                className="px-3 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                                                            >
                                                                Skip
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* People & Comp Tab */}
                {activeTab === 'people' && id && (
                    <StaffPeopleTab staffId={id} canEdit={true} showToast={showToast} />
                )}

                {/* Account Tab — user login, roles, password, MFA */}
                {activeTab === 'account' && (
                    <div className="space-y-6">
                        {!staff.user?.id ? (
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                                <Link2Off className="mx-auto text-slate-300 mb-3" size={48} />
                                <h3 className="text-lg font-semibold text-slate-700 mb-1">No login account linked</h3>
                                <p className="text-sm text-slate-500 mb-4">This staff record has no user account. They cannot log in.</p>
                                <p className="text-xs text-slate-400">To create an account, edit the staff record and link a user, or contact HR.</p>
                            </div>
                        ) : accountLoading ? (
                            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-[#0066B3]" /></div>
                        ) : !account ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">Could not load account details.</div>
                        ) : (
                            <>
                                {/* Top status card */}
                                <div className={`rounded-2xl border p-6 ${account.is_active ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${account.is_active ? 'bg-emerald-200' : 'bg-red-200'}`}>
                                            {account.is_active ? <Unlock className="text-emerald-700" size={24} /> : <Lock className="text-red-700" size={24} />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`text-lg font-semibold ${account.is_active ? 'text-emerald-900' : 'text-red-900'}`}>
                                                {account.is_active ? 'Login enabled' : 'Login disabled'}
                                            </h3>
                                            <p className={`text-sm ${account.is_active ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {account.is_active
                                                    ? 'This user can sign in to the portal with their email and password.'
                                                    : 'This user cannot sign in. Re-enable login to restore access.'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Last login: {account.last_login_at ? new Date(account.last_login_at).toLocaleString() : 'Never'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => account.is_active ? accountDeactivateMutation.mutate() : accountActivateMutation.mutate()}
                                            disabled={accountActivateMutation.isPending || accountDeactivateMutation.isPending}
                                            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${account.is_active ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-50`}
                                        >
                                            {(accountActivateMutation.isPending || accountDeactivateMutation.isPending)
                                                ? <Loader2 size={14} className="animate-spin" />
                                                : account.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                                            {account.is_active ? 'Disable Login' : 'Enable Login'}
                                        </button>
                                    </div>
                                </div>

                                {/* Account details grid */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="bg-white rounded-2xl p-5 border border-slate-200">
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2"><Mail size={14} />Sign-in Email</h4>
                                        <p className="text-base font-medium text-slate-900 break-all">{account.email}</p>
                                        <p className="text-xs text-slate-400 mt-1">Used for portal login and system notifications.</p>
                                    </div>

                                    <div className="bg-white rounded-2xl p-5 border border-slate-200">
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2"><ShieldCheck size={14} />Two-Factor Authentication</h4>
                                        {account.two_factor_enabled ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium"><ShieldCheck size={14} />Enabled</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium"><ShieldOff size={14} />Not configured</span>
                                        )}
                                        <p className="text-xs text-slate-400 mt-2">The user manages 2FA in their own profile settings.</p>
                                    </div>

                                    <div className="bg-white rounded-2xl p-5 border border-slate-200 md:col-span-2">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2"><UserCog size={14} />Role</h4>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            {(account.roles || []).length === 0 ? (
                                                <span className="text-sm text-slate-400 italic">No role assigned</span>
                                            ) : (
                                                (account.roles || []).map((r: any) => (
                                                    <span key={r.id} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">{r.name}</span>
                                                ))
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                defaultValue={account.roles?.[0]?.code || ''}
                                                onChange={(e) => { if (e.target.value && e.target.value !== account.roles?.[0]?.code) accountUpdateRoleMutation.mutate(e.target.value); }}
                                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                            >
                                                <option value="">Select role…</option>
                                                {(allRoles as any[]).map((r: any) => (
                                                    <option key={r.id} value={r.code}>{r.name}</option>
                                                ))}
                                            </select>
                                            {accountUpdateRoleMutation.isPending && <Loader2 size={14} className="animate-spin text-slate-400" />}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">Changing the role takes effect on the user's next login (or token refresh).</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="bg-white rounded-2xl p-5 border border-slate-200">
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Security actions</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setShowResetPwDialog(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm"
                                        ><KeyRound size={14} />Reset Password</button>
                                        <button
                                            onClick={() => resendWelcomeMutation.mutate()}
                                            disabled={resendWelcomeMutation.isPending}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm disabled:opacity-50"
                                        >{resendWelcomeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}Resend Welcome Email</button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-3">A welcome email lets the user set their own password without an admin-chosen one.</p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Actions tab removed — lifecycle actions live in the header "More actions" dropdown */}
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Staff Profile"
                icon={Edit}
                tone="info"
                size="xl"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowEditModal(false)} />
                        <ModalPrimaryButton onClick={() => updateMutation.mutate(formData)} loading={updateMutation.isPending} tone="primary" icon={CheckCircle}>Save Changes</ModalPrimaryButton>
                    </>
                )}
            >
                {showEditModal && (
                    <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                    <input type="text" value={formData.first_name || ''} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
                                    <input type="text" value={formData.middle_name || ''} onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                    <input type="text" value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                                    <select value={formData.gender || ''} onChange={(e) => setFormData({ ...formData, gender: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                        <option value="">Select...</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                                    <input type="date" value={formData.date_of_birth || ''} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">National ID</label>
                                    <input type="text" value={formData.national_id || ''} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input type="text" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Phone</label>
                                    <input type="text" value={formData.alternate_phone || ''} onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Personal Email</label>
                                <input type="email" value={formData.personal_email || ''} onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                    <input type="text" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                                    <input type="text" value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <h4 className="font-medium text-slate-900 pt-4">Statutory & Salary</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">KRA PIN</label>
                                    <input type="text" value={formData.tax_pin || ''} onChange={(e) => setFormData({ ...formData, tax_pin: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">NSSF Number</label>
                                    <input type="text" value={formData.nssf_number || ''} onChange={(e) => setFormData({ ...formData, nssf_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">NHIF Number</label>
                                    <input type="text" value={formData.nhif_number || ''} onChange={(e) => setFormData({ ...formData, nhif_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Basic Salary (KES)</label>
                                    <input type="number" value={formData.basic_salary || ''} onChange={(e) => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <h4 className="font-medium text-slate-900 pt-4">Emergency Contact</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                    <input type="text" value={formData.emergency_contact_name || ''} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input type="text" value={formData.emergency_contact_phone || ''} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
                                    <input type="text" value={formData.emergency_contact_relationship || ''} onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <h4 className="font-medium text-slate-900 pt-4">Bank Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                                    <input type="text" value={formData.bank_name || ''} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                                    <input type="text" value={formData.bank_branch || ''} onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                                    <input type="text" value={formData.bank_account_number || ''} onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                                    <input type="text" value={formData.bank_account_name || ''} onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                    </div>
                )}
            </Modal>

            {/* Upload Document Modal */}
            <Modal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                title="Upload Document"
                icon={Upload}
                tone="info"
                size="md"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowUploadModal(false)} />
                        <ModalPrimaryButton onClick={handleUpload} disabled={!uploadFile || !uploadDocType} loading={uploadDocMutation.isPending} tone="primary" icon={Upload}>Upload</ModalPrimaryButton>
                    </>
                )}
            >
                {showUploadModal && (
                    <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Document Type *</label>
                                <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                    <option value="">Select type...</option>
                                    {documentTypes?.map((dt: any) => <option key={dt.id} value={dt.id}>{dt.name}{dt.is_required ? ' *' : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                                <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number</label>
                                <input type="text" value={uploadRefNumber} onChange={(e) => setUploadRefNumber(e.target.value)} placeholder="e.g. ID number, cert number" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
                                    <input type="date" value={uploadIssueDate} onChange={(e) => setUploadIssueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                                    <input type="date" value={uploadExpiryDate} onChange={(e) => setUploadExpiryDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                    </div>
                )}
            </Modal>

            {/* Reject Document Dialog */}
            <Modal
                isOpen={!!rejectDocId}
                onClose={() => { setRejectDocId(null); setRejectReason(''); }}
                title="Reject Document"
                icon={XCircle}
                tone="danger"
                size="sm"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => { setRejectDocId(null); setRejectReason(''); }} />
                        <ModalPrimaryButton onClick={() => rejectDocMutation.mutate({ docId: rejectDocId!, reason: rejectReason })} disabled={!rejectReason} loading={rejectDocMutation.isPending} tone="danger" icon={XCircle}>Reject</ModalPrimaryButton>
                    </>
                )}
            >
                {rejectDocId && (
                    <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rejection Reason *</label>
                                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Provide a reason for rejection..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                    </div>
                )}
            </Modal>

            {/* Create Contract Modal */}
            <Modal
                isOpen={showContractModal}
                onClose={() => setShowContractModal(false)}
                title="Create Contract"
                icon={FileCheck}
                tone="info"
                size="lg"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowContractModal(false)} />
                        <ModalPrimaryButton onClick={() => createContractMutation.mutate(contractFormData)} disabled={!contractFormData.start_date || !contractFormData.contract_type} loading={createContractMutation.isPending} tone="primary" icon={Plus}>Create Contract</ModalPrimaryButton>
                    </>
                )}
            >
                {showContractModal && (
                    <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contract Type *</label>
                                    <select value={contractFormData.contract_type || ''} onChange={(e) => setContractFormData({ ...contractFormData, contract_type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                        <option value="permanent">Permanent</option>
                                        <option value="fixed_term">Fixed Term</option>
                                        <option value="probation">Probation</option>
                                        <option value="casual">Casual</option>
                                        <option value="internship">Internship</option>
                                        <option value="consultancy">Consultancy</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                                    <input type="text" value={contractFormData.job_title || ''} onChange={(e) => setContractFormData({ ...contractFormData, job_title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input type="text" value={contractFormData.title || ''} onChange={(e) => setContractFormData({ ...contractFormData, title: e.target.value })} placeholder="e.g. Full-Time Employment Contract" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                                    <input type="date" value={contractFormData.start_date || ''} onChange={(e) => setContractFormData({ ...contractFormData, start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                    <input type="date" value={contractFormData.end_date || ''} onChange={(e) => setContractFormData({ ...contractFormData, end_date: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Salary (KES)</label>
                                    <input type="number" value={contractFormData.salary || ''} onChange={(e) => setContractFormData({ ...contractFormData, salary: parseFloat(e.target.value) || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notice Period (days)</label>
                                    <input type="number" value={contractFormData.notice_period_days || 30} onChange={(e) => setContractFormData({ ...contractFormData, notice_period_days: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
                                <textarea value={contractFormData.terms || ''} onChange={(e) => setContractFormData({ ...contractFormData, terms: e.target.value })} rows={3} placeholder="Contract terms..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Special Conditions</label>
                                <textarea value={contractFormData.special_conditions || ''} onChange={(e) => setContractFormData({ ...contractFormData, special_conditions: e.target.value })} rows={2} placeholder="Any special conditions..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                    </div>
                )}
            </Modal>

            {/* Transfer Modal */}
            <Modal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                title="Transfer Staff"
                icon={Building2}
                tone="info"
                size="md"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowTransferModal(false)} />
                        <ModalPrimaryButton onClick={() => transferMutation.mutate(formData)} loading={transferMutation.isPending} tone="primary" icon={Building2}>Transfer</ModalPrimaryButton>
                    </>
                )}
            >
                {showTransferModal && (
                    <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                                <select value={formData.region_id || ''} onChange={(e) => setFormData({ ...formData, region_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                    <option value="">Keep current</option>
                                    {regions?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                                <select value={formData.branch_id || ''} onChange={(e) => setFormData({ ...formData, branch_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                    <option value="">Keep current</option>
                                    {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                                <select value={formData.position_id || ''} onChange={(e) => setFormData({ ...formData, position_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                    <option value="">Keep current</option>
                                    {positions?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Effective Date</label>
                                <input type="date" value={formData.effective_date || ''} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                                <textarea value={formData.reason || ''} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                    </div>
                )}
            </Modal>

            {/* Probation Modal */}
            <Modal
                isOpen={showProbationModal}
                onClose={() => setShowProbationModal(false)}
                title="Probation Review"
                icon={Clock}
                tone="warning"
                size="md"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowProbationModal(false)} />
                        <ModalPrimaryButton onClick={() => probationMutation.mutate(formData)} disabled={!formData.status} loading={probationMutation.isPending} tone="primary" icon={CheckCircle}>Save</ModalPrimaryButton>
                    </>
                )}
            >
                {showProbationModal && (
                    <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                <select value={formData.status || ''} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                    <option value="">Select...</option>
                                    <option value="confirmed">Confirm (Pass)</option>
                                    <option value="extended">Extend Probation</option>
                                    <option value="failed">Fail Probation</option>
                                </select>
                            </div>
                            {formData.status === 'extended' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Extended Until</label>
                                    <input type="date" value={formData.extendedUntil || ''} onChange={(e) => setFormData({ ...formData, extendedUntil: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                    </div>
                )}
            </Modal>

            {/* Terminate Modal */}
            <Modal
                isOpen={showTerminateModal}
                onClose={() => setShowTerminateModal(false)}
                title="Terminate Employment"
                icon={Ban}
                tone="danger"
                size="lg"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowTerminateModal(false)} />
                        <ModalPrimaryButton onClick={() => terminateMutation.mutate(formData)} disabled={!formData.reason || !formData.termination_type} loading={terminateMutation.isPending} tone="danger" icon={Ban}>Terminate Employment</ModalPrimaryButton>
                    </>
                )}
            >
                {showTerminateModal && (
                    <div className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                <p className="text-sm text-red-700">This action will permanently end employment for <strong>{staff.first_name} {staff.last_name}</strong> ({staff.employee_number}). This cannot be undone.</p>
                            </div>
                            {terminationBlockers && (terminationBlockers.active_assets > 0 || terminationBlockers.pending_documents > 0) && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                                        <div className="flex-1">
                                            <p className="font-semibold text-amber-900 mb-1.5">Exit clearance pending</p>
                                            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                                                {terminationBlockers.active_assets > 0 && <li><strong>{terminationBlockers.active_assets}</strong> active asset assignment{terminationBlockers.active_assets > 1 ? 's' : ''} — please return assigned items first</li>}
                                                {terminationBlockers.pending_documents > 0 && <li><strong>{terminationBlockers.pending_documents}</strong> mandatory document{terminationBlockers.pending_documents > 1 ? 's' : ''} unverified</li>}
                                            </ul>
                                            <p className="text-xs text-amber-700 mt-2">Resolve these blockers first, or check the override box below to proceed anyway.</p>
                                            <label className="mt-3 flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.force === true}
                                                    onChange={(e) => setFormData({ ...formData, force: e.target.checked })}
                                                    className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                                />
                                                <span className="text-sm font-medium text-amber-900">Override blockers and terminate anyway (CEO/HR Manager only)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {terminationBlockers && terminationBlockers.active_assets === 0 && terminationBlockers.pending_documents === 0 && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                                    <CheckCircle className="text-emerald-600 flex-shrink-0" size={18} />
                                    <p className="text-sm text-emerald-800 font-medium">Exit clearance complete — no blockers detected</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Termination Type *</label>
                                <select value={formData.termination_type || ''} onChange={(e) => setFormData({ ...formData, termination_type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                    <option value="">Select...</option>
                                    <option value="voluntary_resignation">Voluntary Resignation</option>
                                    <option value="involuntary_dismissal">Involuntary Dismissal</option>
                                    <option value="redundancy">Redundancy / Retrenchment</option>
                                    <option value="contract_end">Contract End (Non-renewal)</option>
                                    <option value="probation_failure">Probation Failure</option>
                                    <option value="retirement">Retirement</option>
                                    <option value="death">Death in Service</option>
                                    <option value="mutual_agreement">Mutual Agreement</option>
                                    <option value="absconded">Absconded</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Details *</label>
                                <textarea value={formData.reason || ''} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="Detailed reason for termination..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Working Date *</label>
                                    <input type="date" value={formData.terminationDate || ''} onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notice Period (days)</label>
                                    <input type="number" value={formData.notice_period_days || ''} onChange={(e) => setFormData({ ...formData, notice_period_days: parseInt(e.target.value) || undefined })} placeholder="30" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>

                            {/* Exit Clearance Checklist */}
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">Exit Clearance Checklist</label>
                                <div className="space-y-2 bg-slate-50 rounded-lg p-3">
                                    {[
                                        { key: 'company_property', label: 'Company property returned (laptop, ID, keys, etc.)' },
                                        { key: 'handover', label: 'Work handover completed' },
                                        { key: 'email_deactivated', label: 'Email & system access deactivation scheduled' },
                                        { key: 'final_settlement', label: 'Final salary settlement computed' },
                                        { key: 'leave_balance', label: 'Leave balance cleared / paid' },
                                        { key: 'exit_interview', label: 'Exit interview conducted' },
                                        { key: 'nda_reminder', label: 'NDA / non-compete obligations reminded' },
                                        { key: 'benefits_terminated', label: 'Benefits (NHIF, NSSF, pension) termination initiated' },
                                    ].map((item) => (
                                        <label key={item.key} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-white px-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={formData[`clearance_${item.key}`] || false}
                                                onChange={(e) => setFormData({ ...formData, [`clearance_${item.key}`]: e.target.checked })}
                                                className="w-4 h-4 rounded border-slate-300 text-[#0066B3] focus:ring-[#0066B3]"
                                            />
                                            <span className="text-sm text-slate-700">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Exit Interview Notes</label>
                                <textarea value={formData.exit_notes || ''} onChange={(e) => setFormData({ ...formData, exit_notes: e.target.value })} rows={2} placeholder="Optional exit interview notes..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                    </div>
                )}
            </Modal>

            {/* Reset Password Dialog (Account tab) */}
            <InputDialog
                isOpen={showResetPwDialog}
                title="Reset Password"
                message={`Set a new password for ${account?.email || 'this user'}. They will be required to use it on next login.`}
                inputLabel="New password"
                placeholder="Minimum 8 characters"
                confirmLabel="Reset Password"
                required
                minLength={8}
                inputType="password"
                onConfirm={(pw) => accountResetPwMutation.mutate(pw)}
                onCancel={() => setShowResetPwDialog(false)}
                isLoading={accountResetPwMutation.isPending}
            />

            {/* Skip Onboarding Task Dialog */}
            <InputDialog
                isOpen={!!skipTaskId}
                title="Skip Task"
                message="Provide a reason for skipping this task. This will be recorded against the onboarding instance."
                inputLabel="Reason"
                placeholder="e.g., Not applicable for this role"
                confirmLabel="Skip Task"
                required
                minLength={3}
                onConfirm={(reason) => { if (skipTaskId) skipTaskMutation.mutate({ taskStatusId: skipTaskId, reason }); setSkipTaskId(null); }}
                onCancel={() => setSkipTaskId(null)}
                isLoading={skipTaskMutation.isPending}
            />

            {/* Delete Document Dialog */}
            <ConfirmDialog
                isOpen={!!deleteDocId}
                title="Delete Document"
                message="Are you sure you want to delete this document? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { if (deleteDocId) deleteDocMutation.mutate(deleteDocId); setDeleteDocId(null); }}
                onCancel={() => setDeleteDocId(null)}
                isLoading={deleteDocMutation.isPending}
            />

            {/* Deactivate Staff Dialog */}
            <ConfirmDialog
                isOpen={showDeactivateConfirm}
                title="Suspend Staff"
                message="Are you sure you want to deactivate this staff member? Their access will be temporarily disabled."
                confirmLabel="Suspend"
                variant="danger"
                onConfirm={() => { deactivateMutation.mutate(undefined); setShowDeactivateConfirm(false); }}
                onCancel={() => setShowDeactivateConfirm(false)}
                isLoading={deactivateMutation.isPending}
            />

            {/* Promote Modal */}
            <Modal
                isOpen={showPromoteModal}
                onClose={() => setShowPromoteModal(false)}
                title="Promote Staff"
                icon={TrendingUp}
                tone="success"
                size="md"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowPromoteModal(false)} />
                        <ModalPrimaryButton onClick={() => promoteMutation.mutate(formData)} disabled={!formData.new_position_id} loading={promoteMutation.isPending} tone="success" icon={TrendingUp}>Promote</ModalPrimaryButton>
                    </>
                )}
            >
                {showPromoteModal && (
                    <div className="space-y-4">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                                Current: <strong>{staff.position?.name || 'N/A'}</strong> — {staff.basic_salary ? `KES ${Number(staff.basic_salary).toLocaleString()}` : 'No salary set'}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Position *</label>
                                <select value={formData.new_position_id || ''} onChange={(e) => setFormData({ ...formData, new_position_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                    <option value="">Select position...</option>
                                    {positions?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Salary (KES)</label>
                                <input type="number" value={formData.new_salary || ''} onChange={(e) => setFormData({ ...formData, new_salary: parseFloat(e.target.value) || undefined })} placeholder={staff.basic_salary ? `Current: ${Number(staff.basic_salary).toLocaleString()}` : 'Enter salary'} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Branch</label>
                                    <select value={formData.new_branch_id || ''} onChange={(e) => setFormData({ ...formData, new_branch_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                        <option value="">Keep current ({staff.branch?.name || 'None'})</option>
                                        {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Department</label>
                                    <select value={formData.new_department_id || ''} onChange={(e) => setFormData({ ...formData, new_department_id: e.target.value || undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                                        <option value="">Keep current ({staff.department?.name || 'None'})</option>
                                        {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Effective Date</label>
                                <input type="date" value={formData.effective_date || ''} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                                <textarea value={formData.reason || ''} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={2} placeholder="Reason for promotion..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                    </div>
                )}
            </Modal>

            {/* Photo Upload Modal */}
            <Modal
                isOpen={showPhotoInput}
                onClose={() => { setShowPhotoInput(false); setPhotoFile(null); }}
                title="Change Photo"
                icon={Camera}
                tone="info"
                size="sm"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => { setShowPhotoInput(false); setPhotoFile(null); }} />
                        <ModalPrimaryButton onClick={() => { if (photoFile) uploadPhotoMutation.mutate(photoFile); }} disabled={!photoFile} loading={uploadPhotoMutation.isPending} tone="primary" icon={Upload}>Upload</ModalPrimaryButton>
                    </>
                )}
            >
                {showPhotoInput && (
                    <div className="space-y-4">
                        <input type="file" accept="image/jpeg,image/png,image/gif" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                        {photoFile && <p className="text-sm text-slate-500">Selected: {photoFile.name}</p>}
                    </div>
                )}
            </Modal>

            {/* Terminate Contract Modal */}
            <Modal
                isOpen={showTerminateContractModal}
                onClose={() => { setShowTerminateContractModal(false); setTerminateContractTarget(null); }}
                title="Terminate Contract"
                icon={Ban}
                tone="danger"
                size="md"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => { setShowTerminateContractModal(false); setTerminateContractTarget(null); }} />
                        <ModalPrimaryButton onClick={() => { if (terminateContractTarget) terminateContractMutation.mutate({ contractId: terminateContractTarget, reason: terminateContractReason, termination_date: terminateContractDate || undefined }); }} disabled={!terminateContractReason} loading={terminateContractMutation.isPending} tone="danger" icon={Ban}>Terminate Contract</ModalPrimaryButton>
                    </>
                )}
            >
                {showTerminateContractModal && (
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Termination Date</label><input type="date" value={terminateContractDate} onChange={(e) => setTerminateContractDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label><textarea value={terminateContractReason} onChange={(e) => setTerminateContractReason(e.target.value)} rows={3} placeholder="Reason for contract termination..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div>
                    </div>
                )}
            </Modal>

            {/* Renew Contract Modal */}
            <Modal
                isOpen={showRenewModal}
                onClose={() => { setShowRenewModal(false); setRenewContractTarget(null); }}
                title="Renew Contract"
                icon={RotateCcw}
                tone="info"
                size="md"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => { setShowRenewModal(false); setRenewContractTarget(null); }} />
                        <ModalPrimaryButton onClick={() => { if (renewContractTarget) renewContractMutation.mutate({ contractId: renewContractTarget, data: { new_end_date: renewEndDate, ...(renewSalary && { new_salary: Number(renewSalary) }) } }); }} disabled={!renewEndDate} loading={renewContractMutation.isPending} tone="primary" icon={RotateCcw}>Renew Contract</ModalPrimaryButton>
                    </>
                )}
            >
                {showRenewModal && (
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">New End Date *</label><input type="date" value={renewEndDate} onChange={(e) => setRenewEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">New Salary (KES)</label><input type="number" value={renewSalary} onChange={(e) => setRenewSalary(e.target.value)} placeholder="Leave blank to keep current" className="w-full px-3 py-2 border border-slate-200 rounded-lg" /></div>
                    </div>
                )}
            </Modal>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
                    toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-red-500" />}
                    {toast.text}
                </div>
            )}
        </div>
    );
};

export default StaffProfilePage;
