import { type JSX, useState } from "react";
import { NavLink } from "react-router-dom";
import { LogMode } from "../logging-sheet/LoggingSheet";
import { toastBus } from "../../services/toast-bus";
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

    // Placeholder actions — UI only for now, a friendly hint instead of an error.
    const comingSoon = (feature: string): void => {
        setOpen(false);
        toastBus.show({ kind: "info", headline: `${feature} is coming soon!` });
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

                {/* Fan-out, growing upward from the +: the four WORKING actions fill
                    the two thumb-reachable rows [Meal | Saved] then [Workout | Scan],
                    with the lone coming-soon placeholder [Photo] on top. */}
                <div className={open ? "bn-center bn-open" : "bn-center"}>
                    <button type="button" className="bn-fan glass-float bn-fan-meal" onClick={() => pick("meal")} tabIndex={open ? 0 : -1}>
                        <svg viewBox="0 0 24 24" className="bn-fan-icon" aria-hidden="true">
                            <path d="M3 3v7a3 3 0 0 0 6 0V3" />
                            <path d="M6 3v18" />
                            <path d="M18 3c-1.5 0-3 1.8-3 5s1.5 4 3 4" />
                            <path d="M18 12v9" />
                        </svg>
                        <span className="bn-fan-label">Meal</span>
                    </button>

                    <button type="button" className="bn-fan glass-float bn-fan-saved" onClick={() => pick("saved")} tabIndex={open ? 0 : -1}>
                        <svg viewBox="0 0 24 24" className="bn-fan-icon" aria-hidden="true">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="bn-fan-label">Saved</span>
                    </button>

                    <button type="button" className="bn-fan glass-float bn-fan-workout" onClick={() => pick("workout")} tabIndex={open ? 0 : -1}>
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

                    {/* Label scanning — a real, working action (replaced the planned
                        barcode feature). Photographs a nutrition label; the AI reads
                        it and the user confirms before it's saved. */}
                    <button
                        type="button"
                        className="bn-fan glass-float bn-fan-scan"
                        onClick={() => pick("scan")}
                        tabIndex={open ? 0 : -1}
                        aria-label="Scan a nutrition label"
                    >
                        <svg viewBox="0 0 24 24" className="bn-fan-icon" aria-hidden="true">
                            {/* viewfinder corners + label lines */}
                            <path d="M3 8V5a2 2 0 0 1 2-2h3" />
                            <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                            <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
                            <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                            <path d="M7 10h10" />
                            <path d="M7 14h6" />
                        </svg>
                        <span className="bn-fan-label">Scan</span>
                    </button>

                    {/* TODO(photo): replace comingSoon with the real photo-logging flow
                        (camera/gallery -> AI food recognition -> prefill the meal log). */}
                    <button
                        type="button"
                        className="bn-fan glass-float bn-fan-photo"
                        onClick={() => comingSoon("Photo logging")}
                        tabIndex={open ? 0 : -1}
                        aria-label="Log by photo (coming soon)"
                    >
                        <svg viewBox="0 0 24 24" className="bn-fan-icon" aria-hidden="true">
                            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                            <circle cx="12" cy="13" r="3" />
                        </svg>
                        <span className="bn-fan-label">Photo</span>
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

                {/* Strength-training list (dumbbell — same icon the Workout
                    fan action uses). Purely a list of lifts: no calorie logging. */}
                <NavLink to="/strength" className={navClass}>
                    <svg viewBox="0 0 24 24" className="bn-icon" aria-hidden="true">
                        <path d="M6.5 6.5 17.5 17.5" />
                        <path d="m21 21-1-1" />
                        <path d="m3 3 1 1" />
                        <path d="m18 22 4-4" />
                        <path d="m2 6 4-4" />
                        <path d="m3 10 7-7" />
                        <path d="m14 21 7-7" />
                    </svg>
                    <span className="bn-label">Lifts</span>
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
