import { type JSX, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { userUpdated } from "../../store/auth-slice";
import { authService } from "../../services/auth.service";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { IDailySummary } from "../../models/daily-summary";
import { addDaysToDateString, todayInTimeZone } from "../../utils/date";
import { colors } from "../../styles/colors";
import "./WeeklyRing.css";

const TARGET = 7700; // kcal deficit ≈ 1 kg/week
const RING_COLOR = colors.accent;
const TRACK_COLOR = colors.track;

interface WeeklyRingProps {
    timeZone: string;
    refreshKey: number;
}

function WeeklyRing({ timeZone, refreshKey }: WeeklyRingProps): JSX.Element {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const maintenance = user?.maintenanceCalories ?? null;

    const [summaries, setSummaries] = useState<IDailySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
    }, [timeZone, refreshKey]);

    // Backfill maintenance for older accounts.
    useEffect(() => {
        if (maintenance != null) return;
        let active = true;
        authService
            .me()
            .then((fresh) => {
                if (active) dispatch(userUpdated(fresh));
            })
            .catch(() => {
                /* guard handles a still-missing value */
            });
        return () => {
            active = false;
        };
    }, [maintenance, dispatch]);

    const { deficit, kg } = useMemo(() => {
        if (maintenance == null) return { deficit: 0, kg: 0 };
        // Only days with FOOD logs count. exercise raises that day's burn.
        const d = summaries
            .filter((s) => s.logCount > 0)
            .reduce(
                (acc, s) => acc + (maintenance + (s.exerciseBurned ?? 0) - s.totals.calories),
                0
            );
        return { deficit: d, kg: d / TARGET };
    }, [summaries, maintenance]);

    // Progress ring as a 2-slice donut: filled portion vs remaining track.
    const ringValue = Math.max(0, Math.min(deficit, TARGET));
    const ringData = [
        { name: "filled", value: ringValue, color: RING_COLOR },
        { name: "rest", value: Math.max(0, TARGET - ringValue), color: TRACK_COLOR },
    ];

    return (
        <div className="ring">
            <h2 className="ring-title">Weekly burn</h2>

            {loading && <p className="ring-hint">Loading…</p>}
            {error && <p className="ring-error">{error}</p>}
            {!loading && !error && maintenance == null && (
                <p className="ring-hint">Maintenance not available yet.</p>
            )}

            {!loading && !error && maintenance != null && (
                <>
                    <div className="ring-wrap">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={ringData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius="74%"
                                    outerRadius="100%"
                                    startAngle={90}
                                    endAngle={-270}
                                    stroke="none"
                                    isAnimationActive={false}
                                >
                                    {ringData.map((d) => (
                                        <Cell key={d.name} fill={d.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="ring-center">
                            <div className="ring-num">{Math.round(deficit).toLocaleString()}</div>
                            <div className="ring-sub">/ {TARGET.toLocaleString()} kcal</div>
                            <div className="ring-kg">
                                {kg >= 0
                                    ? `≈ ${kg.toFixed(1)} kg this week`
                                    : `≈ ${Math.abs(kg).toFixed(1)} kg gained`}
                            </div>
                        </div>
                    </div>
                    <p className="ring-foot">Deficit toward 7,700 kcal (≈ 1 kg). Logged-food days only.</p>
                </>
            )}
        </div>
    );
}

export default WeeklyRing;
