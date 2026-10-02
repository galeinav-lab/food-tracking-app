import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { strengthService } from "../../services/strength.service";
import { ApiError } from "../../services/http-client";
import {
    ICreateStrengthExerciseInput,
    IStrengthExercise,
    MUSCLE_GROUPS,
    MuscleGroup,
} from "../../models/strength";
import StrengthEditor, { StrengthFormValues } from "./editor/StrengthEditor";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import "./Strength.css";

// Tab labels — the model's lowercase enum, title-cased for display.
const GROUP_LABEL: Record<MuscleGroup, string> = {
    back: "Back",
    chest: "Chest",
    biceps: "Biceps",
    triceps: "Triceps",
    shoulders: "Shoulders",
    abs: "Abs",
    legs: "Legs",
};

// One plate on each side of a barbell — the smallest jump most gyms allow, and
// the reason weightKg accepts decimals.
const STEP_KG = 2.5;
const MAX_KG = 1000;
// How long to wait after the last +/- tap before sending the PATCH, so holding
// the button through 60 -> 70 costs one request instead of four.
const BUMP_DEBOUNCE_MS = 600;

const clampKg = (n: number): number =>
    Math.min(MAX_KG, Math.max(0, Math.round(n * 100) / 100));

// 60 -> "60", 62.5 -> "62.5" (never "62.50").
const fmtKg = (n: number): string => String(Number(n.toFixed(2)));

/**
 * The strength-training list: the user's exercises per muscle group, edited in
 * place. Completely separate from calorie tracking — nothing here is dated and
 * nothing feeds the daily summary or deficit.
 *
 * Data strategy: fetch EVERY exercise once on mount and slice it per tab in
 * memory, so switching tabs is instant and never shows a spinner. Create/edit/
 * delete patch the local list too — no refetch on the happy path.
 */
