import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import {
    FileText, Plus, Save, X, Eye, CheckCircle, Trash2, Loader2,
    ChevronDown, ChevronRight, FileSignature, Briefcase, AlertTriangle,
} from 'lucide-react';

// ---------- Types ----------
type TemplateKind =
    | 'employment_contract' | 'offer_letter' | 'job_description'
    | 'salary_increment' | 'transfer' | 'warning'
    | 'certificate_of_service' | 'clearance' | 'custom';

type TemplateScope = 'global' | 'per_contract_type' | 'per_position';

interface DocumentTemplate {
    id: string;
    kind: TemplateKind;
    scope: TemplateScope;
    scope_value?: string | null;
    name: string;
    description?: string;
    version: number;
    is_active: boolean;
    body_html: string;
    header_html?: string;
    footer_html?: string;
    page_size: 'A4' | 'Letter';
    margins?: { top: number; right: number; bottom: number; left: number };
    created_at: string;
    updated_at: string;
}

interface VariableDef {
    key: string;
    label: string;
    group?: string;
    sample?: any;
}

const KIND_LABELS: Record<TemplateKind, string> = {
    employment_contract: 'Employment Contracts',
    offer_letter: 'Offer Letters',
    job_description: 'Job Descriptions',
    salary_increment: 'Salary Increment Letters',
    transfer: 'Transfer Letters',
    warning: 'Warning Letters',
    certificate_of_service: 'Certificate of Service',
    clearance: 'Clearance Forms',
    custom: 'Custom Documents',
};

const KIND_ORDER: TemplateKind[] = [
    'employment_contract', 'offer_letter', 'job_description',
    'salary_increment', 'transfer', 'warning',
    'certificate_of_service', 'clearance', 'custom',
];

// ---------- Toast ----------
interface Toast { text: string; type: 'success' | 'error' }

// ---------- Page ----------
const DocumentTemplatesPage: React.FC = () => {
    const qc = useQueryClient();
    const [toast, setToast] = useState<Toast | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    const { data: templates = [], isLoading } = useQuery<DocumentTemplate[]>({
        queryKey: ['document-templates'],
        queryFn: () => api.get('/document-templates').then(r => r.data),
    });

    const grouped = useMemo(() => {
        const byKind: Record<string, DocumentTemplate[]> = {};
        for (const t of templates) {
            if (!byKind[t.kind]) byKind[t.kind] = [];
            byKind[t.kind].push(t);
        }
        for (const k of Object.keys(byKind)) {
            byKind[k].sort((a, b) => b.version - a.version);
        }
        return byKind;
    }, [templates]);

    const selected = templates.find(t => t.id === selectedId) || null;

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <FileText className="text-[#0066B3]" size={32} />Document Templates
                </h1>
                <p className="text-slate-500 mt-1">Author and version company-wide documents: contracts, offer letters, JDs, warnings, transfers and more.</p>
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* LIST */}
                <aside className="col-span-12 lg:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <span className="font-semibold text-slate-700 text-sm">Templates</span>
                        <button
                            onClick={() => { setCreating(true); setSelectedId(null); }}
                            className="flex items-center gap-1 text-xs font-medium text-[#0066B3] hover:bg-blue-50 px-2 py-1 rounded"
                        >
                            <Plus size={14} />New
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {isLoading && (
                            <div className="p-6 text-center text-slate-500 text-sm flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Loading…</div>
                        )}
                        {!isLoading && KIND_ORDER.map(kind => {
                            const list = grouped[kind] || [];
                            if (list.length === 0) return null;
                            return (
                                <KindGroup
                                    key={kind}
                                    kind={kind}
                                    list={list}
                                    selectedId={selectedId}
                                    onSelect={(id) => { setCreating(false); setSelectedId(id); }}
                                />
                            );
                        })}
                    </div>
                </aside>

                {/* EDITOR */}
                <main className="col-span-12 lg:col-span-9">
                    {!selected && !creating && (
                        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500" style={{ minHeight: 600 }}>
                            <FileSignature size={42} className="mx-auto text-slate-300 mb-3" />
                            <div className="font-medium text-slate-700">Select a template to edit</div>
                            <div className="text-sm mt-1">or click <strong>New</strong> to create one.</div>
                        </div>
                    )}
                    {(selected || creating) && (
                        <TemplateEditor
                            key={selected?.id || 'new'}
                            initial={selected || undefined}
                            onSaved={(t) => {
                                qc.invalidateQueries({ queryKey: ['document-templates'] });
                                setSelectedId(t.id);
                                setCreating(false);
                                showToast(creating ? 'Template created' : 'Template saved');
                            }}
                            onActivated={() => {
                                qc.invalidateQueries({ queryKey: ['document-templates'] });
                                showToast('Template activated');
                            }}
                            onDeleted={() => {
                                qc.invalidateQueries({ queryKey: ['document-templates'] });
                                setSelectedId(null);
                                showToast('Template deleted');
                            }}
                            onError={(msg) => showToast(msg || 'Action failed', 'error')}
                            onCancelCreate={() => { setCreating(false); }}
                        />
                    )}
                </main>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {toast.text}
                </div>
            )}
        </div>
    );
};

