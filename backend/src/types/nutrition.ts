import { INutrition, IFoodItem } from "../models/food-log";

export type NutritionTotals = INutrition;
export type ParsedFoodItem = IFoodItem;

export interface ParsedNutrition {
    items: ParsedFoodItem[];
    totals: NutritionTotals;
}