function Strength(): JSX.Element {
    const [all, setAll] = useState<IStrengthExercise[]>([]);
    const [loading, setLoading] = useState(true);
    // The list fetch failing is a whole-page state (friendly message + retry);
    // `error` is for action failures (delete, weight save) and leaves the list up.
    const [loadError, setLoadError] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [group, setGroup] = useState<MuscleGroup>(MUSCLE_GROUPS[0]);

    // Editor sheet: `target` null = creating in the active tab.
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<IStrengthExercise | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Debounced weight bumps: id -> latest weight not yet sent, and its timer.
    const pending = useRef(new Map<string, number>());
    const timers = useRef(new Map<string, number>());

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        setError(null);
        try {
            // No muscleGroup filter on purpose — one fetch feeds all 7 tabs.
            setAll(await strengthService.list());
        } catch (err) {
            // The backend's wording is for us, not the user: log it, show a
            // friendly message. (The http interceptor has already reported it.)
            console.error("Failed to load exercises", err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const visible = useMemo(
        () => all.filter((ex) => ex.muscleGroup === group),
        [all, group]
    );

    // Per-tab counts, so the user can see which groups hold something without
    // tapping through all seven.
    const counts = useMemo(() => {
        const map = {} as Record<MuscleGroup, number>;
        for (const g of MUSCLE_GROUPS) map[g] = 0;
        for (const ex of all) map[ex.muscleGroup] += 1;
        return map;
    }, [all]);

    // Keep the selected tab on screen when the strip has scrolled.
    const tabsRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = tabsRef.current?.querySelector<HTMLElement>(".st-tab-on");
        el?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    }, [group]);

    const cancelPending = useCallback((id: string): void => {
        const timer = timers.current.get(id);
        if (timer) window.clearTimeout(timer);
        timers.current.delete(id);
        pending.current.delete(id);
    }, []);

    // Send whatever weight is queued for this exercise.
    const flush = useCallback((id: string): void => {
        const weightKg = pending.current.get(id);
        if (weightKg === undefined) return;
        cancelPending(id);

        strengthService
            .update(id, { weightKg })
            .then((saved) => {
                // Ignore a stale response if the user has already tapped again —
                // the newer local value (and its own PATCH) wins.
                if (pending.current.has(id)) return;
                setAll((list) => list.map((ex) => (ex._id === id ? saved : ex)));
            })
            .catch((err) => {
                setError(err instanceof ApiError ? err.message : "Failed to save weight");
                // The optimistic value may now be wrong — resync from the server.
                void load();
            });
    }, [cancelPending, load]);

    // THE core action: one tap changes the weight. The list updates immediately
    // and the PATCH follows once the tapping stops.
    const bumpWeight = (ex: IStrengthExercise, delta: number): void => {
        const next = clampKg(ex.weightKg + delta);
        if (next === ex.weightKg) return;

        setAll((list) => list.map((e) => (e._id === ex._id ? { ...e, weightKg: next } : e)));
        pending.current.set(ex._id, next);

        const existing = timers.current.get(ex._id);
        if (existing) window.clearTimeout(existing);
        timers.current.set(
            ex._id,
            window.setTimeout(() => flush(ex._id), BUMP_DEBOUNCE_MS)
        );
    };

    // Leaving the page mid-tap must not drop the bump — fire the queued PATCHes.
    // `flush` is stable (useCallback), so this cleanup only runs on unmount.
    useEffect(() => {
        const queued = pending.current;
        return () => {
            for (const id of Array.from(queued.keys())) flush(id);
        };
    }, [flush]);

    const openCreate = (): void => {
        setEditing(null);
        setFormError(null);
        setEditorOpen(true);
    };

    const openEdit = (ex: IStrengthExercise): void => {
        setEditing(ex);
        setFormError(null);
        setEditorOpen(true);
    };

    const closeEditor = (): void => {
        setEditorOpen(false);
        setEditing(null);
        setFormError(null);
    };

    const onSubmit = async (values: StrengthFormValues): Promise<void> => {
        setFormError(null);
        setSaving(true);
        try {
            if (editing) {
                // A queued bump would otherwise land after this save and undo it.
                cancelPending(editing._id);
                const saved = await strengthService.update(editing._id, values);
                setAll((list) => list.map((ex) => (ex._id === saved._id ? saved : ex)));
            } else {
                const created = await strengthService.create(values as ICreateStrengthExerciseInput);
                setAll((list) => [...list, created]);
                // Follow the new exercise if it was filed under another group.
                setGroup(created.muscleGroup);
            }
            closeEditor();
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : "Failed to save exercise");
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (ex: IStrengthExercise): Promise<void> => {
        cancelPending(ex._id);
        setBusyId(ex._id);
        setError(null);
        try {
            await strengthService.remove(ex._id);
            setAll((list) => list.filter((e) => e._id !== ex._id));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to delete exercise");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="st">
            <header className="st-head">
                <h1 className="st-title">Exercises</h1>
                <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                    + New
                </button>
            </header>
            <p className="st-intro">
                Your training list, one tab per muscle group. Tap −&nbsp;/&nbsp;+ to bump a
                weight — it saves itself.
            </p>

            {/* 7 tabs never fit a phone: the strip scrolls horizontally and the
                active tab is scrolled into view. */}
            <div className="st-tabs" role="tablist" aria-label="Muscle group" ref={tabsRef}>
                {MUSCLE_GROUPS.map((g) => (
                    <button
                        key={g}
                        type="button"
                        role="tab"
                        aria-selected={g === group}
                        className={g === group ? "st-tab st-tab-on" : "st-tab"}
                        onClick={() => setGroup(g)}
                    >
                        {GROUP_LABEL[g]}
                        {counts[g] > 0 && <span className="st-tab-count">{counts[g]}</span>}
                    </button>
                ))}
            </div>

            {loading && (
                <SkeletonGroup label="Loading exercises" className="card-list">
                    <Skeleton shape="block" height="104px" />
                    <Skeleton shape="block" height="104px" />
                    <Skeleton shape="block" height="104px" />
                </SkeletonGroup>
            )}
            {error && (
                <p className="form-error st-error" role="alert">
                    {error}
                </p>
            )}

            {/* Reuses the empty-state block so the failure reads like part of the
                page rather than a raw stack of server text. */}
            {!loading && loadError && (
                <div className="st-empty">
                    <p className="st-hint">Couldn't load your exercises.</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>
                        Try again
                    </button>
                </div>
            )}

            {!loading && !loadError && visible.length === 0 && (
                <div className="st-empty">
                    <p className="st-hint">
                        No {GROUP_LABEL[group].toLowerCase()} exercises yet.
                    </p>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                        + Add one
                    </button>
                </div>
            )}

            {!loading && !loadError && visible.length > 0 && (
                <div className="card-list stagger">
                    {visible.map((ex) => (
                        <div className="st-card glass" key={ex._id}>
                            <div className="st-card-top">
                                <p className="st-name">{ex.name}</p>
                                <div className="st-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => openEdit(ex)}
                                        disabled={busyId === ex._id}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className={
                                            busyId === ex._id
                                                ? "btn btn-secondary btn-sm btn-loading"
                                                : "btn btn-secondary btn-sm"
                                        }
                                        onClick={() => void onDelete(ex)}
                                        disabled={busyId === ex._id}
                                        aria-busy={busyId === ex._id}
                                    >
                                        {busyId === ex._id ? "Deleting…" : "Delete"}
                                    </button>
                                </div>
                            </div>

                            <div className="st-card-bottom">
                                <span className="st-meta">
                                    {ex.sets} × {ex.reps}
                                </span>

                                <div className="st-step">
                                    <button
                                        type="button"
                                        className="st-step-btn"
                                        onClick={() => bumpWeight(ex, -STEP_KG)}
                                        disabled={ex.weightKg === 0}
                                        aria-label={`Decrease ${ex.name} weight by ${STEP_KG} kg`}
                                    >
                                        −
                                    </button>
                                    <span
                                        className={ex.weightKg === 0 ? "st-weight st-weight-bw" : "st-weight"}
                                        aria-live="polite"
                                    >
                                        {ex.weightKg === 0 ? "Bodyweight" : `${fmtKg(ex.weightKg)} kg`}
                                    </span>
                                    <button
                                        type="button"
                                        className="st-step-btn"
                                        onClick={() => bumpWeight(ex, STEP_KG)}
                                        disabled={ex.weightKg >= MAX_KG}
                                        aria-label={`Increase ${ex.name} weight by ${STEP_KG} kg`}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editorOpen && (
                <StrengthEditor
                    // Remount on target change so the fields re-prefill.
                    key={editing?._id ?? `new-${group}`}
                    initial={editing}
                    defaultGroup={group}
                    busy={saving}
                    error={formError}
                    onSubmit={(values) => void onSubmit(values)}
                    onClose={closeEditor}
                />
            )}
        </div>
    );
}

export default Strength;