export default DocumentTemplatesPage;

// =============================================================================
// KindGroup — collapsible list section grouped by template kind
// =============================================================================
const KindGroup: React.FC<{
    kind: TemplateKind;
    list: DocumentTemplate[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}> = ({ kind, list, selectedId, onSelect }) => {
    const [open, setOpen] = useState(true);
    return (
        <div className="border-b border-slate-100">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-slate-50"
            >
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{KIND_LABELS[kind]}</span>
                {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {open && list.map(t => (
                <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`w-full text-left px-4 py-2.5 border-l-2 transition-colors ${
                        selectedId === t.id ? 'bg-blue-50 border-[#0066B3]' : 'border-transparent hover:bg-slate-50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate">{t.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">v{t.version}{t.scope_value ? ` · ${t.scope_value}` : ''}</div>
                        </div>
                        {t.is_active && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">ACTIVE</span>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
};

// =============================================================================
// TemplateEditor — main edit pane with WYSIWYG body + variables sidebar
// =============================================================================
const TemplateEditor: React.FC<{
    initial?: DocumentTemplate;
    onSaved: (t: DocumentTemplate) => void;
    onActivated: () => void;
    onDeleted: () => void;
    onError: (msg?: string) => void;
    onCancelCreate: () => void;
}> = ({ initial, onSaved, onActivated, onDeleted, onError, onCancelCreate }) => {
    const isNew = !initial;
    const [form, setForm] = useState({
        kind: (initial?.kind || 'custom') as TemplateKind,
        scope: (initial?.scope || 'global') as TemplateScope,
        scope_value: initial?.scope_value || '',
        name: initial?.name || '',
        description: initial?.description || '',
        body_html: initial?.body_html || '',
        header_html: initial?.header_html || '',
        footer_html: initial?.footer_html || '',
        page_size: (initial?.page_size || 'A4') as 'A4' | 'Letter',
        margins: initial?.margins || { top: 18, right: 16, bottom: 18, left: 16 },
    });

    const [showHeader, setShowHeader] = useState(!!initial?.header_html);
    const [showFooter, setShowFooter] = useState(!!initial?.footer_html);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [previewing, setPreviewing] = useState(false);

    // Reset when switching template
    useEffect(() => {
        if (initial) {
            setForm({
                kind: initial.kind,
                scope: initial.scope,
                scope_value: initial.scope_value || '',
                name: initial.name,
                description: initial.description || '',
                body_html: initial.body_html,
                header_html: initial.header_html || '',
                footer_html: initial.footer_html || '',
                page_size: initial.page_size,
                margins: initial.margins || { top: 18, right: 16, bottom: 18, left: 16 },
            });
            setShowHeader(!!initial.header_html);
            setShowFooter(!!initial.footer_html);
            setPreviewHtml(null);
        }
    }, [initial?.id]);

    // Variables catalog for selected kind
    const { data: variables = [] } = useQuery<VariableDef[]>({
        queryKey: ['document-template-variables', form.kind],
        queryFn: () => api.get(`/document-templates/kinds/${form.kind}/variables`).then(r => r.data),
    });

    const groupedVars = useMemo(() => {
        const g: Record<string, VariableDef[]> = {};
        for (const v of variables) {
            const key = v.group || 'Other';
            if (!g[key]) g[key] = [];
            g[key].push(v);
        }
        return g;
    }, [variables]);

    const insertVariable = (key: string) => {
        const token = `{{${key}}}`;
        // Use execCommand insertText to drop the token at the current selection
        // inside the contentEditable surface. This relies on the editor being
        // currently focused; we attempt to refocus first.
        // eslint-disable-next-line deprecation/deprecation
        const ok = document.execCommand('insertText', false, token);
        if (!ok) {
            // Fallback: append at end of body
            setForm(f => ({ ...f, body_html: (f.body_html || '') + token }));
        }
    };

    const saveMutation = useMutation({
        mutationFn: async (): Promise<DocumentTemplate> => {
            const payload = {
                ...form,
                header_html: showHeader ? form.header_html : null,
                footer_html: showFooter ? form.footer_html : null,
                scope_value: form.scope === 'global' ? null : (form.scope_value || null),
            };
            if (isNew) {
                return (await api.post('/document-templates', payload)).data;
            }
            return (await api.patch(`/document-templates/${initial!.id}`, payload)).data;
        },
        onSuccess: onSaved,
        onError: (err: any) => onError(extractErr(err)),
    });

    const activateMutation = useMutation({
        mutationFn: async () => {
            if (!initial) return;
            return (await api.post(`/document-templates/${initial.id}/activate`)).data;
        },
        onSuccess: onActivated,
        onError: (err: any) => onError(extractErr(err)),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!initial) return;
            return (await api.delete(`/document-templates/${initial.id}`)).data;
        },
        onSuccess: onDeleted,
        onError: (err: any) => onError(extractErr(err)),
    });

    const previewMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/document-templates/preview', {
                body_html: form.body_html,
                header_html: showHeader ? form.header_html : undefined,
                footer_html: showFooter ? form.footer_html : undefined,
                kind: form.kind,
            });
            return res.data.html as string;
        },
        onMutate: () => setPreviewing(true),
        onSettled: () => setPreviewing(false),
        onSuccess: (html) => setPreviewHtml(html),
        onError: (err: any) => onError(extractErr(err)),
    });

    const previewPdf = () => {
        if (!initial) {
            onError('Save the template first to preview as PDF.');
            return;
        }
        window.open(`/api/document-templates/${initial.id}/preview.pdf`, '_blank');
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                    <Briefcase size={18} className="text-[#0066B3] shrink-0" />
                    <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{isNew ? 'New Template' : initial!.name}</div>
                        {!isNew && (
                            <div className="text-[11px] text-slate-500">
                                v{initial!.version} · {KIND_LABELS[initial!.kind]}{initial!.is_active ? ' · ACTIVE' : ''}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => previewMutation.mutate()}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1.5"
                    >
                        {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                        Preview HTML
                    </button>
                    <button
                        onClick={previewPdf}
                        disabled={isNew}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isNew ? 'Save first to preview as PDF' : 'Preview as PDF'}
                    >
                        <FileText size={14} />
                        Preview PDF
                    </button>
                    {!isNew && !initial!.is_active && (
                        <button
                            onClick={() => activateMutation.mutate()}
                            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1.5"
                        >
                            <CheckCircle size={14} />
                            Activate
                        </button>
                    )}
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-[#0066B3] text-white rounded hover:bg-[#005299] flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save
                    </button>
                    {isNew ? (
                        <button onClick={onCancelCreate} className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 rounded"><X size={16} /></button>
                    ) : (
                        !initial!.is_active && (
                            <button
                                onClick={() => { if (confirm(`Delete "${initial!.name}" (v${initial!.version})?`)) deleteMutation.mutate(); }}
                                className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-12 gap-4 p-5 flex-1 overflow-y-auto">
                {/* MAIN */}
                <div className="col-span-12 xl:col-span-9 space-y-3">
                    {/* Meta */}
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-7">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                            <input
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                                placeholder="e.g. Permanent Employment Contract"
                            />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Kind</label>
                            <select
                                value={form.kind}
                                onChange={e => setForm({ ...form, kind: e.target.value as TemplateKind })}
                                disabled={!isNew}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded disabled:bg-slate-50 disabled:text-slate-600"
                            >
                                {KIND_ORDER.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                            </select>
                        </div>
                        <div className="col-span-6 md:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Page</label>
                            <select
                                value={form.page_size}
                                onChange={e => setForm({ ...form, page_size: e.target.value as 'A4' | 'Letter' })}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                            >
                                <option value="A4">A4</option>
                                <option value="Letter">Letter</option>
                            </select>
                        </div>
                    </div>

                    {/* Scope */}
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-6 md:col-span-4">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Scope</label>
                            <select
                                value={form.scope}
                                onChange={e => setForm({ ...form, scope: e.target.value as TemplateScope })}
                                disabled={!isNew}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded disabled:bg-slate-50 disabled:text-slate-600"
                            >
                                <option value="global">Global</option>
                                <option value="per_contract_type">Per contract type</option>
                                <option value="per_position">Per position</option>
                            </select>
                        </div>
                        {form.scope !== 'global' && (
                            <div className="col-span-6 md:col-span-4">
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    {form.scope === 'per_contract_type' ? 'Contract type' : 'Position ID'}
                                </label>
                                <input
                                    value={form.scope_value}
                                    onChange={e => setForm({ ...form, scope_value: e.target.value })}
                                    placeholder={form.scope === 'per_contract_type' ? 'permanent / fixed_term / probation …' : 'position UUID'}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                                />
                            </div>
                        )}
                        <div className="col-span-12 md:col-span-4">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                            <input
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded"
                                placeholder="Short description (optional)"
                            />
                        </div>
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
                        <RichTextEditor
                            value={form.body_html}
                            onChange={(html) => setForm(f => ({ ...f, body_html: html }))}
                            placeholder="Write the document body. Click variables on the right to insert {{variable}} tokens."
                            minHeight={420}
                        />
                    </div>

                    {/* Header / Footer toggles */}
                    <div className="grid grid-cols-12 gap-3">
                        <CollapsibleHtmlField
                            label="Page Header"
                            open={showHeader}
                            onToggle={() => setShowHeader(!showHeader)}
                            value={form.header_html}
                            onChange={(v) => setForm({ ...form, header_html: v })}
                        />
                        <CollapsibleHtmlField
                            label="Page Footer"
                            open={showFooter}
                            onToggle={() => setShowFooter(!showFooter)}
                            value={form.footer_html}
                            onChange={(v) => setForm({ ...form, footer_html: v })}
                        />
                    </div>

                    {/* Margins */}
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12">
                            <div className="text-xs font-medium text-slate-600 mb-1">Margins (mm)</div>
                            <div className="grid grid-cols-4 gap-2">
                                {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                                    <div key={side}>
                                        <label className="block text-[11px] text-slate-500 capitalize">{side}</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={50}
                                            value={form.margins?.[side] ?? 0}
                                            onChange={e => setForm({ ...form, margins: { ...form.margins!, [side]: Number(e.target.value || 0) } })}
                                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Preview pane */}
                    {previewHtml && (
                        <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                                <span className="text-xs font-semibold text-slate-700">Preview (sample data)</span>
                                <button onClick={() => setPreviewHtml(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                            </div>
                            <iframe
                                title="preview"
                                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;font-size:11pt;padding:24px;color:#1e293b;line-height:1.45;}</style></head><body>${previewHtml}</body></html>`}
                                className="w-full bg-white"
                                style={{ minHeight: 500, border: 0 }}
                            />
                        </div>
                    )}
                </div>

                {/* VARIABLE SIDEBAR */}
                <aside className="col-span-12 xl:col-span-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg sticky top-2">
                        <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Variables</span>
                            <span className="text-[10px] text-slate-500">click to insert</span>
                        </div>
                        <div className="p-2 max-h-[640px] overflow-y-auto space-y-3">
                            {Object.entries(groupedVars).map(([group, list]) => (
                                <div key={group}>
                                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 px-1">{group}</div>
                                    <div className="flex flex-wrap gap-1">
                                        {list.map(v => (
                                            <button
                                                key={v.key}
                                                onClick={() => insertVariable(v.key)}
                                                title={v.key}
                                                className="px-2 py-0.5 text-[11px] bg-white border border-slate-200 rounded hover:bg-blue-50 hover:border-blue-300 text-slate-700"
                                            >
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {variables.length === 0 && (
                                <div className="text-xs text-slate-500 px-1 py-2 flex items-center gap-1.5"><AlertTriangle size={12} />No variables for this kind.</div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

// =============================================================================
// CollapsibleHtmlField — small textarea for header/footer raw HTML
// =============================================================================
const CollapsibleHtmlField: React.FC<{
    label: string;
    open: boolean;
    onToggle: () => void;
    value: string;
    onChange: (v: string) => void;
}> = ({ label, open, onToggle, value, onChange }) => (
    <div className="col-span-12 md:col-span-6">
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between text-xs font-medium text-slate-600 mb-1"
        >
            <span>{label}</span>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={3}
                placeholder={`Optional ${label.toLowerCase()} HTML. Supports Handlebars variables.`}
                className="w-full px-2 py-1.5 text-xs font-mono border border-slate-200 rounded focus:ring-2 focus:ring-[#0066B3]"
            />
        )}
    </div>
);

// ---------- helpers ----------
function extractErr(err: any): string | undefined {
    const msg = err?.response?.data?.message;
    return Array.isArray(msg) ? msg.join('; ') : msg;
}
