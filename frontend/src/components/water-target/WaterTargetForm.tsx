import { type FormEvent, type JSX, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { userUpdated } from "../../store/auth-slice";
import { userService } from "../../services/user.service";
import { ApiError } from "../../services/http-client";
import "./WaterTargetForm.css";

const DEFAULT_WATER_TARGET_ML = 3000;

// Daily water target, edited in litres and saved in ml via PUT /api/user/water-target
// (the backend returns the updated user, which refreshes the auth user in Redux).
// Lives on the Daily Goals page, next to the nutrition targets.
function WaterTargetForm(): JSX.Element {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);

    const [waterL, setWaterL] = useState(
        ((user?.waterTargetMl ?? DEFAULT_WATER_TARGET_ML) / 1000).toString()
    );
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async (e: FormEvent) => {
        e.preventDefault();
        const litres = Number(waterL);
        if (waterL.trim() === "" || !Number.isFinite(litres) || litres <= 0 || litres > 20) {
            setError("Enter a target between 0.1 and 20 L.");
            return;
        }
        setError(null);
        setSaving(true);
        setSaved(false);
        try {
            const updated = await userService.setWaterTarget(Math.round(litres * 1000));
            dispatch(userUpdated(updated));
            setSaved(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save water target");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="wt glass rise-in" onSubmit={save}>
            <label className="field-label" htmlFor="water-target">
                Daily water target (litres)
            </label>
            <div className="wt-row">
                <input
                    id="water-target"
                    className="input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="20"
                    value={waterL}
                    onChange={(e) => {
                        setWaterL(e.target.value);
                        setSaved(false);
                    }}
                />
                <button
                    type="submit"
                    className={saving ? "btn btn-primary btn-loading" : "btn btn-primary"}
                    disabled={saving}
                    aria-busy={saving}
                >
                    {saving ? "Saving…" : "Save"}
                </button>
            </div>
            {saved && !saving && <p className="wt-saved">Saved.</p>}
            {error && (
                <p className="form-error" role="alert">
                    {error}
                </p>
            )}
        </form>
    );
}

export default WaterTargetForm;
