// Mirrors backend water endpoints (a per-day running total).
export interface IWaterDayResult {
    date: string; // YYYY-MM-DD
    waterMl: number;
}

// Body of POST /api/water. amountMl is signed (negative subtracts / undoes).
export interface IAddWaterInput {
    amountMl: number;
    date?: string;
}
