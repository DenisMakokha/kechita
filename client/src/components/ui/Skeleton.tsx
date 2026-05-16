import React from 'react';

interface SkeletonProps {
    className?: string;
    /** Number of bar rows for `SkeletonRows`. Defaults to 5. */
    rows?: number;
}

/** A single shimmering rectangle for use inline. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => (
    <div className={`animate-pulse bg-slate-200/70 rounded-md ${className}`} />
);

/** Skeleton placeholder for a generic table-style list. */
export const SkeletonRows: React.FC<SkeletonProps> = ({ rows = 5, className = '' }) => (
    <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-slate-200/70 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-1/5" />
                </div>
                <Skeleton className="h-6 w-20" />
            </div>
        ))}
    </div>
);

/** 4-tile KPI placeholder, same proportions as StatCard. */
export const SkeletonStatGrid: React.FC<{ tiles?: number }> = ({ tiles = 4 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: tiles }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-200/70 animate-pulse" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-6 w-3/4" />
                </div>
            </div>
        ))}
    </div>
);

export default Skeleton;
