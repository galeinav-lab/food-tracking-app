import React, { type JSX, useState } from "react";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import "./FoodLog.css";

interface FoodLogProps {
    // The selected calendar day to attach the meal to (YYYY-MM-DD, user tz).
    date: string;
    // Called after a meal is successfully logged, so a parent can refresh
    // dependent data (the daily dashboard totals and the meal list).
    onLogged?: () => void;
}

// Just the meal-entry form. The logged meal appears as a card in the meal list
// (one card per meal) rather than as an inline per-item preview here.
function FoodLog({ date, onLogged }: FoodLogProps): JSX.Element {
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;

        setLoading(true);
        setError(null);
        try {
            await foodService.logFood({ description, date });
            setDescription("");
            onLogged?.();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="food-log">
            <form className="food-form" onSubmit={handleSubmit}>
                <textarea
                    className="food-input"
                    placeholder="e.g. 2 eggs, toast with butter, orange juice"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                />
                <button className="food-btn" type="submit" disabled={loading || !description.trim()}>
                    {loading ? "Analyzing…" : "Log meal"}
                </button>
            </form>

            {loading && <p className="hint">Analyzing your meal with AI…</p>}
            {error && <p className="food-error">{error}</p>}
        </div>
    );
}

export default FoodLog;
