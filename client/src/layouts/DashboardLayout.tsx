import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { NotificationBell } from '../components/notifications/NotificationBell';
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
    CheckSquare,
    Wallet,
    Megaphone,
} from 'lucide-react';

// All staff can access basic features; managers/HR get additional access
const ALL_STAFF_ROLES = ['CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'ACCOUNTANT', 'STAFF', 'HR_ASSISTANT'];

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_STAFF_ROLES },
    { path: '/approvals', label: 'Approvals', icon: ClipboardCheck, roles: ALL_STAFF_ROLES },
    { path: '/announcements', label: 'Announcements', icon: Megaphone, roles: ALL_STAFF_ROLES },
    { path: '/staff', label: 'Staff', icon: Users, roles: ['CEO', 'HR_MANAGER'] },
    { path: '/onboarding', label: 'Onboarding', icon: CheckSquare, roles: ['CEO', 'HR_MANAGER', 'HR_ASSISTANT'] },
    { path: '/leave', label: 'Leave', icon: Calendar, roles: ALL_STAFF_ROLES },
    { path: '/claims', label: 'Claims', icon: Receipt, roles: ALL_STAFF_ROLES },
    { path: '/loans', label: 'Loans', icon: PiggyBank, roles: ALL_STAFF_ROLES },
    { path: '/petty-cash', label: 'Petty Cash', icon: Wallet, roles: ['CEO', 'ACCOUNTANT', 'BRANCH_MANAGER', 'REGIONAL_MANAGER'] },
    { path: '/recruitment', label: 'Recruitment', icon: UserPlus, roles: ['CEO', 'HR_MANAGER', 'HR_ASSISTANT'] },
    { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'ACCOUNTANT'] },
    { path: '/settings', label: 'Settings', icon: Settings, roles: ['CEO', 'HR_MANAGER'] },
];


export const DashboardLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const userRoles = user?.roles.map((r) => r.code) || [];

    const filteredNav = navItems.filter((item) =>
        item.roles.some((role) => userRoles.includes(role))
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-[#003366] to-[#002244] transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h1 className="text-xl font-bold text-white">Kechita Portal</h1>
                    <button
                        className="lg:hidden text-white"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="p-4 space-y-2">
                    {filteredNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-[#0066B3] text-white shadow-lg'
                                    : 'text-slate-300 hover:bg-[#0066B3]/30 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:ml-64">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            className="lg:hidden text-slate-600"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>

                        <div className="flex items-center gap-4 ml-auto">
                            {/* Theme Toggle */}
                            <ThemeToggle />

                            {/* Notification Bell */}
                            <NotificationBell />

                            <div className="text-right">
                                <p className="text-sm font-medium text-slate-900">{user?.email}</p>
                                <p className="text-xs text-slate-500">
                                    {user?.roles.map((r) => r.code).join(', ')}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066B3] to-[#8DC63F] flex items-center justify-center text-white font-bold">
                                {user?.email?.charAt(0).toUpperCase()}
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
