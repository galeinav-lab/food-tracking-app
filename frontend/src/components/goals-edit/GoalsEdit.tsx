import React, { type JSX, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { goalsService } from "../../services/goals.service";
import { ApiError } from "../../services/http-client";
import { INutrition } from "../../models/nutrition";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import WaterTargetForm from "../water-target/WaterTargetForm";
import "./GoalsEdit.css";

const FIELDS: { key: keyof INutrition; label: string; unit: string }[] = [
    { key: "calories", label: "Calories", unit: "kcal" },
    { key: "protein", label: "Protein", unit: "g" },
    { key: "carbs", label: "Carbs", unit: "g" },
    { key: "fat", label: "Fat", unit: "g" },
    { key: "fiber", label: "Fiber", unit: "g" },
];

// Form values are kept as strings (raw input) and parsed/validated on submit.
type FormValues = Record<keyof INutrition, string>;

const EMPTY: FormValues = { calories: "", protein: "", carbs: "", fat: "", fiber: "" };

function GoalsEdit(): JSX.Element {
    const navigate = useNavigate();

    const [values, setValues] = useState<FormValues>(EMPTY);
    const [loading, setLoading] = useState(true); // initial fetch
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Prefill with the current goals.
    useEffect(() => {
        let active = true;
        goalsService
            .getGoals()
            .then((goal) => {
                if (!active) return;
                setValues({
                    calories: String(goal.calories),
                    protein: String(goal.protein),
                    carbs: String(goal.carbs),
                    fat: String(goal.fat),
                    fiber: String(goal.fiber),
                });
            })
            .catch((err) => {
                if (active) setError(err instanceof ApiError ? err.message : "Failed to load goals");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const setField = (key: keyof INutrition, raw: string) => {
        setValues((prev) => ({ ...prev, [key]: raw }));
        setSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validate: every field must parse to a finite, non-negative number.
        const parsed: Partial<INutrition> = {};
        for (const { key, label } of FIELDS) {
            const raw = values[key].trim();
            const num = Number(raw);
            if (raw === "" || !Number.isFinite(num) || num < 0) {
                setError(`${label} must be a number of 0 or more.`);
                return;
            }
            parsed[key] = num;
        }

        setSaving(true);
        try {
            await goalsService.setGoals(parsed);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save goals");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="goals-edit">
                <h1 className="goals-title">Edit daily goals</h1>
                <SkeletonGroup label="Loading goals" className="goals-form glass">
                    {FIELDS.map(({ key }) => (
                        <Skeleton key={key} shape="block" height="64px" />
                    ))}
                </SkeletonGroup>
            </div>
        );
    }

    return (
        <div className="goals-edit">
            <h1 className="goals-title">Edit daily goals</h1>

            <form className="goals-form glass rise-in" onSubmit={handleSubmit}>
                {FIELDS.map(({ key, label, unit }) => (
                    <div className="field" key={key}>
                        <label className="field-label" htmlFor={`goal-${key}`}>
                            {label} ({unit})
                        </label>
                        <input
                            className="input"
                            id={`goal-${key}`}
                            type="number"
                            min="0"
                            step="1"
                            value={values[key]}
                            onChange={(e) => setField(key, e.target.value)}
                        />
                    </div>
                ))}

                {error && <p className="goals-error">{error}</p>}
                {success && <p className="goals-success">Goals saved.</p>}

                <div className="goals-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Saving…" : "Save goals"}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate("/")}>
                        Back to dashboard
                    </button>
                </div>
            </form>

            <WaterTargetForm />

            {/* Reruns the setup questions (prefilled) and lets the backend compute
                new targets — the same onboarding calculation, never frontend maths. */}
            <section className="goals-recalc glass rise-in">
                <h2 className="goals-recalc-title">Recalculate my targets</h2>
                <p className="goals-recalc-text">
                    Update your body stats and goal and get new daily targets. They apply from
                    today on; past days keep theirs.
                </p>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate("/settings/goals/recalculate")}
                >
                    Recalculate my targets
                </button>
            </section>
        </div>
    );
}

export default GoalsEdit;
