import { type JSX, useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { IWeeklyDeficit } from "../../models/deficit";
import { colors } from "../../styles/colors";
import "./WeeklyRing.css";

const TARGET = 7700; // kcal deficit ≈ 1 kg/week
const RING_COLOR = colors.accent;
const TRACK_COLOR = colors.track;

interface WeeklyRingProps {
    // The selected calendar day; the ring shows THAT day's Sun–Sat week.
    date: string;
    refreshKey: number;
}

// Weekly deficit progress ring. All numbers come from GET /api/food/deficit —
// this component does NO deficit math, it only displays what the endpoint returns.
function WeeklyRing({ date, refreshKey }: WeeklyRingProps): JSX.Element {
    const [data, setData] = useState<IWeeklyDeficit | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        foodService
            .getWeeklyDeficit(date)
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
    }, [date, refreshKey]);

    if (loading) return <div className="ring glass"><h2 className="ring-title">This week</h2><p className="ring-hint">Loading…</p></div>;
    if (error) return <div className="ring glass"><h2 className="ring-title">This week</h2><p className="ring-error">{error}</p></div>;
    if (!data) return <div className="ring glass"><h2 className="ring-title">This week</h2><p className="ring-hint">No data yet.</p></div>;

    const { weeklyDeficit, projectedKg, progressToTarget, loggedDayCount } = data;

    // Ring fill = progress toward the 7,700 target, visually capped at 100% but the
    // real number is shown below. A negative weeklyDeficit (net surplus) => empty ring.
    const filledPct = Math.max(0, Math.min(progressToTarget, 1));
    const ringData = [
        { name: "filled", value: filledPct, color: RING_COLOR },
        { name: "rest", value: 1 - filledPct, color: TRACK_COLOR },
    ];

    const kgAbs = Math.abs(projectedKg).toFixed(2);
    const kgLabel = projectedKg >= 0 ? `≈ ${kgAbs} kg lost` : `≈ ${kgAbs} kg gained`;

    return (
        <div className="ring glass">
            <h2 className="ring-title">This week so far</h2>

            <div className="ring-wrap">
                <ResponsiveContainer width="100%" height={190}>
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
                            isAnimationActive={true}
                            animationDuration={550}
                            animationEasing="ease-out"
                        >
                            {ringData.map((d) => (
                                <Cell key={d.name} fill={d.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="ring-center">
                    <div className="ring-num">{Math.round(weeklyDeficit).toLocaleString()}</div>
                    <div className="ring-sub">/ {TARGET.toLocaleString()} kcal</div>
                    <div className="ring-kg">{kgLabel}</div>
                </div>
            </div>

            <p className="ring-foot">
                {loggedDayCount} of 7 days logged · deficit toward 7,700 kcal (≈ 1 kg)
            </p>
        </div>
    );
}

export default WeeklyRing;
