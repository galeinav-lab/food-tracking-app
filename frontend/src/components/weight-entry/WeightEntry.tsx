import { type FormEvent, type JSX, useState } from "react";
import { weightService } from "../../services/weight.service";
import { ApiError } from "../../services/http-client";
import "./WeightEntry.css";

interface WeightEntryProps {
    // Called after a successful save so the host can refresh its data / close.
    onLogged: () => void;
    // Prefill (e.g. today's already-logged weight) so a correction is a small edit.
    initialWeightKg?: number | null;
    autoFocus?: boolean;
}

/**
 * THE weight-logging form — the single place the "log today's weight" input
 * exists. Kept as its own component so any future entry point reuses it instead
 * of growing a second form that validates slightly differently.
 *
 * Posts with no date: the backend stamps today in the user's timezone and the
 * entry is a per-day upsert, so re-logging corrects the day instead of stacking.
 */
function WeightEntry({ onLogged, initialWeightKg = null, autoFocus = false }: WeightEntryProps): JSX.Element {
    const [weightInput, setWeightInput] = useState(
        initialWeightKg == null ? "" : String(initialWeightKg)
    );
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const onSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        const w = Number(weightInput);
        if (weightInput.trim() === "" || !Number.isFinite(w) || w < 20 || w > 500) {
            setFormError("Enter a weight between 20 and 500 kg.");
            return;
        }
        setFormError(null);
        setSubmitting(true);
        try {
            await weightService.add({ weightKg: w }); // date defaults to today (server, user tz)
            setWeightInput("");
            onLogged();
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : "Failed to log weight");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <form className="weight-form" onSubmit={(e) => void onSubmit(e)}>
                <input
                    className="weight-input"
                    type="number"
                    step="0.1"
                    min="20"
                    max="500"
                    inputMode="decimal"
                    placeholder="Today's weight (kg)"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    autoFocus={autoFocus}
                />
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Saving…" : "Log"}
                </button>
            </form>
            {formError && <p className="weight-error">{formError}</p>}
        </>
    );
}

export default WeightEntry;
