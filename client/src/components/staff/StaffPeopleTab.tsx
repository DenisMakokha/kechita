import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    Users, Heart, Wallet, ClipboardCheck, Plus, Trash2, Edit3, Loader2,
    Star, Save, CheckCircle, AlertTriangle, GraduationCap, Briefcase, 
    Wrench, Languages, Package, CreditCard
} from 'lucide-react';
import { Modal, ModalCancelButton, ModalPrimaryButton } from '../ui/Modal';

interface Props {
    staffId: string;
    canEdit: boolean;
    showToast: (text: string, type?: 'success' | 'error') => void;
}

type Section = 'next-of-kin' | 'dependents' | 'salary' | 'probation' | 'education' | 'experience' | 'skills' | 'languages' | 'assets' | 'bank-accounts';

const fmtKES = (n: number | string | null | undefined) => n == null ? '—' :
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(Number(n));

export const StaffPeopleTab: React.FC<Props> = ({ staffId, canEdit, showToast }) => {
    const qc = useQueryClient();
    const [section, setSection] = useState<Section>('next-of-kin');

    const tabs = [
        { id: 'next-of-kin' as Section, label: 'Next of Kin', icon: Heart },
        { id: 'dependents' as Section, label: 'Dependents', icon: Users },
        { id: 'education' as Section, label: 'Education', icon: GraduationCap },
        { id: 'experience' as Section, label: 'Experience', icon: Briefcase },
        { id: 'skills' as Section, label: 'Skills', icon: Wrench },
        { id: 'languages' as Section, label: 'Languages', icon: Languages },
        { id: 'assets' as Section, label: 'Assets', icon: Package },
        { id: 'bank-accounts' as Section, label: 'Bank Accounts', icon: CreditCard },
        { id: 'salary' as Section, label: 'Salary History', icon: Wallet },
        { id: 'probation' as Section, label: 'Probation', icon: ClipboardCheck },
    ];

    return (
        <div className="space-y-5">
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto -mb-px">
                {tabs.map(s => {
                    const I = s.icon;
                    return (
                        <button key={s.id} onClick={() => setSection(s.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
                                section === s.id ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}>
                            <I size={15} />{s.label}
                        </button>
                    );
                })}
            </div>

            {section === 'next-of-kin' && <NextOfKinSection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
            {section === 'dependents' && <DependentsSection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
            {section === 'education' && <EducationSection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
            {section === 'experience' && <ExperienceSection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
            {section === 'skills' && <SkillsSection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
            {section === 'languages' && <LanguagesSection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
            {section === 'assets' && <AssetsSection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
            {section === 'bank-accounts' && <BankAccountsSection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
            {section === 'salary' && <SalarySection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
            {section === 'probation' && <ProbationSection staffId={staffId} canEdit={canEdit} qc={qc} showToast={showToast} />}
        </div>
    );
};

// ─────────── Next of Kin ───────────
const NextOfKinSection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({ full_name: '', relationship: 'spouse', phone: '', email: '', national_id: '', address: '', is_primary: false, benefit_share_percent: '' });

    const { data: list = [], isLoading } = useQuery<any[]>({
        queryKey: ['nok', staffId],
        queryFn: async () => (await api.get(`/staff/${staffId}/next-of-kin`)).data,
    });

    const save = useMutation({
        mutationFn: async () => {
            const payload = { ...form, benefit_share_percent: form.benefit_share_percent ? Number(form.benefit_share_percent) : undefined };
            if (editing) return (await api.patch(`/staff-people/next-of-kin/${editing.id}`, payload)).data;
            return (await api.post(`/staff/${staffId}/next-of-kin`, payload)).data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['nok', staffId] }); setShowModal(false); setEditing(null); showToast(editing ? 'Next of kin updated' : 'Next of kin added'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const remove = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/staff-people/next-of-kin/${id}`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['nok', staffId] }); showToast('Removed'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const openNew = () => { setEditing(null); setForm({ full_name: '', relationship: 'spouse', phone: '', email: '', national_id: '', address: '', is_primary: list.length === 0, benefit_share_percent: '' }); setShowModal(true); };
    const openEdit = (n: any) => { setEditing(n); setForm({ ...n, benefit_share_percent: n.benefit_share_percent || '' }); setShowModal(true); };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">List people who should be contacted in emergencies and who receive benefit allocations.</p>
                {canEdit && <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Add</button>}
            </div>

            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> :
                list.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200">
                        <Heart className="mx-auto text-slate-300 mb-2" size={36} />
                        <p className="text-slate-500 text-sm">No next of kin recorded yet</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                        {list.map(n => (
                            <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-slate-900">{n.full_name}</h4>
                                            {n.is_primary && <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700 font-semibold uppercase flex items-center gap-0.5"><Star size={9} fill="currentColor" />Primary</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 capitalize">{n.relationship}</p>
                                    </div>
                                    {canEdit && (
                                        <div className="flex gap-1">
                                            <button onClick={() => openEdit(n)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit3 size={14} /></button>
                                            <button onClick={() => confirm('Remove this next of kin?') && remove.mutate(n.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 space-y-1 text-xs text-slate-600">
                                    {n.phone && <p>📞 {n.phone}</p>}
                                    {n.email && <p>✉️ {n.email}</p>}
                                    {n.national_id && <p>ID: {n.national_id}</p>}
                                    {n.address && <p>📍 {n.address}</p>}
                                    {n.benefit_share_percent && <p className="font-medium text-emerald-700">Benefit share: {n.benefit_share_percent}%</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`${editing ? 'Edit' : 'Add'} Next of Kin`}
                icon={Heart}
                tone="info"
                size="lg"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowModal(false)} />
                        <ModalPrimaryButton onClick={() => save.mutate()} disabled={!form.full_name} loading={save.isPending} tone="primary" icon={Save}>{editing ? 'Save' : 'Add'}</ModalPrimaryButton>
                    </>
                )}
            >
                {showModal && (
                    <div className="space-y-3">
                        <div><label className="block text-sm font-medium mb-1">Full Name *</label><input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-sm font-medium mb-1">Relationship</label><select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="spouse">Spouse</option><option value="parent">Parent</option><option value="child">Child</option><option value="sibling">Sibling</option><option value="friend">Friend</option><option value="other">Other</option></select></div>
                            <div><label className="block text-sm font-medium mb-1">Phone</label><input type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium mb-1">National ID</label><input type="text" value={form.national_id || ''} onChange={(e) => setForm({ ...form, national_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        </div>
                        <div><label className="block text-sm font-medium mb-1">Address</label><textarea value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        <div className="grid grid-cols-2 gap-3 items-end">
                            <div><label className="block text-sm font-medium mb-1">Benefit Share %</label><input type="number" min="0" max="100" value={form.benefit_share_percent} onChange={(e) => setForm({ ...form, benefit_share_percent: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <label className="flex items-center gap-2 text-sm pb-2.5"><input type="checkbox" checked={form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} />Mark as primary</label>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// ─────────── Dependents ───────────
const DependentsSection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({ full_name: '', relationship: 'child', date_of_birth: '', gender: '', national_id: '', medical_eligible: true, is_disabled: false });

    const { data: list = [], isLoading } = useQuery<any[]>({
        queryKey: ['dependents', staffId],
        queryFn: async () => (await api.get(`/staff/${staffId}/dependents`)).data,
    });

    const save = useMutation({
        mutationFn: async () => {
            if (editing) return (await api.patch(`/staff-people/dependents/${editing.id}`, form)).data;
            return (await api.post(`/staff/${staffId}/dependents`, form)).data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['dependents', staffId] }); setShowModal(false); setEditing(null); showToast(editing ? 'Dependent updated' : 'Dependent added'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const remove = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/staff-people/dependents/${id}`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['dependents', staffId] }); showToast('Removed'); },
    });

    const openNew = () => { setEditing(null); setForm({ full_name: '', relationship: 'child', date_of_birth: '', gender: '', national_id: '', medical_eligible: true, is_disabled: false }); setShowModal(true); };
    const openEdit = (d: any) => { setEditing(d); setForm({ ...d, date_of_birth: d.date_of_birth ? String(d.date_of_birth).slice(0, 10) : '' }); setShowModal(true); };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">Family members eligible for medical cover or insurance benefits.</p>
                {canEdit && <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Add</button>}
            </div>

            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> :
                list.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200">
                        <Users className="mx-auto text-slate-300 mb-2" size={36} />
                        <p className="text-slate-500 text-sm">No dependents listed</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                <tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Relationship</th><th className="px-4 py-2 text-left">DOB</th><th className="px-4 py-2 text-center">Medical</th><th className="px-4 py-2 text-center">Disabled</th><th className="px-4 py-2 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {list.map(d => (
                                    <tr key={d.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium text-slate-900">{d.full_name}</td>
                                        <td className="px-4 py-2 capitalize">{d.relationship}</td>
                                        <td className="px-4 py-2 text-xs">{d.date_of_birth || '—'}</td>
                                        <td className="px-4 py-2 text-center">{d.medical_eligible ? <CheckCircle size={14} className="inline text-emerald-500" /> : '—'}</td>
                                        <td className="px-4 py-2 text-center">{d.is_disabled ? <CheckCircle size={14} className="inline text-blue-500" /> : '—'}</td>
                                        <td className="px-4 py-2 text-right">
                                            {canEdit && (
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit3 size={13} /></button>
                                                    <button onClick={() => confirm('Remove this dependent?') && remove.mutate(d.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`${editing ? 'Edit' : 'Add'} Dependent`}
                icon={Users}
                tone="info"
                size="md"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowModal(false)} />
                        <ModalPrimaryButton onClick={() => save.mutate()} disabled={!form.full_name} loading={save.isPending} tone="primary" icon={Save}>{editing ? 'Save' : 'Add'}</ModalPrimaryButton>
                    </>
                )}
            >
                {showModal && (
                    <div className="space-y-3">
                        <div><label className="block text-sm font-medium mb-1">Full Name *</label><input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-sm font-medium mb-1">Relationship</label><select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="spouse">Spouse</option><option value="child">Child</option><option value="parent">Parent</option><option value="other">Other</option></select></div>
                            <div><label className="block text-sm font-medium mb-1">Gender</label><select value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-sm font-medium mb-1">Date of Birth</label><input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium mb-1">National ID</label><input type="text" value={form.national_id || ''} onChange={(e) => setForm({ ...form, national_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        </div>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.medical_eligible} onChange={(e) => setForm({ ...form, medical_eligible: e.target.checked })} />Eligible for medical cover</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_disabled} onChange={(e) => setForm({ ...form, is_disabled: e.target.checked })} />Disabled</label>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// ─────────── Salary History ───────────
const SalarySection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<any>({ new_salary: '', change_type: 'merit_increase', effective_date: new Date().toISOString().slice(0, 10), reason: '' });

    const { data: list = [], isLoading } = useQuery<any[]>({
        queryKey: ['salary-history', staffId],
        queryFn: async () => (await api.get(`/staff/${staffId}/salary-history`)).data,
    });

    const adjust = useMutation({
        mutationFn: async () => (await api.post(`/staff/${staffId}/salary-adjustment`, { ...form, new_salary: Number(form.new_salary) })).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-history', staffId] }); qc.invalidateQueries({ queryKey: ['staff', staffId] }); setShowModal(false); showToast('Salary adjusted'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">Track all salary changes — raises, adjustments, and promotions.</p>
                {canEdit && <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Adjust Salary</button>}
            </div>

            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> :
                list.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200">
                        <Wallet className="mx-auto text-slate-300 mb-2" size={36} />
                        <p className="text-slate-500 text-sm">No salary history yet</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                <tr><th className="px-4 py-2 text-left">Effective</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-right">Previous</th><th className="px-4 py-2 text-right">New</th><th className="px-4 py-2 text-right">Change</th><th className="px-4 py-2 text-left">Reason</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {list.map(h => (
                                    <tr key={h.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-xs">{h.effective_date}</td>
                                        <td className="px-4 py-2 text-xs capitalize">{h.change_type.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-2 text-right tabular-nums text-xs text-slate-500">{fmtKES(h.previous_salary)}</td>
                                        <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmtKES(h.new_salary)}</td>
                                        <td className={`px-4 py-2 text-right text-xs font-medium ${h.change_percent && h.change_percent > 0 ? 'text-emerald-600' : h.change_percent && h.change_percent < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                            {h.change_percent != null ? `${h.change_percent > 0 ? '+' : ''}${h.change_percent}%` : '—'}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-slate-500 max-w-[280px] truncate">{h.reason || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Adjust Salary"
                icon={Wallet}
                tone="info"
                size="md"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowModal(false)} />
                        <ModalPrimaryButton onClick={() => adjust.mutate()} disabled={!form.new_salary} loading={adjust.isPending} tone="primary" icon={Save}>Apply</ModalPrimaryButton>
                    </>
                )}
            >
                {showModal && (
                    <div className="space-y-3">
                        <div><label className="block text-sm font-medium mb-1">New Salary (KES) *</label><input type="number" value={form.new_salary} onChange={(e) => setForm({ ...form, new_salary: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        <div><label className="block text-sm font-medium mb-1">Change Type</label><select value={form.change_type} onChange={(e) => setForm({ ...form, change_type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="annual_increment">Annual Increment</option><option value="merit_increase">Merit Increase</option><option value="market_adjustment">Market Adjustment</option><option value="promotion">Promotion</option><option value="demotion">Demotion</option><option value="correction">Correction</option><option value="other">Other</option></select></div>
                        <div><label className="block text-sm font-medium mb-1">Effective Date</label><input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        <div><label className="block text-sm font-medium mb-1">Reason</label><textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// ─────────── Education ───────────
const EducationSection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({ institution: '', qualification: '', field_of_study: '', level: 'diploma', start_date: '', end_date: '', is_completed: true, grade: '', certificate_number: '', verifying_body: '' });

    const { data: list = [], isLoading } = useQuery<any[]>({ queryKey: ['education', staffId], queryFn: async () => (await api.get(`/staff/${staffId}/education`)).data });
    const save = useMutation({ mutationFn: async () => { if (editing) return (await api.patch(`/staff-people/education/${editing.id}`, form)).data; return (await api.post(`/staff/${staffId}/education`, form)).data; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['education', staffId] }); setShowModal(false); setEditing(null); showToast(editing ? 'Education updated' : 'Education added'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error') });
    const remove = useMutation({ mutationFn: async (id: string) => (await api.delete(`/staff-people/education/${id}`)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ['education', staffId] }); showToast('Removed'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error') });
    const openNew = () => { setEditing(null); setForm({ institution: '', qualification: '', field_of_study: '', level: 'diploma', start_date: '', end_date: '', is_completed: true, grade: '', certificate_number: '', verifying_body: '' }); setShowModal(true); };
    const openEdit = (item: any) => { setEditing(item); setForm({ ...item, start_date: item.start_date?.slice(0,10) || '', end_date: item.end_date?.slice(0,10) || '' }); setShowModal(true); };

    return (
        <div>
            <div className="flex items-center justify-between mb-4"><p className="text-sm text-slate-500">Academic qualifications and professional certifications.</p>{canEdit && <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Add</button>}</div>
            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> : list.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200"><GraduationCap className="mx-auto text-slate-300 mb-2" size={36} /><p className="text-slate-500 text-sm">No education records</p></div>
            ) : (
                <div className="grid md:grid-cols-2 gap-3">{list.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2"><h4 className="font-semibold text-slate-900">{item.qualification}</h4>{item.is_completed && <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 font-semibold">Completed</span>}</div>
                                <p className="text-sm text-[#0066B3] font-medium">{item.institution}</p>
                                <p className="text-xs text-slate-500 capitalize">{item.level} • {item.field_of_study}</p>
                            </div>
                            {canEdit && <div className="flex gap-1"><button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit3 size={14} /></button><button onClick={() => confirm('Remove?') && remove.mutate(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button></div>}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-slate-400">Period:</span> {item.start_date?.slice(0,7) || '?'} — {item.end_date?.slice(0,7) || 'Present'}</div>
                            {item.grade && <div><span className="text-slate-400">Grade:</span> <span className="font-semibold text-emerald-700">{item.grade}</span></div>}
                        </div>
                    </div>
                ))}</div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'Add'} Education`} icon={GraduationCap} tone="info" size="lg" footer={<><ModalCancelButton onClick={() => setShowModal(false)} /><ModalPrimaryButton onClick={() => save.mutate()} disabled={!form.institution || !form.qualification} loading={save.isPending} tone="primary" icon={Save}>{editing ? 'Save' : 'Add'}</ModalPrimaryButton></>}>
                {showModal && <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Institution *</label><input type="text" value={form.institution} onChange={e => setForm({...form, institution: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Qualification *</label><input type="text" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Field of Study</label><input type="text" value={form.field_of_study} onChange={e => setForm({...form, field_of_study: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Level</label><select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"><option value="high_school">High School</option><option value="diploma">Diploma</option><option value="bachelors">Bachelors</option><option value="masters">Masters</option><option value="phd">PhD</option><option value="professional">Professional Cert</option></select></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Grade/Score</label><input type="text" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Certificate No.</label><input type="text" value={form.certificate_number} onChange={e => setForm({...form, certificate_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div></div>
                    <div><label className="block text-sm font-medium mb-1">Verifying Body</label><input type="text" value={form.verifying_body} onChange={e => setForm({...form, verifying_body: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_completed} onChange={e => setForm({...form, is_completed: e.target.checked})} />Completed</label>
                </div>}
            </Modal>
        </div>
    );
};

// ─────────── Work Experience ───────────
const ExperienceSection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({ employer_name: '', job_title: '', employment_type: 'full_time', start_date: '', end_date: '', is_current: false, responsibilities: '', reference_name: '', reference_phone: '', reference_email: '' });

    const { data: list = [], isLoading } = useQuery<any[]>({ queryKey: ['experience', staffId], queryFn: async () => (await api.get(`/staff/${staffId}/work-experience`)).data });
    const save = useMutation({ mutationFn: async () => { if (editing) return (await api.patch(`/staff-people/work-experience/${editing.id}`, form)).data; return (await api.post(`/staff/${staffId}/work-experience`, form)).data; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['experience', staffId] }); setShowModal(false); setEditing(null); showToast(editing ? 'Experience updated' : 'Experience added'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error') });
    const remove = useMutation({ mutationFn: async (id: string) => (await api.delete(`/staff-people/work-experience/${id}`)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ['experience', staffId] }); showToast('Removed'); } });
    const openNew = () => { setEditing(null); setForm({ employer_name: '', job_title: '', employment_type: 'full_time', start_date: '', end_date: '', is_current: false, responsibilities: '', reference_name: '', reference_phone: '', reference_email: '' }); setShowModal(true); };
    const openEdit = (item: any) => { setEditing(item); setForm({ ...item, start_date: item.start_date?.slice(0,10) || '', end_date: item.end_date?.slice(0,10) || '' }); setShowModal(true); };

    return (
        <div>
            <div className="flex items-center justify-between mb-4"><p className="text-sm text-slate-500">Previous employment history and work experience.</p>{canEdit && <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Add</button>}</div>
            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> : list.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200"><Briefcase className="mx-auto text-slate-300 mb-2" size={36} /><p className="text-slate-500 text-sm">No work experience records</p></div>
            ) : (
                <div className="space-y-3">{list.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2"><h4 className="font-semibold text-slate-900">{item.job_title}</h4>{item.is_current && <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-700 font-semibold">Current</span>}</div>
                                <p className="text-sm text-[#0066B3] font-medium">{item.employer_name}</p>
                                <p className="text-xs text-slate-500">{item.employment_type.replace('_',' ')} • {item.start_date?.slice(0,7)} — {item.end_date?.slice(0,7) || 'Present'}</p>
                            </div>
                            {canEdit && <div className="flex gap-1"><button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit3 size={14} /></button><button onClick={() => confirm('Remove?') && remove.mutate(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button></div>}
                        </div>
                        {item.responsibilities && <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2 rounded">{item.responsibilities}</p>}
                        {(item.reference_name || item.reference_phone) && <div className="mt-3 pt-3 border-t border-slate-100 text-xs"><span className="text-slate-400">Ref:</span> {item.reference_name} {item.reference_phone && `• ${item.reference_phone}`}</div>}
                    </div>
                ))}</div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'Add'} Work Experience`} icon={Briefcase} tone="info" size="lg" footer={<><ModalCancelButton onClick={() => setShowModal(false)} /><ModalPrimaryButton onClick={() => save.mutate()} disabled={!form.employer_name || !form.job_title} loading={save.isPending} tone="primary" icon={Save}>{editing ? 'Save' : 'Add'}</ModalPrimaryButton></>}>
                {showModal && <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Employer *</label><input type="text" value={form.employer_name} onChange={e => setForm({...form, employer_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Job Title *</label><input type="text" value={form.job_title} onChange={e => setForm({...form, job_title: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Employment Type</label><select value={form.employment_type} onChange={e => setForm({...form, employment_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option><option value="internship">Internship</option></select></div><div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_current} onChange={e => setForm({...form, is_current: e.target.checked, end_date: e.target.checked ? '' : form.end_date})} />Current job</label></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>{!form.is_current && <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>}</div>
                    <div><label className="block text-sm font-medium mb-1">Responsibilities</label><textarea value={form.responsibilities} onChange={e => setForm({...form, responsibilities: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    <div className="grid grid-cols-3 gap-3"><div><label className="block text-sm font-medium mb-1">Reference Name</label><input type="text" value={form.reference_name} onChange={e => setForm({...form, reference_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Reference Phone</label><input type="text" value={form.reference_phone} onChange={e => setForm({...form, reference_phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Reference Email</label><input type="email" value={form.reference_email} onChange={e => setForm({...form, reference_email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                </div>}
            </Modal>
        </div>
    );
};

// ─────────── Skills ───────────
const SkillsSection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({ skill_name: '', category: 'technical', proficiency: 'intermediate', years_experience: '', certification_name: '', certification_number: '', issuing_body: '', expiry_date: '', is_certified: false });

    const { data: list = [], isLoading } = useQuery<any[]>({ queryKey: ['skills', staffId], queryFn: async () => (await api.get(`/staff/${staffId}/skills`)).data });
    const save = useMutation({ mutationFn: async () => { if (editing) return (await api.patch(`/staff-people/skills/${editing.id}`, form)).data; return (await api.post(`/staff/${staffId}/skills`, form)).data; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills', staffId] }); setShowModal(false); setEditing(null); showToast(editing ? 'Skill updated' : 'Skill added'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error') });
    const remove = useMutation({ mutationFn: async (id: string) => (await api.delete(`/staff-people/skills/${id}`)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills', staffId] }); showToast('Removed'); } });
    const openNew = () => { setEditing(null); setForm({ skill_name: '', category: 'technical', proficiency: 'intermediate', years_experience: '', certification_name: '', certification_number: '', issuing_body: '', expiry_date: '', is_certified: false }); setShowModal(true); };
    const openEdit = (item: any) => { setEditing(item); setForm({ ...item, years_experience: item.years_experience || '', expiry_date: item.expiry_date?.slice(0,10) || '' }); setShowModal(true); };

    const profColor = (p: string) => p === 'expert' ? 'bg-emerald-100 text-emerald-700' : p === 'advanced' ? 'bg-blue-100 text-blue-700' : p === 'intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';

    return (
        <div>
            <div className="flex items-center justify-between mb-4"><p className="text-sm text-slate-500">Professional skills, competencies, and certifications.</p>{canEdit && <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Add</button>}</div>
            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> : list.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200"><Wrench className="mx-auto text-slate-300 mb-2" size={36} /><p className="text-slate-500 text-sm">No skills recorded</p></div>
            ) : (
                <div className="grid md:grid-cols-2 gap-3">{list.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2"><h4 className="font-semibold text-slate-900">{item.skill_name}</h4>{item.is_certified && <CheckCircle size={14} className="text-emerald-500" />}</div>
                                <p className="text-xs text-slate-500 capitalize">{item.category}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded-full capitalize font-medium ${profColor(item.proficiency)}`}>{item.proficiency}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                            {item.years_experience && <span className="text-slate-600">{item.years_experience} years exp.</span>}
                            {item.certification_name && <span className="text-emerald-600 font-medium">{item.certification_name}</span>}
                        </div>
                        {canEdit && <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1"><button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit3 size={14} /></button><button onClick={() => confirm('Remove?') && remove.mutate(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button></div>}
                    </div>
                ))}</div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'Add'} Skill`} icon={Wrench} tone="info" size="lg" footer={<><ModalCancelButton onClick={() => setShowModal(false)} /><ModalPrimaryButton onClick={() => save.mutate()} disabled={!form.skill_name} loading={save.isPending} tone="primary" icon={Save}>{editing ? 'Save' : 'Add'}</ModalPrimaryButton></>}>
                {showModal && <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Skill Name *</label><input type="text" value={form.skill_name} onChange={e => setForm({...form, skill_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"><option value="technical">Technical</option><option value="soft_skill">Soft Skill</option><option value="language">Language</option><option value="management">Management</option><option value="other">Other</option></select></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Proficiency</label><select value={form.proficiency} onChange={e => setForm({...form, proficiency: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></div><div><label className="block text-sm font-medium mb-1">Years Experience</label><input type="number" value={form.years_experience} onChange={e => setForm({...form, years_experience: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_certified} onChange={e => setForm({...form, is_certified: e.target.checked})} />Certified</label>
                    {form.is_certified && <>
                        <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Certification Name</label><input type="text" value={form.certification_name} onChange={e => setForm({...form, certification_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Certification No.</label><input type="text" value={form.certification_number} onChange={e => setForm({...form, certification_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div></div>
                        <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Issuing Body</label><input type="text" value={form.issuing_body} onChange={e => setForm({...form, issuing_body: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Expiry Date</label><input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                    </>}
                </div>}
            </Modal>
        </div>
    );
};

// ─────────── Languages ───────────
const LanguagesSection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({ language: '', proficiency: 'intermediate', is_primary: false, can_read: true, can_write: true, can_speak: true });

    const { data: list = [], isLoading } = useQuery<any[]>({ queryKey: ['languages', staffId], queryFn: async () => (await api.get(`/staff/${staffId}/languages`)).data });
    const save = useMutation({ mutationFn: async () => { if (editing) return (await api.patch(`/staff-people/languages/${editing.id}`, form)).data; return (await api.post(`/staff/${staffId}/languages`, form)).data; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['languages', staffId] }); setShowModal(false); setEditing(null); showToast(editing ? 'Language updated' : 'Language added'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error') });
    const remove = useMutation({ mutationFn: async (id: string) => (await api.delete(`/staff-people/languages/${id}`)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ['languages', staffId] }); showToast('Removed'); } });
    const openNew = () => { setEditing(null); setForm({ language: '', proficiency: 'intermediate', is_primary: false, can_read: true, can_write: true, can_speak: true }); setShowModal(true); };
    const openEdit = (item: any) => { setEditing(item); setForm({ ...item }); setShowModal(true); };

    const profColor = (p: string) => p === 'native' ? 'bg-emerald-100 text-emerald-700' : p === 'fluent' ? 'bg-blue-100 text-blue-700' : p === 'intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';

    return (
        <div>
            <div className="flex items-center justify-between mb-4"><p className="text-sm text-slate-500">Languages spoken and proficiency levels.</p>{canEdit && <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Add</button>}</div>
            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> : list.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200"><Languages className="mx-auto text-slate-300 mb-2" size={36} /><p className="text-slate-500 text-sm">No languages recorded</p></div>
            ) : (
                <div className="grid md:grid-cols-2 gap-3">{list.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2"><h4 className="font-semibold text-slate-900">{item.language}</h4>{item.is_primary && <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-700 font-semibold">Primary</span>}</div>
                            <span className={`px-2 py-0.5 text-xs rounded-full capitalize font-medium ${profColor(item.proficiency)}`}>{item.proficiency}</span>
                        </div>
                        <div className="mt-3 flex gap-2 text-xs">
                            {item.can_read && <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">Read</span>}
                            {item.can_write && <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">Write</span>}
                            {item.can_speak && <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">Speak</span>}
                        </div>
                        {canEdit && <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1"><button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit3 size={14} /></button><button onClick={() => confirm('Remove?') && remove.mutate(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button></div>}
                    </div>
                ))}</div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'Add'} Language`} icon={Languages} tone="info" size="md" footer={<><ModalCancelButton onClick={() => setShowModal(false)} /><ModalPrimaryButton onClick={() => save.mutate()} disabled={!form.language} loading={save.isPending} tone="primary" icon={Save}>{editing ? 'Save' : 'Add'}</ModalPrimaryButton></>}>
                {showModal && <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Language *</label><input type="text" value={form.language} onChange={e => setForm({...form, language: e.target.value})} placeholder="e.g. English, Swahili" className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Proficiency</label><select value={form.proficiency} onChange={e => setForm({...form, proficiency: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"><option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="fluent">Fluent</option><option value="native">Native</option></select></div></div>
                    <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.can_read} onChange={e => setForm({...form, can_read: e.target.checked})} />Read</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.can_write} onChange={e => setForm({...form, can_write: e.target.checked})} />Write</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.can_speak} onChange={e => setForm({...form, can_speak: e.target.checked})} />Speak</label></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_primary} onChange={e => setForm({...form, is_primary: e.target.checked})} />Primary language</label>
                </div>}
            </Modal>
        </div>
    );
};

// ─────────── Assets ───────────
const AssetsSection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({ category: 'laptop', description: '', brand: '', model: '', serial_number: '', asset_tag: '', date_assigned: new Date().toISOString().slice(0,10), expected_return_date: '', condition_notes: '' });

    const { data: list = [], isLoading } = useQuery<any[]>({ queryKey: ['assets', staffId], queryFn: async () => (await api.get(`/staff/${staffId}/assets`)).data });
    const save = useMutation({ mutationFn: async () => { if (editing) return (await api.patch(`/staff-people/assets/${editing.id}`, form)).data; return (await api.post(`/staff/${staffId}/assets`, form)).data; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets', staffId] }); setShowModal(false); setEditing(null); showToast(editing ? 'Asset updated' : 'Asset assigned'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error') });
    const remove = useMutation({ mutationFn: async (id: string) => (await api.delete(`/staff-people/assets/${id}`)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets', staffId] }); showToast('Removed'); } });
    const returnAsset = useMutation({ mutationFn: async (id: string) => (await api.post(`/staff-people/assets/${id}/return`, {})).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets', staffId] }); showToast('Asset returned'); } });
    const openNew = () => { setEditing(null); setForm({ category: 'laptop', description: '', brand: '', model: '', serial_number: '', asset_tag: '', date_assigned: new Date().toISOString().slice(0,10), expected_return_date: '', condition_notes: '' }); setShowModal(true); };
    const openEdit = (item: any) => { setEditing(item); setForm({ ...item, date_assigned: item.date_assigned?.slice(0,10) || '', expected_return_date: item.expected_return_date?.slice(0,10) || '' }); setShowModal(true); };

    const catIcon = (c: string) => c === 'laptop' ? '💻' : c === 'phone' ? '📱' : c === 'vehicle' ? '🚗' : c === 'access_card' ? '🎫' : '📦';

    return (
        <div>
            <div className="flex items-center justify-between mb-4"><p className="text-sm text-slate-500">Company assets assigned to staff.</p>{canEdit && <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Assign</button>}</div>
            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> : list.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200"><Package className="mx-auto text-slate-300 mb-2" size={36} /><p className="text-slate-500 text-sm">No assets assigned</p></div>
            ) : (
                <div className="grid md:grid-cols-2 gap-3">{list.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2"><span className="text-2xl">{catIcon(item.category)}</span><div><h4 className="font-semibold text-slate-900">{item.description || item.category}</h4><p className="text-xs text-slate-500">{item.brand} {item.model}</p></div></div>
                            {item.date_returned ? <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600">Returned</span> : <span className="px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700">Active</span>}
                        </div>
                        <div className="mt-3 text-xs space-y-1">
                            {item.serial_number && <p><span className="text-slate-400">S/N:</span> <span className="font-mono">{item.serial_number}</span></p>}
                            {item.asset_tag && <p><span className="text-slate-400">Tag:</span> {item.asset_tag}</p>}
                            <p><span className="text-slate-400">Assigned:</span> {item.date_assigned}</p>
                        </div>
                        {canEdit && !item.date_returned && <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1"><button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit3 size={14} /></button><button onClick={() => returnAsset.mutate(item.id)} className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100">Return</button><button onClick={() => confirm('Remove?') && remove.mutate(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button></div>}
                    </div>
                ))}</div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'Assign'} Asset`} icon={Package} tone="info" size="lg" footer={<><ModalCancelButton onClick={() => setShowModal(false)} /><ModalPrimaryButton onClick={() => save.mutate()} disabled={!form.category} loading={save.isPending} tone="primary" icon={Save}>{editing ? 'Save' : 'Assign'}</ModalPrimaryButton></>}>
                {showModal && <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"><option value="laptop">Laptop</option><option value="phone">Phone</option><option value="tablet">Tablet</option><option value="vehicle">Vehicle</option><option value="access_card">Access Card</option><option value="equipment">Equipment</option><option value="other">Other</option></select></div><div><label className="block text-sm font-medium mb-1">Asset Tag</label><input type="text" value={form.asset_tag} onChange={e => setForm({...form, asset_tag: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                    <div><label className="block text-sm font-medium mb-1">Description</label><input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Dell Latitude 5520" className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Brand</label><input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Model</label><input type="text" value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Serial Number</label><input type="text" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div><div><label className="block text-sm font-medium mb-1">Date Assigned</label><input type="date" value={form.date_assigned} onChange={e => setForm({...form, date_assigned: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                    <div><label className="block text-sm font-medium mb-1">Expected Return Date</label><input type="date" value={form.expected_return_date} onChange={e => setForm({...form, expected_return_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm w-1/2" /></div>
                    <div><label className="block text-sm font-medium mb-1">Condition Notes</label><textarea value={form.condition_notes} onChange={e => setForm({...form, condition_notes: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                </div>}
            </Modal>
        </div>
    );
};

// ─────────── Bank Accounts ───────────
const BankAccountsSection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<any>({ bank_name: '', bank_branch: '', account_type: 'current', account_number: '', account_name: '', swift_code: '', iban: '', is_primary: false });

    const { data: list = [], isLoading } = useQuery<any[]>({ queryKey: ['bank-accounts', staffId], queryFn: async () => (await api.get(`/staff/${staffId}/bank-accounts`)).data });
    const save = useMutation({ mutationFn: async () => { if (editing) return (await api.patch(`/staff-people/bank-accounts/${editing.id}`, form)).data; return (await api.post(`/staff/${staffId}/bank-accounts`, form)).data; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts', staffId] }); setShowModal(false); setEditing(null); showToast(editing ? 'Account updated' : 'Account added'); }, onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error') });
    const remove = useMutation({ mutationFn: async (id: string) => (await api.delete(`/staff-people/bank-accounts/${id}`)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts', staffId] }); showToast('Removed'); } });
    const openNew = () => { setEditing(null); setForm({ bank_name: '', bank_branch: '', account_type: 'current', account_number: '', account_name: '', swift_code: '', iban: '', is_primary: list.length === 0 }); setShowModal(true); };
    const openEdit = (item: any) => { setEditing(item); setForm({ ...item }); setShowModal(true); };

    return (
        <div>
            <div className="flex items-center justify-between mb-4"><p className="text-sm text-slate-500">Bank accounts for salary and reimbursements.</p>{canEdit && <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Add</button>}</div>
            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> : list.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200"><CreditCard className="mx-auto text-slate-300 mb-2" size={36} /><p className="text-slate-500 text-sm">No bank accounts</p></div>
            ) : (
                <div className="grid md:grid-cols-2 gap-3">{list.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2"><h4 className="font-semibold text-slate-900">{item.bank_name}</h4>{item.is_primary && <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 font-semibold">Primary</span>}</div>
                                <p className="text-sm text-slate-600">{item.account_name}</p>
                                <p className="text-xs text-slate-500">{item.bank_branch} • {item.account_type}</p>
                            </div>
                            {canEdit && <div className="flex gap-1"><button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit3 size={14} /></button><button onClick={() => confirm('Remove?') && remove.mutate(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button></div>}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100"><p className="text-xs font-mono text-slate-700">{item.account_number}</p>{item.swift_code && <p className="text-xs text-slate-400">SWIFT: {item.swift_code}</p>}</div>
                    </div>
                ))}</div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'Add'} Bank Account`} icon={CreditCard} tone="info" size="lg" footer={<><ModalCancelButton onClick={() => setShowModal(false)} /><ModalPrimaryButton onClick={() => save.mutate()} disabled={!form.bank_name || !form.account_number} loading={save.isPending} tone="primary" icon={Save}>{editing ? 'Save' : 'Add'}</ModalPrimaryButton></>}>
                {showModal && <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Bank Name *</label><input type="text" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><div><label className="block text-sm font-medium mb-1">Branch</label><input type="text" value={form.bank_branch} onChange={e => setForm({...form, bank_branch: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Account Type</label><select value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white"><option value="current">Current</option><option value="savings">Savings</option><option value="fixed_deposit">Fixed Deposit</option></select></div><div><label className="block text-sm font-medium mb-1">Account Number *</label><input type="text" value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div></div>
                    <div><label className="block text-sm font-medium mb-1">Account Name</label><input type="text" value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">SWIFT Code</label><input type="text" value={form.swift_code} onChange={e => setForm({...form, swift_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div><div><label className="block text-sm font-medium mb-1">IBAN</label><input type="text" value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_primary} onChange={e => setForm({...form, is_primary: e.target.checked})} />Primary account (for salary)</label>
                </div>}
            </Modal>
        </div>
    );
};

// ─────────── Probation Reviews ───────────
const ProbationSection: React.FC<{ staffId: string; canEdit: boolean; qc: any; showToast: any }> = ({ staffId, canEdit, qc, showToast }) => {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<any>({ review_date: new Date().toISOString().slice(0, 10), overall_rating: 3, strengths: '', development_areas: '', manager_comments: '', recommendation: 'pending', extended_until: '' });

    const { data: list = [], isLoading } = useQuery<any[]>({
        queryKey: ['prob-reviews', staffId],
        queryFn: async () => (await api.get(`/staff/${staffId}/probation-reviews`)).data,
    });

    const create = useMutation({
        mutationFn: async () => {
            const payload = { ...form };
            if (!payload.extended_until) delete payload.extended_until;
            return (await api.post(`/staff/${staffId}/probation-reviews`, payload)).data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['prob-reviews', staffId] });
            qc.invalidateQueries({ queryKey: ['staff', staffId] });
            setShowModal(false); showToast('Probation review recorded');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const ack = useMutation({
        mutationFn: async (reviewId: string) => (await api.post(`/staff-people/probation-reviews/${reviewId}/acknowledge`, {})).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['prob-reviews', staffId] }); showToast('Review acknowledged'); },
    });

    const recColor = (r: string) =>
        r === 'confirm' ? 'bg-emerald-100 text-emerald-700'
        : r === 'extend' ? 'bg-amber-100 text-amber-700'
        : r === 'terminate' ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-600';

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">Formal probation evaluations with manager feedback and recommendation.</p>
                {canEdit && <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />New Review</button>}
            </div>

            {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#0066B3]" /></div> :
                list.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-10 text-center border border-dashed border-slate-200">
                        <ClipboardCheck className="mx-auto text-slate-300 mb-2" size={36} />
                        <p className="text-slate-500 text-sm">No probation reviews yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {list.map(r => (
                            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-start justify-between flex-wrap gap-3">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="font-semibold text-slate-900">Review · {r.review_date}</h4>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${recColor(r.recommendation)}`}>{r.recommendation}</span>
                                            {r.acknowledged_by_employee && <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><CheckCircle size={11} />Acknowledged</span>}
                                        </div>
                                        {r.reviewer && <p className="text-xs text-slate-500">Reviewer: {r.reviewer.first_name} {r.reviewer.last_name}</p>}
                                        {r.overall_rating && (
                                            <div className="flex items-center gap-1 mt-1">
                                                {[1,2,3,4,5].map(i => <Star key={i} size={13} className={i <= r.overall_rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />)}
                                                <span className="text-xs text-slate-500 ml-1">{r.overall_rating}/5</span>
                                            </div>
                                        )}
                                    </div>
                                    {!r.acknowledged_by_employee && (
                                        <button onClick={() => ack.mutate(r.id)} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg">Acknowledge</button>
                                    )}
                                </div>
                                {(r.strengths || r.development_areas || r.manager_comments) && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 grid md:grid-cols-3 gap-3 text-xs">
                                        {r.strengths && <div><p className="font-semibold text-slate-600 mb-1">Strengths</p><p className="text-slate-500">{r.strengths}</p></div>}
                                        {r.development_areas && <div><p className="font-semibold text-slate-600 mb-1">Development Areas</p><p className="text-slate-500">{r.development_areas}</p></div>}
                                        {r.manager_comments && <div><p className="font-semibold text-slate-600 mb-1">Manager Comments</p><p className="text-slate-500">{r.manager_comments}</p></div>}
                                    </div>
                                )}
                                {r.extended_until && <p className="mt-2 text-xs text-amber-700 font-medium">Probation extended until {r.extended_until}</p>}
                            </div>
                        ))}
                    </div>
                )
            }

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="New Probation Review"
                icon={ClipboardCheck}
                tone="warning"
                size="lg"
                footer={(
                    <>
                        <ModalCancelButton onClick={() => setShowModal(false)} />
                        <ModalPrimaryButton
                            onClick={() => create.mutate()}
                            disabled={form.recommendation === 'extend' && !form.extended_until}
                            loading={create.isPending}
                            tone="primary"
                            icon={Save}
                        >Save Review</ModalPrimaryButton>
                    </>
                )}
            >
                {showModal && (
                    <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Review Date</label><input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium mb-1">Overall Rating (1-5)</label><input type="number" min="1" max="5" value={form.overall_rating} onChange={(e) => setForm({ ...form, overall_rating: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Strengths</label><textarea value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium mb-1">Development Areas</label><textarea value={form.development_areas} onChange={(e) => setForm({ ...form, development_areas: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium mb-1">Manager Comments</label><textarea value={form.manager_comments} onChange={(e) => setForm({ ...form, manager_comments: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Recommendation</label>
                                <select value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                    <option value="pending">Pending — still under review</option>
                                    <option value="confirm">Confirm — pass probation</option>
                                    <option value="extend">Extend probation</option>
                                    <option value="terminate">Terminate employment</option>
                                </select>
                            </div>
                            {form.recommendation === 'extend' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                                    <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1 text-amber-900">Extend until *</label>
                                        <input type="date" value={form.extended_until} onChange={(e) => setForm({ ...form, extended_until: e.target.value })} className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white" />
                                    </div>
                                </div>
                            )}
                            {(form.recommendation === 'confirm' || form.recommendation === 'terminate') && (
                                <div className={`rounded-lg p-3 flex items-start gap-2 ${form.recommendation === 'confirm' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                                    <AlertTriangle className={`flex-shrink-0 mt-0.5 ${form.recommendation === 'confirm' ? 'text-emerald-600' : 'text-red-600'}`} size={16} />
                                    <p className="text-xs">
                                        {form.recommendation === 'confirm' ? 'This will mark the staff as confirmed and set status to ACTIVE.' : 'This will terminate the staff member immediately.'}
                                    </p>
                                </div>
                            )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StaffPeopleTab;
