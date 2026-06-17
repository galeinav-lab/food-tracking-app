import { type JSX, useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { userUpdated } from "../../store/auth-slice";
import { authService } from "../../services/auth.service";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { IDailySummary } from "../../models/daily-summary";
import { addDaysToDateString, formatDateLabel, formatDateShort, todayInTimeZone } from "../../utils/date";
import { colors, chartTheme } from "../../styles/colors";
import "./WeeklyCalories.css";

const KCAL_PER_KG = 7700;
const DEFICIT_COLOR = colors.success; // under maintenance
const SURPLUS_COLOR = colors.warning; // over maintenance

interface DayBar {
    date: string;
    eaten: number | null; // null = no logs that day (excluded from deficit)
    logged: boolean;
}

function WeeklyCalories(): JSX.Element {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const timeZone =
        user?.preferences.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const maintenance = user?.maintenanceCalories ?? null;

    const [summaries, setSummaries] = useState<IDailySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Last 7 days of summaries.
    useEffect(() => {
        let active = true;
        const to = todayInTimeZone(timeZone);
        const from = addDaysToDateString(to, -6);
        setLoading(true);
        setError(null);
        foodService
            .getSummaries({ from, to })
            .then((rows) => {
                if (active) setSummaries(rows);
            })
            .catch((err) => {
                if (active) setError(err instanceof ApiError ? err.message : "Failed to load week");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [timeZone]);

    // Ensure maintenance is available — older accounts get it backfilled by /auth/me.
    useEffect(() => {
        if (maintenance != null) return;
        let active = true;
        authService
            .me()
            .then((fresh) => {
                if (active) dispatch(userUpdated(fresh));
            })
            .catch(() => {
                /* best-effort; the guard below handles a still-missing value */
            });
        return () => {
            active = false;
        };
    }, [maintenance, dispatch]);

    const { data, loggedDays, weeklyDeficit, projectedChangeKg, yMax } = useMemo(() => {
        const to = todayInTimeZone(timeZone);
        const dates: string[] = [];
        for (let i = 6; i >= 0; i--) dates.push(addDaysToDateString(to, -i));

        const byDate = new Map(summaries.map((s) => [s.date, s]));
        const bars: DayBar[] = dates.map((date) => {
            const s = byDate.get(date);
            const logged = !!s && s.logCount > 0;
            return { date, eaten: logged && s ? s.totals.calories : null, logged };
        });

        // Only days the user actually logged count toward the deficit.
        const logged = bars.filter((b) => b.logged && b.eaten != null);
        const deficit =
            maintenance != null
                ? logged.reduce((acc, b) => acc + (maintenance - (b.eaten as number)), 0)
                : 0;

        const maxEaten = bars.reduce((m, b) => Math.max(m, b.eaten ?? 0), 0);
        const max = Math.max(maxEaten, maintenance ?? 0);

        return {
            data: bars,
            loggedDays: logged.length,
            weeklyDeficit: deficit,
            projectedChangeKg: deficit / KCAL_PER_KG,
            yMax: max > 0 ? Math.ceil((max * 1.1) / 100) * 100 : 100,
        };
    }, [summaries, maintenance, timeZone]);

    return (
        <div className="weekly">
            <h1 className="weekly-title">Weekly calories</h1>

            {loading && <p className="weekly-hint">Loading…</p>}
            {error && <p className="weekly-error">{error}</p>}

            {!loading && !error && maintenance == null && (
                <p className="weekly-hint">
                    Maintenance calories aren't available yet — complete onboarding to see this chart.
                </p>
            )}

            {!loading && !error && maintenance != null && (
                <>
                    <div className="weekly-chart">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDateShort}
                                    tick={chartTheme.axisTick}
                                    axisLine={chartTheme.axisLine}
                                    tickLine={chartTheme.axisLine}
                                />
                                <YAxis
                                    domain={[0, yMax]}
                                    tick={chartTheme.axisTick}
                                    axisLine={chartTheme.axisLine}
                                    tickLine={chartTheme.axisLine}
                                    width={44}
                                />
                                <Tooltip
                                    formatter={(value) => `${Number(value).toLocaleString()} kcal`}
                                    labelFormatter={(label) => formatDateLabel(String(label))}
                                    contentStyle={chartTheme.tooltipContentStyle}
                                    labelStyle={chartTheme.tooltipLabelStyle}
                                    itemStyle={chartTheme.tooltipItemStyle}
                                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                />
                                <ReferenceLine
                                    y={maintenance}
                                    stroke={colors.muted}
                                    strokeDasharray="5 5"
                                    label={{ value: "maintenance", position: "right", fontSize: 11, fill: colors.muted }}
                                />
                                <Bar dataKey="eaten" radius={[4, 4, 0, 0]}>
                                    {data.map((d) => (
                                        <Cell
                                            key={d.date}
                                            fill={d.eaten != null && d.eaten < maintenance ? DEFICIT_COLOR : SURPLUS_COLOR}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {loggedDays === 0 ? (
                        <p className="weekly-hint">No food logged in the last 7 days yet.</p>
                    ) : (
                        <div className="weekly-summary">
                            {weeklyDeficit >= 0 ? (
                                <p className="weekly-line">
                                    Weekly deficit: <strong>{Math.round(weeklyDeficit).toLocaleString()} kcal</strong>{" "}
                                    → about <strong>{Math.abs(projectedChangeKg).toFixed(1)} kg lost</strong> this week
                                </p>
                            ) : (
                                <p className="weekly-line">
                                    Weekly surplus:{" "}
                                    <strong>{Math.abs(Math.round(weeklyDeficit)).toLocaleString()} kcal</strong> → about{" "}
                                    <strong>{Math.abs(projectedChangeKg).toFixed(1)} kg gained</strong> this week
                                </p>
                            )}
                            <p className="weekly-explainer">
                                Based on {loggedDays} logged {loggedDays === 1 ? "day" : "days"}. ~7,700 kcal ≈ 1 kg of
                                body fat. Days with no food logged are not counted.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default WeeklyCalories;
