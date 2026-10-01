import { type FormEvent, type JSX, useState } from "react";
import { SavedFoodBaseUnit } from "../../models/saved-food";
import { INutrition } from "../../models/nutrition";
import "./SavedFoodForm.css";

// The five macro fields, in display order.
const MACRO_FIELDS: { key: keyof INutrition; label: string }[] = [
    { key: "calories", label: "Calories" },
    { key: "protein", label: "Protein (g)" },
    { key: "carbs", label: "Carbs (g)" },
    { key: "fat", label: "Fat (g)" },
    { key: "fiber", label: "Fiber (g)" },
];

export interface SavedFoodFormValues {
    name: string;
    baseUnit: SavedFoodBaseUnit;
    per100: INutrition;
}

interface SavedFoodFormProps {
    title: string;
    submitLabel: string;
    // Prefill. Macro values may be null (e.g. the AI couldn't read that nutrient),
    // which renders as an empty field flagged "not read".
    initialName?: string;
    initialBaseUnit?: SavedFoodBaseUnit;
    initialPer100?: Partial<Record<keyof INutrition, number | null>>;
    // Keys the AI failed to read — shown with a "couldn't read this" hint.
    unreadKeys?: (keyof INutrition)[];
    busy?: boolean;
    error?: string | null;
    onSubmit: (values: SavedFoodFormValues) => void;
    onCancel: () => void;
    cancelLabel?: string;
}

const toField = (v: number | null | undefined): string =>
    v === null || v === undefined ? "" : String(v);

// The ONE saved-food editor. Used for manual create/edit in the saved-foods
// manager AND as the confirm/edit step of a label scan (prefilled from the AI
// read) — so both paths validate and look identical.
function SavedFoodForm({
    title,
    submitLabel,
    initialName = "",
    initialBaseUnit = "g",
    initialPer100,
    unreadKeys = [],
    busy = false,
    error = null,
    onSubmit,
    onCancel,
    cancelLabel = "Cancel",
}: SavedFoodFormProps): JSX.Element {
    const [name, setName] = useState(initialName);
    const [baseUnit, setBaseUnit] = useState<SavedFoodBaseUnit>(initialBaseUnit);
    const [macros, setMacros] = useState<Record<keyof INutrition, string>>({
        calories: toField(initialPer100?.calories),
        protein: toField(initialPer100?.protein),
        carbs: toField(initialPer100?.carbs),
        fat: toField(initialPer100?.fat),
        fiber: toField(initialPer100?.fiber),
    });
    const [localError, setLocalError] = useState<string | null>(null);

    const setMacro = (key: keyof INutrition, value: string): void => {
        setMacros((prev) => ({ ...prev, [key]: value }));
    };

    const submit = (e: FormEvent): void => {
        e.preventDefault();
        if (!name.trim()) {
            setLocalError("Enter a name.");
            return;
        }

        // Every macro must be a non-negative number (blank counts as 0).
        const per100 = {} as INutrition;
        for (const { key, label } of MACRO_FIELDS) {
            const raw = macros[key].trim();
            const num = raw === "" ? 0 : Number(raw);
            if (!Number.isFinite(num) || num < 0) {
                setLocalError(`${label} must be a positive number.`);
                return;
            }
            per100[key] = num;
        }

        setLocalError(null);
        onSubmit({ name: name.trim(), baseUnit, per100 });
    };

    return (
        <form className="sff" onSubmit={submit}>
            <h2 className="sff-title">{title}</h2>

            <label className="field-label sff-label" htmlFor="sff-name">
                Name
            </label>
            <input
                id="sff-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Greek yogurt 5%"
                disabled={busy}
            />

            <span className="field-label sff-label">Base unit</span>
            <div className="sff-unit-toggle" role="group" aria-label="Base unit">
                <button
                    type="button"
                    className="btn btn-secondary sff-unit"
                    aria-pressed={baseUnit === "g"}
                    onClick={() => setBaseUnit("g")}
                    disabled={busy}
                >
                    grams (g)
                </button>
                <button
                    type="button"
                    className="btn btn-secondary sff-unit"
                    aria-pressed={baseUnit === "ml"}
                    onClick={() => setBaseUnit("ml")}
                    disabled={busy}
                >
                    millilitres (ml)
                </button>
            </div>

            <span className="field-label sff-label">Per 100 {baseUnit}</span>
            <div className="sff-macros">
                {MACRO_FIELDS.map(({ key, label }) => {
                    const unread = unreadKeys.includes(key);
                    return (
                        <div className="sff-macro-field" key={key}>
                            <label className="field-label sff-macro-label" htmlFor={`sff-${key}`}>
                                {label}
                            </label>
                            <input
                                id={`sff-${key}`}
                                className={unread ? "input sff-input-unread" : "input"}
                                type="number"
                                min="0"
                                step="0.1"
                                inputMode="decimal"
                                value={macros[key]}
                                onChange={(e) => setMacro(key, e.target.value)}
                                placeholder="0"
                                disabled={busy}
                            />
                            {unread && <span className="sff-unread">Not on label — add it</span>}
                        </div>
                    );
                })}
            </div>

            {(localError || error) && (
                <p className="form-error sff-error" role="alert">
                    {localError ?? error}
                </p>
            )}

            <div className="sff-actions">
                <button
                    type="submit"
                    className={busy ? "btn btn-primary btn-loading sff-save" : "btn btn-primary sff-save"}
                    disabled={busy}
                    aria-busy={busy}
                >
                    {busy ? "Saving…" : submitLabel}
                </button>
                <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
                    {cancelLabel}
                </button>
            </div>
        </form>
    );
}

export default SavedFoodForm;
