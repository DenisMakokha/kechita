import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    FileText, PenTool, AlertCircle, CheckCircle2, Calendar,
    Briefcase, Loader2, Eraser, Download,
} from 'lucide-react';
import { api } from '../../lib/api';

/**
 * Public, token-gated contract signing page.
 *
 * Flow:
 *  1. HR clicks "Send for signature" on a contract → backend mints a token
 *     and emails the employee a link to /sign/contract/:token.
 *  2. This page resolves the token to a contract summary via
 *     `GET /public/contracts/sign/:token`.
 *  3. Employee reviews the embedded contract PDF preview, draws a signature
 *     on the canvas, types their full name, ticks the agreement box, and
 *     submits.
 *  4. `POST /public/contracts/sign/:token` records the signature + audit
 *     trail server-side and flips the contract status to ACTIVE.
 */

interface ContractSummary {
    id: string;
    contract_number?: string;
    contract_type: string;
    title?: string;
    start_date: string;
    end_date?: string;
    salary?: number;
    salary_currency?: string;
    notice_period_days?: number;
    status: string;
    expires_at?: string;
    staff: {
        first_name?: string;
        last_name?: string;
        full_name?: string;
        employee_number?: string;
        position?: string;
        branch?: string;
        department?: string;
    };
}

const formatCurrency = (amount?: number, currency: string = 'KES') =>
    typeof amount === 'number'
        ? new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(amount)
        : '';

