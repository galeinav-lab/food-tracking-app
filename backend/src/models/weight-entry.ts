import { Document, Model, Schema, Types, model } from "mongoose";

export interface IWeightEntry extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    weightKg: number;
    date: string; // YYYY-MM-DD
    createdAt: Date;
    updatedAt: Date;
}

const WeightEntrySchema = new Schema<IWeightEntry>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        weightKg: {
            type: Number,
            required: true,
            min: [20, "Weight must be at least 20 kg"],
            max: [500, "Weight must be at most 500 kg"],
        },
        date: {
            type: String,
            required: true,
            index: true,
            match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"],
        },
    },
    { timestamps: true }
);

// One entry per user per day (supports upsert-per-day; re-logging overwrites).
WeightEntrySchema.index({ userId: 1, date: 1 }, { unique: true });
// Compound index for descending date listings.
WeightEntrySchema.index({ userId: 1, date: -1 });

export const WeightEntry: Model<IWeightEntry> = model<IWeightEntry>(
    "WeightEntry",
    WeightEntrySchema,
    "weight_entries"
);
