import { type JSX, type KeyboardEvent as ReactKeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
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
// Keyboard follows the WAI-ARIA menu pattern: focus starts on the first item,
// ↑/↓ move (wrapping), Home/End jump, Tab closes and moves on from the trigger.
function ActionMenu({ label, items, busy = false }: ActionMenuProps): JSX.Element {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
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
        enabledItems()[0]?.focus();
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

    function enabledItems(): HTMLButtonElement[] {
        return Array.from(popRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
    }

    // Roving focus: items are tabIndex -1, the arrow keys move between them.
    const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
        const list = enabledItems();
        const at = list.indexOf(document.activeElement as HTMLButtonElement);
        const go = (i: number): void => {
            e.preventDefault();
            list[(i + list.length) % list.length]?.focus();
        };
        if (e.key === "ArrowDown") go(at + 1);
        else if (e.key === "ArrowUp") go(at - 1);
        else if (e.key === "Home") go(0);
        else if (e.key === "End") go(list.length - 1);
        else if (e.key === "Tab") {
            // No preventDefault: with focus back on the trigger, the browser's own
            // Tab / Shift+Tab then moves past it as if the menu was never open.
            setOpen(false);
            triggerRef.current?.focus();
        }
    };

    const pick = (item: ActionMenuItem): void => {
        setOpen(false);
        triggerRef.current?.focus();
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
                // aria-disabled, not disabled: a disabled button drops keyboard
                // focus to <body> the moment a picked action starts working.
                aria-disabled={busy}
                onClick={() => {
                    if (!busy) setOpen((o) => !o);
                }}
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
                    onKeyDown={onMenuKey}
                >
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            tabIndex={-1}
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
