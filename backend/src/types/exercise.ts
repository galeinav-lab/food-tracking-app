export interface AddExerciseInput {
    type: string;
    caloriesBurned: number;
    durationMin?: number;
    note?: string;
    date?: string; // YYYY-MM-DD; defaults to today (user tz)
}

export interface ExerciseRange {
    date?: string; // single day
    from?: string;
    to?: string;
}
