import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-lg w-full text-center">
                <div className="text-8xl font-bold text-slate-200 mb-4">404</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
                <p className="text-slate-500 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 bg-[#0066B3] text-white rounded-lg font-medium hover:bg-[#005299] transition-colors"
                    >
                        <Home size={18} />
                        Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};

export { NotFoundPage };
export default NotFoundPage;
