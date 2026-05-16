import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    GraduationCap, AlertOctagon, Wallet, Package, Plus, X, Loader2,
    CheckCircle, AlertTriangle, Award, Briefcase, Edit, Trash2, Clock,
    Calendar, Users, Ban,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InputDialog } from '../components/ui/InputDialog';
import PerformancePage from './PerformancePage';

type Tab = 'training' | 'disciplinary' | 'comp-benefits' | 'assets' | 'attendance' | 'performance';
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
                <p className="text-slate-500 mt-1">Training, performance, attendance, discipline, compensation, and assets</p>
            </div>

            <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl overflow-x-auto">
                {[
                    { id: 'training' as Tab, label: 'Training & L&D', icon: GraduationCap },
                    { id: 'performance' as Tab, label: 'Performance', icon: Award },
                    { id: 'attendance' as Tab, label: 'Attendance', icon: Clock },
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
            {tab === 'performance' && <div className="-mx-6 -mt-2"><PerformancePage /></div>}
            {tab === 'attendance' && <AttendanceTab showToast={showToast} qc={qc} />}
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
                                            <button onClick={() => openProgModal(p)} className="p-1 hover:bg-slate-100 rounded text-slate-400" title="Edit" aria-label="Edit"><Edit size={13} /></button>
                                            <button onClick={() => setDeleteProg(p)} className="p-1 hover:bg-red-50 rounded text-red-400" title="Delete" aria-label="Delete"><Trash2 size={13} /></button>
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
                                            <button onClick={() => setSelectedCase(c)} className="p-1 hover:bg-slate-100 rounded text-slate-400 text-xs" title="Actions" aria-label="Actions"><Edit size={13} /></button>
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
                            <button onClick={() => createCase.mutate()} disabled={!caseForm.staff_id || !caseForm.title || !caseForm.incident_date || !caseForm.description || createCase.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">{createCase.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Open Case</button>
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

// ─────────── ROSTER PLANNER ───────────
interface RosterShift {
    id: string;
    code: string;
    name: string;
    start_time: string;
    end_time: string;
    is_night_shift: boolean;
}
interface RosterStaff {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    branch?: { id: string; name: string };
}
interface RosterEntry {
    id: string;
    staff_id: string;
    shift_id: string | null;
    date: string;
    is_day_off: boolean;
    shift?: RosterShift;
    staff?: RosterStaff;
}

const RosterPlanner: React.FC<{
    shifts: RosterShift[];
    qc: any;
    showToast: (text: string, type?: 'success' | 'error') => void;
    onOpenManualEntry: () => void;
}> = ({ shifts, qc, showToast, onOpenManualEntry }) => {
    // Start week on Monday
    const startOfWeek = (d: Date) => {
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day; // shift Sunday back to previous Monday
        const r = new Date(d);
        r.setDate(d.getDate() + diff);
        r.setHours(0, 0, 0, 0);
        return r;
    };
    const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
    const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
    const [branchId, setBranchId] = useState<string>('');

    const weekDays: Date[] = useMemo(() => Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
    }), [weekStart]);
    const from = fmtDate(weekDays[0]);
    const to = fmtDate(weekDays[6]);

    // Branches
    const { data: branches = [] } = useQuery<any[]>({
        queryKey: ['branches-for-roster'],
        queryFn: async () => (await api.get('/organization/branches')).data,
    });

    useEffect(() => {
        if (!branchId && branches.length > 0) setBranchId(branches[0].id);
    }, [branches, branchId]);

    // Staff for branch
    const { data: staffData = [] } = useQuery<any[]>({
        queryKey: ['staff-by-branch', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const res = await api.get(`/staff?branchId=${branchId}&limit=200`);
            return Array.isArray(res.data) ? res.data : (res.data?.data || []);
        },
        enabled: !!branchId,
    });

    // Existing roster entries for branch + week
    const { data: roster = [], isLoading: rosterLoading } = useQuery<RosterEntry[]>({
        queryKey: ['roster', branchId, from, to],
        queryFn: async () => (await api.get(`/attendance/roster/branch/${branchId}?from=${from}&to=${to}`)).data,
        enabled: !!branchId,
    });

    // Local pending edits keyed by `${staff_id}|${date}`
    const [pending, setPending] = useState<Record<string, { shift_id: string | null; is_day_off: boolean }>>({});
    const cellKey = (sid: string, date: string) => `${sid}|${date}`;
    const getCell = (sid: string, date: string): { shift_id: string | null; is_day_off: boolean } | null => {
        const key = cellKey(sid, date);
        if (pending[key] !== undefined) return pending[key];
        const r = roster.find(r => r.staff_id === sid && r.date === date);
        if (!r) return null;
        return { shift_id: r.shift_id, is_day_off: r.is_day_off };
    };
    const setCell = (sid: string, date: string, value: { shift_id: string | null; is_day_off: boolean } | null) => {
        const key = cellKey(sid, date);
        setPending(prev => {
            const next = { ...prev };
            if (value === null) {
                // mark as removed: server has no delete; we'll use day-off true with shift null as "cleared" approximation
                next[key] = { shift_id: null, is_day_off: false };
            } else {
                next[key] = value;
            }
            return next;
        });
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const assignments = Object.entries(pending)
                .filter(([, v]) => v.shift_id || v.is_day_off)
                .map(([key, v]) => {
                    const [staff_id, date] = key.split('|');
                    return { staff_id, shift_id: v.shift_id || (shifts[0]?.id ?? ''), date, is_day_off: v.is_day_off };
                });
            if (assignments.length === 0) return { created: 0, updated: 0 };
            return (await api.post('/attendance/roster/assign', { assignments })).data;
        },
        onSuccess: (res: any) => {
            qc.invalidateQueries({ queryKey: ['roster', branchId, from, to] });
            setPending({});
            showToast(`Roster saved (${res.created || 0} new, ${res.updated || 0} updated)`);
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to save roster', 'error'),
    });

    const shiftColor = (code?: string) => {
        if (!code) return 'bg-slate-100 text-slate-600';
        const colors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-cyan-100 text-cyan-700'];
        let h = 0; for (const c of code) h = (h * 31 + c.charCodeAt(0)) % colors.length;
        return colors[h];
    };

    const goPrevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
    const goNextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
    const goThisWeek = () => setWeekStart(startOfWeek(new Date()));

    const pendingCount = Object.keys(pending).length;

    if (shifts.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <Clock className="mx-auto text-slate-300 mb-3" size={48} />
                <p className="text-slate-500 font-medium">No shifts defined yet</p>
                <p className="text-sm text-slate-400 mt-1">Create at least one shift first in the Shifts tab to start planning the roster.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 mr-2">
                    <button onClick={goPrevWeek} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Previous week" title="Previous week">‹</button>
                    <button onClick={goThisWeek} className="px-3 py-1.5 text-sm font-medium hover:bg-slate-100 rounded-lg">This week</button>
                    <button onClick={goNextWeek} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Next week" title="Next week">›</button>
                </div>
                <p className="text-sm font-medium text-slate-900">
                    {weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium ml-auto">
                    <option value="">Select branch…</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <button onClick={onOpenManualEntry} className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium">
                    <Plus size={14} />Manual entry
                </button>
                <button
                    onClick={() => saveMutation.mutate()}
                    disabled={pendingCount === 0 || saveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299] disabled:opacity-50"
                >
                    {saveMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                    Save {pendingCount > 0 && `(${pendingCount})`}
                </button>
            </div>

            {/* Shift legend */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium mr-1">Shifts:</span>
                {shifts.map(s => (
                    <span key={s.id} className={`px-2 py-1 rounded-md font-medium ${shiftColor(s.code)}`}>
                        {s.code} <span className="opacity-60 ml-1 font-normal">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span>
                    </span>
                ))}
                <span className="px-2 py-1 rounded-md font-medium bg-slate-200 text-slate-600">OFF · day off</span>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {!branchId ? (
                    <div className="p-10 text-center text-slate-500"><Calendar className="mx-auto text-slate-300 mb-2" size={36} />Select a branch to start planning</div>
                ) : rosterLoading ? (
                    <div className="p-10 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} />Loading roster…</div>
                ) : staffData.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">No staff in this branch.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">Staff</th>
                                    {weekDays.map((d) => {
                                        const isToday = fmtDate(d) === fmtDate(new Date());
                                        return (
                                            <th key={d.toISOString()} className={`px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider ${isToday ? 'bg-blue-50 text-[#0066B3]' : 'text-slate-500'}`}>
                                                <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                                <div className="text-[11px] font-normal mt-0.5">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {staffData.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2 sticky left-0 bg-white">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-[#0066B3] flex items-center justify-center text-white text-[11px] font-medium shrink-0">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-900 truncate text-sm">{s.first_name} {s.last_name}</p>
                                                    <p className="text-[11px] text-slate-400 truncate font-mono">{s.employee_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {weekDays.map(d => {
                                            const date = fmtDate(d);
                                            const cell = getCell(s.id, date);
                                            const isPending = pending[cellKey(s.id, date)] !== undefined;
                                            const shift = cell?.shift_id ? shifts.find(sh => sh.id === cell.shift_id) : undefined;
                                            return (
                                                <td key={date} className="px-1 py-1 text-center">
                                                    <RosterCellSelect
                                                        shifts={shifts}
                                                        value={cell}
                                                        shift={shift}
                                                        shiftColor={shiftColor}
                                                        isPending={isPending}
                                                        onChange={(v) => setCell(s.id, date, v)}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {pendingCount > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertTriangle size={14} /> {pendingCount} unsaved change{pendingCount === 1 ? '' : 's'}. Click <strong>Save</strong> to apply.
                </div>
            )}
        </div>
    );
};

// Cell-level shift picker (small dropdown via native select for keyboard support)
const RosterCellSelect: React.FC<{
    shifts: RosterShift[];
    value: { shift_id: string | null; is_day_off: boolean } | null;
    shift: RosterShift | undefined;
    shiftColor: (code?: string) => string;
    isPending: boolean;
    onChange: (v: { shift_id: string | null; is_day_off: boolean } | null) => void;
}> = ({ shifts, value, shift, shiftColor, isPending, onChange }) => {
    const display = value?.is_day_off
        ? <span className="text-xs font-semibold">OFF</span>
        : shift
            ? <span className="text-xs font-bold">{shift.code}</span>
            : <span className="text-slate-300 text-xs">—</span>;
    const colorClass = value?.is_day_off
        ? 'bg-slate-200 text-slate-700'
        : shift
            ? shiftColor(shift.code)
            : 'bg-slate-50 text-slate-300 hover:bg-slate-100';

    return (
        <div className="relative">
            <select
                value={value?.is_day_off ? '__off__' : (value?.shift_id || '')}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') onChange(null);
                    else if (v === '__off__') onChange({ shift_id: null, is_day_off: true });
                    else onChange({ shift_id: v, is_day_off: false });
                }}
                className={`appearance-none cursor-pointer w-14 h-10 rounded-md text-center font-medium text-xs transition-colors ${colorClass} ${isPending ? 'ring-2 ring-amber-400' : ''}`}
                aria-label="Assign shift"
            >
                <option value="">—</option>
                {shifts.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
                <option value="__off__">OFF</option>
            </select>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">{display}</div>
        </div>
    );
};

// ─────────── ATTENDANCE TAB ───────────
const AttendanceTab: React.FC<TabProps> = ({ showToast, qc }) => {
    type SubTab = 'entries' | 'shifts' | 'roster';
    const [subTab, setSubTab] = useState<SubTab>('entries');

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    const [fromDate, setFromDate] = useState(firstOfMonth);
    const [toDate, setToDate] = useState(lastOfMonth);

    interface Shift {
        id: string;
        code: string;
        name: string;
        start_time: string;
        end_time: string;
        break_minutes: number;
        grace_minutes: number;
        is_night_shift: boolean;
        is_active: boolean;
    }

    interface TimeEntry {
        id: string;
        staff_id: string;
        date: string;
        clock_in_at: string;
        clock_out_at?: string;
        clock_in_method: string;
        status: string;
        worked_minutes: number;
        overtime_minutes: number;
        late_minutes: number;
        notes?: string;
        rejection_reason?: string;
        shift?: Shift;
        staff?: { id: string; first_name: string; last_name: string; employee_number: string; branch?: { name: string } };
    }

    // Queries
    const { data: allEntries = [] } = useQuery<TimeEntry[]>({
        queryKey: ['all-attendance', fromDate, toDate],
        queryFn: async () => (await api.get(`/attendance/entries?from=${fromDate}&to=${toDate}`)).data,
    });

    const { data: shifts = [] } = useQuery<Shift[]>({
        queryKey: ['shifts'],
        queryFn: async () => (await api.get('/attendance/shifts')).data,
    });

    // Mutations
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [deleteShiftTarget, setDeleteShiftTarget] = useState<Shift | null>(null);
    const emptyShiftForm = { code: '', name: '', start_time: '08:00', end_time: '17:00', break_minutes: 60, grace_minutes: 5, is_night_shift: false };
    const [shiftForm, setShiftForm] = useState(emptyShiftForm);
    const [approveEntryId, setApproveEntryId] = useState<string | null>(null);
    const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualForm, setManualForm] = useState({ staff_id: '', date: new Date().toISOString().split('T')[0], clock_in_at: '', clock_out_at: '', notes: '' });

    const openShiftModal = (shift?: Shift) => {
        if (shift) {
            setEditingShift(shift);
            setShiftForm({ code: shift.code, name: shift.name, start_time: shift.start_time.slice(0, 5), end_time: shift.end_time.slice(0, 5), break_minutes: shift.break_minutes, grace_minutes: shift.grace_minutes, is_night_shift: shift.is_night_shift });
        } else {
            setEditingShift(null);
            setShiftForm(emptyShiftForm);
        }
        setShowShiftModal(true);
    };

    const createShiftMutation = useMutation({
        mutationFn: async () => (await api.post('/attendance/shifts', shiftForm)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); setShowShiftModal(false); setShiftForm(emptyShiftForm); showToast('Shift created'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to create shift', 'error'),
    });

    const updateShiftMutation = useMutation({
        mutationFn: async () => (await api.patch(`/attendance/shifts/${editingShift!.id}`, shiftForm)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); setShowShiftModal(false); setEditingShift(null); setShiftForm(emptyShiftForm); showToast('Shift updated'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to update shift', 'error'),
    });

    const deleteShiftMutation = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/attendance/shifts/${id}`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); setDeleteShiftTarget(null); showToast('Shift deleted'); },
        onError: (e: any) => { setDeleteShiftTarget(null); showToast(e?.response?.data?.message || 'Failed to delete shift', 'error'); },
    });

    const manualEntryMutation = useMutation({
        mutationFn: async () => (await api.post('/attendance/entries/manual', manualForm)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-attendance'] }); setShowManualModal(false); setManualForm({ staff_id: '', date: new Date().toISOString().split('T')[0], clock_in_at: '', clock_out_at: '', notes: '' }); showToast('Manual entry added'); },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Failed to add entry', 'error'),
    });

    const approveEntryMutation = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/attendance/entries/${id}/approve`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-attendance'] }); setApproveEntryId(null); showToast('Entry approved'); },
        onError: (e: any) => { setApproveEntryId(null); showToast(e?.response?.data?.message || 'Failed', 'error'); },
    });

    const rejectEntryMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => (await api.patch(`/attendance/entries/${id}/reject`, { reason })).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-attendance'] }); setRejectEntryId(null); showToast('Entry rejected'); },
        onError: (e: any) => { setRejectEntryId(null); showToast(e?.response?.data?.message || 'Failed', 'error'); },
    });

    // Helpers
    const fmtTime = (d: Date | string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
    const fmtMins = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return h > 0 ? `${h}h ${mm}m` : `${mm}m`; };

    const statusBadge = (s: string) => {
        const map: Record<string, string> = {
            open: 'bg-blue-100 text-blue-700',
            complete: 'bg-emerald-100 text-emerald-700',
            approved: 'bg-purple-100 text-purple-700',
            rejected: 'bg-red-100 text-red-700',
            auto_closed: 'bg-amber-100 text-amber-700',
        };
        return map[s] || 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2">
                {[
                    { id: 'entries' as SubTab, label: 'All Entries', icon: Users },
                    { id: 'shifts' as SubTab, label: 'Shifts', icon: Clock },
                    { id: 'roster' as SubTab, label: 'Roster', icon: Calendar },
                ].map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id} onClick={() => setSubTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                subTab === t.id ? 'bg-[#0066B3] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}>
                            <Icon size={16} />{t.label}
                        </button>
                    );
                })}
            </div>

            {/* ENTRIES TAB */}
            {subTab === 'entries' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            <span className="text-slate-400">to</span>
                            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <p className="text-sm text-slate-600 ml-auto">{allEntries.length} entries</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Employee</th><th className="px-4 py-3 text-left">In</th><th className="px-4 py-3 text-left">Out</th><th className="px-4 py-3 text-right">Worked</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3"></th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allEntries.map(e => (
                                    <tr key={e.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-xs text-slate-600">{fmtDate(e.date)}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900">{e.staff?.first_name} {e.staff?.last_name}</p>
                                            <p className="text-xs text-slate-400">{e.staff?.employee_number} · {e.staff?.branch?.name || '—'}</p>
                                        </td>
                                        <td className="px-4 py-3">{fmtTime(e.clock_in_at)}{e.late_minutes > 0 && <span className="ml-1 text-xs text-amber-600">+{e.late_minutes}m</span>}</td>
                                        <td className="px-4 py-3">{e.clock_out_at ? fmtTime(e.clock_out_at) : '—'}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{fmtMins(e.worked_minutes)}</td>
                                        <td className="px-4 py-3 text-center"><span className={`px-2 py-1 text-xs rounded-full font-medium ${statusBadge(e.status)}`}>{e.status}</span></td>
                                        <td className="px-4 py-3 text-right">
                                            {(e.status === 'complete' || e.status === 'auto_closed') && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setApproveEntryId(e.id)} className="p-1.5 hover:bg-emerald-100 rounded text-emerald-600" title="Approve" aria-label="Approve"><CheckCircle size={16} /></button>
                                                    <button onClick={() => setRejectEntryId(e.id)} className="p-1.5 hover:bg-red-100 rounded text-red-600" title="Reject" aria-label="Reject"><Ban size={16} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {allEntries.length === 0 && <tr><td colSpan={7} className="text-center p-8 text-slate-400">No entries in this period</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SHIFTS TAB */}
            {subTab === 'shifts' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">{shifts.length} shift{shifts.length === 1 ? '' : 's'}</p>
                        <button onClick={() => openShiftModal()} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299]"><Plus size={16} />New Shift</button>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                <tr><th className="px-5 py-3 text-left">Code</th><th className="px-5 py-3 text-left">Name</th><th className="px-5 py-3 text-left">Hours</th><th className="px-5 py-3 text-center">Break</th><th className="px-5 py-3 text-center">Active</th><th className="px-5 py-3"></th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {shifts.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="px-5 py-3 font-mono text-xs">{s.code}</td>
                                        <td className="px-5 py-3 font-medium text-slate-900">{s.name}{s.is_night_shift && <span className="ml-2 text-xs text-purple-600">NIGHT</span>}</td>
                                        <td className="px-5 py-3 tabular-nums">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</td>
                                        <td className="px-5 py-3 text-center">{s.break_minutes}m</td>
                                        <td className="px-5 py-3 text-center">{s.is_active ? <CheckCircle size={16} className="inline text-emerald-500" /> : <X size={16} className="inline text-slate-300" />}</td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openShiftModal(s)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="Edit" aria-label="Edit"><Edit size={14} /></button>
                                                <button onClick={() => setDeleteShiftTarget(s)} className="p-1.5 hover:bg-red-50 rounded text-red-400" title="Delete" aria-label="Delete"><X size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {shifts.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-slate-400">No shifts yet. Create one to start scheduling.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ROSTER TAB */}
            {subTab === 'roster' && (
                <RosterPlanner
                    shifts={shifts}
                    qc={qc}
                    showToast={showToast}
                    onOpenManualEntry={() => setShowManualModal(true)}
                />
            )}

            {/* Manual Entry Modal */}
            {showManualModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">Manual Time Entry</h2>
                            <button onClick={() => setShowManualModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Staff ID</label><input type="text" value={manualForm.staff_id} onChange={(e) => setManualForm({ ...manualForm, staff_id: e.target.value })} placeholder="Enter staff ID" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Clock In</label><input type="time" value={manualForm.clock_in_at} onChange={(e) => setManualForm({ ...manualForm, clock_in_at: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Clock Out</label><input type="time" value={manualForm.clock_out_at} onChange={(e) => setManualForm({ ...manualForm, clock_out_at: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Notes</label><input type="text" value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} placeholder="Optional reason / note" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowManualModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => manualEntryMutation.mutate()} disabled={!manualForm.staff_id || !manualForm.date || !manualForm.clock_in_at || manualEntryMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">
                                {manualEntryMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Add Entry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shift Modal */}
            {showShiftModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">{editingShift ? 'Edit Shift' : 'New Shift'}</h2>
                            <button onClick={() => { setShowShiftModal(false); setEditingShift(null); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Code</label><input type="text" value={shiftForm.code} onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })} placeholder="e.g., MORNING" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input type="text" value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} placeholder="Morning Shift" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Start</label><input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">End</label><input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Break (min)</label><input type="number" value={shiftForm.break_minutes} onChange={(e) => setShiftForm({ ...shiftForm, break_minutes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Grace (min)</label><input type="number" value={shiftForm.grace_minutes} onChange={(e) => setShiftForm({ ...shiftForm, grace_minutes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={shiftForm.is_night_shift} onChange={(e) => setShiftForm({ ...shiftForm, is_night_shift: e.target.checked })} className="w-4 h-4 text-[#0066B3]" />
                                Night shift (crosses midnight)
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowShiftModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => editingShift ? updateShiftMutation.mutate() : createShiftMutation.mutate()} disabled={!shiftForm.code || !shiftForm.name || createShiftMutation.isPending || updateShiftMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">
                                {(createShiftMutation.isPending || updateShiftMutation.isPending) ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{editingShift ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete shift dialog */}
            <ConfirmDialog
                isOpen={!!deleteShiftTarget}
                title="Delete Shift"
                message={`Delete shift "${deleteShiftTarget?.name}"? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => { if (deleteShiftTarget) deleteShiftMutation.mutate(deleteShiftTarget.id); }}
                onCancel={() => setDeleteShiftTarget(null)}
                isLoading={deleteShiftMutation.isPending}
            />

            {/* Approve dialog */}
            <ConfirmDialog
                isOpen={!!approveEntryId}
                title="Approve Time Entry"
                message="Mark this attendance entry as approved? It will count toward the staff's monthly attendance."
                confirmLabel="Approve"
                onConfirm={() => { if (approveEntryId) approveEntryMutation.mutate(approveEntryId); }}
                onCancel={() => setApproveEntryId(null)}
                isLoading={approveEntryMutation.isPending}
            />

            {/* Reject dialog */}
            <InputDialog
                isOpen={!!rejectEntryId}
                title="Reject Time Entry"
                message="Provide a reason for rejecting this entry."
                inputLabel="Reason"
                placeholder="e.g., Outside scheduled hours, no GPS match"
                confirmLabel="Reject"
                required
                minLength={3}
                onConfirm={(reason) => { if (rejectEntryId) rejectEntryMutation.mutate({ id: rejectEntryId, reason }); }}
                onCancel={() => setRejectEntryId(null)}
                isLoading={rejectEntryMutation.isPending}
            />
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
                                            <button onClick={() => openModal(a)} className="p-1 hover:bg-slate-100 rounded text-slate-400" title="Edit" aria-label="Edit"><Edit size={13} /></button>
                                            {a.status !== 'retired' && <button onClick={() => retireAsset.mutate(a.id)} disabled={retireAsset.isPending} className="p-1 hover:bg-red-50 rounded text-red-400 text-xs font-medium" title="Retire" aria-label="Retire">Retire</button>}
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
