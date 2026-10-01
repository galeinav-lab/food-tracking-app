import { type JSX, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./ActionMenu.css";

export interface ActionMenuItem {
    label: string;
    onSelect: () => void;
    danger?: boolean;
    disabled?: boolean;
}

interface ActionMenuProps {
    // Accessible name of the trigger, e.g. "Meal actions".
    label: string;
    items: ActionMenuItem[];
    // An action is in flight: the trigger shows a spinner and can't be opened.
    busy?: boolean;
}

const GAP = 6; // px between trigger and popover (matches ActionMenu.css)

// Compact "⋯" button that opens a small floating list of actions. Closes on an
// outside tap, on Escape (focus returns to the trigger) and after a pick. Opens
// downward unless that would land it under the fixed bottom nav (then upward).
function ActionMenu({ label, items, busy = false }: ActionMenuProps): JSX.Element {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const firstItemRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const [up, setUp] = useState(false);

    // Decide the side before paint. Uses layout height (offsetHeight), not the
    // rect, since the entrance animation starts the popover scaled down.
    useLayoutEffect(() => {
        if (!open || !popRef.current || !triggerRef.current) return;
        const t = triggerRef.current.getBoundingClientRect();
        const h = popRef.current.offsetHeight;
        const clearance =
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-clearance")) || 0;
        const fitsBelow = t.bottom + GAP + h <= window.innerHeight - clearance;
        const fitsAbove = t.top - GAP - h >= 0;
        setUp(!fitsBelow && fitsAbove);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        firstItemRef.current?.focus();
        const onPointer = (e: PointerEvent): void => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const pick = (item: ActionMenuItem): void => {
        setOpen(false);
        item.onSelect();
    };

    return (
        <div className="amenu" ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                className={busy ? "btn btn-secondary btn-icon btn-loading" : "btn btn-secondary btn-icon"}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-busy={busy}
                disabled={busy}
                onClick={() => setOpen((o) => !o)}
            >
                {!busy && (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="12" r="1.8" />
                        <circle cx="12" cy="12" r="1.8" />
                        <circle cx="19" cy="12" r="1.8" />
                    </svg>
                )}
            </button>

            {open && (
                <div
                    ref={popRef}
                    className={up ? "amenu-pop amenu-pop-up glass-float" : "amenu-pop glass-float"}
                    role="menu"
                    aria-label={label}
                >
                    {items.map((item, i) => (
                        <button
                            key={item.label}
                            ref={i === 0 ? firstItemRef : undefined}
                            type="button"
                            role="menuitem"
                            className={item.danger ? "amenu-item amenu-item-danger" : "amenu-item"}
                            disabled={item.disabled}
                            onClick={() => pick(item)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ActionMenu;
