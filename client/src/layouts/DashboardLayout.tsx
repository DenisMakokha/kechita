import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { useNotifications } from '../hooks/useNotifications';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Receipt,
    PiggyBank,
    BarChart3,
    UserPlus,
    Settings,
    LogOut,
    Menu,
    X,
    ClipboardCheck,
    Wallet,
    Megaphone,
    Search,
    ChevronLeft,
    ChevronRight,
    Command,
    HelpCircle,
    Lock,
    Bell,
    FileText,
    UserCheck,
    Building2,
} from 'lucide-react';
import LogoHeader from '../assets/LogoHeader.svg';

// All staff can access basic features; managers/HR get additional access
const ALL_STAFF_ROLES = ['CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'ACCOUNTANT', 'STAFF', 'HR_ASSISTANT', 'RELATIONSHIP_OFFICER', 'BDM', 'REGIONAL_ADMIN'];

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_STAFF_ROLES },
    { path: '/approvals', label: 'Approvals', icon: ClipboardCheck, roles: ALL_STAFF_ROLES },
    { path: '/announcements', label: 'Announcements', icon: Megaphone, roles: ALL_STAFF_ROLES },
    { path: '/staff-management', label: 'Staff Management', icon: Users, roles: ['CEO', 'HR_MANAGER'] },
    { path: '/leave-management', label: 'Leave', icon: Calendar, roles: ALL_STAFF_ROLES },
    { path: '/claims', label: 'Claims', icon: Receipt, roles: ALL_STAFF_ROLES },
    { path: '/loans', label: 'Loans', icon: PiggyBank, roles: ALL_STAFF_ROLES },
    { path: '/petty-cash', label: 'Petty Cash', icon: Wallet, roles: ['CEO', 'ACCOUNTANT', 'BRANCH_MANAGER', 'REGIONAL_MANAGER'] },
    { path: '/recruitment', label: 'Recruitment', icon: UserPlus, roles: ['CEO', 'HR_MANAGER', 'HR_ASSISTANT'] },
    { path: '/onboarding', label: 'Onboarding', icon: UserCheck, roles: ['CEO', 'HR_MANAGER', 'HR_ASSISTANT'] },
    { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'ACCOUNTANT', 'RELATIONSHIP_OFFICER', 'BDM'] },
    { path: '/organization', label: 'Organization', icon: Building2, roles: ['CEO', 'HR_MANAGER', 'REGIONAL_MANAGER'] },
    { path: '/audit', label: 'Audit Logs', icon: FileText, roles: ['CEO', 'HR_MANAGER'] },
    { path: '/settings', label: 'Settings', icon: Settings, roles: ['CEO', 'HR_MANAGER'] },
];

// Get time-based greeting
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
    if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    return { text: 'Good evening', emoji: '🌙' };
};

// Get current time
const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

