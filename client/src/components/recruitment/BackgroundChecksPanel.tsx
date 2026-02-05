import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Shield, FileSearch, UserCheck, Phone, Mail, Star, Check, X,
    Clock, AlertTriangle, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../../lib/api';
import './background-checks.css';

interface BackgroundCheck {
    id: string;
    check_number: string;
    type: string;
    status: string;
    result?: string;
    provider_name?: string;
    initiated_date?: string;
    completed_date?: string;
    findings?: string;
    has_issues: boolean;
    cost?: number;
    initiatedBy?: { first_name: string; last_name: string };
}

interface ReferenceCheck {
    id: string;
    reference_name: string;
    reference_title?: string;
    reference_company?: string;
    reference_email: string;
    reference_phone?: string;
    relationship: string;
    status: string;
    overall_rating?: number;
    would_rehire?: boolean;
    strengths?: string;
    areas_for_improvement?: string;
    contact_attempts: number;
}

interface BackgroundSummary {
    total: number;
    pending: number;
    completed: number;
    clear: number;
    flagged: number;
    all_clear: boolean;
}

interface ReferenceSummary {
    total: number;
    completed: number;
    pending: number;
    average_rating: number;
    would_rehire_percentage: number;
}

interface Props {
    candidateId: string;
    candidateName: string;
    onClose?: () => void;
}