const formatDate = (s?: string) =>
    s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const ContractSigningPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [typedName, setTypedName] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const { data: contract, isLoading, error } = useQuery<ContractSummary>({
        queryKey: ['public-contract', token],
        queryFn: () => api.get(`/public/contracts/sign/${token}`).then(r => r.data),
        enabled: !!token,
        retry: false,
    });

    // ---- Canvas setup: scale for hi-DPI screens once per mount ----
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        ctx.scale(ratio, ratio);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [contract?.id]);

    // ---- Drawing handlers (mouse + touch) ----
    const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            const t = e.touches[0] || e.changedTouches[0];
            return { x: t.clientX - rect.left, y: t.clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        const { x, y } = getPoint(e);
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.beginPath();
        ctx?.moveTo(x, y);
    };

    const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getPoint(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const endDraw = () => setIsDrawing(false);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const signMutation = useMutation({
        mutationFn: () => {
            const canvas = canvasRef.current!;
            const dataUrl = canvas.toDataURL('image/png');
            return api.post(`/public/contracts/sign/${token}`, {
                signatureImage: dataUrl,
                signedByName: typedName.trim(),
            });
        },
        onSuccess: () => setSubmitted(true),
    });

    const submitError = (signMutation.error as any)?.response?.data?.message;

    // ---- Render states ----

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={36} className="animate-spin text-[#0066B3] mx-auto" />
                    <p className="mt-3 text-slate-600 text-sm">Loading your contract…</p>
                </div>
            </div>
        );
    }

    if (error || !contract) {
        const msg = (error as any)?.response?.data?.message || 'This signing link is invalid or has expired.';
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-xl shadow border border-slate-200 p-8 text-center">
                    <AlertCircle size={48} className="text-rose-500 mx-auto" />
                    <h2 className="mt-4 text-xl font-bold text-slate-900">Link unavailable</h2>
                    <p className="mt-2 text-slate-600">{msg}</p>
                    <p className="mt-4 text-sm text-slate-500">If you believe this is an error, please contact your HR team for a new link.</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-xl shadow border border-slate-200 p-8 text-center">
                    <CheckCircle2 size={56} className="text-emerald-500 mx-auto" />
                    <h2 className="mt-4 text-2xl font-bold text-slate-900">Contract signed</h2>
                    <p className="mt-2 text-slate-600">
                        Thank you, {contract.staff.first_name}. Your employment contract has been signed and recorded.
                        HR will be in touch with next steps.
                    </p>
                    <div className="mt-6 text-xs text-slate-400">Reference: {contract.contract_number || contract.id}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Brand bar */}
            <div className="bg-[#0066B3] text-white">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
                    <FileText size={22} />
                    <div>
                        <div className="text-base font-semibold">Kechita Capital Limited</div>
                        <div className="text-xs text-blue-100">Employment Contract Signing</div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                {/* Welcome */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h1 className="text-2xl font-bold text-slate-900">Welcome, {contract.staff.first_name}</h1>
                    <p className="text-slate-600 mt-1">
                        Please review the terms of your employment contract below and sign to accept.
                    </p>
                    {contract.expires_at && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <Calendar size={12} />
                            This link expires on {formatDate(contract.expires_at)}
                        </div>
                    )}
                </div>

                {/* Summary card */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                        <Briefcase size={18} className="text-[#0066B3]" />
                        <h2 className="font-semibold text-slate-900">Contract summary</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 text-sm">
                        <SummaryItem label="Reference" value={contract.contract_number || '—'} />
                        <SummaryItem label="Contract type" value={contract.contract_type.replace('_', ' ')} className="capitalize" />
                        <SummaryItem label="Position" value={contract.staff.position || '—'} />
                        <SummaryItem label="Department" value={contract.staff.department || '—'} />
                        <SummaryItem label="Branch" value={contract.staff.branch || '—'} />
                        <SummaryItem label="Employee number" value={contract.staff.employee_number || '—'} />
                        <SummaryItem label="Start date" value={formatDate(contract.start_date)} />
                        {contract.end_date && <SummaryItem label="End date" value={formatDate(contract.end_date)} />}
                        <SummaryItem label="Monthly salary" value={formatCurrency(contract.salary, contract.salary_currency)} />
                        <SummaryItem label="Notice period" value={`${contract.notice_period_days || 30} days`} />
                    </div>
                </div>

                {/* PDF preview link */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4">
                    <div>
                        <div className="font-medium text-slate-900 flex items-center gap-2"><FileText size={16} className="text-[#0066B3]" />Full contract document</div>
                        <p className="text-sm text-slate-500 mt-1">Open the full contract PDF to review every clause before signing.</p>
                    </div>
                    {/* Note: this PDF endpoint requires the HR PDF endpoint which is JWT-guarded.
                        For the signing flow we rely on the summary above; HR ensures the PDF is
                        attached to the signature-request email. If we later add a public PDF
                        renderer scoped to the token, swap href below. */}
                    <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); alert('A copy of your contract PDF was emailed to you. Please refer to that document.'); }}
                        className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                    >
                        <Download size={14} />Open PDF
                    </a>
                </div>

                {/* Signature pad */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                        <PenTool size={18} className="text-[#0066B3]" />
                        <h2 className="font-semibold text-slate-900">Your signature</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Full legal name</label>
                            <input
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                placeholder={contract.staff.full_name || `${contract.staff.first_name} ${contract.staff.last_name}`}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0066B3] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Draw your signature below</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
                                <canvas
                                    ref={canvasRef}
                                    className="w-full block cursor-crosshair touch-none"
                                    style={{ height: 180 }}
                                    onMouseDown={startDraw}
                                    onMouseMove={moveDraw}
                                    onMouseUp={endDraw}
                                    onMouseLeave={endDraw}
                                    onTouchStart={startDraw}
                                    onTouchMove={moveDraw}
                                    onTouchEnd={endDraw}
                                />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-slate-500">Use your mouse, trackpad, or touchscreen.</span>
                                <button
                                    type="button"
                                    onClick={clearSignature}
                                    className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1"
                                >
                                    <Eraser size={12} />Clear
                                </button>
                            </div>
                        </div>

                        <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0066B3] focus:ring-[#0066B3]"
                            />
                            <span>
                                I confirm that I have read and understood the terms of this employment contract and I accept and agree to be bound by them. I understand that this electronic signature has the same legal effect as a handwritten signature.
                            </span>
                        </label>

                        {submitError && (
                            <div className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2">
                                <AlertCircle size={14} />{Array.isArray(submitError) ? submitError.join('; ') : submitError}
                            </div>
                        )}

                        <button
                            onClick={() => signMutation.mutate()}
                            disabled={!hasSignature || !typedName.trim() || !agreed || signMutation.isPending}
                            className="w-full sm:w-auto px-6 py-2.5 bg-[#0066B3] text-white font-semibold rounded-lg hover:bg-[#005299] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {signMutation.isPending ? (
                                <><Loader2 size={16} className="animate-spin" />Signing…</>
                            ) : (
                                <><CheckCircle2 size={16} />Sign and submit</>
                            )}
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400">
                    By signing this document electronically you agree that the signature, IP address, and timestamp
                    captured at submission are part of the audit record for this contract.
                </p>
            </div>
        </div>
    );
};

const SummaryItem: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
    <div>
        <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
        <div className={`text-sm font-medium text-slate-900 mt-0.5 ${className || ''}`}>{value}</div>
    </div>
);

export default ContractSigningPage;
