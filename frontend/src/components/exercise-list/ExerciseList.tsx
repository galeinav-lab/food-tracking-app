import { type JSX, useCallback, useEffect, useState } from "react";
import { exerciseService } from "../../services/exercise.service";
import { ApiError } from "../../services/http-client";
import { IExerciseEntry } from "../../models/exercise";
import "./ExerciseList.css";

interface ExerciseListProps {
    // The dashboard's selected calendar day (YYYY-MM-DD, user tz).
    date: string;
    // Bumping this re-fetches the day's entries (e.g. after logging a workout).
    refreshKey: number;
    // Bubbled after a remove so the whole day (this list + dashboard rings) refreshes.
    onChanged: () => void;
}

const fmt = (n: number): string => Math.round(n).toLocaleString();

// The selected day's logged exercises, as cards — same visual language as the
// meals section. Sits under the meal list on the dashboard.
function ExerciseList({ date, refreshKey, onChanged }: ExerciseListProps): JSX.Element {
    const [entries, setEntries] = useState<IExerciseEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setEntries(await exerciseService.list({ date }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to load exercise");
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    const onRemove = async (id: string): Promise<void> => {
        setBusyId(id);
        setError(null);
        try {
            await exerciseService.remove(id);
            await load();
            onChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to remove entry");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="exercise-section">
            <h2 className="exercise-section-title">Exercise</h2>

            {loading && <p className="exercise-section-hint">Loading…</p>}
            {error && <p className="exercise-section-error">{error}</p>}
            {!loading && !error && entries.length === 0 && (
                <p className="exercise-section-hint">No exercise logged.</p>
            )}

            {!loading &&
                !error &&
                entries.map((en) => (
                    <div className="ex-card glass" key={en._id}>
                        <div className="ex-card-head">
                            <div className="ex-thumb" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6.5 6.5 17.5 17.5" />
                                    <path d="m21 21-1-1" />
                                    <path d="m3 3 1 1" />
                                    <path d="m18 22 4-4" />
                                    <path d="m2 6 4-4" />
                                    <path d="m3 10 7-7" />
                                    <path d="m14 21 7-7" />
                                </svg>
                            </div>
                            <div className="ex-card-main">
                                <p className="ex-type">{en.type}</p>
                                <div className="ex-dots">
                                    <span className="ex-dot ex-dot-cal">{fmt(en.caloriesBurned)} kcal</span>
                                    {en.durationMin ? (
                                        <span className="ex-dot">{fmt(en.durationMin)} min</span>
                                    ) : null}
                                </div>
                                {en.note && <p className="ex-note">{en.note}</p>}
                            </div>
                            <button
                                type="button"
                                className="ex-remove"
                                onClick={() => onRemove(en._id)}
                                disabled={busyId === en._id}
                            >
                                {busyId === en._id ? "Removing…" : "Remove"}
                            </button>
                        </div>
                    </div>
                ))}
        </div>
    );
}

export default ExerciseList;
