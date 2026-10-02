import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { foodService } from "../../services/food.service";
import { IDailySummary } from "../../models/daily-summary";
import { IFoodLog } from "../../models/food-log";
import { addDaysToDateString, formatDateLabel, todayInTimeZone } from "../../utils/date";
import MealCard from "../meal-card/MealCard";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
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
    // Both of this page's failures are LOADS (it has no mutations), so both get
    // the friendly message + retry rather than the backend's wording.
    const [loadError, setLoadError] = useState(false);

    // Inline drill-down (one expanded day at a time).
    const [expanded, setExpanded] = useState<string | null>(null);
    const [dayLogs, setDayLogs] = useState<IFoodLog[]>([]);
    const [dayLoading, setDayLoading] = useState(false);
    const [dayError, setDayError] = useState(false);

    // Named so the retry button can re-run exactly what the effect runs. The
    // request counter replaces the old `active` flag: a response only lands if
    // it's still the newest request (retry included).
    const summariesReq = useRef(0);
    const load = useCallback(async () => {
        const reqId = ++summariesReq.current;
        const to = todayInTimeZone(timeZone);
        const from = addDaysToDateString(to, -29); // last 30 days inclusive

        setLoading(true);
        setLoadError(false);
        try {
            const rows = await foodService.getSummaries({ from, to });
            if (reqId !== summariesReq.current) return;
            // Endpoint returns ascending; show most recent first.
            setSummaries([...rows].sort((a, b) => (a.date < b.date ? 1 : -1)));
        } catch (err) {
            if (reqId !== summariesReq.current) return;
            console.error("Failed to load history", err);
            setLoadError(true);
        } finally {
            if (reqId === summariesReq.current) setLoading(false);
        }
    }, [timeZone]);

    useEffect(() => {
        void load();
    }, [load]);

    // Split out of toggleDay so the drill-down's retry can re-run just the fetch
    // (calling toggleDay again would collapse the row instead of reloading it).
    const loadDay = useCallback(async (date: string) => {
        setDayLogs([]);
        setDayError(false);
        setDayLoading(true);
        try {
            const day = await foodService.getDay(date);
            setDayLogs(day.logs);
        } catch (err) {
            console.error("Failed to load that day", err);
            setDayError(true);
        } finally {
            setDayLoading(false);
        }
    }, []);

    const toggleDay = (date: string): void => {
        if (expanded === date) {
            setExpanded(null);
            return;
        }
        setExpanded(date);
        void loadDay(date);
    };

    return (
        <div className="history">
            <h1 className="history-title">History</h1>

            {loading && (
                <SkeletonGroup label="Loading history" className="history-list">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} shape="block" height="72px" />
                    ))}
                </SkeletonGroup>
            )}

            {!loading && loadError && (
                <div>
                    <p className="history-hint">Couldn't load your history.</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>
                        Try again
                    </button>
                </div>
            )}

            {!loading && !loadError && summaries.length === 0 && (
                <p className="history-hint">No logged days yet.</p>
            )}

            <div className="history-list stagger">
                {summaries.map((s) => {
                    const consumed = s.totals?.calories ?? 0;
                    const goal = snapshotNumber(s.goalSnapshot, "calories");
                    const pct = goal && goal > 0 ? (consumed / goal) * 100 : 0;
                    const isOver = goal != null && consumed > goal;
                    const isExpanded = expanded === s.date;

                    return (
                        <div className="history-day glass" key={s.date}>
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
                                <div className="history-detail glass-inset">
                                    {dayLoading && (
                                        <SkeletonGroup label="Loading meals" className="card-list">
                                            <Skeleton shape="block" height="96px" />
                                            <Skeleton shape="block" height="96px" />
                                        </SkeletonGroup>
                                    )}
                                    {!dayLoading && dayError && (
                                        <div>
                                            <p className="history-hint">Couldn't load that day.</p>
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => void loadDay(s.date)}
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    )}
                                    {!dayLoading && !dayError && dayLogs.length > 0 && (
                                        <div className="card-list">
                                            {dayLogs.map((m) => (
                                                <MealCard key={m._id} meal={m} readOnly />
                                            ))}
                                        </div>
                                    )}
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
