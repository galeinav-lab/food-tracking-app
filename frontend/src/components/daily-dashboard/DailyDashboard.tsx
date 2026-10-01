import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { goalsService } from "../../services/goals.service";
import { foodService } from "../../services/food.service";
import { IGoal } from "../../models/goal";
import { INutrition } from "../../models/nutrition";
import Ring from "../ring/Ring";
import { colors } from "../../styles/colors";
import "./DailyDashboard.css";

const ZERO: INutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
const fmt = (n: number): string => Math.round(n).toLocaleString();

// All four goal nutrients render as IDENTICAL rings in a 2×2 grid (fiber included).
const MACROS: { key: "protein" | "carbs" | "fat" | "fiber"; label: string; color: string }[] = [
    { key: "protein", label: "Protein", color: colors.macroProtein },
    { key: "carbs", label: "Carbs", color: colors.macroCarbs },
    { key: "fat", label: "Fat", color: colors.macroFat },
    { key: "fiber", label: "Fiber", color: colors.macroFiber },
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
    // The dashboard has no actions of its own — its only failure is the load.
    const [loadError, setLoadError] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Named so the retry button re-runs exactly what the effect runs. The request
    // counter replaces the old `active` flag: a response only lands if it's still
    // the newest request (retry included).
    const reqId = useRef(0);
    const load = useCallback(async () => {
        const id = ++reqId.current;
        setLoading(true);
        setLoadError(false);
        try {
            const [g, day] = await Promise.all([
                goalsService.getGoals(),
                foodService.getDay(date),
            ]);
            if (id !== reqId.current) return;
            setGoals(g);
            setConsumed(day.summary?.totals ?? ZERO);
        } catch (err) {
            if (id !== reqId.current) return;
            console.error("Failed to load dashboard", err);
            setLoadError(true);
        } finally {
            if (id === reqId.current) setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    if (loading) return <div className="card glass dash-msg">Loading…</div>;
    if (loadError) {
        return (
            <div className="card glass dash-msg">
                <p>Couldn't load your dashboard.</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>
                    Try again
                </button>
            </div>
        );
    }
    if (!goals) return <div className="card glass dash-msg">No goals set.</div>;

    const calGoal = goals.calories;
    const calEaten = consumed.calories;
    const calPct = calGoal > 0 ? (calEaten / calGoal) * 100 : 0;
    const remaining = Math.max(0, Math.round(calGoal - calEaten));
    const over = calEaten > calGoal;

    return (
        <div className="dash">
            <button
                type="button"
                className="card glass dash-hero"
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
                                <div className="card glass macro" key={key}>
                                    <Ring pct={pct} size={96} stroke={9} color={color} label={`${label} ${fmt(c)} of ${fmt(g)} g`}>
                                        <span className="macro-g">{fmt(c)}</span>
                                    </Ring>
                                    <span className="macro-label">{label}</span>
                                    <span className="macro-of">/ {fmt(g)} g</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DailyDashboard;