export const BackgroundChecksPanel: React.FC<Props> = ({ candidateId, candidateName, onClose }) => {
    const [activeTab, setActiveTab] = useState<'background' | 'references'>('background');
    const [showAddBgCheck, setShowAddBgCheck] = useState(false);
    const [showAddReference, setShowAddReference] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Background checks
    const { data: bgChecks = [] } = useQuery<BackgroundCheck[]>({
        queryKey: ['background-checks', candidateId],
        queryFn: () => api.get(`/recruitment/candidates/${candidateId}/background-checks`).then(r => r.data),
    });

    const { data: bgSummary } = useQuery<BackgroundSummary>({
        queryKey: ['background-summary', candidateId],
        queryFn: () => api.get(`/recruitment/candidates/${candidateId}/background-summary`).then(r => r.data),
    });

    // Reference checks
    const { data: refChecks = [] } = useQuery<ReferenceCheck[]>({
        queryKey: ['reference-checks', candidateId],
        queryFn: () => api.get(`/recruitment/candidates/${candidateId}/reference-checks`).then(r => r.data),
    });

    const { data: refSummary } = useQuery<ReferenceSummary>({
        queryKey: ['reference-summary', candidateId],
        queryFn: () => api.get(`/recruitment/candidates/${candidateId}/reference-summary`).then(r => r.data),
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <Check size={14} />;
            case 'pending': case 'contacted': return <Clock size={14} />;
            case 'failed': case 'unreachable': return <X size={14} />;
            default: return <Clock size={14} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'status-success';
            case 'pending': case 'contacted': case 'in_progress': return 'status-warning';
            case 'failed': case 'unreachable': case 'declined': return 'status-danger';
            default: return 'status-default';
        }
    };

    const getResultColor = (result?: string) => {
        switch (result) {
            case 'clear': return 'result-clear';
            case 'flagged': return 'result-flagged';
            case 'inconclusive': return 'result-inconclusive';
            default: return '';
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="bgc-stars">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star
                        key={star}
                        size={14}
                        className={star <= rating ? 'filled' : ''}
                    />
                ))}
            </div>
        );
    };

    const checkTypes = [
        { value: 'criminal', label: 'Criminal Record' },
        { value: 'credit', label: 'Credit Check' },
        { value: 'employment', label: 'Employment History' },
        { value: 'education', label: 'Education Verification' },
        { value: 'identity', label: 'Identity Verification' },
        { value: 'address', label: 'Address Verification' },
        { value: 'professional_license', label: 'Professional License' },
    ];

    return (
        <div className="bgc-panel">
            <div className="bgc-header">
                <div className="bgc-header-content">
                    <Shield size={24} />
                    <div>
                        <h3>Pre-Employment Checks</h3>
                        <span>{candidateName}</span>
                    </div>
                </div>
                {onClose && (
                    <button className="bgc-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="bgc-summary-row">
                <div className={`bgc-summary-card ${bgSummary?.all_clear ? 'success' : bgSummary?.flagged ? 'danger' : ''}`}>
                    <FileSearch size={20} />
                    <div>
                        <span className="bgc-summary-value">{bgSummary?.completed || 0}/{bgSummary?.total || 0}</span>
                        <span className="bgc-summary-label">Background Checks</span>
                    </div>
                    {bgSummary?.all_clear && <Check className="bgc-summary-icon success" size={18} />}
                    {bgSummary?.flagged && bgSummary.flagged > 0 && <AlertTriangle className="bgc-summary-icon danger" size={18} />}
                </div>
                <div className="bgc-summary-card">
                    <UserCheck size={20} />
                    <div>
                        <span className="bgc-summary-value">{refSummary?.completed || 0}/{refSummary?.total || 0}</span>
                        <span className="bgc-summary-label">References</span>
                    </div>
                    {refSummary?.average_rating && (
                        <span className="bgc-rating">{refSummary.average_rating.toFixed(1)}/5</span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="bgc-tabs">
                <button
                    className={activeTab === 'background' ? 'active' : ''}
                    onClick={() => setActiveTab('background')}
                >
                    <FileSearch size={16} />
                    Background ({bgChecks.length})
                </button>
                <button
                    className={activeTab === 'references' ? 'active' : ''}
                    onClick={() => setActiveTab('references')}
                >
                    <UserCheck size={16} />
                    References ({refChecks.length})
                </button>
            </div>

            {/* Content */}
            <div className="bgc-content">
                {activeTab === 'background' && (
                    <>
                        <div className="bgc-actions">
                            <button className="bgc-btn primary" onClick={() => setShowAddBgCheck(true)}>
                                <Plus size={16} /> Initiate Check
                            </button>
                        </div>
                        <div className="bgc-list">
                            {bgChecks.map(check => (
                                <div key={check.id} className={`bgc-item ${check.has_issues ? 'has-issues' : ''}`}>
                                    <div
                                        className="bgc-item-header"
                                        onClick={() => setExpandedId(expandedId === check.id ? null : check.id)}
                                    >
                                        <div className="bgc-item-info">
                                            <span className="bgc-item-type">
                                                {checkTypes.find(t => t.value === check.type)?.label || check.type}
                                            </span>
                                            <span className="bgc-item-number">{check.check_number}</span>
                                        </div>
                                        <div className="bgc-item-status">
                                            <span className={`bgc-status ${getStatusColor(check.status)}`}>
                                                {getStatusIcon(check.status)}
                                                {check.status}
                                            </span>
                                            {check.result && (
                                                <span className={`bgc-result ${getResultColor(check.result)}`}>
                                                    {check.result}
                                                </span>
                                            )}
                                            {expandedId === check.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>
                                    {expandedId === check.id && (
                                        <div className="bgc-item-details">
                                            {check.provider_name && (
                                                <div className="bgc-detail-row">
                                                    <span>Provider:</span>
                                                    <span>{check.provider_name}</span>
                                                </div>
                                            )}
                                            {check.initiated_date && (
                                                <div className="bgc-detail-row">
                                                    <span>Initiated:</span>
                                                    <span>{new Date(check.initiated_date).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {check.completed_date && (
                                                <div className="bgc-detail-row">
                                                    <span>Completed:</span>
                                                    <span>{new Date(check.completed_date).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {check.cost && (
                                                <div className="bgc-detail-row">
                                                    <span>Cost:</span>
                                                    <span>KES {check.cost.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {check.findings && (
                                                <div className="bgc-findings">
                                                    <span>Findings:</span>
                                                    <p>{check.findings}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {bgChecks.length === 0 && (
                                <div className="bgc-empty">
                                    <FileSearch size={32} />
                                    <p>No background checks initiated</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'references' && (
                    <>
                        <div className="bgc-actions">
                            <button className="bgc-btn primary" onClick={() => setShowAddReference(true)}>
                                <Plus size={16} /> Add Reference
                            </button>
                        </div>
                        <div className="bgc-list">
                            {refChecks.map(ref => (
                                <div key={ref.id} className="bgc-item reference">
                                    <div
                                        className="bgc-item-header"
                                        onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}
                                    >
                                        <div className="bgc-ref-info">
                                            <span className="bgc-ref-name">{ref.reference_name}</span>
                                            <span className="bgc-ref-role">
                                                {ref.reference_title && `${ref.reference_title} at `}
                                                {ref.reference_company}
                                            </span>
                                            <span className="bgc-ref-relationship">{ref.relationship}</span>
                                        </div>
                                        <div className="bgc-item-status">
                                            <span className={`bgc-status ${getStatusColor(ref.status)}`}>
                                                {getStatusIcon(ref.status)}
                                                {ref.status}
                                            </span>
                                            {ref.overall_rating && renderStars(ref.overall_rating)}
                                            {expandedId === ref.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>
                                    {expandedId === ref.id && (
                                        <div className="bgc-item-details">
                                            <div className="bgc-ref-contact">
                                                <a href={`mailto:${ref.reference_email}`}>
                                                    <Mail size={14} /> {ref.reference_email}
                                                </a>
                                                {ref.reference_phone && (
                                                    <a href={`tel:${ref.reference_phone}`}>
                                                        <Phone size={14} /> {ref.reference_phone}
                                                    </a>
                                                )}
                                            </div>
                                            <div className="bgc-detail-row">
                                                <span>Contact Attempts:</span>
                                                <span>{ref.contact_attempts}</span>
                                            </div>
                                            {ref.would_rehire !== undefined && (
                                                <div className="bgc-detail-row">
                                                    <span>Would Rehire:</span>
                                                    <span className={ref.would_rehire ? 'text-success' : 'text-danger'}>
                                                        {ref.would_rehire ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            )}
                                            {ref.strengths && (
                                                <div className="bgc-feedback">
                                                    <span>Strengths:</span>
                                                    <p>{ref.strengths}</p>
                                                </div>
                                            )}
                                            {ref.areas_for_improvement && (
                                                <div className="bgc-feedback">
                                                    <span>Areas for Improvement:</span>
                                                    <p>{ref.areas_for_improvement}</p>
                                                </div>
                                            )}
                                            <div className="bgc-ref-actions">
                                                <button className="bgc-btn-sm">
                                                    <Phone size={14} /> Log Contact
                                                </button>
                                                <button className="bgc-btn-sm primary">
                                                    <Check size={14} /> Enter Response
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {refChecks.length === 0 && (
                                <div className="bgc-empty">
                                    <UserCheck size={32} />
                                    <p>No references added</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add Background Check Modal */}
            {showAddBgCheck && (
                <AddBackgroundCheckModal
                    candidateId={candidateId}
                    checkTypes={checkTypes}
                    onClose={() => setShowAddBgCheck(false)}
                    onSuccess={() => {
                        setShowAddBgCheck(false);
                        queryClient.invalidateQueries({ queryKey: ['background-checks', candidateId] });
                        queryClient.invalidateQueries({ queryKey: ['background-summary', candidateId] });
                    }}
                />
            )}

            {/* Add Reference Modal */}
            {showAddReference && (
                <AddReferenceModal
                    candidateId={candidateId}
                    onClose={() => setShowAddReference(false)}
                    onSuccess={() => {
                        setShowAddReference(false);
                        queryClient.invalidateQueries({ queryKey: ['reference-checks', candidateId] });
                        queryClient.invalidateQueries({ queryKey: ['reference-summary', candidateId] });
                    }}
                />
            )}
        </div>
    );
};

// Add Background Check Modal
const AddBackgroundCheckModal: React.FC<{
    candidateId: string;
    checkTypes: { value: string; label: string }[];
    onClose: () => void;
    onSuccess: () => void;
}> = ({ candidateId, checkTypes, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        type: '',
        provider_name: '',
        expected_completion_date: '',
        cost: '',
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/recruitment/background-checks', data),
        onSuccess,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            candidate_id: candidateId,
            type: formData.type,
            provider_name: formData.provider_name || undefined,
            expected_completion_date: formData.expected_completion_date || undefined,
            cost: formData.cost ? parseFloat(formData.cost) : undefined,
        });
    };

    return (
        <div className="bgc-modal-overlay">
            <div className="bgc-modal">
                <h3>Initiate Background Check</h3>
                <form onSubmit={handleSubmit}>
                    <div className="bgc-form-group">
                        <label>Check Type</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            required
                        >
                            <option value="">Select Type</option>
                            {checkTypes.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="bgc-form-group">
                        <label>Provider (optional)</label>
                        <input
                            type="text"
                            value={formData.provider_name}
                            onChange={e => setFormData({ ...formData, provider_name: e.target.value })}
                            placeholder="e.g., CRB Kenya"
                        />
                    </div>
                    <div className="bgc-form-row">
                        <div className="bgc-form-group">
                            <label>Expected Completion</label>
                            <input
                                type="date"
                                value={formData.expected_completion_date}
                                onChange={e => setFormData({ ...formData, expected_completion_date: e.target.value })}
                            />
                        </div>
                        <div className="bgc-form-group">
                            <label>Cost (KES)</label>
                            <input
                                type="number"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="bgc-modal-actions">
                        <button type="button" className="bgc-btn secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="bgc-btn primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Initiating...' : 'Initiate Check'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Add Reference Modal
const AddReferenceModal: React.FC<{
    candidateId: string;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ candidateId, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        reference_name: '',
        reference_title: '',
        reference_company: '',
        reference_email: '',
        reference_phone: '',
        relationship: '',
        years_known: '',
    });

    const relationships = [
        'Former Manager',
        'Former Supervisor',
        'Colleague',
        'Direct Report',
        'Client',
        'Professor',
        'Mentor',
        'Other',
    ];

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/recruitment/reference-checks', data),
        onSuccess,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            candidate_id: candidateId,
            ...formData,
            years_known: formData.years_known ? parseInt(formData.years_known) : undefined,
        });
    };

    return (
        <div className="bgc-modal-overlay">
            <div className="bgc-modal">
                <h3>Add Reference</h3>
                <form onSubmit={handleSubmit}>
                    <div className="bgc-form-group">
                        <label>Reference Name</label>
                        <input
                            type="text"
                            value={formData.reference_name}
                            onChange={e => setFormData({ ...formData, reference_name: e.target.value })}
                            placeholder="Full name"
                            required
                        />
                    </div>
                    <div className="bgc-form-row">
                        <div className="bgc-form-group">
                            <label>Title</label>
                            <input
                                type="text"
                                value={formData.reference_title}
                                onChange={e => setFormData({ ...formData, reference_title: e.target.value })}
                                placeholder="Job title"
                            />
                        </div>
                        <div className="bgc-form-group">
                            <label>Company</label>
                            <input
                                type="text"
                                value={formData.reference_company}
                                onChange={e => setFormData({ ...formData, reference_company: e.target.value })}
                                placeholder="Company name"
                            />
                        </div>
                    </div>
                    <div className="bgc-form-row">
                        <div className="bgc-form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={formData.reference_email}
                                onChange={e => setFormData({ ...formData, reference_email: e.target.value })}
                                placeholder="Email address"
                                required
                            />
                        </div>
                        <div className="bgc-form-group">
                            <label>Phone</label>
                            <input
                                type="tel"
                                value={formData.reference_phone}
                                onChange={e => setFormData({ ...formData, reference_phone: e.target.value })}
                                placeholder="Phone number"
                            />
                        </div>
                    </div>
                    <div className="bgc-form-row">
                        <div className="bgc-form-group">
                            <label>Relationship</label>
                            <select
                                value={formData.relationship}
                                onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                                required
                            >
                                <option value="">Select</option>
                                {relationships.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="bgc-form-group">
                            <label>Years Known</label>
                            <input
                                type="number"
                                value={formData.years_known}
                                onChange={e => setFormData({ ...formData, years_known: e.target.value })}
                                min="0"
                                placeholder="Years"
                            />
                        </div>
                    </div>
                    <div className="bgc-modal-actions">
                        <button type="button" className="bgc-btn secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="bgc-btn primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Adding...' : 'Add Reference'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BackgroundChecksPanel;
