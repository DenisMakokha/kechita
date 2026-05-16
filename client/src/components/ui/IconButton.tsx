import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Required: short, descriptive label for screen readers and tooltip. */
    label: string;
    /** Visual variant. */
    variant?: 'default' | 'danger' | 'success' | 'primary' | 'ghost';
    /** Sizing. */
    size?: 'sm' | 'md';
}

const variantClasses: Record<NonNullable<IconButtonProps['variant']>, string> = {
    default: 'text-slate-500 hover:bg-slate-100',
    danger:  'text-red-500 hover:bg-red-50',
    success: 'text-emerald-600 hover:bg-emerald-50',
    primary: 'text-[#0066B3] hover:bg-blue-50',
    ghost:   'text-slate-400 hover:text-slate-700 hover:bg-slate-50',
};

const sizeClasses: Record<NonNullable<IconButtonProps['size']>, string> = {
    sm: 'p-1.5',
    md: 'p-2',
};

/**
 * Accessible icon-only button. Always provide a descriptive `label`
 * which becomes both `aria-label` and the native tooltip.
 */
export const IconButton: React.FC<IconButtonProps> = ({
    label,
    variant = 'default',
    size = 'md',
    className = '',
    children,
    ...rest
}) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        className={`inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#0066B3]/40 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...rest}
    >
        {children}
    </button>
);

export default IconButton;
