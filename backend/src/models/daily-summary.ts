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
        date: {
            type: String,
            required: true,
            index: true,
            match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"],
        },
        totals: { type: totalsSchema, default: () => ({}) },
        logCount: { type: Number, default: 0 },
        exerciseBurned: { type: Number, default: 0 },
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
