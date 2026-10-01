import { type FormEvent, type JSX, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { savedFoodService } from "../../services/saved-food.service";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { ISavedFood } from "../../models/saved-food";
import { INutrition } from "../../models/nutrition";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import "./SavedFoodPicker.css";

interface SavedFoodPickerProps {
    // The dashboard's selected calendar day (YYYY-MM-DD) — the log attaches here.
    date: string;
    // Called after a successful log so the sheet can refresh + close.
    onLogged: () => void;
}

const fmt = (n: number): string => Math.round(n).toLocaleString();

// Scale a food's per-100 macros to an amount. Mirrors the server's math purely
// for the PREVIEW — the server recomputes it authoritatively on submit.
function scale(per100: INutrition, amount: number): INutrition {
    const factor = amount / 100;
    return {
        calories: per100.calories * factor,
        protein: per100.protein * factor,
        carbs: per100.carbs * factor,
        fat: per100.fat * factor,
        fiber: per100.fiber * factor,
    };
}

// Pick a saved food, type an amount, see the scaled macros, confirm. No AI call.
function SavedFoodPicker({ date, onLogged }: SavedFoodPickerProps): JSX.Element {
    const [foods, setFoods] = useState<ISavedFood[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    // Once a food is picked we switch to the amount step.
    const [picked, setPicked] = useState<ISavedFood | null>(null);
    const [amount, setAmount] = useState("100");
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async (q: string) => {
        setLoading(true);
        setError(null);
        try {
            setFoods(await savedFoodService.list(q.trim() || undefined));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to load saved foods");
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced search (skipped while the amount step is open).
    useEffect(() => {
        if (picked) return;
        const timer = window.setTimeout(() => {
            void load(query);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [query, picked, load]);

    const pick = (food: ISavedFood): void => {
        setPicked(food);
        setAmount("100"); // a sensible default: one "per 100" serving
        setError(null);
    };

    const submit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        if (!picked) return;

        const num = Number(amount);
        if (amount.trim() === "" || !Number.isFinite(num) || num <= 0) {
            setError("Enter an amount greater than 0.");
            return;
        }

        setError(null);
        setSubmitting(true);
        try {
            // Server scales per100 and creates a NORMAL FoodLog for this date, so
            // the day's summary / rings / deficit update like any other meal.
            await foodService.logSavedFood({ savedFoodId: picked._id, amount: num, date });
            onLogged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to log food");
            setSubmitting(false);
        }
    };

    // ── Step 2: amount + live preview ───────────────────────────────────
    if (picked) {
        const num = Number(amount);
        const valid = amount.trim() !== "" && Number.isFinite(num) && num > 0;
        const preview = scale(picked.per100, valid ? num : 0);

        return (
            <form className="sfp-amount rise-in" onSubmit={submit}>
                <button
                    type="button"
                    className="sfp-back"
                    onClick={() => setPicked(null)}
                    disabled={submitting}
                >
                    ‹ All foods
                </button>

                <h2 className="sfp-picked-name">{picked.name}</h2>
                <p className="sfp-picked-per">
                    {fmt(picked.per100.calories)} kcal per 100 {picked.baseUnit}
                </p>

                <label className="field-label sfp-label" htmlFor="sfp-amount">
                    Amount ({picked.baseUnit})
                </label>
                <div className="sfp-amount-row">
                    <input
                        id="sfp-amount"
                        className="input sfp-input"
                        type="number"
                        min="1"
                        step="1"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        autoFocus
                        disabled={submitting}
                    />
                    <span className="sfp-unit">{picked.baseUnit}</span>
                </div>

                {/* Live preview of exactly what will be logged. */}
                <div className="sfp-preview glass-inset">
                    <span className="sfp-preview-cal">{fmt(preview.calories)} kcal</span>
                    <div className="sfp-preview-macros">
                        <span className="chip chip-protein">P {fmt(preview.protein)}g</span>
                        <span className="chip chip-carbs">C {fmt(preview.carbs)}g</span>
                        <span className="chip chip-fat">F {fmt(preview.fat)}g</span>
                        <span className="chip">Fiber {fmt(preview.fiber)}g</span>
                    </div>
                </div>

                {error && (
                    <p className="form-error sfp-error" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    className={
                        submitting
                            ? "btn btn-primary btn-block btn-loading sfp-submit"
                            : "btn btn-primary btn-block sfp-submit"
                    }
                    disabled={submitting || !valid}
                    aria-busy={submitting}
                >
                    {submitting ? "Logging…" : `Log ${valid ? fmt(num) : ""} ${picked.baseUnit}`}
                </button>
            </form>
        );
    }

    // ── Step 1: search + pick ───────────────────────────────────────────
    return (
        <div className="sfp">
            <input
                className="input sfp-search"
                type="search"
                placeholder="Search saved foods…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search saved foods"
            />

            {loading && (
                <SkeletonGroup label="Loading saved foods" className="sfp-list">
                    <Skeleton shape="block" height="62px" />
                    <Skeleton shape="block" height="62px" />
                    <Skeleton shape="block" height="62px" />
                </SkeletonGroup>
            )}
            {error && (
                <p className="form-error sfp-error" role="alert">
                    {error}
                </p>
            )}

            {!loading && !error && foods.length === 0 && (
                <div className="sfp-empty">
                    {query.trim() ? (
                        <p className="sfp-hint">No saved foods match “{query.trim()}”.</p>
                    ) : (
                        <>
                            <p className="sfp-hint">
                                No saved foods yet. Saved foods let you log a food again in
                                seconds — no AI needed.
                            </p>
                            <Link to="/saved-foods" className="btn btn-primary sfp-empty-link">
                                Create your first food
                            </Link>
                            <p className="sfp-hint sfp-hint-sm">
                                Tip: you can also tap “Save food” on any logged meal.
                            </p>
                        </>
                    )}
                </div>
            )}

            {!loading && !error && foods.length > 0 && (
                <div className="sfp-list stagger">
                    {foods.map((food) => (
                        <button
                            type="button"
                            className="sfp-item glass-inset"
                            key={food._id}
                            onClick={() => pick(food)}
                        >
                            <span className="sfp-item-main">
                                <span className="sfp-item-name">{food.name}</span>
                                <span className="sfp-item-per">
                                    {fmt(food.per100.calories)} kcal · P {fmt(food.per100.protein)}g · C{" "}
                                    {fmt(food.per100.carbs)}g · F {fmt(food.per100.fat)}g
                                    <span className="sfp-item-unit"> / 100 {food.baseUnit}</span>
                                </span>
                            </span>
                            <span className="sfp-item-go" aria-hidden="true">
                                ›
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SavedFoodPicker;
