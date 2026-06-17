export interface AddWeightInput {
    weightKg: number;
    date?: string; // YYYY-MM-DD; defaults to today (user timezone) if omitted
}

export interface WeightRange {
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
    days?: number; // alternative to from/to: last N days
}
