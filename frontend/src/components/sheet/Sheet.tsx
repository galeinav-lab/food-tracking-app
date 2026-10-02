import { type JSX, type MouseEvent, type ReactNode } from "react";
import "./Sheet.css";

interface SheetProps {
    // Visible heading; may contain markup (e.g. the logging sheet's day label).
    title: ReactNode;
    // Plain-text dialog name for screen readers.
    ariaLabel: string;
    onClose: () => void;
    children: ReactNode;
}

// The shared bottom sheet: dimmed scrim (tap to close), slide-up panel, drag
// handle, title row with a close button. Callers render it only while open.
function Sheet({ title, ariaLabel, onClose, children }: SheetProps): JSX.Element {
    const stop = (e: MouseEvent): void => e.stopPropagation();

    return (
        <div className="sheet-backdrop" onClick={onClose}>
            <div className="sheet glass-float" role="dialog" aria-modal="true" aria-label={ariaLabel} onClick={stop}>
                <div className="sheet-handle" aria-hidden="true" />
                <div className="sheet-head">
                    <h2 className="sheet-title">{title}</h2>
                    <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default Sheet;
