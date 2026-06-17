// Shared nutrition shape — the single source of truth, reused across food items,
// food logs, daily summaries, goals, and user goals. Mirrors backend INutrition.
export interface INutrition {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
}

// A single parsed food item within a log. Mirrors backend IFoodItem.
export interface IFoodItem {
    name: string;
    quantity: number;
    unit: string;
    nutrition: INutrition;
}
