import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { InputDialog } from '../components/ui/InputDialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    Shield, Key, Smartphone, Monitor, Clock, MapPin, Trash2,
    Eye, EyeOff, CheckCircle, AlertCircle, Lock, LogOut,
    Copy, RefreshCw
} from 'lucide-react';

interface Session {
    id: string;
    user_agent?: string;
    ip_address?: string;
    created_at: string;
    expires_at: string;
    is_current?: boolean;
}

export const SecuritySettingsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'password' | '2fa' | 'sessions'>('password');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // 2FA state
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [twoFactorError, setTwoFactorError] = useState('');

    // Fetch active sessions
    const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
        queryKey: ['auth-sessions'],
        queryFn: async () => (await api.get('/auth/sessions')).data,
        enabled: activeTab === 'sessions',
    });

    // Change password mutation
    const changePasswordMutation = useMutation({
        mutationFn: async (data: { currentPassword: string; newPassword: string }) =>
            (await api.post('/auth/change-password', data)).data,
        onSuccess: () => {
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError('');
            setTimeout(() => setPasswordSuccess(false), 5000);
        },
        onError: (error: any) => {
            setPasswordError(error.response?.data?.message || 'Failed to change password');
        },
    });

    // 2FA setup mutation
    const setup2FAMutation = useMutation({
        mutationFn: async () => (await api.post('/auth/2fa/setup')).data,
        onSuccess: (data) => {
            setQrCode(data.qrCode);
            setSecret(data.secret);
            setShow2FASetup(true);
        },
        onError: (e: any) => setTwoFactorError(e.response?.data?.message || 'Failed to setup 2FA'),
    });

    // Enable 2FA mutation
    const enable2FAMutation = useMutation({
        mutationFn: async (token: string) => (await api.post('/auth/2fa/enable', { token })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth-me'] });
            setShow2FASetup(false);
            setVerificationCode('');
            setQrCode('');
            setSecret('');
        },
        onError: (error: any) => {
            setTwoFactorError(error.response?.data?.message || 'Invalid verification code');
        },
    });

    // Disable 2FA mutation
    const disable2FAMutation = useMutation({
        mutationFn: async (token: string) => (await api.post('/auth/2fa/disable', { token })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth-me'] });
            setVerificationCode('');
        },
        onError: (error: any) => {
            setTwoFactorError(error.response?.data?.message || 'Invalid verification code');
        },
    });

    // Revoke session mutation
    const revokeSessionMutation = useMutation({
        mutationFn: async (sessionId: string) => (await api.delete(`/auth/sessions/${sessionId}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
        },
        onError: (e: any) => console.error('Failed to revoke session:', e),
    });

    // Logout all sessions mutation
    const logoutAllMutation = useMutation({
        mutationFn: async () => (await api.post('/auth/logout-all')).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
        },
        onError: (e: any) => console.error('Failed to logout all sessions:', e),
    });

    const handleChangePassword = () => {
        setPasswordError('');
        
        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        changePasswordMutation.mutate({ currentPassword, newPassword });
    };

    const handleEnable2FA = () => {
        setTwoFactorError('');
        if (verificationCode.length !== 6) {
            setTwoFactorError('Please enter a 6-digit code');
            return;
        }
        enable2FAMutation.mutate(verificationCode);
    };

    const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
    const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);

    const handleDisable2FA = () => {
        setTwoFactorError('');
        setShowDisable2FADialog(true);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const getDeviceIcon = (userAgent?: string) => {
        if (!userAgent) return <Monitor size={20} />;
        if (userAgent.toLowerCase().includes('mobile')) return <Smartphone size={20} />;
        return <Monitor size={20} />;
    };

    const getBrowserName = (userAgent?: string) => {
        if (!userAgent) return 'Unknown Browser';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Browser';
    };

    const tabs = [
        { key: 'password' as const, label: 'Password', icon: Key },
        { key: '2fa' as const, label: 'Two-Factor Auth', icon: Smartphone },
        { key: 'sessions' as const, label: 'Active Sessions', icon: Monitor },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Security Settings</h1>
                <p className="text-slate-500">Manage your account security and sessions</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? 'text-[#0066B3] border-b-2 border-[#0066B3] bg-blue-50/50'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="p-6">
                    {/* Password Tab */}
                    {activeTab === 'password' && (
                        <div className="max-w-md space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
                                <Lock className="text-[#0066B3] flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="font-medium text-slate-900">Password Requirements</h3>
                                    <ul className="text-sm text-slate-600 mt-1 space-y-1">
                                        <li>• Minimum 8 characters</li>
                                        <li>• Mix of letters and numbers recommended</li>
                                        <li>• Avoid using personal information</li>
                                    </ul>
                                </div>
                            </div>

                            {passwordSuccess && (
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                                    <CheckCircle size={20} />
                                    Password changed successfully!
                                </div>
                            )}

                            {passwordError && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                                    <AlertCircle size={20} />
                                    {passwordError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] pr-12"
                                        placeholder="Enter current password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] pr-12"
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3]"
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <button
                                onClick={handleChangePassword}
                                disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
                                className="w-full py-3 px-4 bg-[#0066B3] text-white font-medium rounded-xl hover:bg-[#005599] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {changePasswordMutation.isPending ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </div>
                    )}

                    {/* 2FA Tab */}
                    {activeTab === '2fa' && (
                        <div className="max-w-md space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                                <Shield className="text-slate-600 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="font-medium text-slate-900">Two-Factor Authentication</h3>
                                    <p className="text-sm text-slate-600 mt-1">
                                        Add an extra layer of security to your account by requiring a verification code from your authenticator app.
                                    </p>
                                </div>
                            </div>

                            {user?.two_factor_enabled ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <CheckCircle className="text-emerald-600" size={24} />
                                        <div>
                                            <p className="font-medium text-emerald-800">2FA is enabled</p>
                                            <p className="text-sm text-emerald-600">Your account is protected with two-factor authentication</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleDisable2FA}
                                        disabled={disable2FAMutation.isPending}
                                        className="w-full py-3 px-4 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        {disable2FAMutation.isPending ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                                    </button>
                                </div>
                            ) : show2FASetup ? (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <p className="text-sm text-slate-600 mb-4">
                                            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                                        </p>
                                        {qrCode && (
                                            <div className="inline-block p-4 bg-white border border-slate-200 rounded-xl">
                                                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-600 mb-2">Or enter this code manually:</p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 p-2 bg-white border border-slate-200 rounded font-mono text-sm">
                                                {secret}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(secret)}
                                                className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"
                                                title="Copy to clipboard"
                                            >
                                                <Copy size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {twoFactorError && (
                                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                                            <AlertCircle size={20} />
                                            {twoFactorError}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Verification Code
                                        </label>
                                        <input
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3] text-center text-2xl tracking-widest font-mono"
                                            placeholder="000000"
                                            maxLength={6}
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setShow2FASetup(false); setQrCode(''); setSecret(''); setVerificationCode(''); }}
                                            className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleEnable2FA}
                                            disabled={verificationCode.length !== 6 || enable2FAMutation.isPending}
                                            className="flex-1 py-3 px-4 bg-[#0066B3] text-white font-medium rounded-xl hover:bg-[#005599] disabled:opacity-50 transition-colors"
                                        >
                                            {enable2FAMutation.isPending ? 'Verifying...' : 'Enable 2FA'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setup2FAMutation.mutate()}
                                    disabled={setup2FAMutation.isPending}
                                    className="w-full py-3 px-4 bg-[#0066B3] text-white font-medium rounded-xl hover:bg-[#005599] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {setup2FAMutation.isPending ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            Setting up...
                                        </>
                                    ) : (
                                        <>
                                            <Shield size={18} />
                                            Set Up Two-Factor Authentication
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Sessions Tab */}
                    {activeTab === 'sessions' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-slate-900">Active Sessions</h3>
                                    <p className="text-sm text-slate-500">Devices currently logged into your account</p>
                                </div>
                                <button
                                    onClick={() => setShowLogoutAllConfirm(true)}
                                    disabled={logoutAllMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-medium text-sm"
                                >
                                    <LogOut size={16} />
                                    Log Out All Devices
                                </button>
                            </div>

                            {sessionsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0066B3]"></div>
                                </div>
                            ) : sessions?.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl">
                                    <Monitor className="mx-auto text-slate-300 mb-4" size={48} />
                                    <p className="text-slate-500">No active sessions found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sessions?.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`flex items-center justify-between p-4 rounded-xl border ${
                                                session.is_current
                                                    ? 'border-emerald-200 bg-emerald-50'
                                                    : 'border-slate-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                    session.is_current ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {getDeviceIcon(session.user_agent)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-slate-900">
                                                            {getBrowserName(session.user_agent)}
                                                        </p>
                                                        {session.is_current && (
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                                        {session.ip_address && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={12} />
                                                                {session.ip_address}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            Created: {new Date(session.created_at).toLocaleDateString('en-GB', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {!session.is_current && (
                                                <button
                                                    onClick={() => revokeSessionMutation.mutate(session.id)}
                                                    disabled={revokeSessionMutation.isPending}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                                    title="Revoke session"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Disable 2FA Dialog */}
            <InputDialog
                isOpen={showDisable2FADialog}
                title="Disable Two-Factor Authentication"
                message="Enter your 2FA code to disable two-factor authentication."
                inputLabel="2FA Code"
                placeholder="6-digit code"
                confirmLabel="Disable 2FA"
                onConfirm={(code) => { if (code.length === 6) disable2FAMutation.mutate(code); setShowDisable2FADialog(false); }}
                onCancel={() => setShowDisable2FADialog(false)}
                isLoading={disable2FAMutation.isPending}
            />

            {/* Logout All Devices Dialog */}
            <ConfirmDialog
                isOpen={showLogoutAllConfirm}
                title="Log Out All Devices"
                message="This will log you out from all devices except the current one. Continue?"
                confirmLabel="Log Out All"
                variant="warning"
                onConfirm={() => { logoutAllMutation.mutate(); setShowLogoutAllConfirm(false); }}
                onCancel={() => setShowLogoutAllConfirm(false)}
                isLoading={logoutAllMutation.isPending}
            />
        </div>
    );
};

export default SecuritySettingsPage;
