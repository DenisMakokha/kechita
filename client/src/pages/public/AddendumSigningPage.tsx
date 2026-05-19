import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    FileText, PenTool, AlertCircle, CheckCircle2, Calendar,
    Loader2, Eraser,
} from 'lucide-react';
import { api } from '../../lib/api';

/**
 * Public, token-gated signing page for contract addendums. Mirrors
 * ContractSigningPage but talks to /public/contracts/addendums/sign/:token.
 */

interface AddendumSummary {
    id: string;
    sequence: number;
    title: string;
    body: string;
    effective_date: string;
    status: string;
    expires_at?: string;
}

const formatDate = (s?: string) =>
    s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const AddendumSigningPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [typedName, setTypedName] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const { data: addendum, isLoading, error } = useQuery<AddendumSummary>({
        queryKey: ['public-addendum', token],
        queryFn: () => api.get(`/public/contracts/addendums/sign/${token}`).then(r => r.data),
        enabled: !!token,
        retry: false,
    });

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
    }, [addendum?.id]);

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
            return api.post(`/public/contracts/addendums/sign/${token}`, {
                signatureImage: canvas.toDataURL('image/png'),
                signedByName: typedName.trim(),
            });
        },
        onSuccess: () => setSubmitted(true),
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 size={36} className="animate-spin text-[#0066B3]" />
            </div>
        );
    }

    if (error || !addendum) {
        const msg = (error as any)?.response?.data?.message || 'This signing link is invalid or has expired.';
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-xl shadow border border-slate-200 p-8 text-center">
                    <AlertCircle size={48} className="text-rose-500 mx-auto" />
                    <h2 className="mt-4 text-xl font-bold text-slate-900">Link unavailable</h2>
                    <p className="mt-2 text-slate-600">{msg}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-xl shadow border border-slate-200 p-8 text-center">
                    <CheckCircle2 size={56} className="text-emerald-500 mx-auto" />
                    <h2 className="mt-4 text-2xl font-bold text-slate-900">Addendum signed</h2>
                    <p className="mt-2 text-slate-600">Thank you. The addendum has been recorded against your contract.</p>
                </div>
            </div>
        );
    }

    const submitError = (signMutation.error as any)?.response?.data?.message;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-[#0066B3] text-white">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
                    <FileText size={22} />
                    <div>
                        <div className="text-base font-semibold">Kechita Capital Limited</div>
                        <div className="text-xs text-blue-100">Contract Addendum Signing</div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h1 className="text-xl font-bold text-slate-900">Addendum #{addendum.sequence}: {addendum.title}</h1>
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#0066B3]">
                            <Calendar size={12} />Effective {formatDate(addendum.effective_date)}
                        </span>
                    </div>
                    <div className="mt-4 prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">{addendum.body}</div>
                    {addendum.expires_at && (
                        <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded inline-flex items-center gap-1">
                            <Calendar size={12} />This signing link expires on {formatDate(addendum.expires_at)}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                        <PenTool size={18} className="text-[#0066B3]" />
                        <h2 className="font-semibold text-slate-900">Sign to accept</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Full legal name</label>
                            <input
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                placeholder="Your full name"
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
                                <span className="text-xs text-slate-500">Use mouse, trackpad, or touchscreen.</span>
                                <button onClick={clearSignature} className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1">
                                    <Eraser size={12} />Clear
                                </button>
                            </div>
                        </div>
                        <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0066B3] focus:ring-[#0066B3]" />
                            <span>I confirm I have read and understood this addendum and accept its terms. This electronic signature has the same legal effect as a handwritten signature.</span>
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
                            {signMutation.isPending ? <><Loader2 size={16} className="animate-spin" />Signing…</> : <><CheckCircle2 size={16} />Sign and submit</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddendumSigningPage;
