// ── StrengthExercise model ─────────────────────────────────────────────────
// A strength-training exercise in the user's PERSISTENT list — "Bench press,
// 4x8 @ 60kg" — grouped by muscle group.
//
// NOT to be confused with ExerciseEntry (`exercise_entries`), which is the
// calorie-burn log: dated, one row per workout, feeding DailySummary/deficit.
// This model is deliberately isolated from all of that: no date, no history, no
// energy math. The user edits these rows IN PLACE (bumping the weight is the
// whole point of the feature), so there is exactly one document per exercise.
import { Document, Model, Schema, Types, model } from "mongoose";

// The 7 groups the UI shows as tabs. Exported so the Joi schema and the frontend
// contract stay derived from one list instead of three copies of the strings.
export const MUSCLE_GROUPS = [
    "back",
    "chest",
    "biceps",
    "triceps",
    "shoulders",
    "abs",
    "legs",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface IStrengthExercise extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    muscleGroup: MuscleGroup;
    name: string;
    sets: number;
    reps: number;
    weightKg: number;
    createdAt: Date;
    updatedAt: Date;
}

const StrengthExerciseSchema = new Schema<IStrengthExercise>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        muscleGroup: {
            // `[...MUSCLE_GROUPS]` because Mongoose wants a mutable array and the
            // const assertion above makes it readonly.
            type: String,
            enum: [...MUSCLE_GROUPS],
            required: true,
        },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        sets: {
            type: Number,
            required: true,
            min: [1, "sets must be at least 1"],
            max: [50, "sets is unrealistically high"],
        },
        reps: {
            type: Number,
            required: true,
            min: [1, "reps must be at least 1"],
            max: [500, "reps is unrealistically high"],
        },
        // 0 means bodyweight (the UI renders it as such). Decimals are allowed on
        // purpose — 2.5 kg plates and 0.5 kg micro-loading are normal progression.
        weightKg: {
            type: Number,
            default: 0,
            min: [0, "weightKg cannot be negative"],
            max: [1000, "weightKg is unrealistically high"],
        },
    },
    { timestamps: true }
);

// The main read is always "this user's exercises for one muscle group".
StrengthExerciseSchema.index({ userId: 1, muscleGroup: 1 });

export const StrengthExercise: Model<IStrengthExercise> = model<IStrengthExercise>(
    "StrengthExercise",
    StrengthExerciseSchema,
    "strength_exercises"
);
