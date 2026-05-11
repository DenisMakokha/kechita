import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalMenuProps {
    /** The element the menu should anchor to. */
    anchorRef: React.RefObject<HTMLElement | null>;
    isOpen: boolean;
    onClose: () => void;
    /** Tailwind width classes for the menu. */
    widthClassName?: string;
    /** Optional extra classes for the menu card. */
    className?: string;
    children: React.ReactNode;
}

/**
 * A dropdown menu that escapes any clipping ancestor (overflow-hidden /
 * overflow-x-auto) by rendering into document.body via a React portal.
 *
 * Positioning: anchored to the right edge of `anchorRef`. Auto-flips above
 * the anchor when there isn't enough room below.
 */
export function PortalMenu({ anchorRef, isOpen, onClose, widthClassName = 'w-52', className = '', children }: PortalMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; right: number; placeAbove: boolean } | null>(null);

    useLayoutEffect(() => {
        if (!isOpen || !anchorRef.current) return;
        const reposition = () => {
            const rect = anchorRef.current!.getBoundingClientRect();
            const menuHeight = menuRef.current?.offsetHeight ?? 280;
            const spaceBelow = window.innerHeight - rect.bottom;
            const placeAbove = spaceBelow < menuHeight + 16 && rect.top > menuHeight + 16;
            setCoords({
                top: placeAbove ? rect.top - 4 : rect.bottom + 4,
                right: window.innerWidth - rect.right,
                placeAbove,
            });
        };
        reposition();
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [isOpen, anchorRef]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen || !coords) return null;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[60]" onClick={onClose} />
            <div
                ref={menuRef}
                style={{
                    position: 'fixed',
                    top: coords.placeAbove ? undefined : coords.top,
                    bottom: coords.placeAbove ? window.innerHeight - coords.top : undefined,
                    right: coords.right,
                }}
                className={`z-[70] ${widthClassName} bg-white rounded-lg shadow-lg border border-slate-200 py-1 ${className}`}
                role="menu"
            >
                {children}
            </div>
        </>,
        document.body,
    );
}
