// Input types for the strength-training exercise LIST (/api/strength).
// Separate from types/exercise.ts, which belongs to the calorie-burn log.
import { MuscleGroup } from "../models/strength-exercise";

// POST /api/strength
export interface CreateStrengthExerciseInput {
    muscleGroup: MuscleGroup;
    name: string;
    sets: number;
    reps: number;
    weightKg?: number; // omitted => 0 (bodyweight)
}

// PATCH /api/strength/:id — partial edit, at least one field.
export interface UpdateStrengthExerciseInput {
    muscleGroup?: MuscleGroup;
    name?: string;
    sets?: number;
    reps?: number;
    weightKg?: number;
}

// GET /api/strength?muscleGroup=
export interface StrengthListQuery {
    muscleGroup?: MuscleGroup;
}
