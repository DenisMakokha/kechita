import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    FileText, PenTool, Type, Upload, Check, X, Clock, AlertCircle,
    Building2, Calendar, DollarSign, Briefcase
} from 'lucide-react';
import { api } from '../../lib/api';
import './offer-signing.css';

interface SignatureRequest {
    id: string;
    signature_token: string;
    status: 'pending' | 'signed' | 'declined' | 'expired';
    expires_at: string;
    offer: {
        id: string;
        salary: number;
        currency: string;
        start_date: string;
        position_title?: string;
        department?: string;
        benefits?: string[];
        probation_period_months?: number;
    };
    candidate: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
}

export const OfferSigningPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [signatureType, setSignatureType] = useState<'drawn' | 'typed' | 'uploaded'>('drawn');
    const [signatureData, setSignatureData] = useState<string>('');
    const [typedName, setTypedName] = useState('');
    const [declineReason, setDeclineReason] = useState('');
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { data: signatureRequest, isLoading, error } = useQuery<SignatureRequest>({
        queryKey: ['signature-request', token],
        queryFn: () => api.get(`/recruitment/sign/${token}`).then(r => r.data),
        enabled: !!token,
    });

    const signMutation = useMutation({
        mutationFn: (data: { signature_type: string; signature_data?: string; typed_name?: string }) =>
            api.post(`/recruitment/sign/${token}`, data),
        onSuccess: () => {
            // Show success state
        },
    });

    const declineMutation = useMutation({
        mutationFn: (reason: string) =>
            api.post(`/recruitment/sign/${token}/decline`, { reason }),
        onSuccess: () => {
            setShowDeclineModal(false);
        },
    });

    // Canvas drawing logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);

        // Style
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, [signatureType]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (signatureType !== 'drawn') return;
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || signatureType !== 'drawn') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            // Capture signature
            const canvas = canvasRef.current;
            if (canvas) {
                setSignatureData(canvas.toDataURL('image/png'));
            }
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setSignatureData('');
    };

    const handleSubmit = () => {
        if (signatureType === 'drawn') {
            signMutation.mutate({
                signature_type: 'drawn',
                signature_data: signatureData,
            });
        } else if (signatureType === 'typed') {
            signMutation.mutate({
                signature_type: 'typed',
                typed_name: typedName,
            });
        }
    };

    const formatCurrency = (amount: number, currency: string = 'KES') =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(amount);

    if (isLoading) {
        return (
            <div className="os-loading">
                <div className="os-spinner" />
                <p>Loading offer details...</p>
            </div>
        );
    }

    if (error || !signatureRequest) {
        return (
            <div className="os-error">
                <AlertCircle size={48} />
                <h2>Offer Not Found</h2>
                <p>This signing link may be invalid or expired.</p>
            </div>
        );
    }

    if (signatureRequest.status === 'signed') {
        return (
            <div className="os-success-page">
                <div className="os-success-content">
                    <div className="os-success-icon">
                        <Check size={48} />
                    </div>
                    <h1>Offer Accepted!</h1>
                    <p>
                        Thank you, {signatureRequest.candidate.first_name}! You have successfully signed the offer.
                        We're excited to have you join the team!
                    </p>
                    <div className="os-next-steps">
                        <h3>Next Steps</h3>
                        <ul>
                            <li>You will receive a confirmation email shortly</li>
                            <li>HR will reach out with onboarding details</li>
                            <li>Your start date: {new Date(signatureRequest.offer.start_date).toLocaleDateString()}</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    if (signatureRequest.status === 'declined') {
        return (
            <div className="os-declined-page">
                <X size={48} />
                <h2>Offer Declined</h2>
                <p>This offer has been declined.</p>
            </div>
        );
    }

    if (signatureRequest.status === 'expired') {
        return (
            <div className="os-expired-page">
                <Clock size={48} />
                <h2>Offer Expired</h2>
                <p>This signing request has expired. Please contact HR for a new link.</p>
            </div>
        );
    }

    const isExpired = new Date(signatureRequest.expires_at) < new Date();
    if (isExpired) {
        return (
            <div className="os-expired-page">
                <Clock size={48} />
                <h2>Link Expired</h2>
                <p>This signing link has expired. Please contact HR for a new one.</p>
            </div>
        );
    }

    return (
        <div className="offer-signing-page">
            <div className="os-container">
                {/* Header */}
                <div className="os-header">
                    <div className="os-logo">
                        <Building2 size={32} />
                        <span>Kechita</span>
                    </div>
                    <div className="os-expires">
                        <Clock size={16} />
                        Expires: {new Date(signatureRequest.expires_at).toLocaleDateString()}
                    </div>
                </div>

                {/* Greeting */}
                <div className="os-greeting">
                    <h1>Hello, {signatureRequest.candidate.first_name}!</h1>
                    <p>
                        Congratulations! We're pleased to extend this offer to you.
                        Please review the details below and sign to accept.
                    </p>
                </div>

                {/* Offer Summary */}
                <div className="os-offer-card">
                    <h2><FileText size={20} /> Offer Summary</h2>
                    <div className="os-offer-grid">
                        <div className="os-offer-item">
                            <Briefcase size={18} />
                            <div>
                                <span className="os-label">Position</span>
                                <span className="os-value">{signatureRequest.offer.position_title || 'N/A'}</span>
                            </div>
                        </div>
                        {signatureRequest.offer.department && (
                            <div className="os-offer-item">
                                <Building2 size={18} />
                                <div>
                                    <span className="os-label">Department</span>
                                    <span className="os-value">{signatureRequest.offer.department}</span>
                                </div>
                            </div>
                        )}
                        <div className="os-offer-item">
                            <DollarSign size={18} />
                            <div>
                                <span className="os-label">Salary</span>
                                <span className="os-value highlight">
                                    {formatCurrency(signatureRequest.offer.salary, signatureRequest.offer.currency)}
                                    <small>/month</small>
                                </span>
                            </div>
                        </div>
                        <div className="os-offer-item">
                            <Calendar size={18} />
                            <div>
                                <span className="os-label">Start Date</span>
                                <span className="os-value">
                                    {new Date(signatureRequest.offer.start_date).toLocaleDateString('en-KE', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {signatureRequest.offer.benefits && signatureRequest.offer.benefits.length > 0 && (
                        <div className="os-benefits">
                            <h4>Benefits Package</h4>
                            <ul>
                                {signatureRequest.offer.benefits.map((benefit, i) => (
                                    <li key={i}><Check size={14} /> {benefit}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Signature Section */}
                <div className="os-signature-section">
                    <h2><PenTool size={20} /> Your Signature</h2>

                    <div className="os-signature-tabs">
                        <button
                            className={signatureType === 'drawn' ? 'active' : ''}
                            onClick={() => setSignatureType('drawn')}
                        >
                            <PenTool size={16} /> Draw
                        </button>
                        <button
                            className={signatureType === 'typed' ? 'active' : ''}
                            onClick={() => setSignatureType('typed')}
                        >
                            <Type size={16} /> Type
                        </button>
                    </div>

                    {signatureType === 'drawn' && (
                        <div className="os-draw-area">
                            <canvas
                                ref={canvasRef}
                                className="os-canvas"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                            />
                            <button className="os-clear-btn" onClick={clearSignature}>
                                Clear
                            </button>
                            <p className="os-draw-hint">Draw your signature above</p>
                        </div>
                    )}

                    {signatureType === 'typed' && (
                        <div className="os-type-area">
                            <input
                                type="text"
                                value={typedName}
                                onChange={e => setTypedName(e.target.value)}
                                placeholder="Type your full legal name"
                                className="os-type-input"
                            />
                            {typedName && (
                                <div className="os-typed-preview">
                                    <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2rem' }}>
                                        {typedName}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Agreement */}
                <div className="os-agreement">
                    <p>
                        By signing below, I acknowledge that I have read and understood the terms of this offer,
                        and I agree to accept the position as described above.
                    </p>
                </div>

                {/* Actions */}
                <div className="os-actions">
                    <button
                        className="os-decline-btn"
                        onClick={() => setShowDeclineModal(true)}
                    >
                        Decline Offer
                    </button>
                    <button
                        className="os-accept-btn"
                        onClick={handleSubmit}
                        disabled={
                            signMutation.isPending ||
                            (signatureType === 'drawn' && !signatureData) ||
                            (signatureType === 'typed' && !typedName)
                        }
                    >
                        {signMutation.isPending ? 'Signing...' : (
                            <>
                                <Check size={18} />
                                Accept & Sign Offer
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="os-footer">
                    <p>
                        Questions? Contact HR at <a href="mailto:hr@kechita.com">hr@kechita.com</a>
                    </p>
                </div>
            </div>

            {/* Decline Modal */}
            {showDeclineModal && (
                <div className="os-modal-overlay">
                    <div className="os-modal">
                        <h3>Decline Offer</h3>
                        <p>We're sorry to hear you want to decline. Could you share why?</p>
                        <textarea
                            value={declineReason}
                            onChange={e => setDeclineReason(e.target.value)}
                            placeholder="Please share your reason (optional but appreciated)"
                            rows={4}
                        />
                        <div className="os-modal-actions">
                            <button onClick={() => setShowDeclineModal(false)}>Cancel</button>
                            <button
                                className="danger"
                                onClick={() => declineMutation.mutate(declineReason)}
                                disabled={declineMutation.isPending}
                            >
                                {declineMutation.isPending ? 'Declining...' : 'Confirm Decline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfferSigningPage;
