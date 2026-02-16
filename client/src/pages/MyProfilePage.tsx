import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    User, Mail, Phone, Building2, MapPin, Briefcase,
    FileText, Edit, Save, X, Download, AlertTriangle,
    CreditCard, History, LogOut
} from 'lucide-react';

type Tab = 'profile' | 'documents' | 'employment' | 'resignation';

interface MyProfile {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    status: string;
    phone?: string;
    alternate_phone?: string;
    personal_email?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    date_of_birth?: string;
    gender?: string;
    national_id?: string;
    hire_date?: string;
    confirmation_date?: string;
    probation_end_date?: string;
    employment_type?: string;
    photo_url?: string;
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
    user?: { id: string; email: string };
}

interface Document {
    id: string;
    original_name: string;
    document_type: { id: string; name: string; code: string };
    status: string;
    expiry_date?: string;
    issue_date?: string;
    created_at: string;
}

interface EmploymentHistory {
    id: string;
    position?: { name: string };
    branch?: { name: string };
    region?: { name: string };
    employment_type?: string;
    start_date: string;
    end_date?: string;
    change_reason?: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-700',
        onboarding: 'bg-blue-100 text-blue-700',
        probation: 'bg-amber-100 text-amber-700',
        suspended: 'bg-red-100 text-red-700',
        verified: 'bg-emerald-100 text-emerald-700',
        pending: 'bg-amber-100 text-amber-700',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
};

