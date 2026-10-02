import { type JSX, useEffect, useState } from "react";
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
import { useRefresh } from "../../context/refresh-context";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { IDeficitDay, IWeeklyDeficit } from "../../models/deficit";
import { formatDateLabel, formatDateShort } from "../../utils/date";
import { colors, chartTheme } from "../../styles/colors";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import "./WeeklyCalories.css";

const fmt = (n: number): string => Math.round(n).toLocaleString();

// Custom tooltip so no-data days read clearly and logged days show their deficit.
interface TipProps {
    active?: boolean;
    payload?: Array<{ payload: IDeficitDay }>;
}
function DayTooltip({ active, payload }: TipProps): JSX.Element | null {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
        <div className="wc-tip glass-float">
            <div className="wc-tip-date">{formatDateLabel(d.date)}</div>
            {d.logged && d.eaten != null && d.deficit != null ? (
                <>
                    <div>Eaten {fmt(d.eaten)} kcal</div>
                    {d.exercise > 0 && <div>Exercise +{fmt(d.exercise)} kcal</div>}
                    <div className={d.deficit >= 0 ? "wc-tip-deficit" : "wc-tip-surplus"}>
                        {d.deficit >= 0 ? `Deficit ${fmt(d.deficit)}` : `Surplus ${fmt(-d.deficit)}`} kcal
                    </div>
                </>
            ) : (
                <div className="wc-tip-none">No food logged</div>
            )}
        </div>
    );
}

// Per-day weekly calories chart. All numbers come from GET /api/food/deficit —
// no deficit math here; it only renders perDay[]. Follows the selected date's week.
function WeeklyCalories(): JSX.Element {
    const { selectedDate, refreshKey } = useRefresh();

    const [data, setData] = useState<IWeeklyDeficit | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        foodService
            .getWeeklyDeficit(selectedDate)
            .then((res) => {
                if (active) setData(res);
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
    }, [selectedDate, refreshKey]);

    return (
        <div className="weekly">
            <h1 className="weekly-title">This week so far</h1>

            {loading && (
                <SkeletonGroup label="Loading this week" className="weekly-skel">
                    <Skeleton width="55%" />
                    <Skeleton shape="block" height="292px" />
                    <Skeleton shape="block" height="96px" />
                </SkeletonGroup>
            )}
            {error && (
                <p className="form-error" role="alert">
                    {error}
                </p>
            )}

            {!loading && !error && data && (
                <>
                    <p className="weekly-sub">
                        {data.loggedDayCount} of 7 days logged · Sun {formatDateShort(data.weekStart)} – Sat{" "}
                        {formatDateShort(data.weekEnd)}
                    </p>

                    <div className="weekly-chart glass rise-in">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart
                                data={data.perDay}
                                margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDateShort}
                                    tick={chartTheme.axisTick}
                                    axisLine={chartTheme.axisLine}
                                    tickLine={chartTheme.axisLine}
                                />
                                <YAxis
                                    tick={chartTheme.axisTick}
                                    axisLine={chartTheme.axisLine}
                                    tickLine={chartTheme.axisLine}
                                    width={44}
                                />
                                <Tooltip
                                    content={<DayTooltip />}
                                    cursor={{ fill: colors.chartCursor }}
                                />
                                <ReferenceLine
                                    y={data.maintenance}
                                    stroke={colors.muted}
                                    strokeDasharray="5 5"
                                    label={{
                                        value: "maintenance",
                                        position: "right",
                                        fontSize: 11,
                                        fill: colors.muted,
                                    }}
                                />
                                {/* `background` draws a faint track per column, so a day
                                    with no food logged shows an EMPTY track (no bar) —
                                    clearly "no data", never a zero that looks like fasting. */}
                                <Bar
                                    dataKey="eaten"
                                    radius={[4, 4, 0, 0]}
                                    background={{ fill: colors.barTrack }}
                                >
                                    {data.perDay.map((d) => (
                                        <Cell
                                            key={d.date}
                                            fill={
                                                d.deficit != null && d.deficit >= 0
                                                    ? colors.success
                                                    : colors.warning
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {data.loggedDayCount === 0 ? (
                        <p className="weekly-hint">No food logged this week yet.</p>
                    ) : (
                        <div className="weekly-summary glass rise-in">
                            {data.weeklyDeficit >= 0 ? (
                                <p className="weekly-line">
                                    Deficit so far:{" "}
                                    <strong>{fmt(data.weeklyDeficit)} kcal</strong> → about{" "}
                                    <strong>{Math.abs(data.projectedKg).toFixed(2)} kg</strong> toward loss
                                </p>
                            ) : (
                                <p className="weekly-line">
                                    Surplus so far:{" "}
                                    <strong>{fmt(-data.weeklyDeficit)} kcal</strong> → about{" "}
                                    <strong>{Math.abs(data.projectedKg).toFixed(2)} kg</strong> gained
                                </p>
                            )}
                            <p className="weekly-explainer">
                                Based on {data.loggedDayCount} logged{" "}
                                {data.loggedDayCount === 1 ? "day" : "days"} this week. Days with no food
                                logged aren't counted, so this is progress so far — not a missed goal.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default WeeklyCalories;
