import { Document, Model, Schema, Types, model } from "mongoose";

export interface IWaterDay extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    date: string; // YYYY-MM-DD
    waterMl: number;
    createdAt: Date;
    updatedAt: Date;
}

const WaterDaySchema = new Schema<IWaterDay>(
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
        // Running cumulative total for the day (clamped at 0 in the service).
        waterMl: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

// UNIQUE compound index on (userId, date): guarantees at most ONE water doc per
// user per day. That's what makes the "upsert + $inc" pattern safe — the service
// can atomically create-or-increment today's total without risking duplicate rows.
WaterDaySchema.index({ userId: 1, date: 1 }, { unique: true });

export const WaterDay: Model<IWaterDay> = model<IWaterDay>(
    "WaterDay",
    WaterDaySchema,
    "water_days"
);
