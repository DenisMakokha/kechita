import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    ArrowLeft, Edit, Mail, Phone, Building2, MapPin,
    Briefcase, FileText, Clock, CheckCircle, XCircle,
    Upload, Download, Trash2, AlertTriangle, User,
    CreditCard, Shield, History, X, Camera, RefreshCw,
    ChevronRight, AlertCircle, TrendingUp, DollarSign,
    FileCheck, Plus, RotateCcw, Ban, Play
} from 'lucide-react';

type Tab = 'overview' | 'documents' | 'contracts' | 'employment' | 'actions';

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
    const [formData, setFormData] = useState<any>({});
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadDocType, setUploadDocType] = useState('');
    const [uploadExpiryDate, setUploadExpiryDate] = useState('');
    const [uploadIssueDate, setUploadIssueDate] = useState('');
    const [uploadRefNumber, setUploadRefNumber] = useState('');
    const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [contractFormData, setContractFormData] = useState<any>({});
    const [rejectDocId, setRejectDocId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

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

    // Update staff mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => (await api.put(`/staff/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', id] });
            setShowEditModal(false);
            showToast('Staff updated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update staff', 'error'),
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

    const terminateContractMutation = useMutation({
        mutationFn: async ({ contractId, reason }: { contractId: string; reason: string }) => (await api.patch(`/staff/contracts/${contractId}/terminate`, { reason })).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-contracts', id] }); showToast('Contract terminated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to terminate contract', 'error'),
    });

    const renewContractMutation = useMutation({
        mutationFn: async ({ contractId, data }: { contractId: string; data: any }) => (await api.post(`/staff/contracts/${contractId}/renew`, data)).data,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-contracts', id] }); showToast('Contract renewed'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to renew contract', 'error'),
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

    const openEditModal = () => {
        setFormData({
            first_name: staff?.first_name,
            middle_name: staff?.middle_name,
            last_name: staff?.last_name,
            gender: staff?.gender,
            date_of_birth: staff?.date_of_birth,
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
        { key: 'documents' as Tab, label: 'Documents', icon: FileText },
        { key: 'contracts' as Tab, label: 'Contracts', icon: FileCheck },
        { key: 'employment' as Tab, label: 'History', icon: History },
        { key: 'actions' as Tab, label: 'Actions', icon: Shield },
    ];

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
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/staff')} className="p-2 hover:bg-slate-100 rounded-lg">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">Staff Profile</h1>
                    <p className="text-slate-500">{staff.employee_number}</p>
                </div>
                <button
                    onClick={openEditModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599]"
                >
                    <Edit size={18} />
                    Edit Profile
                </button>
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
                        <button className="absolute -bottom-2 -right-2 p-2 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50">
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
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
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
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Personal Information */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <User size={18} className="text-[#0066B3]" />
                                Personal Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Full Name</span>
                                    <span className="font-medium">{[staff.first_name, staff.middle_name, staff.last_name].filter(Boolean).join(' ')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Date of Birth</span>
                                    <span className="font-medium">{staff.date_of_birth ? new Date(staff.date_of_birth).toLocaleDateString('en-GB') : '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Gender</span>
                                    <span className="font-medium capitalize">{staff.gender || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">National ID</span>
                                    <span className="font-medium">{staff.national_id || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Personal Email</span>
                                    <span className="font-medium">{staff.personal_email || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Address</span>
                                    <span className="font-medium">{[staff.address, staff.city, staff.postal_code].filter(Boolean).join(', ') || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Employment Information */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Briefcase size={18} className="text-[#0066B3]" />
                                Employment Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Hire Date</span>
                                    <span className="font-medium">{staff.hire_date ? new Date(staff.hire_date).toLocaleDateString('en-GB') : '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Confirmation Date</span>
                                    <span className="font-medium">{staff.confirmation_date ? new Date(staff.confirmation_date).toLocaleDateString('en-GB') : '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Department</span>
                                    <span className="font-medium">{staff.department?.name || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Manager</span>
                                    <span className="font-medium">{staff.manager ? `${staff.manager.first_name} ${staff.manager.last_name}` : '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Probation</span>
                                    <span className="font-medium">
                                        {staff.probation_end_date ? `Ends ${new Date(staff.probation_end_date).toLocaleDateString('en-GB')}` : '-'}
                                        {staff.probation_status && staff.probation_status !== 'not_applicable' && (
                                            <StatusBadge status={staff.probation_status} size="sm" />
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Basic Salary</span>
                                    <span className="font-medium flex items-center gap-1">
                                        <DollarSign size={14} className="text-emerald-600" />
                                        {staff.basic_salary ? `${staff.salary_currency || 'KES'} ${Number(staff.basic_salary).toLocaleString()}` : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Statutory Information */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Shield size={18} className="text-[#0066B3]" />
                                Statutory Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">KRA PIN</span>
                                    <span className="font-medium">{staff.tax_pin || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">NSSF Number</span>
                                    <span className="font-medium">{staff.nssf_number || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">NHIF Number</span>
                                    <span className="font-medium">{staff.nhif_number || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-[#0066B3]" />
                                Emergency Contact
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Name</span>
                                    <span className="font-medium">{staff.emergency_contact_name || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Phone</span>
                                    <span className="font-medium">{staff.emergency_contact_phone || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Relationship</span>
                                    <span className="font-medium capitalize">{staff.emergency_contact_relationship || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bank Information */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <CreditCard size={18} className="text-[#0066B3]" />
                                Bank Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Bank Name</span>
                                    <span className="font-medium">{staff.bank_name || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Branch</span>
                                    <span className="font-medium">{staff.bank_branch || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Account Number</span>
                                    <span className="font-medium">{staff.bank_account_number || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Account Name</span>
                                    <span className="font-medium">{staff.bank_account_name || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-slate-900">Staff Documents</h3>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599]"
                            >
                                <Upload size={18} />
                                Upload Document
                            </button>
                        </div>
                        {documents?.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500">No documents uploaded</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents?.map((doc) => {
                                    const docStatusColors: Record<string, string> = {
                                        verified: 'bg-emerald-100 text-emerald-700',
                                        uploaded: 'bg-blue-100 text-blue-700',
                                        pending: 'bg-amber-100 text-amber-700',
                                        rejected: 'bg-red-100 text-red-700',
                                        expired: 'bg-red-100 text-red-700',
                                        expiring_soon: 'bg-orange-100 text-orange-700',
                                    };
                                    return (
                                        <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                                                    <FileText size={24} className="text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{doc.documentType?.name || doc.doc_type || 'Document'}</p>
                                                    <p className="text-sm text-slate-500">{doc.document?.original_name || doc.original_name}</p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${docStatusColors[doc.status] || 'bg-slate-100 text-slate-600'}`}>
                                                            {doc.status?.replace('_', ' ')}
                                                        </span>
                                                        {doc.reference_number && (
                                                            <span className="text-xs text-slate-400">Ref: {doc.reference_number}</span>
                                                        )}
                                                        {doc.expiry_date && (
                                                            <span className={`text-xs ${new Date(doc.expiry_date) < new Date() ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                                                {new Date(doc.expiry_date) < new Date() ? 'Expired' : 'Expires'}: {new Date(doc.expiry_date).toLocaleDateString('en-GB')}
                                                            </span>
                                                        )}
                                                        {doc.issue_date && (
                                                            <span className="text-xs text-slate-400">Issued: {new Date(doc.issue_date).toLocaleDateString('en-GB')}</span>
                                                        )}
                                                    </div>
                                                    {doc.rejection_reason && (
                                                        <p className="text-xs text-red-500 mt-1">Rejected: {doc.rejection_reason}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {doc.document?.id && (
                                                    <a href={`${api.defaults.baseURL}/staff/documents/file/${doc.document.id}`} target="_blank" rel="noreferrer" className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600" title="Download">
                                                        <Download size={18} />
                                                    </a>
                                                )}
                                                {(doc.status === 'uploaded' || doc.status === 'pending') && (
                                                    <>
                                                        <button onClick={() => verifyDocMutation.mutate(doc.id)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-emerald-600" title="Verify">
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button onClick={() => setRejectDocId(doc.id)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-orange-600" title="Reject">
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => setDeleteDocId(doc.id)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600" title="Delete">
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
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-slate-900">Employment Contracts</h3>
                            <button
                                onClick={() => { setContractFormData({ contract_type: 'permanent', notice_period_days: 30, salary: staff.basic_salary, job_title: staff.position?.name }); setShowContractModal(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599]"
                            >
                                <Plus size={18} />
                                New Contract
                            </button>
                        </div>
                        {contracts?.length === 0 ? (
                            <div className="text-center py-12">
                                <FileCheck className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500">No contracts found</p>
                                <p className="text-sm text-slate-400 mt-1">Create a contract to track employment terms</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {contracts?.map((c) => {
                                    const statusColors: Record<string, string> = {
                                        draft: 'bg-slate-100 text-slate-600',
                                        pending_signature: 'bg-amber-100 text-amber-700',
                                        active: 'bg-emerald-100 text-emerald-700',
                                        expired: 'bg-red-100 text-red-700',
                                        terminated: 'bg-red-100 text-red-700',
                                        renewed: 'bg-blue-100 text-blue-700',
                                        superseded: 'bg-slate-100 text-slate-500',
                                    };
                                    const daysRemaining = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                                    return (
                                        <div key={c.id} className={`p-5 rounded-xl border ${c.status === 'active' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-slate-900">{c.title || `${c.contract_type.replace('_', ' ')} Contract`}</h4>
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                                                            {c.status.replace('_', ' ')}
                                                        </span>
                                                        {c.renewal_count ? <span className="text-xs text-slate-400">Renewal #{c.renewal_count}</span> : null}
                                                    </div>
                                                    <p className="text-sm text-slate-500">
                                                        {c.contract_number} • {c.contract_type.replace('_', ' ')} • Notice: {c.notice_period_days}d
                                                    </p>
                                                </div>
                                                {c.salary && (
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-emerald-700 flex items-center gap-1">
                                                            <DollarSign size={16} /> {c.salary_currency || 'KES'} {Number(c.salary).toLocaleString()}
                                                        </p>
                                                        <p className="text-xs text-slate-400">per month</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                                                <span className="flex items-center gap-1"><Clock size={14} /> {new Date(c.start_date).toLocaleDateString('en-GB')} — {c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB') : 'Ongoing'}</span>
                                                {daysRemaining !== null && c.status === 'active' && (
                                                    <span className={`font-medium ${daysRemaining <= 30 ? 'text-red-600' : daysRemaining <= 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                                                    </span>
                                                )}
                                            </div>
                                            {c.termination_reason && (
                                                <p className="text-sm text-red-600 mb-3">Termination: {c.termination_reason}</p>
                                            )}
                                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
                                                {/* PDF Actions */}
                                                <a
                                                    href={`${api.defaults.baseURL}/staff/contracts/${c.id}/pdf/preview`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center gap-1"
                                                >
                                                    <FileText size={12} /> Preview PDF
                                                </a>
                                                <a
                                                    href={`${api.defaults.baseURL}/staff/contracts/${c.id}/pdf`}
                                                    className="px-3 py-1.5 text-xs font-medium bg-[#0066B3]/10 text-[#0066B3] rounded-lg hover:bg-[#0066B3]/20 flex items-center gap-1"
                                                >
                                                    <Download size={12} /> Download PDF
                                                </a>
                                                {(c.status === 'draft' || c.status === 'pending_signature') && (
                                                    <button onClick={() => activateContractMutation.mutate(c.id)} className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center gap-1">
                                                        <Play size={12} /> Activate
                                                    </button>
                                                )}
                                                {c.status === 'active' && c.end_date && (
                                                    <button onClick={() => renewContractMutation.mutate({ contractId: c.id, data: { new_end_date: new Date(new Date(c.end_date!).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } })} className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1">
                                                        <RotateCcw size={12} /> Renew (+1yr)
                                                    </button>
                                                )}
                                                {c.status === 'active' && (
                                                    <button onClick={() => terminateContractMutation.mutate({ contractId: c.id, reason: 'Contract terminated by HR' })} className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1">
                                                        <Ban size={12} /> Terminate
                                                    </button>
                                                )}
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
                        <h3 className="font-semibold text-slate-900 mb-6">Employment History</h3>
                        {employmentHistory?.length === 0 ? (
                            <div className="text-center py-12">
                                <History className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500">No employment history</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                                <div className="space-y-6">
                                    {employmentHistory?.map((entry, idx) => {
                                        const changeColors: Record<string, string> = {
                                            initial: 'bg-blue-500 border-blue-500',
                                            promotion: 'bg-emerald-500 border-emerald-500',
                                            transfer: 'bg-purple-500 border-purple-500',
                                            demotion: 'bg-red-500 border-red-500',
                                            salary_change: 'bg-amber-500 border-amber-500',
                                            lateral: 'bg-slate-500 border-slate-500',
                                        };
                                        const dotColor = idx === 0
                                            ? (changeColors[entry.change_type || 'initial'] || 'bg-[#0066B3] border-[#0066B3]')
                                            : 'bg-white border-slate-300';
                                        const changeBadgeColors: Record<string, string> = {
                                            promotion: 'bg-emerald-100 text-emerald-700',
                                            transfer: 'bg-purple-100 text-purple-700',
                                            demotion: 'bg-red-100 text-red-700',
                                            salary_change: 'bg-amber-100 text-amber-700',
                                            initial: 'bg-blue-100 text-blue-700',
                                        };
                                        return (
                                            <div key={entry.id} className="relative pl-10">
                                                <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${dotColor}`} />
                                                <div className="bg-slate-50 rounded-xl p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-medium text-slate-900">{entry.position?.name || 'Position change'}</p>
                                                                {entry.change_type && entry.change_type !== 'initial' && (
                                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${changeBadgeColors[entry.change_type] || 'bg-slate-100 text-slate-600'}`}>
                                                                        {entry.change_type.replace('_', ' ')}
                                                                    </span>
                                                                )}
                                                                {idx === 0 && !entry.end_date && (
                                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Current</span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-500">
                                                                {[entry.department?.name, entry.branch?.name, entry.region?.name].filter(Boolean).join(' • ')}
                                                            </p>
                                                            {entry.salary && (
                                                                <p className="text-sm text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                                                    <DollarSign size={13} /> KES {Number(entry.salary).toLocaleString()}/mo
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="text-sm text-slate-400 whitespace-nowrap">
                                                            {new Date(entry.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            {entry.end_date && ` — ${new Date(entry.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                                            {!entry.end_date && ' — Present'}
                                                        </span>
                                                    </div>
                                                    {entry.change_reason && (
                                                        <p className="text-sm text-slate-500 mt-2 italic">{entry.change_reason}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions Tab */}
                {activeTab === 'actions' && (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Promote */}
                            <button
                                onClick={() => { setFormData({}); setShowPromoteModal(true); }}
                                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors text-left"
                            >
                                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="text-emerald-600" size={24} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Promote Staff</p>
                                    <p className="text-sm text-slate-500">Change position, salary, and department</p>
                                </div>
                                <ChevronRight className="ml-auto text-slate-400" size={20} />
                            </button>

                            {/* Transfer */}
                            <button
                                onClick={() => setShowTransferModal(true)}
                                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors text-left"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Transfer Staff</p>
                                    <p className="text-sm text-slate-500">Move to different branch, region, or position</p>
                                </div>
                                <ChevronRight className="ml-auto text-slate-400" size={20} />
                            </button>

                            {/* Probation */}
                            <button
                                onClick={() => setShowProbationModal(true)}
                                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-amber-50 transition-colors text-left"
                            >
                                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Clock className="text-amber-600" size={24} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Probation Review</p>
                                    <p className="text-sm text-slate-500">Confirm, extend, or fail probation</p>
                                </div>
                                <ChevronRight className="ml-auto text-slate-400" size={20} />
                            </button>

                            {/* Activate/Deactivate */}
                            {staff.status === 'suspended' ? (
                                <button
                                    onClick={() => activateMutation.mutate()}
                                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors text-left"
                                >
                                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                        <CheckCircle className="text-emerald-600" size={24} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">Reactivate Staff</p>
                                        <p className="text-sm text-slate-500">Restore access and active status</p>
                                    </div>
                                    <ChevronRight className="ml-auto text-slate-400" size={20} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowDeactivateConfirm(true)}
                                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-red-50 transition-colors text-left"
                                >
                                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                        <XCircle className="text-red-600" size={24} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">Suspend Staff</p>
                                        <p className="text-sm text-slate-500">Temporarily disable access</p>
                                    </div>
                                    <ChevronRight className="ml-auto text-slate-400" size={20} />
                                </button>
                            )}

                            {/* Terminate */}
                            <button
                                onClick={() => setShowTerminateModal(true)}
                                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-red-50 transition-colors text-left"
                            >
                                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                    <AlertTriangle className="text-red-600" size={24} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Terminate Employment</p>
                                    <p className="text-sm text-slate-500">End employment relationship</p>
                                </div>
                                <ChevronRight className="ml-auto text-slate-400" size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Edit Staff Profile</h2>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
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
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => updateMutation.mutate(formData)} disabled={updateMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Document Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Upload Document</h2>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
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
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={handleUpload} disabled={!uploadFile || !uploadDocType || uploadDocMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">
                                {uploadDocMutation.isPending ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Document Dialog */}
            {rejectDocId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-red-600">Reject Document</h2>
                            <button onClick={() => { setRejectDocId(null); setRejectReason(''); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rejection Reason *</label>
                                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Provide a reason for rejection..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => { setRejectDocId(null); setRejectReason(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => rejectDocMutation.mutate({ docId: rejectDocId, reason: rejectReason })} disabled={!rejectReason || rejectDocMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                                {rejectDocMutation.isPending ? 'Rejecting...' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Contract Modal */}
            {showContractModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Create Contract</h2>
                            <button onClick={() => setShowContractModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
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
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => setShowContractModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => createContractMutation.mutate(contractFormData)} disabled={!contractFormData.start_date || !contractFormData.contract_type || createContractMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">
                                {createContractMutation.isPending ? 'Creating...' : 'Create Contract'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Transfer Staff</h2>
                            <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
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
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => transferMutation.mutate(formData)} disabled={transferMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">
                                {transferMutation.isPending ? 'Transferring...' : 'Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Probation Modal */}
            {showProbationModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Probation Review</h2>
                            <button onClick={() => setShowProbationModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
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
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => setShowProbationModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => probationMutation.mutate(formData)} disabled={!formData.status || probationMutation.isPending} className="px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50">
                                {probationMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terminate Modal */}
            {showTerminateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-red-600">Terminate Employment</h2>
                            <button onClick={() => setShowTerminateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                <p className="text-sm text-red-700">This action will permanently end employment for <strong>{staff.first_name} {staff.last_name}</strong> ({staff.employee_number}). This cannot be undone.</p>
                            </div>
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
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => setShowTerminateModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => terminateMutation.mutate(formData)} disabled={!formData.reason || !formData.termination_type || terminateMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                                {terminateMutation.isPending ? 'Terminating...' : 'Terminate Employment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
            {showPromoteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <TrendingUp size={20} className="text-emerald-600" /> Promote Staff
                            </h2>
                            <button onClick={() => setShowPromoteModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
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
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button onClick={() => setShowPromoteModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                            <button onClick={() => promoteMutation.mutate(formData)} disabled={!formData.new_position_id || promoteMutation.isPending} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50">
                                {promoteMutation.isPending ? 'Promoting...' : 'Promote'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
