import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Modal, ModalCancelButton, ModalPrimaryButton } from '../ui/Modal';
import {
    FileText, Plus, Save, CheckCircle2, Trash2, Edit, Eye, Loader2, History,
} from 'lucide-react';

/**
 * Job Description manager for a single Position.
 *
 * Shows the version history (newest first), lets HR:
 *   - create a new draft
 *   - edit the latest draft (only DRAFT status is editable)
 *   - activate a draft (retires the previously-active sibling)
 *   - preview as PDF (server-rendered via the document template engine)
 *   - delete a draft (approved/retired JDs are immutable for audit)
 *
 * Lists are entered as one-per-line textareas and serialised to JSON arrays
 * before sending to the API — same approach the recruitment JD UI uses.
 */

interface Props {
    positionId: string;
    positionName: string;
    onClose: () => void;
    showToast: (text: string, type?: 'success' | 'error') => void;
}

interface JdItem {
    id: string;
    position_id: string;
    version: number;
    is_active: boolean;
    status: 'draft' | 'approved' | 'retired';
    effective_from?: string;
    purpose?: string;
    notes?: string;
    responsibilities?: string[];
    qualifications?: string[];
    skills?: string[];
    kpis?: string[];
    reports_to?: string;
    working_conditions?: string;
    created_at: string;
    updated_at: string;
}

type Mode = 'list' | 'edit';

const linesToArray = (s: string): string[] =>
    s.split('\n').map(l => l.trim()).filter(Boolean);
const arrayToLines = (a?: string[]): string => (a || []).join('\n');

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    retired: 'bg-slate-50 text-slate-600 border-slate-200',
};

