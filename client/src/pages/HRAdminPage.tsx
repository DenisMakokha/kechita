import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    GraduationCap, AlertOctagon, Wallet, Package, Plus, X, Loader2,
    CheckCircle, AlertTriangle, Award, Briefcase, Edit, Trash2,
} from 'lucide-react';

type Tab = 'training' | 'disciplinary' | 'comp-benefits' | 'assets';
type TabProps = { showToast: (t: string, type?: 'success' | 'error') => void; qc: any };

interface Toast { text: string; type: 'success' | 'error' }

const HRAdminPage: React.FC = () => {
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>('training');
    const [toast, setToast] = useState<Toast | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type }); setTimeout(() => setToast(null), 3500);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Briefcase className="text-[#0066B3]" size={32} />HR Administration
                </h1>
                <p className="text-slate-500 mt-1">Training, discipline, compensation, and assets</p>
            </div>

            <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl overflow-x-auto">
                {[
                    { id: 'training' as Tab, label: 'Training & L&D', icon: GraduationCap },
                    { id: 'disciplinary' as Tab, label: 'Disciplinary', icon: AlertOctagon },
                    { id: 'comp-benefits' as Tab, label: 'Comp & Benefits', icon: Wallet },
                    { id: 'assets' as Tab, label: 'Assets', icon: Package },
                ].map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                tab === t.id ? 'border-[#0066B3] text-[#0066B3]' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}>
                            <Icon size={16} />{t.label}
                        </button>
                    );
                })}
            </div>

            {tab === 'training' && <TrainingTab showToast={showToast} qc={qc} />}
            {tab === 'disciplinary' && <DisciplinaryTab showToast={showToast} qc={qc} />}
            {tab === 'comp-benefits' && <CompBenefitsTab showToast={showToast} qc={qc} />}
            {tab === 'assets' && <AssetsTab showToast={showToast} qc={qc} />}

            {toast && (
                <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 z-[100] ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                    <span className="text-sm font-medium">{toast.text}</span>
                </div>
            )}
        </div>
    );
};

