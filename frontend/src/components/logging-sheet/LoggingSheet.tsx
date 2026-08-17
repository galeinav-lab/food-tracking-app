import { type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useRefresh } from "../../context/refresh-context";
import { formatDateLabel, todayInTimeZone } from "../../utils/date";
import FoodLog from "../food-log/FoodLog";
import ExerciseLog from "../exercise-log/ExerciseLog";
import SavedFoodPicker from "../saved-food-picker/SavedFoodPicker";
import LabelScanner from "../label-scanner/LabelScanner";
import "./LoggingSheet.css";

export type LogMode = "meal" | "workout" | "saved" | "scan";

interface LoggingSheetProps {
    open: boolean;
    mode: LogMode;
    onClose: () => void;
}

// Bottom sheet for logging. Shows ONE form depending on the chosen mode (meal or
// workout). Both attach to the dashboard's selected date and, on success, refresh
// the day + close + return to the dashboard so the user sees the update.
function LoggingSheet({ open, mode, onClose }: LoggingSheetProps): JSX.Element | null {
    const { bump, timeZone, selectedDate } = useRefresh();
    const navigate = useNavigate();

    const handleLogged = (): void => {
        bump();
        onClose();
        navigate("/");
    };

    if (!open) return null;

    const isToday = selectedDate === todayInTimeZone(timeZone);
    const dayLabel = isToday ? "today" : formatDateLabel(selectedDate);
    const title =
        mode === "meal"
            ? "Log meal"
            : mode === "workout"
              ? "Log workout"
              : mode === "saved"
                ? "Saved foods"
                : "Scan label";

    return (
        <div className="sheet-backdrop" onClick={onClose}>
            <div
                className="sheet"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sheet-handle" />
                <div className="sheet-head">
                    <h2 className="sheet-title">
                        {title} <span className="sheet-day">· {dayLabel}</span>
                    </h2>
                    <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>

                <div className="sheet-body">
                    <section className="sheet-section">
                        {mode === "meal" && <FoodLog date={selectedDate} onLogged={handleLogged} />}
                        {mode === "workout" && (
                            <ExerciseLog date={selectedDate} onLogged={handleLogged} />
                        )}
                        {mode === "saved" && (
                            <SavedFoodPicker date={selectedDate} onLogged={handleLogged} />
                        )}
                        {/* Scanning creates a saved food (it doesn't log to a day), so
                            it just closes the sheet — no day refresh needed. */}
                        {mode === "scan" && <LabelScanner onSaved={onClose} />}
                    </section>
                </div>
            </div>
        </div>
    );
}

export default LoggingSheet;