export const MyProfilePage: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [showResignModal, setShowResignModal] = useState(false);
    const [resignData, setResignData] = useState({ reason: '', last_working_date: '', notice_period_days: 30 });

    // Fetch my profile
    const { data: profile, isLoading } = useQuery<MyProfile>({
        queryKey: ['my-profile'],
        queryFn: async () => (await api.get('/staff/me/profile')).data,
    });

    // Fetch my documents
    const { data: documents } = useQuery<Document[]>({
        queryKey: ['my-documents'],
        queryFn: async () => (await api.get('/staff/me/documents')).data,
        enabled: activeTab === 'documents',
    });

    // Fetch my employment history
    const { data: employmentHistory } = useQuery<EmploymentHistory[]>({
        queryKey: ['my-employment-history'],
        queryFn: async () => (await api.get('/staff/me/employment-history')).data,
        enabled: activeTab === 'employment',
    });

    // Update profile mutation
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

    const updateProfileMutation = useMutation({
        mutationFn: async (data: any) => (await api.patch('/staff/me/profile', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-profile'] });
            setIsEditing(false);
            showToast('Profile updated successfully');
        },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to update profile', 'error'),
    });

    // Submit resignation mutation
    const resignMutation = useMutation({
        mutationFn: async (data: any) => (await api.post('/staff/me/resign', data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-profile'] });
            setShowResignModal(false);
            setResignData({ reason: '', last_working_date: '', notice_period_days: 30 });
            showToast('Resignation submitted');
        },
        onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to submit resignation', 'error'),
    });

    const startEditing = () => {
        setFormData({
            phone: profile?.phone || '',
            alternate_phone: profile?.alternate_phone || '',
            personal_email: profile?.personal_email || '',
            address: profile?.address || '',
            city: profile?.city || '',
            postal_code: profile?.postal_code || '',
            emergency_contact_name: profile?.emergency_contact_name || '',
            emergency_contact_phone: profile?.emergency_contact_phone || '',
            emergency_contact_relationship: profile?.emergency_contact_relationship || '',
            bank_name: profile?.bank_name || '',
            bank_branch: profile?.bank_branch || '',
            bank_account_number: profile?.bank_account_number || '',
            bank_account_name: profile?.bank_account_name || '',
        });
        setIsEditing(true);
    };

    const saveProfile = () => {
        updateProfileMutation.mutate(formData);
    };

    const submitResignation = () => {
        if (!resignData.reason || !resignData.last_working_date) return;
        resignMutation.mutate(resignData);
    };

    const tabs = [
        { key: 'profile' as Tab, label: 'My Profile', icon: User },
        { key: 'documents' as Tab, label: 'My Documents', icon: FileText },
        { key: 'employment' as Tab, label: 'Employment History', icon: History },
        { key: 'resignation' as Tab, label: 'Resignation', icon: LogOut },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-4 border-[#0066B3] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center py-24">
                <AlertTriangle className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500">Unable to load your profile</p>
            </div>
        );
    }

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                    <p className="text-slate-500">View and manage your personal information</p>
                </div>
                {activeTab === 'profile' && !isEditing && (
                    <button
                        onClick={startEditing}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599]"
                    >
                        <Edit size={18} />
                        Edit Profile
                    </button>
                )}
                {activeTab === 'profile' && isEditing && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
                        >
                            <X size={18} />
                            Cancel
                        </button>
                        <button
                            onClick={saveProfile}
                            disabled={updateProfileMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005599] disabled:opacity-50"
                        >
                            <Save size={18} />
                            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0066B3] to-[#00AEEF] flex items-center justify-center text-white text-2xl font-bold">
                        {profile.photo_url ? (
                            <img src={profile.photo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                            `${profile.first_name?.[0]}${profile.last_name?.[0]}`
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-slate-900">{profile.first_name} {profile.last_name}</h2>
                            <StatusBadge status={profile.status} />
                        </div>
                        <p className="text-slate-600 mb-4">{profile.position?.name || 'No position assigned'}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1.5"><Mail size={14} /> {profile.user?.email}</span>
                            {profile.phone && <span className="flex items-center gap-1.5"><Phone size={14} /> {profile.phone}</span>}
                            {profile.branch && <span className="flex items-center gap-1.5"><Building2 size={14} /> {profile.branch.name}</span>}
                            {profile.region && <span className="flex items-center gap-1.5"><MapPin size={14} /> {profile.region.name}</span>}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Employee Number</p>
                        <p className="text-lg font-mono font-bold text-slate-900">{profile.employee_number}</p>
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
                            onClick={() => { setActiveTab(tab.key); setIsEditing(false); }}
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
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Personal Information */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <User size={18} className="text-[#0066B3]" />
                                Personal Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Date of Birth</span>
                                    <span className="font-medium">{profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-GB') : '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Gender</span>
                                    <span className="font-medium capitalize">{profile.gender || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">National ID</span>
                                    <span className="font-medium">{profile.national_id || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Phone size={18} className="text-[#0066B3]" />
                                Contact Information
                            </h3>
                            <div className="space-y-3">
                                {isEditing ? (
                                    <>
                                        <div>
                                            <label className="block text-sm text-slate-500 mb-1">Phone</label>
                                            <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-500 mb-1">Alternate Phone</label>
                                            <input type="text" value={formData.alternate_phone} onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-500 mb-1">Personal Email</label>
                                            <input type="email" value={formData.personal_email} onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between py-2 border-b border-slate-100">
                                            <span className="text-slate-500">Phone</span>
                                            <span className="font-medium">{profile.phone || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-100">
                                            <span className="text-slate-500">Alternate Phone</span>
                                            <span className="font-medium">{profile.alternate_phone || '-'}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-100">
                                            <span className="text-slate-500">Personal Email</span>
                                            <span className="font-medium">{profile.personal_email || '-'}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <MapPin size={18} className="text-[#0066B3]" />
                                Address
                            </h3>
                            {isEditing ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Address</label>
                                        <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm text-slate-500 mb-1">City</label>
                                            <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-500 mb-1">Postal Code</label>
                                            <input type="text" value={formData.postal_code} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Address</span>
                                        <span className="font-medium">{profile.address || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">City</span>
                                        <span className="font-medium">{profile.city || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Postal Code</span>
                                        <span className="font-medium">{profile.postal_code || '-'}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Emergency Contact */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-[#0066B3]" />
                                Emergency Contact
                            </h3>
                            {isEditing ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Name</label>
                                        <input type="text" value={formData.emergency_contact_name} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Phone</label>
                                        <input type="text" value={formData.emergency_contact_phone} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Relationship</label>
                                        <input type="text" value={formData.emergency_contact_relationship} onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Name</span>
                                        <span className="font-medium">{profile.emergency_contact_name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Phone</span>
                                        <span className="font-medium">{profile.emergency_contact_phone || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Relationship</span>
                                        <span className="font-medium capitalize">{profile.emergency_contact_relationship || '-'}</span>
                                    </div>
                                </div>
                            )}
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
                                    <span className="font-medium">{profile.hire_date ? new Date(profile.hire_date).toLocaleDateString('en-GB') : '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Employment Type</span>
                                    <span className="font-medium capitalize">{profile.employment_type?.replace(/_/g, ' ') || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Department</span>
                                    <span className="font-medium">{profile.department?.name || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Manager</span>
                                    <span className="font-medium">{profile.manager ? `${profile.manager.first_name} ${profile.manager.last_name}` : '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bank Information */}
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <CreditCard size={18} className="text-[#0066B3]" />
                                Bank Information
                            </h3>
                            {isEditing ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm text-slate-500 mb-1">Bank Name</label>
                                            <input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-500 mb-1">Branch</label>
                                            <input type="text" value={formData.bank_branch} onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Account Number</label>
                                        <input type="text" value={formData.bank_account_number} onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Account Name</label>
                                        <input type="text" value={formData.bank_account_name} onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Bank Name</span>
                                        <span className="font-medium">{profile.bank_name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Branch</span>
                                        <span className="font-medium">{profile.bank_branch || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Account Number</span>
                                        <span className="font-medium">{profile.bank_account_number ? `****${profile.bank_account_number.slice(-4)}` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Account Name</span>
                                        <span className="font-medium">{profile.bank_account_name || '-'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-6">My Documents</h3>
                        {documents?.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500">No documents found</p>
                                <p className="text-sm text-slate-400">Contact HR to upload required documents</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents?.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                                                <FileText size={24} className="text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{doc.document_type?.name}</p>
                                                <p className="text-sm text-slate-500">{doc.original_name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <StatusBadge status={doc.status} />
                                                    {doc.expiry_date && (
                                                        <span className={`text-xs ${new Date(doc.expiry_date) < new Date() ? 'text-red-600' : 'text-slate-400'}`}>
                                                            Expires: {new Date(doc.expiry_date).toLocaleDateString('en-GB')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <a
                                            href={`/api/staff/documents/file/${doc.id}`}
                                            target="_blank"
                                            className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600"
                                        >
                                            <Download size={18} />
                                        </a>
                                    </div>
                                ))}
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
                                    {employmentHistory?.map((entry, idx) => (
                                        <div key={entry.id} className="relative pl-10">
                                            <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${idx === 0 ? 'bg-[#0066B3] border-[#0066B3]' : 'bg-white border-slate-300'}`} />
                                            <div className="bg-slate-50 rounded-xl p-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-slate-900">{entry.position?.name || 'Position change'}</p>
                                                        <p className="text-sm text-slate-500">
                                                            {[entry.branch?.name, entry.region?.name].filter(Boolean).join(' • ')}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm text-slate-400">
                                                        {new Date(entry.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                                        {entry.end_date && ` - ${new Date(entry.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}
                                                        {!entry.end_date && ' - Present'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Resignation Tab */}
                {activeTab === 'resignation' && (
                    <div>
                        <div className="max-w-xl">
                            <h3 className="font-semibold text-slate-900 mb-4">Submit Resignation</h3>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-medium text-amber-800">Important Notice</p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Submitting a resignation request will notify HR and your manager. 
                                            Please ensure you have discussed this with your manager before proceeding.
                                            Standard notice period is 30 days.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowResignModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                            >
                                <LogOut size={18} />
                                Submit Resignation
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Resignation Modal */}
            {showResignModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Submit Resignation</h2>
                            <button onClick={() => setShowResignModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                    This action will formally submit your resignation. Please fill in all details carefully.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Resignation *</label>
                                <textarea
                                    value={resignData.reason}
                                    onChange={(e) => setResignData({ ...resignData, reason: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                    placeholder="Please provide your reason for leaving..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Working Date *</label>
                                <input
                                    type="date"
                                    value={resignData.last_working_date}
                                    onChange={(e) => setResignData({ ...resignData, last_working_date: e.target.value })}
                                    min={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                                <p className="text-xs text-slate-500 mt-1">Minimum 30 days notice required</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notice Period (Days)</label>
                                <input
                                    type="number"
                                    value={resignData.notice_period_days}
                                    onChange={(e) => setResignData({ ...resignData, notice_period_days: parseInt(e.target.value) })}
                                    min={30}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                            <button
                                onClick={() => setShowResignModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitResignation}
                                disabled={!resignData.reason || !resignData.last_working_date || resignMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                                {resignMutation.isPending ? 'Submitting...' : 'Submit Resignation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyProfilePage;
