import { type FormEvent, type JSX, useEffect, useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { waterService } from "../../services/water.service";
import { ApiError } from "../../services/http-client";
import "./Water.css";

const DEFAULT_TARGET_ML = 3000;
const toL = (ml: number): string => (ml / 1000).toFixed(1);

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
    const [custom, setCustom] = useState("");
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

    const change = async (amountMl: number) => {
        setBusy(true);
        setError(null);
        try {
            // Attach to the selected day (defaults to today). Server clamps at 0.
            const r = await waterService.add({ amountMl, date });
            setWaterMl(r.waterMl); // server returns the clamped running total
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to update water");
        } finally {
            setBusy(false);
        }
    };

    const onCustom = async (e: FormEvent) => {
        e.preventDefault();
        const amt = Number(custom);
        if (custom.trim() === "" || !Number.isFinite(amt) || amt <= 0 || amt > 5000) {
            setError("Enter an amount between 1 and 5000 ml.");
            return;
        }
        await change(Math.round(amt));
        setCustom("");
    };

    const pct = target > 0 ? Math.min((waterMl / target) * 100, 100) : 0;

    return (
        <div className="water">
            <div className="water-head">
                <h2 className="water-title">Water</h2>
                <span className="water-amount">
                    {toL(waterMl)} / {toL(target)} L
                </span>
            </div>

            {loading ? (
                <p className="water-hint">Loading…</p>
            ) : (
                <>
                    <div className="water-bar">
                        <div className="water-fill" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="water-actions">
                        <button type="button" className="water-btn" disabled={busy} onClick={() => change(250)}>
                            +250 ml
                        </button>
                        <button type="button" className="water-btn" disabled={busy} onClick={() => change(500)}>
                            +500 ml
                        </button>
                        <button
                            type="button"
                            className="water-btn water-undo"
                            disabled={busy}
                            onClick={() => change(-250)}
                        >
                            −250 ml
                        </button>
                        <form className="water-custom" onSubmit={onCustom}>
                            <input
                                className="water-input"
                                type="number"
                                placeholder="ml"
                                value={custom}
                                onChange={(e) => setCustom(e.target.value)}
                            />
                            <button type="submit" className="water-btn" disabled={busy}>
                                Add
                            </button>
                        </form>
                    </div>
                </>
            )}

            {error && <p className="water-error">{error}</p>}
        </div>
    );
}

export default Water;
