import React, { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { useFormValidation, validators } from '../hooks/useFormValidation';
import type { ValidationRules } from '../hooks/useFormValidation';
import { FieldError } from '../components/ui/FieldError';

export const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const rules = useMemo<ValidationRules<{ password: string; confirmPassword: string }>>(() => ({
        password: [v => validators.required(v, 'Password'), validators.passwordStrength],
        confirmPassword: [v => validators.required(v, 'Confirm password'), validators.passwordMatch(password)],
    }), [password]);
    const { validateAll, onBlur, onChange, getFieldError } = useFormValidation(rules);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateAll({ password, confirmPassword })) return;
        setLoading(true);

        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    // Password strength indicator
    const getPasswordStrength = () => {
        if (!password) return { level: 0, label: '', color: '' };
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        if (score <= 2) return { level: score, label: 'Weak', color: 'bg-red-500' };
        if (score <= 3) return { level: score, label: 'Fair', color: 'bg-amber-500' };
        if (score <= 4) return { level: score, label: 'Good', color: 'bg-blue-500' };
        return { level: score, label: 'Strong', color: 'bg-emerald-500' };
    };
    const strength = getPasswordStrength();

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h2>
                            <p className="text-slate-500 mb-6">
                                This password reset link is invalid or has expired. Please request a new one.
                            </p>
                            <Link
                                to="/forgot-password"
                                className="inline-block px-6 py-3 bg-[#0066B3] text-white font-medium rounded-lg transition-all hover:bg-[#005599] hover:shadow-lg"
                            >
                                Request New Link
                            </Link>
                            <div className="mt-4">
                                <Link to="/login" className="text-sm text-slate-500 hover:text-[#0066B3] transition-colors">
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="text-emerald-500" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Set Successfully!</h2>
                            <p className="text-slate-500 mb-6">
                                Your password has been set. Redirecting you to login...
                            </p>
                            <Link
                                to="/login"
                                className="inline-block px-6 py-3 bg-[#0066B3] text-white font-medium rounded-lg transition-all hover:bg-[#005599] hover:shadow-lg"
                            >
                                Go to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-[#0066B3] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
                        <Lock className="text-white" size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Set Your Password</h1>
                    <p className="text-slate-500 mt-1">Create a secure password for your account</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); onChange('password', e.target.value); }}
                                    onBlur={() => onBlur('password', password)}
                                    className={`w-full px-4 py-3 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all pr-12 ${getFieldError('password') ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}
                                    placeholder="Min 8 characters"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <FieldError error={getFieldError('password')} />
                            {password && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-500">Password strength</span>
                                        <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : 'bg-slate-200'}`} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => { setConfirmPassword(e.target.value); onChange('confirmPassword', e.target.value); }}
                                    onBlur={() => onBlur('confirmPassword', confirmPassword)}
                                    className={`w-full px-4 py-3 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all pr-12 ${getFieldError('confirmPassword') ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}
                                    placeholder="Re-enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <FieldError error={getFieldError('confirmPassword')} />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-[#0066B3] hover:bg-[#005599] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Setting Password...
                                </span>
                            ) : 'Set Password'}
                        </button>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#0066B3] text-sm font-medium transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Back to Login
                    </Link>
                </div>

                <p className="text-center text-xs text-slate-400 mt-4">
                    Kechita Capital Staff Portal
                </p>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
