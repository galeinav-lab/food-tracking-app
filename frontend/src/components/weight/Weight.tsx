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
import { useAppSelector } from "../../store/hooks";
import { weightService } from "../../services/weight.service";
import { ApiError } from "../../services/http-client";
import { IWeightEntry } from "../../models/weight";
import { formatDateLabel, formatDateShort, todayInTimeZone } from "../../utils/date";
import { buildWeightChart } from "../../utils/weight-chart";
import WeightEntry from "../weight-entry/WeightEntry";
import { colors, chartTheme } from "../../styles/colors";
import "./Weight.css";

const ACTUAL_COLOR = colors.accent;
const TARGET_COLOR = colors.muted;

function Weight(): JSX.Element {
    const user = useAppSelector((state) => state.auth.user);
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

            {loading && <p className="weight-hint">Loading…</p>}
            {error && <p className="weight-error">{error}</p>}

            {!loading && loadError && (
                <div>
                    <p className="weight-hint">Couldn't load your weight data.</p>
                    <button type="button" className="btn-mini" onClick={() => void loadEntries()}>
                        Try again
                    </button>
                </div>
            )}

            {!loading && !loadError && (
                <>
                    {chartData.length > 0 && (
                        <div className="weight-chart">
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
                                        type="monotone"
                                        dataKey="actual"
                                        name="Actual"
                                        stroke={ACTUAL_COLOR}
                                        strokeWidth={2}
                                        connectNulls
                                        dot={{ r: 3 }}
                                    />
                                    <Line
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

                    {summary && <p className="weight-summary">{summary}</p>}

                    <h2 className="weight-list-title">Recent entries</h2>
                    {recent.length === 0 ? (
                        <p className="weight-hint">No weight logged yet.</p>
                    ) : (
                        <ul className="weight-list">
                            {recent.map((en) => (
                                <li className="weight-row" key={en._id}>
                                    <span className="weight-row-date">{formatDateLabel(en.date)}</span>
                                    <span className="weight-row-kg">{en.weightKg.toFixed(1)} kg</span>
                                    <button
                                        type="button"
                                        className="weight-remove"
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
