import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LogoHeader from '../assets/LogoHeader.svg';

export const PublicLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/careers" className="flex items-center gap-2">
                        <img src={LogoHeader} alt="Kechita Capital" className="h-10" />
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                            Employee Login
                        </Link>
                        <Link
                            to="/careers"
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors group"
                        >
                            View Openings
                            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 pt-12 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <img src={LogoHeader} alt="Kechita Capital" className="h-8" />
                        </div>
                        <p className="text-sm text-slate-400">
                            Powered by Nelium Systems &copy; {new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
