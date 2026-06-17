// Mirrors backend IWeightEntry (weight_entries). Dates are "YYYY-MM-DD" strings;
// timestamps arrive as ISO strings. Id comes back as `_id`.
export interface IWeightEntry {
    _id: string;
    userId: string;
    weightKg: number;
    date: string; // YYYY-MM-DD
    createdAt: string;
    updatedAt: string;
}

// Body of POST /api/weight (date optional -> backend defaults to today, user tz).
export interface IAddWeightInput {
    weightKg: number;
    date?: string;
}
