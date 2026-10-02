import { type JSX, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoalType, IOnboardingInput, IOnboardingResult, Sex } from "../../models/onboarding";
import { onboardingService } from "../../services/onboarding.service";
import { ApiError } from "../../services/http-client";
import { useAppDispatch } from "../../store/hooks";
import { userUpdated } from "../../store/auth-slice";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import "./OnboardingWizard.css";

const fmt = (n: number): string => Math.round(n).toLocaleString();

const STEPS = ["Body stats", "Your goal", "Target", "Review"];

const GOAL_OPTIONS: [GoalType, string][] = [
    ["lose", "Lose weight"],
    ["maintain", "Maintain"],
    ["gain", "Gain weight"],
];

const GOAL_LABELS: Record<GoalType, string> = {
    lose: "Lose weight",
    maintain: "Maintain",
    gain: "Gain weight",
};

function OnboardingWizard(): JSX.Element {
    const [step, setStep] = useState(0);

    // Kept as strings (raw input); parsed/validated per step.
    const [weightKg, setWeightKg] = useState("");
    const [heightCm, setHeightCm] = useState("");
    const [age, setAge] = useState("");
    const [sex, setSex] = useState<Sex | "">("");
    const [goalType, setGoalType] = useState<GoalType | "">("");
    const [targetWeightKg, setTargetWeightKg] = useState("");
    const [timeframeMonths, setTimeframeMonths] = useState("");

    const [error, setError] = useState<string | null>(null);

    // Submission state (wired to POST /api/onboarding).
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [result, setResult] = useState<IOnboardingResult | null>(null);

    const isMaintain = goalType === "maintain";

    // Non-blocking sanity note: target direction vs. goal.
    const warning = useMemo<string | null>(() => {
        const cur = Number(weightKg);
        const tgt = Number(targetWeightKg);
        if (targetWeightKg.trim() === "" || !Number.isFinite(cur) || !Number.isFinite(tgt)) {
            return null;
        }
        if (goalType === "lose" && tgt >= cur) {
            return "Heads up: your target isn't lower than your current weight for a 'lose' goal.";
        }
        if (goalType === "gain" && tgt <= cur) {
            return "Heads up: your target isn't higher than your current weight for a 'gain' goal.";
        }
        return null;
    }, [goalType, weightKg, targetWeightKg]);

    const validateStep = (s: number): string | null => {
        if (s === 0) {
            const w = Number(weightKg);
            const h = Number(heightCm);
            const a = Number(age);
            if (weightKg.trim() === "" || !Number.isFinite(w) || w <= 0) return "Enter a valid weight in kg.";
            if (heightCm.trim() === "" || !Number.isFinite(h) || h < 50 || h > 300)
                return "Enter a valid height (50–300 cm).";
            if (age.trim() === "" || !Number.isInteger(a) || a < 13 || a > 120)
                return "Enter a valid age (13–120).";
            if (sex !== "male" && sex !== "female") return "Select your sex.";
            return null;
        }
        if (s === 1) {
            if (goalType !== "lose" && goalType !== "maintain" && goalType !== "gain")
                return "Choose a goal.";
            return null;
        }
        if (s === 2) {
            if (!isMaintain) {
                const t = Number(targetWeightKg);
                if (targetWeightKg.trim() === "" || !Number.isFinite(t) || t <= 0)
                    return "Enter a valid target weight in kg.";
                const tf = Number(timeframeMonths);
                if (timeframeMonths.trim() === "" || !Number.isInteger(tf) || tf < 1 || tf > 12)
                    return "Enter a timeframe of 1–12 months.";
            } else if (timeframeMonths.trim() !== "") {
                // maintain: timeframe is optional, but if provided it must be valid.
                const tf = Number(timeframeMonths);
                if (!Number.isInteger(tf) || tf < 1 || tf > 12) return "Timeframe must be 1–12 months.";
            }
            return null;
        }
        return null;
    };

    const next = () => {
        const err = validateStep(step);
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const back = () => {
        setError(null);
        setStep((s) => Math.max(s - 1, 0));
    };

    const buildPayload = (): IOnboardingInput => {
        const w = Number(weightKg);
        return {
            weightKg: w,
            heightCm: Number(heightCm),
            age: Number(age),
            sex: sex as Sex,
            goalType: goalType as GoalType,
            // maintain: no separate target -> use current weight.
            targetWeightKg: isMaintain ? w : Number(targetWeightKg),
            // maintain: timeframe optional -> default 1 month.
            timeframeMonths: isMaintain
                ? timeframeMonths.trim() === ""
                    ? 1
                    : Number(timeframeMonths)
                : Number(timeframeMonths),
        };
    };

    const handleFinish = async () => {
        setSubmitting(true);
        setSubmitError(null);
        try {
            // Backend computes + clamps goals, saves the profile, and flips
            // onboardingCompleted. We show the result, then enter the app on confirm.
            const res = await onboardingService.submit(buildPayload());
            setResult(res);
        } catch (err) {
            setSubmitError(err instanceof ApiError ? err.message : "Failed to save your details");
        } finally {
            setSubmitting(false);
        }
    };

    const goToApp = () => {
        if (!result) return;
        // Update the auth user so the routing gate now lets them into the app.
        dispatch(userUpdated(result.user));
        navigate("/", { replace: true });
    };

    // Success screen: shown after a successful submit (before entering the app).
    if (result) {
        return (
            <div className="onboarding">
                <div className="onb-card glass rise-in">
                    <h1 className="onb-title">You're all set!</h1>
                    <p className="onb-note">Your recommended daily goals:</p>

                    <ul className="onb-review">
                        <li>
                            <span>Calories</span>
                            <span>{fmt(result.goals.calories)} kcal</span>
                        </li>
                        <li>
                            <span>Protein</span>
                            <span>{fmt(result.goals.protein)} g</span>
                        </li>
                        <li>
                            <span>Carbs</span>
                            <span>{fmt(result.goals.carbs)} g</span>
                        </li>
                        <li>
                            <span>Fat</span>
                            <span>{fmt(result.goals.fat)} g</span>
                        </li>
                        <li>
                            <span>Fiber</span>
                            <span>{fmt(result.goals.fiber)} g</span>
                        </li>
                    </ul>

                    {result.adjustedForSafety && (
                        <p className="onb-warning">
                            We set your targets to a safe, sustainable level.
                        </p>
                    )}

                    <div className="onb-nav">
                        <button type="button" className="btn btn-primary onb-next" onClick={goToApp}>
                            Go to dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="onboarding">
            <div className="onb-card glass rise-in">
                <div className="onb-progress">
                    <p className="onb-progress-text">
                        Step {step + 1} of {STEPS.length}
                    </p>
                    <div className="onb-segs" aria-hidden="true">
                        {STEPS.map((label, i) => (
                            <span key={label} className={i <= step ? "onb-seg onb-seg-on" : "onb-seg"} />
                        ))}
                    </div>
                </div>

                {/* Keyed by step so each step's content fades in (opacity only). */}
                <div key={step} className="fade-in">
                    <h1 className="onb-title">{STEPS[step]}</h1>

                    {step === 0 && (
                        <div className="onb-fields">
                            <div className="field">
                                <label className="field-label" htmlFor="onb-weight">Weight (kg)</label>
                                <input
                                    className="input"
                                    id="onb-weight"
                                    type="number"
                                    min="0"
                                    value={weightKg}
                                    onChange={(e) => setWeightKg(e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="onb-height">Height (cm)</label>
                                <input
                                    className="input"
                                    id="onb-height"
                                    type="number"
                                    min="0"
                                    value={heightCm}
                                    onChange={(e) => setHeightCm(e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="onb-age">Age</label>
                                <input
                                    className="input"
                                    id="onb-age"
                                    type="number"
                                    min="0"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <span className="field-label">Sex</span>
                                <div className="onb-toggle">
                                    <button
                                        type="button"
                                        className="btn btn-secondary onb-opt"
                                        aria-pressed={sex === "male"}
                                        onClick={() => setSex("male")}
                                    >
                                        Male
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary onb-opt"
                                        aria-pressed={sex === "female"}
                                        onClick={() => setSex("female")}
                                    >
                                        Female
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="onb-goals">
                            {GOAL_OPTIONS.map(([val, label]) => (
                                <button
                                    key={val}
                                    type="button"
                                    className="btn btn-secondary onb-goal"
                                    aria-pressed={goalType === val}
                                    onClick={() => setGoalType(val)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="onb-fields">
                            {!isMaintain ? (
                                <div className="field">
                                    <label className="field-label" htmlFor="onb-target">Target weight (kg)</label>
                                    <input
                                        className="input"
                                        id="onb-target"
                                        type="number"
                                        min="0"
                                        value={targetWeightKg}
                                        onChange={(e) => setTargetWeightKg(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <p className="onb-note">
                                    Maintaining your current weight ({weightKg || "—"} kg). No target needed.
                                </p>
                            )}

                            <div className="field">
                                <label className="field-label" htmlFor="onb-timeframe">
                                    Timeframe (months, 1–12){isMaintain ? " — optional" : ""}
                                </label>
                                <input
                                    className="input"
                                    id="onb-timeframe"
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={timeframeMonths}
                                    onChange={(e) => setTimeframeMonths(e.target.value)}
                                />
                            </div>

                            {warning && <p className="onb-warning">{warning}</p>}
                        </div>
                    )}

                    {step === 3 && submitting && (
                        <>
                            <p className="onb-note" aria-hidden="true">
                                Calculating your recommended daily goals…
                            </p>
                            <SkeletonGroup label="Calculating your goals" className="onb-review onb-calc">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div className="onb-skel-row" key={i}>
                                        <Skeleton width="34%" />
                                        <Skeleton width="22%" />
                                    </div>
                                ))}
                            </SkeletonGroup>
                        </>
                    )}

                    {step === 3 && !submitting && (
                        <>
                            <ul className="onb-review">
                                <li>
                                    <span>Weight</span>
                                    <span>{weightKg} kg</span>
                                </li>
                                <li>
                                    <span>Height</span>
                                    <span>{heightCm} cm</span>
                                </li>
                                <li>
                                    <span>Age</span>
                                    <span>{age}</span>
                                </li>
                                <li>
                                    <span>Sex</span>
                                    <span>{sex}</span>
                                </li>
                                <li>
                                    <span>Goal</span>
                                    <span>{goalType ? GOAL_LABELS[goalType] : "—"}</span>
                                </li>
                                {!isMaintain && (
                                    <li>
                                        <span>Target weight</span>
                                        <span>{targetWeightKg} kg</span>
                                    </li>
                                )}
                                <li>
                                    <span>Timeframe</span>
                                    <span>
                                        {isMaintain && timeframeMonths.trim() === ""
                                            ? "1 (default)"
                                            : timeframeMonths}{" "}
                                        month(s)
                                    </span>
                                </li>
                            </ul>
                            {warning && <p className="onb-warning">{warning}</p>}
                        </>
                    )}
                </div>

                {error && (
                    <p className="form-error onb-error" role="alert">
                        {error}
                    </p>
                )}
                {submitError && (
                    <p className="form-error onb-error" role="alert">
                        {submitError}
                    </p>
                )}

                <div className="onb-nav">
                    {step > 0 && (
                        <button type="button" className="btn btn-secondary" onClick={back} disabled={submitting}>
                            Back
                        </button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <button type="button" className="btn btn-primary onb-next" onClick={next}>
                            Next
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={submitting ? "btn btn-primary btn-loading onb-next" : "btn btn-primary onb-next"}
                            onClick={handleFinish}
                            disabled={submitting}
                            aria-busy={submitting}
                        >
                            {submitting ? "Calculating…" : "Finish"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OnboardingWizard;
