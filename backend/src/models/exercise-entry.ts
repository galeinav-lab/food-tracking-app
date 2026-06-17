import { Document, Model, Schema, Types, model } from "mongoose";

export interface IExerciseEntry extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    date: string; // YYYY-MM-DD
    type: string;
    caloriesBurned: number;
    durationMin?: number;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ExerciseEntrySchema = new Schema<IExerciseEntry>(
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
        type: { type: String, required: true, trim: true, maxlength: 80 },
        caloriesBurned: {
            type: Number,
            required: true,
            min: [0, "caloriesBurned cannot be negative"],
            max: [20000, "caloriesBurned is unrealistically high"],
        },
        durationMin: { type: Number, min: 0, max: 1440 },
        note: { type: String, trim: true, maxlength: 280 },
    },
    { timestamps: true }
);

// Multiple entries per day are allowed (a day can have several workouts).
ExerciseEntrySchema.index({ userId: 1, date: -1 });

export const ExerciseEntry: Model<IExerciseEntry> = model<IExerciseEntry>(
    "ExerciseEntry",
    ExerciseEntrySchema,
    "exercise_entries"
);
