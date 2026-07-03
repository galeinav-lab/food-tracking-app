// ── DailySummary model ─────────────────────────────────────────────────────
// A per-user, per-day rollup (total calories/macros, log count, exercise burned).
// It's a DERIVED cache of the raw food logs: storing the day's totals once means the
// dashboard/history can read one small doc instead of re-summing every meal each time.
// It's always rebuilt from the source logs (see foodService.recomputeDailySummary)
// so it can't drift out of sync.
import { Document, Model, Schema, Types, model } from "mongoose";
import { INutrition } from "./food-log";

export interface IDailySummary extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    date: string;
    totals: INutrition;
    logCount: number;
    exerciseBurned: number;
    goalSnapshot: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const totalsSchema = new Schema<INutrition>(
    {
        calories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
        fiber: { type: Number, default: 0 },
    },
    { _id: false }
);

const DailySummarySchema = new Schema<IDailySummary>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        // Stored as a "YYYY-MM-DD" STRING (not a Date) — it represents a calendar day
        // in the user's timezone, not a moment in time. `match` validates the format.
        date: {
            type: String,
            required: true,
            index: true,
            match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"],
        },
        totals: { type: totalsSchema, default: () => ({}) },
        logCount: { type: Number, default: 0 },
        exerciseBurned: { type: Number, default: 0 },
        // `Schema.Types.Mixed` = anything goes (free-form object). We snapshot the
        // user's goals AS THEY WERE that day, so past days stay accurate even if the
        // user later changes their targets.
        goalSnapshot: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

DailySummarySchema.index({ userId: 1, date: -1 });

export const DailySummary: Model<IDailySummary> = model<IDailySummary>(
    "DailySummary",
    DailySummarySchema,
    "daily_summaries"
);
