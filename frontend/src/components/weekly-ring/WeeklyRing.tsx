import { type JSX, useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { IWeeklyDeficit } from "../../models/deficit";
import { chartTheme, colors } from "../../styles/colors";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import EnergyDetails from "../energy-details/EnergyDetails";
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
    const [showDetails, setShowDetails] = useState(false);

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

    if (loading) {
        return (
            <div className="ring glass">
                <h2 className="ring-title">This week</h2>
                <SkeletonGroup label="Loading this week" className="ring-skel">
                    <Skeleton shape="circle" width="104px" />
                    <Skeleton width="70%" />
                </SkeletonGroup>
            </div>
        );
    }
    if (error) return <div className="ring glass"><h2 className="ring-title">This week</h2><p className="ring-error">{error}</p></div>;
    if (!data) return <div className="ring glass"><h2 className="ring-title">This week</h2><p className="ring-hint">No data yet.</p></div>;

    const { weeklyDeficit, projectedKg, progressToTarget } = data;

    // Ring fill = progress toward the 7,700 target, visually capped at 100% but the
    // real number is shown below. A negative weeklyDeficit (net surplus) => empty ring.
    const filledPct = Math.max(0, Math.min(progressToTarget, 1));
    const ringData = [
        { name: "filled", value: filledPct, color: RING_COLOR },
        { name: "rest", value: 1 - filledPct, color: TRACK_COLOR },
    ];

    const kgAbs = Math.abs(projectedKg).toFixed(2);
    const kgLabel = projectedKg >= 0 ? `≈ ${kgAbs} kg lost` : `≈ ${kgAbs} kg gained`;

    // Compact card: the week's deficit is the one key number. Where the target
    // comes from (BMR, TDEE) is one tap away — the info button or the card itself.
    // The sheet renders beside the card, not inside it, so taps in the sheet
    // (e.g. its scrim closing it) never bubble into the card's own click.
    return (
        <>
            <div className="ring glass ring-compact" onClick={() => setShowDetails(true)}>
                <div className="ring-head">
                    <h2 className="ring-title">This week</h2>
                    <button
                        type="button"
                        className="btn btn-secondary btn-icon ring-info"
                        aria-label="Where your target comes from"
                        aria-haspopup="dialog"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDetails(true);
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 11v5M12 8h.01" />
                        </svg>
                    </button>
                </div>

                <div className="ring-wrap">
                    <ResponsiveContainer width="100%" height={112}>
                        <PieChart>
                            <Pie
                                data={ringData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius="76%"
                                outerRadius="100%"
                                startAngle={90}
                                endAngle={-270}
                                stroke="none"
                                {...chartTheme.animation}
                            >
                                {ringData.map((d) => (
                                    <Cell key={d.name} fill={d.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="ring-center">
                        <div className="ring-num">{Math.round(weeklyDeficit).toLocaleString()}</div>
                        <div className="ring-sub">kcal</div>
                    </div>
                </div>

                <p className="ring-kg">{kgLabel}</p>
            </div>

            {showDetails && <EnergyDetails week={data} target={TARGET} onClose={() => setShowDetails(false)} />}
        </>
    );
}

export default WeeklyRing;
