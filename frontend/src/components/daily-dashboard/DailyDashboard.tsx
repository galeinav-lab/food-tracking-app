import { type JSX, useEffect, useState } from "react";
import { goalsService } from "../../services/goals.service";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { IGoal } from "../../models/goal";
import { INutrition } from "../../models/nutrition";
import Ring from "../ring/Ring";
import { colors } from "../../styles/colors";
import "./DailyDashboard.css";

const ZERO: INutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
const fmt = (n: number): string => Math.round(n).toLocaleString();

const MACROS: { key: "protein" | "carbs" | "fat"; label: string; color: string }[] = [
    { key: "protein", label: "Protein", color: colors.macroProtein },
    { key: "carbs", label: "Carbs", color: colors.macroCarbs },
    { key: "fat", label: "Fat", color: colors.macroFat },
];

interface DailyDashboardProps {
    // The dashboard's selected calendar day (YYYY-MM-DD, user tz).
    date: string;
    refreshKey: number;
}

function DailyDashboard({ date, refreshKey }: DailyDashboardProps): JSX.Element {
    const [goals, setGoals] = useState<IGoal | null>(null);
    const [consumed, setConsumed] = useState<INutrition>(ZERO);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        Promise.all([goalsService.getGoals(), foodService.getDay(date)])
            .then(([g, day]) => {
                if (!active) return;
                setGoals(g);
                setConsumed(day.summary?.totals ?? ZERO);
            })
            .catch((err) => {
                if (active) setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [date, refreshKey]);

    if (loading) return <div className="card dash-msg">Loading…</div>;
    if (error) return <div className="card dash-msg dash-error">{error}</div>;
    if (!goals) return <div className="card dash-msg">No goals set.</div>;

    const calGoal = goals.calories;
    const calEaten = consumed.calories;
    const calPct = calGoal > 0 ? (calEaten / calGoal) * 100 : 0;
    const remaining = Math.max(0, Math.round(calGoal - calEaten));
    const over = calEaten > calGoal;

    const fiberPct = goals.fiber > 0 ? Math.min((consumed.fiber / goals.fiber) * 100, 100) : 0;

    return (
        <div className="dash">
            <button
                type="button"
                className="card dash-hero"
                onClick={() => setShowDetails((v) => !v)}
                aria-expanded={showDetails}
                aria-controls="dash-details"
            >
                <Ring pct={calPct} size={188} stroke={14} color={colors.accent} label={`${remaining} kcal left`}>
                    <span className="hero-num">{fmt(remaining)}</span>
                    <span className="hero-cap">kcal left</span>
                </Ring>
                <p className="hero-sub">
                    {fmt(calEaten)} / {fmt(calGoal)} kcal
                    {over ? ` · over by ${fmt(calEaten - calGoal)}` : ""}
                </p>
                <span className="hero-toggle">
                    {showDetails ? "Hide macros" : "Show macros"}
                    <svg
                        className={`hero-chev${showDetails ? " hero-chev-up" : ""}`}
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </span>
            </button>

            {showDetails && (
                <div id="dash-details" className="dash-details">
                    <div className="dash-macros">
                        {MACROS.map(({ key, label, color }) => {
                            const c = consumed[key];
                            const g = goals[key];
                            const pct = g > 0 ? (c / g) * 100 : 0;
                            return (
                                <div className="card macro" key={key}>
                                    <Ring pct={pct} size={74} stroke={8} color={color} label={`${label} ${fmt(c)} of ${fmt(g)} g`}>
                                        <span className="macro-g">{fmt(c)}</span>
                                    </Ring>
                                    <span className="macro-label">{label}</span>
                                    <span className="macro-of">/ {fmt(g)} g</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="card dash-fiber">
                        <div className="fiber-row">
                            <span className="fiber-label">Fiber</span>
                            <span className="fiber-val">
                                {fmt(consumed.fiber)} / {fmt(goals.fiber)} g
                            </span>
                        </div>
                        <div className="fiber-bar">
                            <div className="fiber-fill" style={{ width: `${fiberPct}%` }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DailyDashboard;
