import { SavedFoodBaseUnit, SavedFoodSource } from "../models/saved-food";
import { NutritionTotals } from "./nutrition";

// POST /api/saved-foods
export interface CreateSavedFoodInput {
    name: string;
    baseUnit: SavedFoodBaseUnit;
    per100: NutritionTotals;
    source?: SavedFoodSource;
}

// PUT /api/saved-foods/:id — every field optional (partial edit).
export interface UpdateSavedFoodInput {
    name?: string;
    baseUnit?: SavedFoodBaseUnit;
    per100?: NutritionTotals;
}

// POST /api/saved-foods/from-log/:logId
// `amount` + `baseUnit` are what the log REPRESENTED (e.g. "that meal was 250 g"),
// used to convert its absolute totals to per-100. Optional: the service first tries
// to infer them from the log's own items and only requires them when it can't.
export interface CreateSavedFoodFromLogInput {
    name?: string;
    amount?: number;
    baseUnit?: SavedFoodBaseUnit;
}

// GET /api/saved-foods?q=
export interface SavedFoodQuery {
    q?: string;
}

// ── Label scanning ─────────────────────────────────────────────────────────

// A macro set where any value the AI couldn't read stays null — we never invent
// numbers off a label; the user fills the gaps in the confirm step.
export interface LabelValues {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
}

// POST /api/saved-foods/scan-label — reads a label photo. Saves NOTHING; the user
// confirms/edits, then the normal create endpoint stores it.
export interface ScanLabelInput {
    imageBase64: string; // raw base64 or a data: URL
}

export interface ScanLabelResult {
    name: string | null;
    baseUnit: SavedFoodBaseUnit;
    // What the label itself was printed as.
    basis: "per100" | "perServing";
    servingSize: number | null;
    servingUnit: string | null;
    values: LabelValues;
    // TRUE  => `values` are per-100 and ready for the saved-food form.
    // FALSE => `values` are the raw PER-SERVING numbers (serving size unknown),
    //          so the UI must ask for the serving size before converting.
    valuesArePer100: boolean;
    needsServingSize: boolean;
}

// POST /api/food/log-saved
export interface LogSavedFoodInput {
    savedFoodId: string;
    amount: number; // in the saved food's baseUnit
    date?: string; // YYYY-MM-DD; defaults to today (user tz)
}
