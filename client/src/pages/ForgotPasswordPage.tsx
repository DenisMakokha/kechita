import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useFormValidation, validators, fieldErrorClass } from '../hooks/useFormValidation';
import type { ValidationRules } from '../hooks/useFormValidation';
import { FieldError } from '../components/ui/FieldError';
import { Mail, KeyRound, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import LogoHeader from '../assets/LogoHeader.svg';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const rules = useMemo<ValidationRules<{ email: string }>>(() => ({
        email: [v => validators.required(v, 'Email'), validators.email],
    }), []);
    const { validateAll, onBlur, onChange, getFieldError } = useFormValidation(rules);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateAll({ email })) return;
        setLoading(true);

        try {
            await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Check Your Email</h2>
                            <p className="text-slate-600 mb-2">
                                If an account exists with
                            </p>
                            <p className="text-[#0066B3] font-medium mb-4">{email}</p>
                            <p className="text-slate-500 text-sm mb-8">
                                You'll receive a password reset link shortly. Don't see it? Check your spam folder.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all"
                            >
                                <ArrowLeft size={18} />
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <img src={LogoHeader} alt="Kechita Capital" className="h-12" />
                        <span className="text-xl font-bold text-slate-800">KECHITA CAPITAL</span>
                    </div>

                    <div className="text-center mb-8">
                        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="w-7 h-7 text-amber-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Forgot Password?</h1>
                        <p className="text-slate-500">No worries, we'll send you reset instructions</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                                <Shield className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); onChange('email', e.target.value); }}
                                    onBlur={() => onBlur('email', email)}
                                    className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent focus:bg-white transition-all ${fieldErrorClass(getFieldError('email'))}`}
                                    placeholder="you@company.com"
                                    autoFocus
                                />
                            </div>
                            <FieldError error={getFieldError('email')} />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Back to Login
                        </Link>
                    </div>
                </div>

                <p className="mt-8 text-center text-slate-400 text-sm">
                    Powered by <span className="font-medium text-slate-600">Nelium Systems</span>
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
