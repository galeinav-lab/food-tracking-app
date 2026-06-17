import { type JSX, useEffect, useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { IDailySummary } from "../../models/daily-summary";
import { IFoodLog } from "../../models/food-log";
import { addDaysToDateString, formatDateLabel, todayInTimeZone } from "../../utils/date";
import MealCard from "../meal-card/MealCard";
import "./History.css";

const fmt = (n: number): string => Math.round(n).toLocaleString();

// Safely read a numeric field from the loosely-typed goalSnapshot, which may be
// missing entirely on older summaries (treat as "no goal").
function snapshotNumber(
    snapshot: Record<string, unknown> | null | undefined,
    key: string
): number | null {
    if (!snapshot) return null;
    const v = snapshot[key];
    return typeof v === "number" ? v : null;
}

function History(): JSX.Element {
    const timeZone =
        useAppSelector((state) => state.auth.user?.preferences.timezone) ??
        Intl.DateTimeFormat().resolvedOptions().timeZone;

    const [summaries, setSummaries] = useState<IDailySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Inline drill-down (one expanded day at a time).
    const [expanded, setExpanded] = useState<string | null>(null);
    const [dayLogs, setDayLogs] = useState<IFoodLog[]>([]);
    const [dayLoading, setDayLoading] = useState(false);
    const [dayError, setDayError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const to = todayInTimeZone(timeZone);
        const from = addDaysToDateString(to, -29); // last 30 days inclusive

        setLoading(true);
        setError(null);
        foodService
            .getSummaries({ from, to })
            .then((rows) => {
                if (!active) return;
                // Endpoint returns ascending; show most recent first.
                const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));
                setSummaries(sorted);
            })
            .catch((err) => {
                if (active) setError(err instanceof ApiError ? err.message : "Failed to load history");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [timeZone]);

    const toggleDay = async (date: string) => {
        if (expanded === date) {
            setExpanded(null);
            return;
        }
        setExpanded(date);
        setDayLogs([]);
        setDayError(null);
        setDayLoading(true);
        try {
            const day = await foodService.getDay(date);
            setDayLogs(day.logs);
        } catch (err) {
            setDayError(err instanceof ApiError ? err.message : "Failed to load that day");
        } finally {
            setDayLoading(false);
        }
    };

    return (
        <div className="history">
            <h1 className="history-title">History</h1>

            {loading && <p className="history-hint">Loading…</p>}
            {error && <p className="history-error">{error}</p>}
            {!loading && !error && summaries.length === 0 && (
                <p className="history-hint">No logged days yet.</p>
            )}

            <div className="history-list">
                {summaries.map((s) => {
                    const consumed = s.totals?.calories ?? 0;
                    const goal = snapshotNumber(s.goalSnapshot, "calories");
                    const pct = goal && goal > 0 ? (consumed / goal) * 100 : 0;
                    const isOver = goal != null && consumed > goal;
                    const isExpanded = expanded === s.date;

                    return (
                        <div className="history-day" key={s.date}>
                            <button
                                type="button"
                                className="history-row"
                                onClick={() => toggleDay(s.date)}
                            >
                                <div className="history-row-main">
                                    <span className="history-date">{formatDateLabel(s.date)}</span>
                                    <span className="history-cals">
                                        {fmt(consumed)}
                                        {goal != null ? ` / ${fmt(goal)}` : ""} kcal
                                    </span>
                                </div>
                                <div className="history-row-sub">
                                    {goal != null ? (
                                        <div className="history-bar">
                                            <div
                                                className={isOver ? "history-bar-fill over" : "history-bar-fill"}
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                        </div>
                                    ) : (
                                        <span className="history-nogoal">no goal set</span>
                                    )}
                                    <span className="history-meals">
                                        {s.logCount} {s.logCount === 1 ? "meal" : "meals"}
                                    </span>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="history-detail">
                                    {dayLoading && <p className="history-hint">Loading…</p>}
                                    {dayError && <p className="history-error">{dayError}</p>}
                                    {!dayLoading &&
                                        !dayError &&
                                        dayLogs.map((m) => <MealCard key={m._id} meal={m} readOnly />)}
                                    {!dayLoading && !dayError && (
                                        <div className="history-totals">
                                            <span>Day total</span>
                                            <span>
                                                {fmt(s.totals?.calories ?? 0)} kcal · P {fmt(s.totals?.protein ?? 0)}g · C{" "}
                                                {fmt(s.totals?.carbs ?? 0)}g · F {fmt(s.totals?.fat ?? 0)}g · Fiber{" "}
                                                {fmt(s.totals?.fiber ?? 0)}g
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default History;
