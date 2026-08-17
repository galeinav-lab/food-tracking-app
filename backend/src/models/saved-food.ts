// ── SavedFood model ────────────────────────────────────────────────────────
// A reusable food the user can log repeatedly WITHOUT an AI call: we store its
// macros PER 100 units of its base unit, then scale by the logged amount.
//
// Why per-100 (and not "per serving"): it's the unit food labels use, it makes
// every food comparable, and scaling is a single multiply (amount / 100). This is
// also the shape a barcode lookup returns, so the barcode feature (next) can drop
// straight into this model — see the reserved `barcode` field below.
import { Document, Model, Schema, Types, model } from "mongoose";
import { INutrition } from "./food-log";

// 'g' for solids, 'ml' for drinks. The amount the user logs is in THIS unit.
export type SavedFoodBaseUnit = "g" | "ml";

// Where the food came from:
//   'manual'  — typed in by hand
//   'ai'      — derived from an AI-parsed meal log (from-log)
//   'label'   — read off a photographed nutrition label (label scanning)
//   'barcode' — reserved (kept for forward-compat; not produced today)
export type SavedFoodSource = "manual" | "ai" | "label" | "barcode";

export interface ISavedFood extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    name: string;
    baseUnit: SavedFoodBaseUnit;
    per100: INutrition;
    source: SavedFoodSource;
    // RESERVED for the barcode feature: the scanned EAN/UPC. Left out of the
    // schema for now on purpose — add it here + a sparse unique index on
    // { userId, barcode } when that feature lands.
    createdAt: Date;
    updatedAt: Date;
}

// Same value-object pattern as FoodLog's nutrition subdoc: embedded, no own _id.
const per100Schema = new Schema<INutrition>(
    {
        calories: { type: Number, default: 0, min: 0 },
        protein: { type: Number, default: 0, min: 0 },
        carbs: { type: Number, default: 0, min: 0 },
        fat: { type: Number, default: 0, min: 0 },
        fiber: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const SavedFoodSchema = new Schema<ISavedFood>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        baseUnit: { type: String, enum: ["g", "ml"], required: true },
        per100: { type: per100Schema, default: () => ({}) },
        source: {
            type: String,
            enum: ["manual", "ai", "label", "barcode"],
            default: "manual",
        },
    },
    { timestamps: true }
);

// Compound index for the main read: "this user's saved foods, A→Z" (and it also
// serves the ?q= name filter, which is a prefix-friendly regex on name).
SavedFoodSchema.index({ userId: 1, name: 1 });

export const SavedFood: Model<ISavedFood> = model<ISavedFood>(
    "SavedFood",
    SavedFoodSchema,
    "saved_foods"
);
