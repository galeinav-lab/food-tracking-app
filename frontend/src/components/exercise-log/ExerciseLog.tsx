import { type FormEvent, type JSX, useState } from "react";
import { exerciseService } from "../../services/exercise.service";
import { ApiError } from "../../services/http-client";
import "./ExerciseLog.css";

interface ExerciseLogProps {
    // The selected calendar day to attach the entry to (YYYY-MM-DD, user tz).
    date: string;
    // Called after a successful add so a parent can refresh + close/redirect.
    onLogged: () => void;
}

// Exercise ENTRY FORM only. The logged-exercise list now lives on the dashboard
// (ExerciseList), mirroring the meals section.
function ExerciseLog({ date, onLogged }: ExerciseLogProps): JSX.Element {
    const [type, setType] = useState("");
    const [calories, setCalories] = useState("");
    const [duration, setDuration] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const cal = Number(calories);
        if (!type.trim()) {
            setFormError("Enter an exercise type.");
            return;
        }
        if (calories.trim() === "" || !Number.isFinite(cal) || cal < 0 || cal > 20000) {
            setFormError("Enter calories burned (0–20,000).");
            return;
        }
        const dur = duration.trim() === "" ? undefined : Number(duration);
        if (dur != null && (!Number.isFinite(dur) || dur < 0)) {
            setFormError("Duration must be a positive number.");
            return;
        }

        setFormError(null);
        setSubmitting(true);
        try {
            await exerciseService.add({
                type: type.trim(),
                caloriesBurned: cal,
                durationMin: dur,
                note: note.trim() || undefined,
                date,
            });
            setType("");
            setCalories("");
            setDuration("");
            setNote("");
            onLogged();
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : "Failed to log exercise");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="exercise-log">
            <form className="exercise-form" onSubmit={onSubmit}>
                <input
                    className="exercise-input exercise-type"
                    placeholder="Type (e.g. run)"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                />
                <input
                    className="exercise-input"
                    type="number"
                    placeholder="kcal"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                />
                <input
                    className="exercise-input"
                    type="number"
                    placeholder="min"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                />
                <input
                    className="exercise-input exercise-note"
                    placeholder="note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <button className="exercise-btn" type="submit" disabled={submitting}>
                    {submitting ? "Saving…" : "Add workout"}
                </button>
            </form>
            {formError && <p className="exercise-error">{formError}</p>}
        </div>
    );
}

export default ExerciseLog;
