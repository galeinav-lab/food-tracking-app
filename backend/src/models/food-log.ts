// ── FoodLog model ──────────────────────────────────────────────────────────
// A Mongoose "model" = a TypeScript interface (the shape in code) + a Schema (the
// rules Mongoose enforces on the DB). One FoodLog = one meal the user logged.
// Good file to learn the model pattern: interfaces, sub-schemas, defaults, indexes.
import { Document, Model, Schema, Types, model } from "mongoose";

// `extends Document` adds Mongoose's instance fields (_id, .save(), etc).
export interface INutrition {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
}

export interface IFoodItem {
    name: string;
    quantity: number;
    unit: string;
    nutrition: INutrition;
}

export interface IFoodLog extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    description: string;
    items: IFoodItem[];
    totals: INutrition;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}

// A "subdocument" schema: nutrition is embedded INSIDE a food log, not its own
// collection. `_id: false` stops Mongoose giving each embedded blob its own _id —
// pointless for a value object like a macro breakdown.
const nutritionSchema = new Schema<INutrition>(
    {
        calories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
        fiber: { type: Number, default: 0 },
    },
    { _id: false }
);

const foodItemSchema = new Schema<IFoodItem>(
    {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, default: "g" },
        nutrition: { type: nutritionSchema, default: () => ({}) },
    },
    { _id: false }
);

const FoodLogSchema = new Schema<IFoodLog>(
    {
        // `ref: "User"` is a relationship (like a foreign key) — userId points at a
        // User doc. `index: true` builds a DB index so "all logs for this user" is fast.
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        description: { type: String, required: true },
        items: { type: [foodItemSchema], default: [] },
        totals: { type: nutritionSchema, default: () => ({}) },
        date: { type: Date, required: true, default: Date.now, index: true },
    },
    // `timestamps: true` auto-adds & maintains createdAt / updatedAt for you.
    { timestamps: true }
);

// A COMPOUND index on (userId asc, date desc) — purpose-built for the most common
// query: "this user's logs, newest first". Indexes trade a little write cost for
// big read speedups, and the field ORDER matters (must match how you filter/sort).
FoodLogSchema.index({ userId: 1, date: -1 });

// The 3rd arg pins the MongoDB collection name; without it Mongoose would auto-
// pluralize the model name ("FoodLog" -> "foodlogs").
export const FoodLog: Model<IFoodLog> = model<IFoodLog>("FoodLog", FoodLogSchema, "food_logs");
