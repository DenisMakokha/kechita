import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of the input value, updated only after
 * the value has remained stable for `delay` ms. Useful for search inputs
 * to avoid filtering/re-rendering large lists on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

export default useDebounce;
