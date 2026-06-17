import React, { type JSX, useState } from "react";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { IFoodLog } from "../../models/food-log";
import "./MealCard.css";

interface MealCardProps {
    meal: IFoodLog;
    // Refresh today's data (meal list + dashboard totals) after an edit/remove.
    // Optional: omitted in read-only contexts (e.g. history).
    onChanged?: () => void;
    // Read-only hides the Edit/Remove actions (e.g. past days in history).
    readOnly?: boolean;
}

const fmt = (n: number): string => Math.round(n).toLocaleString();

// One card == one meal (a single FoodLog, which may contain several food items).
function MealCard({ meal, onChanged, readOnly = false }: MealCardProps): JSX.Element {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(meal.description);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRemove = async () => {
        setBusy(true);
        setError(null);
        try {
            await foodService.deleteLog(meal._id);
            // Parent re-fetches the day -> this card unmounts and totals update.
            onChanged?.();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to remove meal");
            setBusy(false);
        }
    };

    const startEdit = () => {
        setDraft(meal.description);
        setError(null);
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditing(false);
        setError(null);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim()) return;

        setBusy(true);
        setError(null);
        try {
            // Re-runs AIService on the new description (server-side), replacing
            // this log's items + totals and recomputing the day.
            await foodService.editLog(meal._id, { description: draft });
            setEditing(false);
            // Parent re-fetches -> card shows the new items/subtotal, totals update.
            onChanged?.();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to update meal");
        } finally {
            setBusy(false);
        }
    };

    if (editing) {
        return (
            <div className="meal-card">
                <form className="meal-edit-form" onSubmit={submitEdit}>
                    <textarea
                        className="meal-edit-input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={2}
                        disabled={busy}
                    />
                    <div className="meal-edit-actions">
                        <button type="submit" className="btn-mini" disabled={busy || !draft.trim()}>
                            {busy ? "Analyzing…" : "Save"}
                        </button>
                        <button
                            type="button"
                            className="btn-mini"
                            onClick={cancelEdit}
                            disabled={busy}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
                {error && <p className="meal-error">{error}</p>}
            </div>
        );
    }

    return (
        <div className="meal-card">
            <div className="meal-card-head">
                <div className="meal-thumb" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3v7a3 3 0 0 0 6 0V3" />
                        <path d="M6 3v18" />
                        <path d="M18 3c-1.5 0-3 1.8-3 5s1.5 4 3 4" />
                        <path d="M18 12v9" />
                    </svg>
                </div>
                <div className="meal-head-main">
                    <p className="meal-desc">{meal.description}</p>
                    <div className="meal-dots">
                        <span className="meal-dot meal-dot-cal">{fmt(meal.totals.calories)} kcal</span>
                        <span className="meal-dot meal-dot-p">P {fmt(meal.totals.protein)}g</span>
                        <span className="meal-dot meal-dot-c">C {fmt(meal.totals.carbs)}g</span>
                        <span className="meal-dot meal-dot-f">F {fmt(meal.totals.fat)}g</span>
                    </div>
                </div>
                {!readOnly && (
                    <div className="meal-actions">
                        <button type="button" className="btn-mini" onClick={startEdit} disabled={busy}>
                            Edit
                        </button>
                        <button
                            type="button"
                            className="btn-mini btn-mini-danger"
                            onClick={handleRemove}
                            disabled={busy}
                        >
                            {busy ? "Removing…" : "Remove"}
                        </button>
                    </div>
                )}
            </div>

            <ul className="meal-items">
                {meal.items.map((item, i) => (
                    <li className="meal-item" key={i}>
                        <span className="meal-item-name">
                            {item.name}{" "}
                            <span className="meal-item-qty">
                                ({item.quantity} {item.unit})
                            </span>
                        </span>
                        <span className="meal-item-macros">
                            {fmt(item.nutrition.calories)} kcal · P {fmt(item.nutrition.protein)}g · C{" "}
                            {fmt(item.nutrition.carbs)}g · F {fmt(item.nutrition.fat)}g · Fiber{" "}
                            {fmt(item.nutrition.fiber)}g
                        </span>
                    </li>
                ))}
            </ul>

            <div className="meal-subtotal">
                <span>Meal subtotal</span>
                <span>
                    {fmt(meal.totals.calories)} kcal · P {fmt(meal.totals.protein)}g · C{" "}
                    {fmt(meal.totals.carbs)}g · F {fmt(meal.totals.fat)}g · Fiber{" "}
                    {fmt(meal.totals.fiber)}g
                </span>
            </div>

            {error && <p className="meal-error">{error}</p>}
        </div>
    );
}

export default MealCard;
