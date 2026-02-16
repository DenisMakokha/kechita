import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
    const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className={`${sizes[size]} border-2 border-slate-200 border-t-[#0066B3] rounded-full animate-spin`} />
        </div>
    );
};

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
    <div className="flex flex-col items-center justify-center py-20">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-500 mt-4">{message}</p>
    </div>
);

export const InlineLoader: React.FC = () => (
    <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-slate-500 ml-2">Loading...</span>
    </div>
);
