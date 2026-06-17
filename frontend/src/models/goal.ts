import { INutrition } from "./nutrition";

// Mirrors backend IGoal. The five macro targets ARE the shared nutrition shape,
// plus identity and timestamps. Reusing INutrition keeps the macro fields in one
// place. Id comes back as `_id`; timestamps are ISO strings.
export interface IGoal extends INutrition {
    _id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

// Body for PUT /api/goals — any subset of the macro targets (backend requires >= 1).
export type ISetGoalsInput = Partial<INutrition>;
