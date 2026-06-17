import { INutrition } from "./nutrition";

// Mirrors backend IDailySummary. Note: `date` is a "YYYY-MM-DD" string (a
// calendar day key), NOT a full timestamp. `totals` reuses the shared nutrition
// shape. The backend serializes the id as `_id`.
export interface IDailySummary {
    _id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    totals: INutrition;
    logCount: number;
    exerciseBurned?: number;
    goalSnapshot: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
