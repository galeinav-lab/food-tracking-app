import { type JSX, useCallback, useEffect, useState } from "react";
import { authService } from "../../services/auth.service";
import { IUser } from "../../models/user";
import { IWeeklyDeficit } from "../../models/deficit";
import Sheet from "../sheet/Sheet";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import "./EnergyDetails.css";

const ACTIVITY_LABEL: Record<NonNullable<IUser["activityLevel"]>, string> = {
    sedentary: "Sedentary",
    light: "Light",
    moderate: "Moderate",
    active: "Active",
};

const fmt = (n: number): string => Math.round(n).toLocaleString();

interface EnergyDetailsProps {
    // The week the card is showing (from GET /api/food/deficit).
    week: IWeeklyDeficit;
    // The weekly goal the ring fills toward (display constant, ≈ 1 kg).
    target: number;
    onClose: () => void;
}

// "Where your target comes from": BMR and TDEE, both straight from the backend
// (energy.ts owns the formula). BMR comes from GET /api/auth/me (stored on the
// user); TDEE is the maintenance the deficit endpoint actually used. Nothing is
// calculated here.
function EnergyDetails({ week, target, onClose }: EnergyDetailsProps): JSX.Element {
    const [user, setUser] = useState<IUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            setUser(await authService.me());
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <Sheet title="Where your target comes from" ariaLabel="Where your target comes from" onClose={onClose}>
            <dl className="ed-list">
                <div className="ed-row">
                    <dt>
                        Resting burn <span className="ed-abbr">BMR</span>
                    </dt>
                    <dd>
                        {loading ? (
                            <SkeletonGroup label="Loading your BMR" className="ed-skel">
                                <Skeleton width="88px" />
                            </SkeletonGroup>
                        ) : typeof user?.bmr === "number" ? (
                            <>
                                <span className="ed-num">{fmt(user.bmr)}</span> kcal/day
                            </>
                        ) : (
                            <span className="ed-na">{failed ? "Couldn't load" : "Not available yet"}</span>
                        )}
                    </dd>
                </div>

                {user?.activityLevel && (
                    <div className="ed-row">
                        <dt>Activity level</dt>
                        <dd>{ACTIVITY_LABEL[user.activityLevel]}</dd>
                    </div>
                )}

                <div className="ed-row ed-row-key">
                    <dt>
                        Daily burn <span className="ed-abbr">TDEE</span>
                    </dt>
                    <dd>
                        <span className="ed-num">{fmt(week.maintenance)}</span> kcal/day
                    </dd>
                </div>
            </dl>

            {failed && (
                <button type="button" className="btn btn-secondary btn-sm ed-retry" onClick={() => void load()}>
                    Try again
                </button>
            )}

            <p className="ed-note">
                Your daily burn is your resting burn scaled by your activity level. Each day you log
                food, its deficit is your daily burn plus exercise, minus what you ate. Days without
                food logged aren't counted.
            </p>

            <p className="ed-week">
                This week: <strong>{fmt(week.weeklyDeficit)}</strong> of {fmt(target)} kcal (≈ 1 kg) ·{" "}
                {week.loggedDayCount} of 7 days logged
            </p>
        </Sheet>
    );
}

export default EnergyDetails;
