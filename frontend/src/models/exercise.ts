// Mirrors backend IExerciseEntry (exercise_entries).
export interface IExerciseEntry {
    _id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    type: string;
    caloriesBurned: number;
    durationMin?: number;
    note?: string;
    createdAt: string;
    updatedAt: string;
}

// Body of POST /api/exercise (date optional -> backend defaults to today, user tz).
export interface IAddExerciseInput {
    type: string;
    caloriesBurned: number;
    durationMin?: number;
    note?: string;
    date?: string;
}
