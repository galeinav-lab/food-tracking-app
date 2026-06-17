import { IFoodItem, INutrition } from "./nutrition";
import { IDailySummary } from "./daily-summary";

// Mirrors backend IFoodLog. `date`/`createdAt`/`updatedAt` arrive as ISO strings
// over JSON. `totals` reuses the shared nutrition shape. Id comes back as `_id`.
export interface IFoodLog {
    _id: string;
    userId: string;
    description: string;
    items: IFoodItem[];
    totals: INutrition;
    date: string; // ISO timestamp
    createdAt: string;
    updatedAt: string;
}

// Body for POST /api/food/log. Mirrors backend LogFoodInput (date optional).
export interface ILogFoodInput {
    description: string;
    date?: string; // optional ISO timestamp
}

// Body for PUT /api/food/log/:id. Mirrors backend EditFoodInput.
export interface IEditFoodInput {
    description: string;
}

// Payload of GET /api/food/day/:date — the day's logs plus its summary (or null).
export interface IDayView {
    logs: IFoodLog[];
    summary: IDailySummary | null;
}
