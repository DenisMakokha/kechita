import { useEffect } from 'react';

/**
 * Invokes `handler` when the user presses Escape, as long as `active` is true.
 * Use this in any ad-hoc modal that doesn't go through the shared <Modal /> component.
 */
export function useEscKey(active: boolean, handler: () => void) {
    useEffect(() => {
        if (!active) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handler(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [active, handler]);
}

export default useEscKey;
