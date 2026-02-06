import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api from '../lib/api';
import {
    Mail, Lock, Eye, EyeOff, Users, Calendar, Receipt,
    TrendingUp, Shield, CheckCircle, ArrowRight
} from 'lucide-react';
import LogoHeader from '../assets/LogoHeader.svg';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            const { access_token, refresh_token } = response.data;

            localStorage.setItem('token', access_token);
            localStorage.setItem('refresh_token', refresh_token);

            const meResponse = await api.get('/auth/me');
            login(access_token, meResponse.data);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: Users, text: 'Manage staff records effortlessly', color: 'bg-blue-500' },
        { icon: Calendar, text: 'Track leave and attendance', color: 'bg-emerald-500' },
        { icon: Receipt, text: 'Process claims and expenses', color: 'bg-amber-500' },
        { icon: TrendingUp, text: 'Generate insightful reports', color: 'bg-[#0066B3]' },
    ];

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white">
                <div className="w-full max-w-md mx-auto">
                    {/* Logo */}
                    <div className="mb-10">
                        <div className="flex items-center gap-4 mb-8">
                            <img src={LogoHeader} alt="Kechita Capital" className="h-14" />
                            <span className="text-2xl font-bold text-slate-800">KECHITA CAPITAL</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                            Welcome back!
                        </h1>
                        <p className="text-slate-500 text-lg">
                            Sign in to manage your workforce and streamline HR operations.
                        </p>
                    </div>

                    {/* Login Form */}
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
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent focus:bg-white transition-all"
                                    placeholder="you@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent focus:bg-white transition-all"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link
                                to="/forgot-password"
                                className="text-sm font-medium text-[#0066B3] hover:text-[#005599] transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="mt-10 text-center text-slate-400 text-sm">
                        Powered by <span className="font-medium text-slate-600">Nelium Systems</span>
                    </p>
                </div>
            </div>

            {/* Right Panel - Hero/Features */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0066B3] via-[#0077CC] to-[#00AEEF] p-12 flex-col justify-between relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <h2 className="text-4xl font-bold text-white mb-4">
                        Streamline Your HR Operations
                    </h2>
                    <p className="text-blue-100 text-lg max-w-md">
                        A comprehensive platform to manage your workforce, from onboarding to offboarding and everything in between.
                    </p>
                </div>

                {/* Features List */}
                <div className="relative z-10 space-y-4">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors"
                        >
                            <div className={`w-10 h-10 ${feature.color} rounded-lg flex items-center justify-center shadow-lg`}>
                                <feature.icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-white font-medium">{feature.text}</span>
                            <CheckCircle className="w-5 h-5 text-emerald-400 ml-auto" />
                        </div>
                    ))}
                </div>

                {/* Social Proof */}
                <div className="relative z-10 flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white flex items-center justify-center text-slate-600 font-medium text-sm"
                            >
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className="text-white font-medium">Join 500+ staff members</p>
                        <p className="text-blue-200 text-sm">Already using Kechita Portal</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