export const DashboardLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(getCurrentTime());
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Establish WebSocket connection for real-time notifications
    useNotifications();

    const userRoles = user?.roles.map((r) => r.code) || [];
    const greeting = getGreeting();
    const firstName = (user as any)?.staff?.first_name || user?.email?.split('@')[0] || 'User';

    const filteredNav = navItems.filter((item) =>
        item.roles.some((role) => userRoles.includes(role))
    );

    // Update time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(getCurrentTime());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Keyboard shortcut for search (Cmd+K or Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
            if (e.key === 'Escape') {
                setShowSearch(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Search navigation
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchQuery.toLowerCase();
        const matchedItem = filteredNav.find(item =>
            item.label.toLowerCase().includes(query)
        );
        if (matchedItem) {
            navigate(matchedItem.path);
            setShowSearch(false);
            setSearchQuery('');
        }
    };

    const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-64';
    const mainMargin = sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64';

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Search Modal */}
            {showSearch && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
                    <div
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setShowSearch(false)}
                    />
                    <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                        <form onSubmit={handleSearch}>
                            <div className="flex items-center gap-3 p-4 border-b border-slate-200">
                                <Search className="w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search pages, staff, or actions..."
                                    className="flex-1 text-lg outline-none placeholder-slate-400"
                                    autoFocus
                                />
                                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-500 font-medium">
                                    ESC
                                </kbd>
                            </div>
                        </form>
                        <div className="p-2 max-h-80 overflow-y-auto">
                            <p className="px-3 py-2 text-xs font-medium text-slate-400 uppercase">Quick Navigation</p>
                            {filteredNav.filter(item =>
                                !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            navigate(item.path);
                                            setShowSearch(false);
                                            setSearchQuery('');
                                        }}
                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
                                    >
                                        <Icon className="w-5 h-5 text-slate-500" />
                                        <span className="font-medium text-slate-700">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full ${sidebarWidth} bg-white border-r border-slate-200 transform transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo */}
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-slate-200`}>
                    {!sidebarCollapsed && (
                        <img src={LogoHeader} alt="Kechita Capital" className="h-10" />
                    )}
                    {sidebarCollapsed && (
                        <div className="w-10 h-10 bg-gradient-to-br from-[#0066B3] to-[#00AEEF] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="text-white font-bold text-lg">K</span>
                        </div>
                    )}
                    <button
                        className="lg:hidden text-slate-500"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="p-3 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 140px)' }}>
                    {filteredNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={sidebarCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200 group relative ${isActive
                                    ? 'bg-gradient-to-r from-[#0066B3] to-[#00AEEF] text-white shadow-lg shadow-blue-500/30'
                                    : 'text-slate-600 hover:bg-blue-50 hover:text-[#0066B3]'
                                    }`}
                            >
                                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#0066B3]'} />
                                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                                {sidebarCollapsed && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                        {item.label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 bg-white">
                    {/* Collapse Toggle - Desktop Only */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className={`hidden lg:flex items-center gap-3 w-full px-3 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all mb-1 ${sidebarCollapsed ? 'justify-center' : ''}`}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                        {!sidebarCollapsed && <span className="font-medium">Collapse</span>}
                    </button>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
                        title={sidebarCollapsed ? 'Sign out' : undefined}
                    >
                        <LogOut size={20} />
                        {!sidebarCollapsed && <span className="font-medium">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className={`${mainMargin} transition-all duration-300`}>
                {/* Header */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
                    <div className="flex items-center justify-between px-6 py-3">
                        {/* Left: Mobile menu + Greeting */}
                        <div className="flex items-center gap-4">
                            <button
                                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu size={20} />
                            </button>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold text-slate-900">
                                    {greeting.text}, {firstName}! {greeting.emoji}
                                </h1>
                            </div>
                        </div>

                        {/* Center: Search */}
                        <button
                            onClick={() => setShowSearch(true)}
                            className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-w-[280px]"
                        >
                            <Search className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-400 text-sm">Search anything...</span>
                            <kbd className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded text-xs text-slate-400 font-medium border border-slate-200">
                                <Command className="w-3 h-3" />K
                            </kbd>
                        </button>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2">
                            {/* Current Time */}
                            <div className="hidden lg:block text-right mr-2">
                                <p className="text-lg font-semibold text-slate-900">{currentTime}</p>
                            </div>

                            {/* Theme Toggle */}
                            <ThemeToggle />

                            {/* Help */}
                            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                                <HelpCircle size={20} />
                            </button>

                            {/* Notification Bell */}
                            <NotificationBell />

                            {/* User Profile Dropdown */}
                            <div className="relative group pl-3 ml-2 border-l border-slate-200">
                                <button className="flex items-center gap-3 cursor-pointer">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-semibold text-slate-900">{firstName}</p>
                                        <p className="text-xs text-slate-500">
                                            {userRoles[0]?.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00AEEF] to-[#8DC63F] flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/30">
                                        {firstName.charAt(0).toUpperCase()}
                                    </div>
                                </button>
                                
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-2">
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <p className="text-sm font-semibold text-slate-900">{firstName}</p>
                                        <p className="text-xs text-slate-500">{user?.email}</p>
                                    </div>
                                    <Link
                                        to="/my-profile"
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <Users size={16} className="text-slate-400" />
                                        My Profile
                                    </Link>
                                    <Link
                                        to="/notifications"
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <Bell size={16} className="text-slate-400" />
                                        Notifications
                                    </Link>
                                    <Link
                                        to="/security"
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <Lock size={16} className="text-slate-400" />
                                        Security Settings
                                    </Link>
                                    <div className="border-t border-slate-100 mt-2 pt-2">
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                                        >
                                            <LogOut size={16} />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
