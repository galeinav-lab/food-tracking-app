// Mirrors backend IStrengthExercise (models/strength-exercise.ts): one row of the
// user's persistent strength-training list. Nothing here is dated or energy-
// related — it's separate from the exercise BURN log (models/exercise.ts).

// Same order the backend enum uses; also the order the tab bar renders.
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

export interface IStrengthExercise {
    _id: string;
    userId: string;
    muscleGroup: MuscleGroup;
    name: string;
    sets: number;
    reps: number;
    weightKg: number; // 0 = bodyweight
    createdAt: string;
    updatedAt: string;
}

// POST /api/strength
export interface ICreateStrengthExerciseInput {
    muscleGroup: MuscleGroup;
    name: string;
    sets: number;
    reps: number;
    weightKg?: number;
}

// PATCH /api/strength/:id (partial — at least one field)
export interface IUpdateStrengthExerciseInput {
    muscleGroup?: MuscleGroup;
    name?: string;
    sets?: number;
    reps?: number;
    weightKg?: number;
}

export interface IStrengthDeleteResult {
    deleted: boolean;
    id: string;
}