// ─────────── TRAINING TAB ───────────
const TrainingTab: React.FC<TabProps> = ({ showToast, qc }) => {
    const emptyProg = { code: '', title: '', type: 'technical', delivery_mode: 'in_person', duration_hours: 8, issues_certificate: true, is_mandatory: false, is_active: true };
    const emptySess = { name: '', program_id: '', start_date: '', end_date: '', location: '', max_participants: 20, facilitator: '' };
    const [showProgModal, setShowProgModal] = useState(false);
    const [editingProg, setEditingProg] = useState<any>(null);
    const [progForm, setProgForm] = useState<any>(emptyProg);
    const [showSessModal, setShowSessModal] = useState(false);
    const [sessForm, setSessForm] = useState<any>(emptySess);
    const [deleteProg, setDeleteProg] = useState<any>(null);

    const { data: stats } = useQuery<any>({ queryKey: ['training-stats'], queryFn: async () => (await api.get('/training/stats')).data });
    const { data: programs = [] } = useQuery<any[]>({ queryKey: ['training-programs'], queryFn: async () => (await api.get('/training/programs')).data });
    const { data: sessions = [] } = useQuery<any[]>({ queryKey: ['training-sessions'], queryFn: async () => (await api.get('/training/sessions')).data });
    const { data: expiring = [] } = useQuery<any[]>({ queryKey: ['training-expiring'], queryFn: async () => (await api.get('/training/certificates/expiring?days=60')).data });

    const openProgModal = (prog?: any) => { setEditingProg(prog || null); setProgForm(prog ? { code: prog.code, title: prog.title, type: prog.type, delivery_mode: prog.delivery_mode, duration_hours: prog.duration_hours, issues_certificate: prog.issues_certificate, is_mandatory: prog.is_mandatory, is_active: prog.is_active } : emptyProg); setShowProgModal(true); };

    const saveProg = useMutation({
        mutationFn: async () => editingProg ? (await api.patch(`/training/programs/${editingProg.id}`, progForm)).data : (await api.post('/training/programs', progForm)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-programs'] }); qc.invalidateQueries({ queryKey: ['training-stats'] }); setShowProgModal(false); showToast(editingProg ? 'Program updated' : 'Program created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const deleteProgMut = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/training/programs/${id}`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-programs'] }); qc.invalidateQueries({ queryKey: ['training-stats'] }); setDeleteProg(null); showToast('Program deleted'); },
        onError: (e: any) => { setDeleteProg(null); showToast(e?.response?.data?.message || 'Failed', 'error'); },
    });

    const createSess = useMutation({
        mutationFn: async () => (await api.post('/training/sessions', sessForm)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-sessions'] }); qc.invalidateQueries({ queryKey: ['training-stats'] }); setShowSessModal(false); setSessForm(emptySess); showToast('Session created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    return (
        <div className="space-y-5">
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Active Programs', value: stats.active_programs, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Upcoming Sessions', value: stats.upcoming_sessions, color: 'bg-purple-50 text-purple-700' },
                        { label: 'Total Completions', value: stats.total_completions, color: 'bg-emerald-50 text-emerald-700' },
                        { label: 'Expiring Soon (60d)', value: stats.expiring_certificates, color: 'bg-amber-50 text-amber-700' },
                    ].map((s, i) => (
                        <div key={i} className={`${s.color} rounded-xl p-4`}>
                            <p className="text-xs uppercase font-semibold opacity-70 mb-1">{s.label}</p>
                            <p className="text-2xl font-bold">{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Programs</h2>
                <button onClick={() => openProgModal()} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />New Program</button>
            </div>

            {programs.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><GraduationCap className="mx-auto text-slate-300 mb-2" size={40} /><p className="text-slate-500">No training programs yet</p></div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                            <tr><th className="px-4 py-2 text-left">Code</th><th className="px-4 py-2 text-left">Title</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Mode</th><th className="px-4 py-2 text-right">Hrs</th><th className="px-4 py-2 text-center">Cert</th><th className="px-4 py-2 text-center">Req</th><th className="px-4 py-2"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {programs.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-mono text-xs">{p.code}</td>
                                    <td className="px-4 py-2 font-medium text-slate-900">{p.title}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{p.type?.replace('_', ' ')}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{p.delivery_mode?.replace('_', ' ')}</td>
                                    <td className="px-4 py-2 text-right">{p.duration_hours}h</td>
                                    <td className="px-4 py-2 text-center">{p.issues_certificate ? <Award size={14} className="inline text-amber-500" /> : '—'}</td>
                                    <td className="px-4 py-2 text-center">{p.is_mandatory ? <CheckCircle size={14} className="inline text-red-500" /> : '—'}</td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openProgModal(p)} className="p-1 hover:bg-slate-100 rounded text-slate-400" title="Edit"><Edit size={13} /></button>
                                            <button onClick={() => setDeleteProg(p)} className="p-1 hover:bg-red-50 rounded text-red-400" title="Delete"><Trash2 size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex items-center justify-between mt-6">
                <h2 className="text-lg font-semibold text-slate-900">Sessions</h2>
                <button onClick={() => { setSessForm(emptySess); setShowSessModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />New Session</button>
            </div>

            {sessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><p className="text-slate-400 text-sm">No sessions scheduled yet</p></div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                            <tr><th className="px-4 py-2 text-left">Session</th><th className="px-4 py-2 text-left">Program</th><th className="px-4 py-2 text-left">Dates</th><th className="px-4 py-2 text-left">Location</th><th className="px-4 py-2 text-right">Cap</th><th className="px-4 py-2 text-center">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sessions.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium">{s.name}</td>
                                    <td className="px-4 py-2 text-xs">{s.program?.title}</td>
                                    <td className="px-4 py-2 text-xs">{s.start_date} → {s.end_date}</td>
                                    <td className="px-4 py-2 text-xs">{s.location || '—'}</td>
                                    <td className="px-4 py-2 text-right text-xs">{s.enrolled_count ?? 0}/{s.max_participants}</td>
                                    <td className="px-4 py-2 text-center"><span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 capitalize">{s.status?.replace('_', ' ')}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {expiring.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle size={16} />Expiring Certificates ({expiring.length})</h3>
                    <div className="mt-3 space-y-1 text-sm">
                        {expiring.slice(0, 5).map((e: any) => (
                            <p key={e.id} className="text-amber-700"><strong>{e.staff?.first_name} {e.staff?.last_name}</strong> · {e.session?.program?.title} · expires {e.certificate_expires_at}</p>
                        ))}
                    </div>
                </div>
            )}

            {/* Program modal */}
            {showProgModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-semibold">{editingProg ? 'Edit Program' : 'New Training Program'}</h2><button onClick={() => setShowProgModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button></div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Code</label><input type="text" value={progForm.code} onChange={(e) => setProgForm({ ...progForm, code: e.target.value.toUpperCase() })} placeholder="AML-2024" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" /></div>
                                <div><label className="block text-sm font-medium mb-1">Duration (h)</label><input type="number" value={progForm.duration_hours} onChange={(e) => setProgForm({ ...progForm, duration_hours: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Title</label><input type="text" value={progForm.title} onChange={(e) => setProgForm({ ...progForm, title: e.target.value })} placeholder="Anti-Money Laundering Compliance" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Type</label><select value={progForm.type} onChange={(e) => setProgForm({ ...progForm, type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="induction">Induction</option><option value="compliance">Compliance</option><option value="technical">Technical</option><option value="soft_skills">Soft Skills</option><option value="leadership">Leadership</option><option value="product">Product</option><option value="safety">Safety</option><option value="other">Other</option></select></div>
                                <div><label className="block text-sm font-medium mb-1">Mode</label><select value={progForm.delivery_mode} onChange={(e) => setProgForm({ ...progForm, delivery_mode: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="in_person">In-person</option><option value="virtual">Virtual</option><option value="hybrid">Hybrid</option><option value="self_paced">Self-paced</option></select></div>
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={progForm.issues_certificate} onChange={(e) => setProgForm({ ...progForm, issues_certificate: e.target.checked })} />Issues certificate</label>
                                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={progForm.is_mandatory} onChange={(e) => setProgForm({ ...progForm, is_mandatory: e.target.checked })} />Mandatory</label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowProgModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => saveProg.mutate()} disabled={!progForm.code || !progForm.title || saveProg.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">
                                {saveProg.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{editingProg ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Session modal */}
            {showSessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-semibold">New Training Session</h2><button onClick={() => setShowSessModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button></div>
                        <div className="p-6 space-y-3">
                            <div><label className="block text-sm font-medium mb-1">Session Name</label><input type="text" value={sessForm.name} onChange={(e) => setSessForm({ ...sessForm, name: e.target.value })} placeholder="Q1 AML Training" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium mb-1">Program</label><select value={sessForm.program_id} onChange={(e) => setSessForm({ ...sessForm, program_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="">Select program…</option>{programs.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={sessForm.start_date} onChange={(e) => setSessForm({ ...sessForm, start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={sessForm.end_date} onChange={(e) => setSessForm({ ...sessForm, end_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Location</label><input type="text" value={sessForm.location} onChange={(e) => setSessForm({ ...sessForm, location: e.target.value })} placeholder="Head Office / Online" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium mb-1">Max Participants</label><input type="number" value={sessForm.max_participants} onChange={(e) => setSessForm({ ...sessForm, max_participants: parseInt(e.target.value) || 20 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Facilitator</label><input type="text" value={sessForm.facilitator} onChange={(e) => setSessForm({ ...sessForm, facilitator: e.target.value })} placeholder="Facilitator name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowSessModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => createSess.mutate()} disabled={!sessForm.name || !sessForm.program_id || !sessForm.start_date || createSess.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">
                                {createSess.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteProg && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <h3 className="font-semibold text-slate-900 mb-2">Delete Program</h3>
                        <p className="text-sm text-slate-600 mb-4">Delete <strong>{deleteProg.title}</strong>? This cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteProg(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                            <button onClick={() => deleteProgMut.mutate(deleteProg.id)} disabled={deleteProgMut.isPending} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{deleteProgMut.isPending ? 'Deleting…' : 'Delete'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────── DISCIPLINARY TAB ───────────
const DisciplinaryTab: React.FC<TabProps> = ({ showToast, qc }) => {
    const emptyCase = { staff_id: '', type: 'misconduct', title: '', description: '', severity: 'minor', incident_date: '' };
    const [showModal, setShowModal] = useState(false);
    const [caseForm, setCaseForm] = useState<any>(emptyCase);
    const [selectedCase, setSelectedCase] = useState<any>(null);
    const { data: stats } = useQuery<any>({ queryKey: ['disc-stats'], queryFn: async () => (await api.get('/disciplinary/stats')).data });
    const { data: cases = [] } = useQuery<any[]>({ queryKey: ['disc-cases'], queryFn: async () => (await api.get('/disciplinary/cases')).data });
    const { data: staff = [] } = useQuery<any[]>({ queryKey: ['staff-list-disc'], queryFn: async () => (await api.get('/staff?limit=500')).data });

    const createCase = useMutation({
        mutationFn: async () => (await api.post('/disciplinary/cases', caseForm)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['disc-cases'] }); qc.invalidateQueries({ queryKey: ['disc-stats'] }); setShowModal(false); setCaseForm(emptyCase); showToast('Case opened'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const scheduleHearing = useMutation({
        mutationFn: async ({ id, hearing_date }: { id: string; hearing_date: string }) => (await api.post(`/disciplinary/cases/${id}/schedule-hearing`, { hearing_date })).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['disc-cases'] }); setSelectedCase(null); showToast('Hearing scheduled'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const recordOutcome = useMutation({
        mutationFn: async ({ id, outcome, sanction }: { id: string; outcome: string; sanction?: string }) => (await api.post(`/disciplinary/cases/${id}/outcome`, { outcome, sanction })).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['disc-cases'] }); qc.invalidateQueries({ queryKey: ['disc-stats'] }); setSelectedCase(null); showToast('Outcome recorded'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const closeCase = useMutation({
        mutationFn: async (id: string) => (await api.post(`/disciplinary/cases/${id}/close`, {})).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['disc-cases'] }); qc.invalidateQueries({ queryKey: ['disc-stats'] }); setSelectedCase(null); showToast('Case closed'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const staffList = Array.isArray(staff) ? staff : (staff as any)?.data ?? [];

    return (
        <div className="space-y-5">
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Open', value: stats.open, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Investigating', value: stats.under_investigation, color: 'bg-amber-50 text-amber-700' },
                        { label: 'Hearings Scheduled', value: stats.hearings_scheduled, color: 'bg-purple-50 text-purple-700' },
                        { label: 'Resolved', value: stats.resolved, color: 'bg-emerald-50 text-emerald-700' },
                    ].map((s, i) => (
                        <div key={i} className={`${s.color} rounded-xl p-4`}>
                            <p className="text-xs uppercase font-semibold opacity-70 mb-1">{s.label}</p>
                            <p className="text-2xl font-bold">{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Cases</h2>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />New Case</button>
            </div>

            {cases.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><AlertOctagon className="mx-auto text-slate-300 mb-2" size={40} /><p className="text-slate-500">No disciplinary cases on record</p></div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                            <tr><th className="px-4 py-2 text-left">Case #</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Staff</th><th className="px-4 py-2 text-left">Title</th><th className="px-4 py-2 text-left">Severity</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2 text-left">Outcome</th><th className="px-4 py-2"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cases.map((c: any) => (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-mono text-xs">{c.case_number}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{c.type}</td>
                                    <td className="px-4 py-2">{c.staff?.first_name} {c.staff?.last_name}</td>
                                    <td className="px-4 py-2 font-medium text-slate-900">{c.title}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{c.severity?.replace('_', ' ') || '—'}</td>
                                    <td className="px-4 py-2 text-center"><span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 capitalize">{c.status?.replace('_', ' ')}</span></td>
                                    <td className="px-4 py-2 text-xs capitalize">{c.outcome?.replace('_', ' ') || '—'}</td>
                                    <td className="px-4 py-2 text-right">
                                        {c.status !== 'closed' && (
                                            <button onClick={() => setSelectedCase(c)} className="p-1 hover:bg-slate-100 rounded text-slate-400 text-xs" title="Actions"><Edit size={13} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* New Case Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-semibold">Open Disciplinary Case</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button></div>
                        <div className="p-6 space-y-3">
                            <div><label className="block text-sm font-medium mb-1">Staff Member</label><select value={caseForm.staff_id} onChange={(e) => setCaseForm({ ...caseForm, staff_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="">Select staff…</option>{staffList.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.employee_number})</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Type</label><select value={caseForm.type} onChange={(e) => setCaseForm({ ...caseForm, type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="misconduct">Misconduct</option><option value="gross_misconduct">Gross Misconduct</option><option value="performance">Performance</option><option value="attendance">Attendance</option><option value="harassment">Harassment</option><option value="fraud">Fraud</option><option value="other">Other</option></select></div>
                                <div><label className="block text-sm font-medium mb-1">Severity</label><select value={caseForm.severity} onChange={(e) => setCaseForm({ ...caseForm, severity: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="serious">Serious</option><option value="gross">Gross</option></select></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Title</label><input type="text" value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} placeholder="Brief case title" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={caseForm.description} onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Describe the incident…" /></div>
                            <div><label className="block text-sm font-medium mb-1">Incident Date</label><input type="date" value={caseForm.incident_date} onChange={(e) => setCaseForm({ ...caseForm, incident_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => createCase.mutate()} disabled={!caseForm.staff_id || !caseForm.title || createCase.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">{createCase.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Open Case</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Case actions panel */}
            {selectedCase && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-900">Case {selectedCase.case_number}</h3><button onClick={() => setSelectedCase(null)} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button></div>
                        <p className="text-sm text-slate-600 mb-4">{selectedCase.title}</p>
                        <div className="space-y-2">
                            {selectedCase.status === 'open' && (
                                <button onClick={() => scheduleHearing.mutate({ id: selectedCase.id, hearing_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] })} disabled={scheduleHearing.isPending} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">Schedule Hearing (+7 days)</button>
                            )}
                            {['open', 'hearing_scheduled', 'under_investigation'].includes(selectedCase.status) && (
                                <button onClick={() => recordOutcome.mutate({ id: selectedCase.id, outcome: 'warning', sanction: 'verbal_warning' })} disabled={recordOutcome.isPending} className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">Record Outcome (Warning)</button>
                            )}
                            <button onClick={() => closeCase.mutate(selectedCase.id)} disabled={closeCase.isPending} className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">{closeCase.isPending ? 'Closing…' : 'Close Case'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────── COMP & BENEFITS TAB ───────────
const CompBenefitsTab: React.FC<TabProps> = ({ showToast, qc }) => {
    const emptyBand = { code: '', name: '', grade_level: '', min_salary: '', midpoint_salary: '', max_salary: '' };
    const emptyPlan = { code: '', name: '', type: 'medical', provider: '', annual_premium_employer: '', coverage_amount: '' };
    const [showBandModal, setShowBandModal] = useState(false);
    const [editingBand, setEditingBand] = useState<any>(null);
    const [bandForm, setBandForm] = useState<any>(emptyBand);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [planForm, setPlanForm] = useState<any>(emptyPlan);

    const { data: stats } = useQuery<any>({ queryKey: ['cb-stats'], queryFn: async () => (await api.get('/comp-benefits/stats')).data });
    const { data: bands = [] } = useQuery<any[]>({ queryKey: ['salary-bands'], queryFn: async () => (await api.get('/comp-benefits/bands')).data });
    const { data: plans = [] } = useQuery<any[]>({ queryKey: ['benefit-plans'], queryFn: async () => (await api.get('/comp-benefits/plans')).data });
    const fmt = (n: number | string) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(Number(n || 0));

    const openBandModal = (b?: any) => { setEditingBand(b || null); setBandForm(b ? { code: b.code, name: b.name, grade_level: b.grade_level, min_salary: b.min_salary, midpoint_salary: b.midpoint_salary, max_salary: b.max_salary } : emptyBand); setShowBandModal(true); };
    const openPlanModal = (p?: any) => { setEditingPlan(p || null); setPlanForm(p ? { code: p.code, name: p.name, type: p.type, provider: p.provider || '', annual_premium_employer: p.annual_premium_employer || '', coverage_amount: p.coverage_amount || '' } : emptyPlan); setShowPlanModal(true); };

    const saveBand = useMutation({
        mutationFn: async () => {
            const payload = { ...bandForm, min_salary: Number(bandForm.min_salary), midpoint_salary: Number(bandForm.midpoint_salary), max_salary: Number(bandForm.max_salary) };
            return editingBand ? (await api.patch(`/comp-benefits/bands/${editingBand.id}`, payload)).data : (await api.post('/comp-benefits/bands', payload)).data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-bands'] }); qc.invalidateQueries({ queryKey: ['cb-stats'] }); setShowBandModal(false); showToast(editingBand ? 'Band updated' : 'Band created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const deleteBand = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/comp-benefits/bands/${id}`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-bands'] }); qc.invalidateQueries({ queryKey: ['cb-stats'] }); showToast('Band deleted'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const savePlan = useMutation({
        mutationFn: async () => {
            const payload = { ...planForm, annual_premium_employer: planForm.annual_premium_employer ? Number(planForm.annual_premium_employer) : undefined, coverage_amount: planForm.coverage_amount ? Number(planForm.coverage_amount) : undefined };
            return editingPlan ? (await api.patch(`/comp-benefits/plans/${editingPlan.id}`, payload)).data : (await api.post('/comp-benefits/plans', payload)).data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['benefit-plans'] }); qc.invalidateQueries({ queryKey: ['cb-stats'] }); setShowPlanModal(false); showToast(editingPlan ? 'Plan updated' : 'Plan created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const deletePlan = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/comp-benefits/plans/${id}`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['benefit-plans'] }); qc.invalidateQueries({ queryKey: ['cb-stats'] }); showToast('Plan deleted'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    return (
        <div className="space-y-5">
            {stats && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 text-blue-700 rounded-xl p-4"><p className="text-xs uppercase font-semibold opacity-70 mb-1">Active Salary Bands</p><p className="text-2xl font-bold">{stats.active_salary_bands}</p></div>
                    <div className="bg-purple-50 text-purple-700 rounded-xl p-4"><p className="text-xs uppercase font-semibold opacity-70 mb-1">Active Plans</p><p className="text-2xl font-bold">{stats.active_plans}</p></div>
                    <div className="bg-emerald-50 text-emerald-700 rounded-xl p-4"><p className="text-xs uppercase font-semibold opacity-70 mb-1">Active Enrollments</p><p className="text-2xl font-bold">{stats.active_enrollments}</p></div>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between"><h3 className="font-semibold text-slate-900">Salary Bands</h3><button onClick={() => openBandModal()} className="flex items-center gap-1 px-2 py-1 bg-[#0066B3] text-white rounded text-xs font-medium"><Plus size={12} />Add</button></div>
                    {bands.length === 0 ? <p className="p-6 text-center text-slate-400 text-sm">No salary bands defined</p> : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase"><tr><th className="px-4 py-2 text-left">Grade</th><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-right">Min</th><th className="px-4 py-2 text-right">Max</th><th className="px-4 py-2"></th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {bands.map((b: any) => (
                                    <tr key={b.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-mono text-xs">{b.grade_level}</td>
                                        <td className="px-4 py-2 font-medium text-xs">{b.name}</td>
                                        <td className="px-4 py-2 text-right tabular-nums text-xs">{fmt(b.min_salary)}</td>
                                        <td className="px-4 py-2 text-right tabular-nums text-xs">{fmt(b.max_salary)}</td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openBandModal(b)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><Edit size={12} /></button>
                                                <button onClick={() => deleteBand.mutate(b.id)} disabled={deleteBand.isPending} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between"><h3 className="font-semibold text-slate-900">Benefit Plans</h3><button onClick={() => openPlanModal()} className="flex items-center gap-1 px-2 py-1 bg-[#0066B3] text-white rounded text-xs font-medium"><Plus size={12} />Add</button></div>
                    {plans.length === 0 ? <p className="p-6 text-center text-slate-400 text-sm">No benefit plans</p> : (
                        <ul className="divide-y divide-slate-100">
                            {plans.map((p: any) => (
                                <li key={p.id} className="px-5 py-3 hover:bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <div><p className="font-medium text-slate-900 text-sm">{p.name}</p><p className="text-xs text-slate-400 capitalize">{p.type} · {p.provider || 'Internal'}</p></div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right text-xs text-slate-500">
                                                {p.annual_premium_employer && <p>{fmt(p.annual_premium_employer)}/yr</p>}
                                            </div>
                                            <button onClick={() => openPlanModal(p)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><Edit size={12} /></button>
                                            <button onClick={() => deletePlan.mutate(p.id)} disabled={deletePlan.isPending} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Salary Band Modal */}
            {showBandModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-semibold">{editingBand ? 'Edit Salary Band' : 'New Salary Band'}</h2><button onClick={() => setShowBandModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button></div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Code</label><input type="text" value={bandForm.code} onChange={(e) => setBandForm({ ...bandForm, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" placeholder="BAND-A" /></div>
                                <div><label className="block text-sm font-medium mb-1">Grade</label><input type="text" value={bandForm.grade_level} onChange={(e) => setBandForm({ ...bandForm, grade_level: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="G1" /></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Name</label><input type="text" value={bandForm.name} onChange={(e) => setBandForm({ ...bandForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Junior Officer" /></div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Min (KES)</label><input type="number" value={bandForm.min_salary} onChange={(e) => setBandForm({ ...bandForm, min_salary: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium mb-1">Mid (KES)</label><input type="number" value={bandForm.midpoint_salary} onChange={(e) => setBandForm({ ...bandForm, midpoint_salary: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium mb-1">Max (KES)</label><input type="number" value={bandForm.max_salary} onChange={(e) => setBandForm({ ...bandForm, max_salary: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowBandModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                            <button onClick={() => saveBand.mutate()} disabled={!bandForm.code || !bandForm.name || saveBand.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50">{saveBand.isPending ? <Loader2 size={14} className="animate-spin" /> : null}{editingBand ? 'Update' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Benefit Plan Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-semibold">{editingPlan ? 'Edit Benefit Plan' : 'New Benefit Plan'}</h2><button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button></div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Code</label><input type="text" value={planForm.code} onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" /></div>
                                <div><label className="block text-sm font-medium mb-1">Type</label><select value={planForm.type} onChange={(e) => setPlanForm({ ...planForm, type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="medical">Medical</option><option value="life_insurance">Life Insurance</option><option value="pension">Pension</option><option value="dental">Dental</option><option value="vision">Vision</option><option value="gym">Gym</option><option value="other">Other</option></select></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Name</label><input type="text" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="NHIF Enhanced" /></div>
                            <div><label className="block text-sm font-medium mb-1">Provider</label><input type="text" value={planForm.provider} onChange={(e) => setPlanForm({ ...planForm, provider: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. AAR, Jubilee" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Employer Premium/yr</label><input type="number" value={planForm.annual_premium_employer} onChange={(e) => setPlanForm({ ...planForm, annual_premium_employer: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium mb-1">Coverage Amount</label><input type="number" value={planForm.coverage_amount} onChange={(e) => setPlanForm({ ...planForm, coverage_amount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                            <button onClick={() => savePlan.mutate()} disabled={!planForm.code || !planForm.name || savePlan.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50">{savePlan.isPending ? <Loader2 size={14} className="animate-spin" /> : null}{editingPlan ? 'Update' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────── ASSETS TAB ───────────
const AssetsTab: React.FC<TabProps> = ({ showToast, qc }) => {
    const emptyAsset = { asset_tag: '', name: '', category: 'laptop', brand: '', model: '', serial_number: '', purchase_date: '', purchase_cost: '' };
    const [showModal, setShowModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const [assetForm, setAssetForm] = useState<any>(emptyAsset);

    const { data: stats } = useQuery<any>({ queryKey: ['assets-stats'], queryFn: async () => (await api.get('/assets/stats')).data });
    const { data: assets = [] } = useQuery<any[]>({ queryKey: ['assets'], queryFn: async () => (await api.get('/assets')).data });

    const openModal = (a?: any) => { setEditingAsset(a || null); setAssetForm(a ? { asset_tag: a.asset_tag, name: a.name, category: a.category, brand: a.brand || '', model: a.model || '', serial_number: a.serial_number || '', purchase_date: a.purchase_date || '', purchase_cost: a.purchase_cost || '' } : emptyAsset); setShowModal(true); };

    const saveAsset = useMutation({
        mutationFn: async () => {
            const payload = { ...assetForm, purchase_cost: assetForm.purchase_cost ? Number(assetForm.purchase_cost) : undefined };
            return editingAsset ? (await api.patch(`/assets/${editingAsset.id}`, payload)).data : (await api.post('/assets', payload)).data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['assets-stats'] }); setShowModal(false); showToast(editingAsset ? 'Asset updated' : 'Asset registered'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const retireAsset = useMutation({
        mutationFn: async (id: string) => (await api.post(`/assets/${id}/retire`, {})).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['assets-stats'] }); showToast('Asset retired'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed', 'error'),
    });

    const assetList = Array.isArray(assets) ? assets : (assets as any)?.data ?? [];

    const statusStyle = (s: string) => s === 'available' ? 'bg-emerald-100 text-emerald-700' : s === 'assigned' ? 'bg-blue-100 text-blue-700' : s === 'retired' ? 'bg-slate-100 text-slate-500' : s === 'lost' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

    return (
        <div className="space-y-5">
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Total', value: stats.total, color: 'bg-slate-50 text-slate-700' },
                        { label: 'Available', value: stats.available, color: 'bg-emerald-50 text-emerald-700' },
                        { label: 'Assigned', value: stats.assigned, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Lost', value: stats.lost, color: 'bg-red-50 text-red-700' },
                        { label: 'Damaged', value: stats.damaged, color: 'bg-amber-50 text-amber-700' },
                    ].map((s, i) => (
                        <div key={i} className={`${s.color} rounded-xl p-4`}>
                            <p className="text-xs uppercase font-semibold opacity-70 mb-1">{s.label}</p>
                            <p className="text-2xl font-bold">{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Asset Register</h2>
                <button onClick={() => openModal()} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />Register Asset</button>
            </div>

            {assetList.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><Package className="mx-auto text-slate-300 mb-2" size={40} /><p className="text-slate-500">No assets registered yet</p></div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                            <tr><th className="px-4 py-2 text-left">Tag</th><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Brand/Model</th><th className="px-4 py-2 text-left">Serial</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {assetList.map((a: any) => (
                                <tr key={a.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-mono text-xs">{a.asset_tag}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{a.category?.replace('_', ' ')}</td>
                                    <td className="px-4 py-2 font-medium">{a.name}</td>
                                    <td className="px-4 py-2 text-xs text-slate-500">{a.brand || ''}{a.model ? ` / ${a.model}` : ''}</td>
                                    <td className="px-4 py-2 text-xs font-mono text-slate-500">{a.serial_number || '—'}</td>
                                    <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 text-xs rounded-full capitalize ${statusStyle(a.status)}`}>{a.status?.replace('_', ' ')}</span></td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openModal(a)} className="p-1 hover:bg-slate-100 rounded text-slate-400" title="Edit"><Edit size={13} /></button>
                                            {a.status !== 'retired' && <button onClick={() => retireAsset.mutate(a.id)} disabled={retireAsset.isPending} className="p-1 hover:bg-red-50 rounded text-red-400 text-xs font-medium" title="Retire">Retire</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Asset Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-semibold">{editingAsset ? 'Edit Asset' : 'Register New Asset'}</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button></div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Asset Tag</label><input type="text" value={assetForm.asset_tag} onChange={(e) => setAssetForm({ ...assetForm, asset_tag: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" placeholder="AST-0001" /></div>
                                <div><label className="block text-sm font-medium mb-1">Category</label><select value={assetForm.category} onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="laptop">Laptop</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option><option value="vehicle">Vehicle</option><option value="furniture">Furniture</option><option value="printer">Printer</option><option value="server">Server</option><option value="other">Other</option></select></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Name / Description</label><input type="text" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Dell Latitude 7420" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Brand</label><input type="text" value={assetForm.brand} onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium mb-1">Model</label><input type="text" value={assetForm.model} onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Serial Number</label><input type="text" value={assetForm.serial_number} onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" /></div>
                                <div><label className="block text-sm font-medium mb-1">Purchase Date</label><input type="date" value={assetForm.purchase_date} onChange={(e) => setAssetForm({ ...assetForm, purchase_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Purchase Cost (KES)</label><input type="number" value={assetForm.purchase_cost} onChange={(e) => setAssetForm({ ...assetForm, purchase_cost: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                            <button onClick={() => saveAsset.mutate()} disabled={!assetForm.asset_tag || !assetForm.name || saveAsset.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50">{saveAsset.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{editingAsset ? 'Update' : 'Register'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRAdminPage;
