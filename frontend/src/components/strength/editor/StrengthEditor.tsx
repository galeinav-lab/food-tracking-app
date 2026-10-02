import { type FormEvent, type JSX, useState } from "react";
import {
    IStrengthExercise,
    MUSCLE_GROUPS,
    MuscleGroup,
} from "../../../models/strength";
import Sheet from "../../sheet/Sheet";
import "./StrengthEditor.css";

const GROUP_LABEL: Record<MuscleGroup, string> = {
    back: "Back",
    chest: "Chest",
    biceps: "Biceps",
    triceps: "Triceps",
    shoulders: "Shoulders",
    abs: "Abs",
    legs: "Legs",
};

const STEP_KG = 2.5;
const MAX_KG = 1000;

const clampKg = (n: number): number =>
    Math.min(MAX_KG, Math.max(0, Math.round(n * 100) / 100));

const fmtKg = (n: number): string => String(Number(n.toFixed(2)));

export interface StrengthFormValues {
    muscleGroup: MuscleGroup;
    name: string;
    sets: number;
    reps: number;
    weightKg: number;
}

interface StrengthEditorProps {
    // null = create; otherwise the exercise being edited (fields prefilled).
    initial: IStrengthExercise | null;
    // Which tab the user is on — the group a NEW exercise lands in, so they
    // never have to pick it twice.
    defaultGroup: MuscleGroup;
    busy: boolean;
    error: string | null;
    onSubmit: (values: StrengthFormValues) => void;
    onClose: () => void;
}

/**
 * Create/edit sheet for one exercise. Uses the shared <Sheet> shell so it
 * slides up and dims like every other modal.
 * The weight row is a stepper, not a bare field: bumping the load is the thing
 * users come here to do, and it's still two taps from the card's Edit button.
 */
function StrengthEditor({
    initial,
    defaultGroup,
    busy,
    error,
    onSubmit,
    onClose,
}: StrengthEditorProps): JSX.Element {
    const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(
        initial?.muscleGroup ?? defaultGroup
    );
    const [name, setName] = useState(initial?.name ?? "");
    const [sets, setSets] = useState(String(initial?.sets ?? 3));
    const [reps, setReps] = useState(String(initial?.reps ?? 10));
    const [weight, setWeight] = useState(fmtKg(initial?.weightKg ?? 0));
    const [localError, setLocalError] = useState<string | null>(null);

    const isEdit = initial !== null;
    const title = isEdit ? "Edit exercise" : "New exercise";

    const bump = (delta: number): void => {
        const current = Number(weight);
        setWeight(fmtKg(clampKg((Number.isFinite(current) ? current : 0) + delta)));
    };

    const submit = (e: FormEvent): void => {
        e.preventDefault();

        const trimmed = name.trim();
        if (!trimmed) {
            setLocalError("Enter an exercise name.");
            return;
        }

        const setsNum = Number(sets);
        const repsNum = Number(reps);
        if (!Number.isInteger(setsNum) || setsNum < 1 || setsNum > 50) {
            setLocalError("Sets must be a whole number from 1 to 50.");
            return;
        }
        if (!Number.isInteger(repsNum) || repsNum < 1 || repsNum > 500) {
            setLocalError("Reps must be a whole number from 1 to 500.");
            return;
        }

        // Blank weight = bodyweight (0), which is a normal answer here.
        const weightNum = weight.trim() === "" ? 0 : Number(weight);
        if (!Number.isFinite(weightNum) || weightNum < 0 || weightNum > MAX_KG) {
            setLocalError(`Weight must be between 0 and ${MAX_KG} kg.`);
            return;
        }

        setLocalError(null);
        onSubmit({
            muscleGroup,
            name: trimmed,
            sets: setsNum,
            reps: repsNum,
            weightKg: clampKg(weightNum),
        });
    };

    const shown = localError ?? error;

    return (
        <Sheet title={title} ariaLabel={title} onClose={onClose}>
            <form className="ste" onSubmit={submit}>
                <label className="field-label ste-label" htmlFor="ste-name">
                    Exercise
                </label>
                <input
                    id="ste-name"
                    className="input"
                    type="text"
                    value={name}
                    maxLength={80}
                    placeholder="e.g. Bench press"
                    onChange={(e) => setName(e.target.value)}
                    autoFocus={!isEdit}
                />

                <label className="field-label ste-label" htmlFor="ste-weight">
                    Weight (kg) — 0 for bodyweight
                </label>
                <div className="st-step ste-step-lg">
                    <button
                        type="button"
                        className="st-step-btn"
                        onClick={() => bump(-STEP_KG)}
                        aria-label={`Decrease weight by ${STEP_KG} kg`}
                    >
                        −
                    </button>
                    <input
                        id="ste-weight"
                        className="ste-weight-input"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={MAX_KG}
                        step={0.5}
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                    />
                    <button
                        type="button"
                        className="st-step-btn"
                        onClick={() => bump(STEP_KG)}
                        aria-label={`Increase weight by ${STEP_KG} kg`}
                    >
                        +
                    </button>
                </div>

                <div className="ste-pair">
                    <div className="ste-field">
                        <label className="field-label ste-label" htmlFor="ste-sets">
                            Sets
                        </label>
                        <input
                            id="ste-sets"
                            className="input"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={50}
                            value={sets}
                            onChange={(e) => setSets(e.target.value)}
                        />
                    </div>
                    <div className="ste-field">
                        <label className="field-label ste-label" htmlFor="ste-reps">
                            Reps
                        </label>
                        <input
                            id="ste-reps"
                            className="input"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={500}
                            value={reps}
                            onChange={(e) => setReps(e.target.value)}
                        />
                    </div>
                </div>

                <label className="field-label ste-label" htmlFor="ste-group">
                    Muscle group
                </label>
                <select
                    id="ste-group"
                    className="input"
                    value={muscleGroup}
                    onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
                >
                    {MUSCLE_GROUPS.map((g) => (
                        <option key={g} value={g}>
                            {GROUP_LABEL[g]}
                        </option>
                    ))}
                </select>

                {shown && (
                    <p className="form-error st-error" role="alert">
                        {shown}
                    </p>
                )}

                <div className="ste-actions">
                    <button
                        type="submit"
                        className={busy ? "btn btn-primary btn-loading ste-save" : "btn btn-primary ste-save"}
                        disabled={busy}
                        aria-busy={busy}
                    >
                        {busy ? "Saving…" : isEdit ? "Save changes" : "Add exercise"}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
                        Cancel
                    </button>
                </div>
            </form>
        </Sheet>
    );
}

export default StrengthEditor;
