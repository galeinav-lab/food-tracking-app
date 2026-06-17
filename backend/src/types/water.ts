export interface AddWaterInput {
    // Signed: positive adds, negative subtracts (undo). Result clamps at 0.
    amountMl: number;
    date?: string; // YYYY-MM-DD; defaults to today (user tz)
}

export interface WaterRange {
    date?: string;
    from?: string;
    to?: string;
}

export interface WaterDayResult {
    date: string;
    waterMl: number;
}
