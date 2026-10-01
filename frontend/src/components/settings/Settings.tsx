import { type FormEvent, type JSX, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout, userUpdated } from "../../store/auth-slice";
import { ActivityLevel, userService } from "../../services/user.service";
import { ApiError } from "../../services/http-client";
import "./Settings.css";

const DEFAULT_WATER_TARGET_ML = 3000;

const LEVELS: { value: ActivityLevel; label: string }[] = [
    { value: "sedentary", label: "Sedentary (little/no exercise)" },
    { value: "light", label: "Light (1–3 days/week)" },
    { value: "moderate", label: "Moderate (3–5 days/week)" },
    { value: "active", label: "Active (6–7 days/week)" },
];

const CHEVRON = (
    <svg className="settings-chev" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
    </svg>
);

function Settings(): JSX.Element {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const current: ActivityLevel = user?.activityLevel ?? "sedentary";

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Water target is edited in litres (converted to ml for storage).
    const [waterL, setWaterL] = useState(
        ((user?.waterTargetMl ?? DEFAULT_WATER_TARGET_ML) / 1000).toString()
    );
    const [waterSaving, setWaterSaving] = useState(false);
    const [waterSaved, setWaterSaved] = useState(false);
    const [waterError, setWaterError] = useState<string | null>(null);

    const onChange = async (level: ActivityLevel) => {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            // Backend recomputes maintenance and returns the updated user.
            const updated = await userService.setActivityLevel(level);
            dispatch(userUpdated(updated));
            setSaved(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to update activity level");
        } finally {
            setSaving(false);
        }
    };

    const saveWater = async (e: FormEvent) => {
        e.preventDefault();
        const litres = Number(waterL);
        if (waterL.trim() === "" || !Number.isFinite(litres) || litres <= 0 || litres > 20) {
            setWaterError("Enter a target between 0.1 and 20 L.");
            return;
        }
        setWaterError(null);
        setWaterSaving(true);
        setWaterSaved(false);
        try {
            const updated = await userService.setWaterTarget(Math.round(litres * 1000));
            dispatch(userUpdated(updated));
            setWaterSaved(true);
        } catch (err) {
            setWaterError(err instanceof ApiError ? err.message : "Failed to save water target");
        } finally {
            setWaterSaving(false);
        }
    };

    return (
        <div className="settings stagger">
            <h1 className="settings-title">Settings</h1>

            <div className="settings-section glass">
                <label className="settings-label" htmlFor="activity-level">
                    Activity level
                </label>
                <select
                    id="activity-level"
                    className="settings-select"
                    value={current}
                    disabled={saving}
                    onChange={(e) => onChange(e.target.value as ActivityLevel)}
                >
                    {LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>
                            {l.label}
                        </option>
                    ))}
                </select>
                <p className="settings-help">Changing this recalculates your maintenance calories.</p>
                {saving && <p className="settings-help">Saving…</p>}
                {saved && !saving && <p className="settings-saved">Saved.</p>}
                {error && <p className="settings-error">{error}</p>}
            </div>

            <form className="settings-section glass" onSubmit={saveWater}>
                <label className="settings-label" htmlFor="water-target">
                    Daily water target (litres)
                </label>
                <div className="settings-inline">
                    <input
                        id="water-target"
                        className="settings-select"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="20"
                        value={waterL}
                        onChange={(e) => setWaterL(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={waterSaving}>
                        {waterSaving ? "Saving…" : "Save"}
                    </button>
                </div>
                {waterSaved && !waterSaving && <p className="settings-saved">Saved.</p>}
                {waterError && <p className="settings-error">{waterError}</p>}
            </form>

            {/* Sub-pages as one grouped list of rows. Weight logging lives here
                since it left the bottom nav; the /weight page itself is unchanged. */}
            <nav className="settings-nav glass" aria-label="More settings">
                <Link to="/settings/goals" className="settings-row">
                    Edit Daily Goals
                    {CHEVRON}
                </Link>
                <Link to="/saved-foods" className="settings-row">
                    Manage Saved Foods
                    {CHEVRON}
                </Link>
                <Link to="/weight" className="settings-row">
                    Track Weight
                    {CHEVRON}
                </Link>
            </nav>

            <button
                type="button"
                className="btn btn-danger btn-block settings-logout"
                onClick={() => dispatch(logout())}
            >
                Log out
            </button>
        </div>
    );
}

export default Settings;