const JdManagerModal: React.FC<Props> = ({ positionId, positionName, onClose, showToast }) => {
    const qc = useQueryClient();
    const [mode, setMode] = useState<Mode>('list');
    const [editingId, setEditingId] = useState<string | null>(null); // null = creating new

    const [form, setForm] = useState({
        purpose: '',
        reports_to: '',
        effective_from: '',
        working_conditions: '',
        notes: '',
        responsibilities: '',
        qualifications: '',
        skills: '',
        kpis: '',
    });

    const { data: jds = [], isLoading } = useQuery<JdItem[]>({
        queryKey: ['jds', positionId],
        queryFn: () => api.get(`/job-descriptions/position/${positionId}`).then(r => r.data),
    });

    const startEdit = (jd: JdItem) => {
        setForm({
            purpose: jd.purpose || '',
            reports_to: jd.reports_to || '',
            effective_from: jd.effective_from ? jd.effective_from.slice(0, 10) : '',
            working_conditions: jd.working_conditions || '',
            notes: jd.notes || '',
            responsibilities: arrayToLines(jd.responsibilities),
            qualifications: arrayToLines(jd.qualifications),
            skills: arrayToLines(jd.skills),
            kpis: arrayToLines(jd.kpis),
        });
        setEditingId(jd.id);
        setMode('edit');
    };

    const startNew = () => {
        // Pre-fill from the most recent JD if one exists (saves typing for revisions)
        const latest = jds[0];
        if (latest) {
            setForm({
                purpose: latest.purpose || '',
                reports_to: latest.reports_to || '',
                effective_from: '',
                working_conditions: latest.working_conditions || '',
                notes: '',
                responsibilities: arrayToLines(latest.responsibilities),
                qualifications: arrayToLines(latest.qualifications),
                skills: arrayToLines(latest.skills),
                kpis: arrayToLines(latest.kpis),
            });
        } else {
            setForm({
                purpose: '', reports_to: '', effective_from: '', working_conditions: '',
                notes: '', responsibilities: '', qualifications: '', skills: '', kpis: '',
            });
        }
        setEditingId(null);
        setMode('edit');
    };

    const buildPayload = () => ({
        purpose: form.purpose || undefined,
        notes: form.notes || undefined,
        reports_to: form.reports_to || undefined,
        working_conditions: form.working_conditions || undefined,
        effective_from: form.effective_from || undefined,
        responsibilities: linesToArray(form.responsibilities),
        qualifications: linesToArray(form.qualifications),
        skills: linesToArray(form.skills),
        kpis: linesToArray(form.kpis),
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (editingId) {
                return (await api.patch(`/job-descriptions/${editingId}`, buildPayload())).data;
            }
            return (await api.post(`/job-descriptions/position/${positionId}`, buildPayload())).data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['jds', positionId] });
            showToast(editingId ? 'Draft saved' : 'New draft created');
            setMode('list');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Save failed', 'error'),
    });

    const activateMutation = useMutation({
        mutationFn: (id: string) => api.post(`/job-descriptions/${id}/activate`).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['jds', positionId] });
            showToast('Job description activated');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Activation failed', 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/job-descriptions/${id}`).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['jds', positionId] });
            showToast('Draft deleted');
        },
        onError: (e: any) => showToast(e?.response?.data?.message || 'Delete failed', 'error'),
    });

    const previewPdf = async (id: string) => {
        // Authed PDF preview — open inline in a new tab.
        // Build URL relative to the API base used by axios.
        const base = (api.defaults?.baseURL as string) || '/api';
        const url = `${base.replace(/\/$/, '')}/job-descriptions/${id}/pdf`;
        // For authed downloads we fetch then open via blob.
        try {
            const res = await api.get(`/job-descriptions/${id}/pdf`, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            // We deliberately don't revoke immediately so the tab can render.
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'PDF preview failed', 'error');
        }
        return url; // unused, but kept for parity
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Job Description — ${positionName}`}
            icon={FileText}
            size="xl"
            footer={mode === 'edit' ? (
                <>
                    <ModalCancelButton onClick={() => setMode('list')} />
                    <ModalPrimaryButton
                        onClick={() => saveMutation.mutate()}
                        loading={saveMutation.isPending}
                        icon={Save}
                    >
                        {editingId ? 'Save draft' : 'Create draft'}
                    </ModalPrimaryButton>
                </>
            ) : (
                <ModalCancelButton onClick={onClose}>Close</ModalCancelButton>
            )}
        >
            {mode === 'list' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600 flex items-center gap-2">
                            <History size={14} /> {jds.length} version{jds.length === 1 ? '' : 's'} on record
                        </div>
                        <button
                            onClick={startNew}
                            className="px-3 py-1.5 text-sm bg-[#0066B3] text-white rounded-lg hover:bg-[#005299] flex items-center gap-1.5"
                        >
                            <Plus size={14} />New draft
                        </button>
                    </div>

                    {isLoading && (
                        <div className="py-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 size={14} className="animate-spin" />Loading…
                        </div>
                    )}

                    {!isLoading && jds.length === 0 && (
                        <div className="py-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                            <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                            <div className="text-sm">No Job Description authored for this position yet.</div>
                            <div className="text-xs mt-1">Click <strong>New draft</strong> to create the first version.</div>
                        </div>
                    )}

                    {jds.map(jd => (
                        <div
                            key={jd.id}
                            className={`border rounded-lg p-3 ${jd.is_active ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-slate-900">v{jd.version}</span>
                                        <span className={`text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded border ${STATUS_STYLES[jd.status]}`}>
                                            {jd.status}
                                        </span>
                                        {jd.is_active && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-600 text-white">ACTIVE</span>
                                        )}
                                        {jd.effective_from && (
                                            <span className="text-[11px] text-slate-500">
                                                effective {new Date(jd.effective_from).toLocaleDateString('en-GB')}
                                            </span>
                                        )}
                                    </div>
                                    {jd.purpose && (
                                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{jd.purpose}</p>
                                    )}
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        {(jd.responsibilities?.length || 0)} responsibilities ·{' '}
                                        {(jd.qualifications?.length || 0)} qualifications ·{' '}
                                        {(jd.skills?.length || 0)} skills ·{' '}
                                        {(jd.kpis?.length || 0)} KPIs
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => previewPdf(jd.id)}
                                        title="Preview PDF"
                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700"
                                    >
                                        <Eye size={14} />
                                    </button>
                                    {jd.status === 'draft' && (
                                        <>
                                            <button
                                                onClick={() => startEdit(jd)}
                                                title="Edit draft"
                                                className="p-1.5 hover:bg-blue-50 rounded text-slate-500 hover:text-blue-600"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => activateMutation.mutate(jd.id)}
                                                title="Approve & activate"
                                                disabled={activateMutation.isPending}
                                                className="p-1.5 hover:bg-emerald-50 rounded text-slate-500 hover:text-emerald-600 disabled:opacity-50"
                                            >
                                                <CheckCircle2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => { if (confirm(`Delete draft v${jd.version}?`)) removeMutation.mutate(jd.id); }}
                                                title="Delete draft"
                                                className="p-1.5 hover:bg-rose-50 rounded text-slate-500 hover:text-rose-600"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {mode === 'edit' && (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Reports to" value={form.reports_to} onChange={v => setForm({ ...form, reports_to: v })} placeholder="e.g. Regional Manager" />
                        <Field type="date" label="Effective from" value={form.effective_from} onChange={v => setForm({ ...form, effective_from: v })} />
                    </div>

                    <TextField label="Job purpose" rows={2} value={form.purpose} onChange={v => setForm({ ...form, purpose: v })} placeholder="1–3 sentence summary of the role's purpose." />
                    <TextField label="Working conditions" rows={2} value={form.working_conditions} onChange={v => setForm({ ...form, working_conditions: v })} placeholder="e.g. Branch office; field visits as required." />

                    <ListField label="Responsibilities" hint="One per line — these will become bullets in the PDF" value={form.responsibilities} onChange={v => setForm({ ...form, responsibilities: v })} />
                    <ListField label="Qualifications" hint="One per line" value={form.qualifications} onChange={v => setForm({ ...form, qualifications: v })} />
                    <ListField label="Skills" hint="One per line" value={form.skills} onChange={v => setForm({ ...form, skills: v })} />
                    <ListField label="KPIs" hint="One per line — measurable outcomes" value={form.kpis} onChange={v => setForm({ ...form, kpis: v })} />

                    <TextField label="Internal notes" rows={2} value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Optional HR notes (not shown on the PDF)." />
                </div>
            )}
        </Modal>
    );
};

// ---- Form atoms ----
const Field: React.FC<{
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string;
}> = ({ label, value, onChange, placeholder, type }) => (
    <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <input
            type={type || 'text'}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
        />
    </div>
);

const TextField: React.FC<{
    label: string; value: string; onChange: (v: string) => void;
    rows?: number; placeholder?: string;
}> = ({ label, value, onChange, rows, placeholder }) => (
    <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={rows || 3}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
        />
    </div>
);

const ListField: React.FC<{
    label: string; value: string; onChange: (v: string) => void; hint?: string;
}> = ({ label, value, onChange, hint }) => (
    <div>
        <div className="flex items-baseline justify-between">
            <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
            {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
        </div>
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:border-transparent font-mono"
        />
    </div>
);

export default JdManagerModal;
