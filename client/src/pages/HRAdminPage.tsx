import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    GraduationCap, AlertOctagon, Wallet, Package, Plus, X, Loader2,
    CheckCircle, AlertTriangle, Award, Briefcase,
} from 'lucide-react';

type Tab = 'training' | 'disciplinary' | 'comp-benefits' | 'assets';

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
            {tab === 'disciplinary' && <DisciplinaryTab />}
            {tab === 'comp-benefits' && <CompBenefitsTab />}
            {tab === 'assets' && <AssetsTab />}

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
const TrainingTab: React.FC<{ showToast: (t: string, type?: 'success' | 'error') => void; qc: any }> = ({ showToast, qc }) => {
    const [showProgramModal, setShowProgramModal] = useState(false);
    const [programForm, setProgramForm] = useState<any>({ code: '', title: '', type: 'technical', delivery_mode: 'in_person', duration_hours: 8, issues_certificate: true, is_mandatory: false, is_active: true });

    const { data: stats } = useQuery<any>({ queryKey: ['training-stats'], queryFn: async () => (await api.get('/training/stats')).data });
    const { data: programs = [] } = useQuery<any[]>({ queryKey: ['training-programs'], queryFn: async () => (await api.get('/training/programs')).data });
    const { data: sessions = [] } = useQuery<any[]>({ queryKey: ['training-sessions'], queryFn: async () => (await api.get('/training/sessions')).data });
    const { data: expiring = [] } = useQuery<any[]>({ queryKey: ['training-expiring'], queryFn: async () => (await api.get('/training/certificates/expiring?days=60')).data });

    const createProgram = useMutation({
        mutationFn: async () => (await api.post('/training/programs', programForm)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-programs'] }); setShowProgramModal(false); showToast('Program created'); },
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
                <button onClick={() => setShowProgramModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[#0066B3] text-white rounded-lg text-sm font-medium hover:bg-[#005299]"><Plus size={14} />New Program</button>
            </div>

            {programs.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <GraduationCap className="mx-auto text-slate-300 mb-2" size={40} />
                    <p className="text-slate-500">No training programs yet</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                            <tr><th className="px-4 py-2 text-left">Code</th><th className="px-4 py-2 text-left">Title</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Mode</th><th className="px-4 py-2 text-right">Duration</th><th className="px-4 py-2 text-center">Cert</th><th className="px-4 py-2 text-center">Mandatory</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {programs.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-mono text-xs">{p.code}</td>
                                    <td className="px-4 py-2 font-medium text-slate-900">{p.title}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{p.type.replace('_', ' ')}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{p.delivery_mode.replace('_', ' ')}</td>
                                    <td className="px-4 py-2 text-right">{p.duration_hours}h</td>
                                    <td className="px-4 py-2 text-center">{p.issues_certificate ? <Award size={14} className="inline text-amber-500" /> : '—'}</td>
                                    <td className="px-4 py-2 text-center">{p.is_mandatory ? <CheckCircle size={14} className="inline text-red-500" /> : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {sessions.length > 0 && (
                <>
                    <h2 className="text-lg font-semibold text-slate-900 mt-6">Upcoming & Recent Sessions</h2>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                <tr><th className="px-4 py-2 text-left">Session</th><th className="px-4 py-2 text-left">Program</th><th className="px-4 py-2 text-left">Dates</th><th className="px-4 py-2 text-left">Location</th><th className="px-4 py-2 text-center">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sessions.slice(0, 10).map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium">{s.name}</td>
                                        <td className="px-4 py-2 text-xs">{s.program?.title}</td>
                                        <td className="px-4 py-2 text-xs">{s.start_date} → {s.end_date}</td>
                                        <td className="px-4 py-2 text-xs">{s.location || '—'}</td>
                                        <td className="px-4 py-2 text-center"><span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 capitalize">{s.status.replace('_', ' ')}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {expiring.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle size={16} />Expiring Certificates ({expiring.length})</h3>
                    <div className="mt-3 space-y-1 text-sm">
                        {expiring.slice(0, 5).map(e => (
                            <p key={e.id} className="text-amber-700">
                                <strong>{e.staff?.first_name} {e.staff?.last_name}</strong> · {e.session?.program?.title} · expires {e.certificate_expires_at}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {showProgramModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-semibold">New Training Program</h2><button onClick={() => setShowProgramModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button></div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Code</label><input type="text" value={programForm.code} onChange={(e) => setProgramForm({ ...programForm, code: e.target.value.toUpperCase() })} placeholder="AML-2024" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" /></div>
                                <div><label className="block text-sm font-medium mb-1">Duration (h)</label><input type="number" value={programForm.duration_hours} onChange={(e) => setProgramForm({ ...programForm, duration_hours: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Title</label><input type="text" value={programForm.title} onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })} placeholder="Anti-Money Laundering Compliance" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium mb-1">Type</label><select value={programForm.type} onChange={(e) => setProgramForm({ ...programForm, type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="induction">Induction</option><option value="compliance">Compliance</option><option value="technical">Technical</option><option value="soft_skills">Soft Skills</option><option value="leadership">Leadership</option><option value="product">Product</option><option value="safety">Safety</option><option value="other">Other</option></select></div>
                                <div><label className="block text-sm font-medium mb-1">Mode</label><select value={programForm.delivery_mode} onChange={(e) => setProgramForm({ ...programForm, delivery_mode: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="in_person">In-person</option><option value="virtual">Virtual</option><option value="hybrid">Hybrid</option><option value="self_paced">Self-paced</option></select></div>
                            </div>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={programForm.issues_certificate} onChange={(e) => setProgramForm({ ...programForm, issues_certificate: e.target.checked })} />Issues certificate</label>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={programForm.is_mandatory} onChange={(e) => setProgramForm({ ...programForm, is_mandatory: e.target.checked })} />Mandatory for target roles</label>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowProgramModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">Cancel</button>
                            <button onClick={() => createProgram.mutate()} disabled={!programForm.code || !programForm.title || createProgram.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium text-sm hover:bg-[#005299] disabled:opacity-50">
                                {createProgram.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────── DISCIPLINARY TAB ───────────
const DisciplinaryTab: React.FC<Record<string, never>> = () => {
    const { data: stats } = useQuery<any>({ queryKey: ['disc-stats'], queryFn: async () => (await api.get('/disciplinary/stats')).data });
    const { data: cases = [] } = useQuery<any[]>({ queryKey: ['disc-cases'], queryFn: async () => (await api.get('/disciplinary/cases')).data });

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

            <h2 className="text-lg font-semibold text-slate-900">Cases</h2>
            {cases.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <AlertOctagon className="mx-auto text-slate-300 mb-2" size={40} />
                    <p className="text-slate-500">No disciplinary cases on record</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                            <tr><th className="px-4 py-2 text-left">Case #</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Staff</th><th className="px-4 py-2 text-left">Title</th><th className="px-4 py-2 text-left">Severity</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2 text-left">Outcome</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cases.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-mono text-xs">{c.case_number}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{c.type}</td>
                                    <td className="px-4 py-2">{c.staff?.first_name} {c.staff?.last_name}</td>
                                    <td className="px-4 py-2 font-medium text-slate-900">{c.title}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{c.severity?.replace('_', ' ') || '—'}</td>
                                    <td className="px-4 py-2 text-center"><span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 capitalize">{c.status.replace('_', ' ')}</span></td>
                                    <td className="px-4 py-2 text-xs capitalize">{c.outcome?.replace('_', ' ') || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─────────── COMP & BENEFITS TAB ───────────
const CompBenefitsTab: React.FC<Record<string, never>> = () => {
    const { data: stats } = useQuery<any>({ queryKey: ['cb-stats'], queryFn: async () => (await api.get('/comp-benefits/stats')).data });
    const { data: bands = [] } = useQuery<any[]>({ queryKey: ['salary-bands'], queryFn: async () => (await api.get('/comp-benefits/bands')).data });
    const { data: plans = [] } = useQuery<any[]>({ queryKey: ['benefit-plans'], queryFn: async () => (await api.get('/comp-benefits/plans')).data });
    const fmt = (n: number | string) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(Number(n || 0));

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
                    <div className="px-5 py-3 border-b border-slate-200 bg-slate-50"><h3 className="font-semibold text-slate-900">Salary Bands</h3></div>
                    {bands.length === 0 ? <p className="p-6 text-center text-slate-400 text-sm">No salary bands defined</p> : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase"><tr><th className="px-4 py-2 text-left">Grade</th><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-right">Min</th><th className="px-4 py-2 text-right">Mid</th><th className="px-4 py-2 text-right">Max</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {bands.map(b => (
                                    <tr key={b.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-mono text-xs">{b.grade_level}</td>
                                        <td className="px-4 py-2 font-medium">{b.name} <span className="text-xs text-slate-400">({b.code})</span></td>
                                        <td className="px-4 py-2 text-right tabular-nums text-xs">{fmt(b.min_salary)}</td>
                                        <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold">{fmt(b.midpoint_salary)}</td>
                                        <td className="px-4 py-2 text-right tabular-nums text-xs">{fmt(b.max_salary)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 bg-slate-50"><h3 className="font-semibold text-slate-900">Benefit Plans</h3></div>
                    {plans.length === 0 ? <p className="p-6 text-center text-slate-400 text-sm">No benefit plans</p> : (
                        <ul className="divide-y divide-slate-100">
                            {plans.map(p => (
                                <li key={p.id} className="px-5 py-3 hover:bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">{p.name}</p>
                                            <p className="text-xs text-slate-400 capitalize">{p.type} · {p.provider || 'Internal'}</p>
                                        </div>
                                        <div className="text-right text-xs text-slate-500">
                                            {p.annual_premium_employer && <p>Employer: {fmt(p.annual_premium_employer)}/yr</p>}
                                            {p.coverage_amount && <p>Cover: {fmt(p.coverage_amount)}</p>}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────── ASSETS TAB ───────────
const AssetsTab: React.FC<Record<string, never>> = () => {
    const { data: stats } = useQuery<any>({ queryKey: ['assets-stats'], queryFn: async () => (await api.get('/assets/stats')).data });
    const { data: assets = [] } = useQuery<any[]>({ queryKey: ['assets'], queryFn: async () => (await api.get('/assets')).data });

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

            <h2 className="text-lg font-semibold text-slate-900">Asset Register</h2>
            {assets.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Package className="mx-auto text-slate-300 mb-2" size={40} />
                    <p className="text-slate-500">No assets registered yet</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                            <tr><th className="px-4 py-2 text-left">Tag</th><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Brand / Model</th><th className="px-4 py-2 text-left">Serial</th><th className="px-4 py-2 text-center">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {assets.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-mono text-xs">{a.asset_tag}</td>
                                    <td className="px-4 py-2 text-xs capitalize">{a.category.replace('_', ' ')}</td>
                                    <td className="px-4 py-2 font-medium">{a.name}</td>
                                    <td className="px-4 py-2 text-xs text-slate-500">{a.brand || ''} {a.model || ''}</td>
                                    <td className="px-4 py-2 text-xs font-mono text-slate-500">{a.serial_number || '—'}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                                            a.status === 'available' ? 'bg-emerald-100 text-emerald-700'
                                            : a.status === 'assigned' ? 'bg-blue-100 text-blue-700'
                                            : a.status === 'lost' ? 'bg-red-100 text-red-700'
                                            : a.status === 'damaged' ? 'bg-amber-100 text-amber-700'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}>{a.status.replace('_', ' ')}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default HRAdminPage;
