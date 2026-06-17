import { type JSX, useState } from "react";
import { NavLink } from "react-router-dom";
import { LogMode } from "../logging-sheet/LoggingSheet";
import "./BottomNav.css";

interface BottomNavProps {
    // Open the logging sheet in the chosen mode (meal or workout).
    onAdd: (mode: LogMode) => void;
}

const navClass = ({ isActive }: { isActive: boolean }): string =>
    isActive ? "bn-item bn-active" : "bn-item";

function BottomNav({ onAdd }: BottomNavProps): JSX.Element {
    // The center + fans out into two choices; tapping outside closes them.
    const [open, setOpen] = useState(false);

    const pick = (mode: LogMode): void => {
        setOpen(false);
        onAdd(mode);
    };

    return (
        <>
            {open && (
                <div className="bn-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
            )}

            <nav className="bottomnav" aria-label="Primary">
                <NavLink to="/" end className={navClass}>
                    <svg viewBox="0 0 24 24" className="bn-icon" aria-hidden="true">
                        <path d="M3 11l9-8 9 8" />
                        <path d="M5 10v10h14V10" />
                    </svg>
                    <span className="bn-label">Home</span>
                </NavLink>

                <NavLink to="/history" className={navClass}>
                    <svg viewBox="0 0 24 24" className="bn-icon" aria-hidden="true">
                        <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7 3.3" />
                        <path d="M3 4v4h4" />
                        <path d="M12 7v5l3 2" />
                    </svg>
                    <span className="bn-label">History</span>
                </NavLink>

                <div className={open ? "bn-center bn-open" : "bn-center"}>
                    <button type="button" className="bn-fan bn-fan-meal" onClick={() => pick("meal")} tabIndex={open ? 0 : -1}>
                        <svg viewBox="0 0 24 24" className="bn-fan-icon" aria-hidden="true">
                            <path d="M3 3v7a3 3 0 0 0 6 0V3" />
                            <path d="M6 3v18" />
                            <path d="M18 3c-1.5 0-3 1.8-3 5s1.5 4 3 4" />
                            <path d="M18 12v9" />
                        </svg>
                        <span className="bn-fan-label">Meal</span>
                    </button>

                    <button type="button" className="bn-fan bn-fan-workout" onClick={() => pick("workout")} tabIndex={open ? 0 : -1}>
                        <svg viewBox="0 0 24 24" className="bn-fan-icon" aria-hidden="true">
                            <path d="M6.5 6.5 17.5 17.5" />
                            <path d="m21 21-1-1" />
                            <path d="m3 3 1 1" />
                            <path d="m18 22 4-4" />
                            <path d="m2 6 4-4" />
                            <path d="m3 10 7-7" />
                            <path d="m14 21 7-7" />
                        </svg>
                        <span className="bn-fan-label">Workout</span>
                    </button>

                    <button
                        type="button"
                        className="bn-add"
                        onClick={() => setOpen((o) => !o)}
                        aria-label="Log meal or workout"
                        aria-expanded={open}
                    >
                        <svg viewBox="0 0 24 24" className="bn-add-icon" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    </button>
                </div>

                <NavLink to="/weight" className={navClass}>
                    <svg viewBox="0 0 24 24" className="bn-icon" aria-hidden="true">
                        <path d="M4 21V10l8-5 8 5v11" />
                        <path d="M9 21v-6h6v6" />
                    </svg>
                    <span className="bn-label">Weight</span>
                </NavLink>

                <NavLink to="/settings" className={navClass}>
                    <svg viewBox="0 0 24 24" className="bn-icon" aria-hidden="true">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L16.5 3h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1z" />
                    </svg>
                    <span className="bn-label">Settings</span>
                </NavLink>
            </nav>
        </>
    );
}

export default BottomNav;
