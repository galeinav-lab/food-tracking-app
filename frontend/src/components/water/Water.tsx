import { type JSX, useEffect, useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { waterService } from "../../services/water.service";
import { ApiError } from "../../services/http-client";
import { toastBus } from "../../services/toast-bus";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import "./Water.css";

const DEFAULT_TARGET_ML = 3000;
const toL = (ml: number): string => (ml / 1000).toFixed(1);
const GLASS_ML = 500; // the one quick-add amount
const UNDO_MS = 5000; // how long the Undo toast stays

interface WaterProps {
    // The dashboard's selected calendar day (YYYY-MM-DD, user tz).
    date: string;
    refreshKey: number;
}

function Water({ date, refreshKey }: WaterProps): JSX.Element {
    const target = useAppSelector((state) => state.auth.user?.waterTargetMl) ?? DEFAULT_TARGET_ML;

    const [waterMl, setWaterMl] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        waterService
            .getDay(date)
            .then((r) => {
                if (active) setWaterMl(r.waterMl);
            })
            .catch((err) => {
                if (active) setError(err instanceof ApiError ? err.message : "Failed to load water");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [date, refreshKey]);

    // Same POST /api/water for adding and undoing (negative amount). Resolves
    // true on success so the add can offer an Undo.
    const change = async (amountMl: number): Promise<boolean> => {
        setBusy(true);
        setError(null);
        try {
            // Attach to the selected day (defaults to today). Server clamps at 0.
            const r = await waterService.add({ amountMl, date });
            setWaterMl(r.waterMl); // server returns the clamped running total
            return true;
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to update water");
            return false;
        } finally {
            setBusy(false);
        }
    };

    // The card's only control: +500 ml, then a few seconds to take it back.
    const addGlass = async (): Promise<void> => {
        if (!(await change(GLASS_ML))) return;
        toastBus.show({
            kind: "success",
            headline: `Added ${GLASS_ML} ml of water`,
            action: { label: "Undo", onAction: () => void change(-GLASS_ML) },
            durationMs: UNDO_MS,
        });
    };

    const pct = target > 0 ? Math.min((waterMl / target) * 100, 100) : 0;

    return (
        <div className="water glass">
            <h2 className="water-title">Water</h2>

            {loading ? (
                <SkeletonGroup label="Loading water" className="water-skel">
                    <Skeleton width="60%" height="28px" />
                    <Skeleton height="8px" />
                    <Skeleton height="30px" />
                </SkeletonGroup>
            ) : (
                <>
                    <p className="water-amount">
                        <span className="water-num">{toL(waterMl)}</span>
                        <span className="water-of"> / {toL(target)} L</span>
                    </p>

                    <div className="water-bar">
                        {/* scaleX, not width: the fill animates on the compositor. */}
                        <div className="water-fill" style={{ transform: `scaleX(${pct / 100})` }} />
                    </div>

                    <button
                        type="button"
                        className="btn btn-secondary btn-sm btn-block water-add"
                        disabled={busy}
                        onClick={() => void addGlass()}
                    >
                        +{GLASS_ML} ml
                    </button>
                </>
            )}

            {error && (
                <p className="form-error water-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

export default Water;
