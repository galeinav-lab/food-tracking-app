import { type FormEvent, type JSX, useCallback, useEffect, useMemo, useState } from "react";
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
import {
    addMonthsToDateString,
    dateStringToDayNumber,
    formatDateLabel,
    formatDateShort,
    todayInTimeZone,
} from "../../utils/date";
import { colors, chartTheme } from "../../styles/colors";
import "./Weight.css";

const ACTUAL_COLOR = colors.accent;
const TARGET_COLOR = colors.muted;

interface ChartPoint {
    date: string;
    actual: number | null;
    target: number | null;
}

function Weight(): JSX.Element {
    const user = useAppSelector((state) => state.auth.user);
    const timeZone =
        user?.preferences.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = todayInTimeZone(timeZone);

    const [entries, setEntries] = useState<IWeightEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [weightInput, setWeightInput] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rows = await weightService.list(); // all entries, ascending
            setEntries(rows);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to load weight data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const w = Number(weightInput);
        if (weightInput.trim() === "" || !Number.isFinite(w) || w < 20 || w > 500) {
            setFormError("Enter a weight between 20 and 500 kg.");
            return;
        }
        setFormError(null);
        setSubmitting(true);
        try {
            await weightService.add({ weightKg: w }); // date defaults to today (server, user tz)
            setWeightInput("");
            await loadEntries();
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : "Failed to log weight");
        } finally {
            setSubmitting(false);
        }
    };

    const onRemove = async (id: string) => {
        try {
            await weightService.remove(id);
            await loadEntries();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to remove entry");
        }
    };

    // --- Derive the target trajectory + chart data from onboarding profile data ---
    const { chartData, yDomain, summary } = useMemo(() => {
        const hasEntries = entries.length > 0;
        const goalType = user?.goalType;

        // Start point: earliest entry if logged, else the profile's (original) weight.
        const startWeight = hasEntries ? entries[0].weightKg : user?.profile?.weightKg ?? null;
        const startDate = hasEntries ? entries[0].date : today;

        // Maintain => flat target at the start weight; otherwise the onboarding target.
        const targetWeight =
            goalType === "maintain" ? startWeight : user?.targetWeightKg ?? null;
        const timeframe = user?.timeframeMonths ?? null;
        const endDate =
            startDate && timeframe ? addMonthsToDateString(startDate, timeframe) : null;

        const sDays = dateStringToDayNumber(startDate);
        const eDays = endDate ? dateStringToDayNumber(endDate) : sDays;

        const targetAt = (dateStr: string): number | null => {
            if (startWeight == null) return null;
            if (goalType === "maintain" || targetWeight == null || eDays <= sDays) {
                return startWeight;
            }
            const dDays = dateStringToDayNumber(dateStr);
            const t = Math.max(0, Math.min(1, (dDays - sDays) / (eDays - sDays)));
            return startWeight + (targetWeight - startWeight) * t;
        };

        // Union of actual dates + trajectory endpoints, sorted ascending.
        const dateSet = new Set<string>();
        entries.forEach((en) => dateSet.add(en.date));
        dateSet.add(startDate);
        if (endDate) dateSet.add(endDate);
        const dates = Array.from(dateSet).sort();

        const entryByDate = new Map(entries.map((en) => [en.date, en.weightKg]));
        const data: ChartPoint[] = dates.map((date) => ({
            date,
            actual: entryByDate.get(date) ?? null,
            target: targetAt(date),
        }));

        // Y domain padded so small changes don't look dramatic.
        const weights: number[] = entries.map((en) => en.weightKg);
        if (startWeight != null) weights.push(startWeight);
        if (targetWeight != null) weights.push(targetWeight);
        let domain: [number, number] | undefined;
        if (weights.length > 0) {
            const minW = Math.min(...weights);
            const maxW = Math.max(...weights);
            const pad = Math.max(1, (maxW - minW) * 0.15);
            domain = [Math.floor(minW - pad), Math.ceil(maxW + pad)];
        }

        // Progress summary.
        const current = hasEntries ? entries[entries.length - 1].weightKg : startWeight;
        let summaryText: string | null = null;
        if (current != null && targetWeight != null) {
            const toGo = Math.abs(current - targetWeight);
            let status: string;
            if (toGo < 0.1) {
                status = "Goal reached!";
            } else if (goalType === "maintain") {
                status = "Maintaining";
            } else {
                const tToday = targetAt(today);
                const diff = tToday != null ? current - tToday : 0;
                const tol = 0.5;
                if (goalType === "gain") {
                    status = diff > tol ? "Ahead of schedule" : diff < -tol ? "A bit behind" : "On track";
                } else {
                    status = diff < -tol ? "Ahead of schedule" : diff > tol ? "A bit behind" : "On track";
                }
            }
            summaryText =
                `Current ${current.toFixed(1)} kg · Target ${targetWeight.toFixed(1)} kg · ` +
                `${toGo.toFixed(1)} kg to go · ${status}`;
        }

        return { chartData: data, yDomain: domain, summary: summaryText };
    }, [entries, user, today]);

    const recent = [...entries].reverse(); // most recent first for the list

    return (
        <div className="weight">
            <h1 className="weight-title">Weight</h1>

            <form className="weight-form" onSubmit={onSubmit}>
                <input
                    className="weight-input"
                    type="number"
                    step="0.1"
                    min="20"
                    max="500"
                    placeholder="Today's weight (kg)"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                />
                <button type="submit" className="weight-btn" disabled={submitting}>
                    {submitting ? "Saving…" : "Log"}
                </button>
            </form>
            {formError && <p className="weight-error">{formError}</p>}

            {loading && <p className="weight-hint">Loading…</p>}
            {error && <p className="weight-error">{error}</p>}

            {!loading && !error && (
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
