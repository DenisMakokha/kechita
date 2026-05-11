import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    Users, Heart, Wallet, ClipboardCheck, Plus, Trash2, Edit3, Loader2,
    Star, Save, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { Modal, ModalCancelButton, ModalPrimaryButton } from '../ui/Modal';

interface Props {
    staffId: string;
    canEdit: boolean;
    showToast: (text: string, type?: 'success' | 'error') => void;
}

type Section = 'next-of-kin' | 'dependents' | 'salary' | 'probation';

const fmtKES = (n: number | string | null | undefined) => n == null ? '—' :
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(Number(n));

export const StaffPeopleTab: React.FC<Props> = ({ staffId, canEdit, showToast }) => {
    const qc = useQueryClient();
    const [section, setSection] = useState<Section>('next-of-kin');

    return (
        <div className="space-y-5">
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto -mb-px">
                {[
                    { id: 'next-of-kin' as Section, label: 'Next of Kin', icon: Heart },
                    { id: 'dependents' as Section, label: 'Dependents', icon: Users },
                    { id: 'salary' as Section, label: 'Salary History', icon: Wallet },
                    { id: 'probation' as Section, label: 'Probation Reviews', icon: ClipboardCheck },
                ].map(s => {
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
