import { INutrition } from "./nutrition";

// Mirrors backend ISavedFood (models/saved-food.ts). A reusable food stored as
// macros PER 100 units of its base unit; logging scales by amount / 100.
export type SavedFoodBaseUnit = "g" | "ml";

// 'label' = read off a photographed nutrition label; 'ai' = derived from an
// AI-parsed meal log; 'barcode' is reserved (not produced today).
export type SavedFoodSource = "manual" | "ai" | "label" | "barcode";

export interface ISavedFood {
    _id: string;
    userId: string;
    name: string;
    baseUnit: SavedFoodBaseUnit;
    per100: INutrition;
    source: SavedFoodSource;
    createdAt: string;
    updatedAt: string;
}

// POST /api/saved-foods
export interface ICreateSavedFoodInput {
    name: string;
    baseUnit: SavedFoodBaseUnit;
    per100: INutrition;
    // 'barcode' is not accepted by the API (reserved).
    source?: "manual" | "ai" | "label";
}

// PUT /api/saved-foods/:id (partial)
export interface IUpdateSavedFoodInput {
    name?: string;
    baseUnit?: SavedFoodBaseUnit;
    per100?: INutrition;
}

// POST /api/saved-foods/from-log/:logId
// amount/baseUnit describe what the LOG represented; omit them to let the server
// infer from the log's items (it 400s asking for them when it can't).
export interface ICreateSavedFoodFromLogInput {
    name?: string;
    amount?: number;
    baseUnit?: SavedFoodBaseUnit;
}

// POST /api/food/log-saved
export interface ILogSavedFoodInput {
    savedFoodId: string;
    amount: number;
    date?: string; // YYYY-MM-DD
}

export interface ISavedFoodDeleteResult {
    deleted: boolean;
    id: string;
}

// ── Label scanning ─────────────────────────────────────────────────────────
// Mirrors backend ScanLabelResult. A null value = the AI couldn't read that
// nutrient off the label (never a guess) — the user fills it in when confirming.
export interface ILabelValues {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
}

export interface IScanLabelResult {
    name: string | null;
    baseUnit: SavedFoodBaseUnit;
    basis: "per100" | "perServing";
    servingSize: number | null;
    servingUnit: string | null;
    values: ILabelValues;
    // false => `values` are raw PER-SERVING numbers and the UI must ask for the
    // serving size before converting (the server refuses to guess a portion).
    valuesArePer100: boolean;
    needsServingSize: boolean;
}
