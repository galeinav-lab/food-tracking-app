import { type JSX, useCallback, useEffect, useMemo, useState } from "react";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import { weightService } from "../../services/weight.service";
import { ApiError } from "../../services/http-client";
import { IWeightEntry } from "../../models/weight";
import { formatDateLabel, formatDateShort, todayInTimeZone } from "../../utils/date";
import { buildWeightChart } from "../../utils/weight-chart";
import WeightEntry from "../weight-entry/WeightEntry";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import { colors, chartTheme } from "../../styles/colors";
import "./Weight.css";

const GOAL_LABEL: Record<"lose" | "maintain" | "gain", string> = {
    lose: "Lose weight",
    maintain: "Maintain weight",
    gain: "Gain weight",
};

const ACTUAL_COLOR = colors.accentLine;
const TARGET_COLOR = colors.muted;

function Weight(): JSX.Element {
    const user = useAppSelector((state) => state.auth.user);
    const navigate = useNavigate();
    const timeZone =
        user?.preferences.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = todayInTimeZone(timeZone);

    const [entries, setEntries] = useState<IWeightEntry[]>([]);
    const [loading, setLoading] = useState(true);
    // Load failure = friendly message + retry; `error` is for the remove action
    // and must not blank the chart and history.
    const [loadError, setLoadError] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        setError(null);
        try {
            const rows = await weightService.list(); // all entries, ascending
            setEntries(rows);
        } catch (err) {
            console.error("Failed to load weight data", err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const onRemove = async (id: string) => {
        try {
            await weightService.remove(id);
            await loadEntries();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to remove entry");
        }
    };

    // Trajectory + summary come from the shared builder, which is the single
    // home of this math (see utils/weight-chart.ts).
    const { chartData, yDomain, summary } = useMemo(
        () => buildWeightChart(entries, user, today),
        [entries, user, today]
    );

    const recent = [...entries].reverse(); // most recent first for the list

    return (
        <div className="weight">
            <h1 className="weight-title">Weight</h1>

            {/* The app's one weight form (components/weight-entry/). */}
            <WeightEntry onLogged={() => void loadEntries()} />

            {/* The goal (type, target weight, timeframe) as stored on the user. Changing
                it reruns the target calculation on the backend: the onboarding wizard in
                update mode, opened on its goal step and returning here. */}
            <section className="weight-goal glass" aria-label="Your goal">
                <div className="weight-goal-main">
                    <p className="weight-goal-label">Your goal</p>
                    <p className="weight-goal-value">
                        {user?.goalType ? GOAL_LABEL[user.goalType] : "No goal set yet"}
                        {user?.goalType && user.goalType !== "maintain" && user.targetWeightKg
                            ? ` · ${user.targetWeightKg} kg`
                            : ""}
                    </p>
                    {user?.timeframeMonths && user.goalType !== "maintain" ? (
                        <p className="weight-goal-sub">
                            in {user.timeframeMonths} {user.timeframeMonths === 1 ? "month" : "months"}
                        </p>
                    ) : null}
                </div>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate("/settings/goals/recalculate?start=goal&from=weight")}
                >
                    Change
                </button>
            </section>

            {loading && (
                <SkeletonGroup label="Loading weight" className="weight-skel">
                    <Skeleton shape="block" height="292px" />
                    <Skeleton shape="block" height="46px" />
                    <Skeleton shape="block" height="46px" />
                </SkeletonGroup>
            )}
            {error && <p className="weight-error">{error}</p>}

            {!loading && loadError && (
                <div>
                    <p className="weight-hint">Couldn't load your weight data.</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadEntries()}>
                        Try again
                    </button>
                </div>
            )}

            {!loading && !loadError && (
                <>
                    {chartData.length > 0 && (
                        <div className="weight-chart glass rise-in">
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatDateShort}
                                        tick={chartTheme.axisTick}
                                        axisLine={chartTheme.axisLine}
                                        tickLine={chartTheme.axisLine}
                                        minTickGap={24}
                                    />
                                    <YAxis
                                        domain={yDomain ?? ["auto", "auto"]}
                                        tick={chartTheme.axisTick}
                                        axisLine={chartTheme.axisLine}
                                        tickLine={chartTheme.axisLine}
                                        width={40}
                                        unit=""
                                    />
                                    <Tooltip
                                        formatter={(value) => `${Number(value).toFixed(1)} kg`}
                                        labelFormatter={(label) => formatDateLabel(String(label))}
                                        contentStyle={chartTheme.tooltipContentStyle}
                                        labelStyle={chartTheme.tooltipLabelStyle}
                                        itemStyle={chartTheme.tooltipItemStyle}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12, color: colors.muted }} />
                                    <Line
                                        {...chartTheme.animation}
                                        type="monotone"
                                        dataKey="actual"
                                        name="Actual"
                                        stroke={ACTUAL_COLOR}
                                        strokeWidth={2}
                                        connectNulls
                                        dot={{ r: 3 }}
                                    />
                                    <Line
                                        {...chartTheme.animation}
                                        type="monotone"
                                        dataKey="target"
                                        name="Target"
                                        stroke={TARGET_COLOR}
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {summary && <p className="weight-summary glass rise-in">{summary}</p>}

                    <h2 className="weight-list-title">Recent entries</h2>
                    {recent.length === 0 ? (
                        <p className="weight-hint">No weight logged yet.</p>
                    ) : (
                        <ul className="weight-list stagger">
                            {recent.map((en) => (
                                <li className="weight-row glass" key={en._id}>
                                    <span className="weight-row-date">{formatDateLabel(en.date)}</span>
                                    <span className="weight-row-kg">{en.weightKg.toFixed(1)} kg</span>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => onRemove(en._id)}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}

export default Weight;
