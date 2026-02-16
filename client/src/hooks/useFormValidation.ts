import { useState, useCallback } from 'react';

// --- Validator functions ---
export const validators = {
    required: (value: any, label = 'This field') => {
        if (value === null || value === undefined || value === '') return `${label} is required`;
        if (Array.isArray(value) && value.length === 0) return `${label} is required`;
        return null;
    },
    email: (value: string) => {
        if (!value) return null;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(value) ? null : 'Please enter a valid email address';
    },
    minLength: (min: number, label = 'This field') => (value: string) => {
        if (!value) return null;
        return value.length >= min ? null : `${label} must be at least ${min} characters`;
    },
    maxLength: (max: number, label = 'This field') => (value: string) => {
        if (!value) return null;
        return value.length <= max ? null : `${label} must be at most ${max} characters`;
    },
    minValue: (min: number, label = 'Value') => (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return null;
        return num >= min ? null : `${label} must be at least ${min}`;
    },
    maxValue: (max: number, label = 'Value') => (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return null;
        return num <= max ? null : `${label} must be at most ${max}`;
    },
    positiveNumber: (label = 'Amount') => (value: number | string) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (!value && value !== 0) return null;
        if (isNaN(num) || num <= 0) return `${label} must be greater than 0`;
        return null;
    },
    dateNotInPast: (label = 'Date') => (value: string) => {
        if (!value) return null;
        const today = new Date().toISOString().split('T')[0];
        return value >= today ? null : `${label} cannot be in the past`;
    },
    dateBefore: (otherDate: string, label = 'Start date', otherLabel = 'end date') => (value: string) => {
        if (!value || !otherDate) return null;
        return value <= otherDate ? null : `${label} must be before ${otherLabel}`;
    },
    dateAfter: (otherDate: string, label = 'End date', otherLabel = 'start date') => (value: string) => {
        if (!value || !otherDate) return null;
        return value >= otherDate ? null : `${label} must be after ${otherLabel}`;
    },
    passwordStrength: (value: string) => {
        if (!value) return null;
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
        return null;
    },
    passwordMatch: (password: string) => (value: string) => {
        if (!value) return null;
        return value === password ? null : 'Passwords do not match';
    },
    phone: (value: string) => {
        if (!value) return null;
        const re = /^\+?[\d\s-]{7,15}$/;
        return re.test(value) ? null : 'Please enter a valid phone number';
    },
};

// --- Validation rules type ---
type ValidatorFn = (value: any) => string | null;
export type ValidationRules<T> = Partial<Record<keyof T, ValidatorFn[]>>;

// --- Hook ---
export function useFormValidation<T extends Record<string, any>>(rules: ValidationRules<T>) {
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

    const validateField = useCallback((field: keyof T, value: any): string | null => {
        const fieldRules = rules[field];
        if (!fieldRules) return null;
        for (const rule of fieldRules) {
            const error = rule(value);
            if (error) return error;
        }
        return null;
    }, [rules]);

    const validateAll = useCallback((data: T): boolean => {
        const newErrors: Partial<Record<keyof T, string>> = {};
        let isValid = true;

        for (const field of Object.keys(rules) as (keyof T)[]) {
            const error = validateField(field, data[field]);
            if (error) {
                newErrors[field] = error;
                isValid = false;
            }
        }

        setErrors(newErrors);
        // Mark all fields as touched
        const allTouched: Partial<Record<keyof T, boolean>> = {};
        for (const field of Object.keys(rules) as (keyof T)[]) {
            allTouched[field] = true;
        }
        setTouched(allTouched);
        return isValid;
    }, [rules, validateField]);

    const onBlur = useCallback((field: keyof T, value: any) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error || undefined }));
    }, [validateField]);

    const onChange = useCallback((field: keyof T, value: any) => {
        // Only validate on change if already touched
        if (touched[field]) {
            const error = validateField(field, value);
            setErrors(prev => ({ ...prev, [field]: error || undefined }));
        }
    }, [touched, validateField]);

    const getFieldError = useCallback((field: keyof T): string | undefined => {
        return touched[field] ? errors[field] : undefined;
    }, [errors, touched]);

    const clearErrors = useCallback(() => {
        setErrors({});
        setTouched({});
    }, []);

    const hasErrors = Object.values(errors).some(Boolean);

    return {
        errors,
        touched,
        hasErrors,
        validateAll,
        validateField,
        onBlur,
        onChange,
        getFieldError,
        clearErrors,
    };
}

// --- Inline error component helper ---
export const fieldErrorClass = (error?: string) =>
    error ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-[#0066B3]';
