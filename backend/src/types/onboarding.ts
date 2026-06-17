import { NutritionTotals } from "./nutrition";

export type Sex = "male" | "female";
export type GoalType = "lose" | "maintain" | "gain";

// Body of POST /api/onboarding (also the input AIService.calculateGoals needs).
export interface OnboardingInput {
    weightKg: number;
    heightCm: number;
    age: number;
    sex: Sex;
    goalType: GoalType;
    targetWeightKg: number;
    timeframeMonths: number;
}

// Result of AIService.calculateGoals after server-side safety clamping.
export interface CalculatedGoals {
    goals: NutritionTotals;
    // True when the backend had to clamp the AI's calorie target to a safe value.
    adjustedForSafety: boolean;
}

// Result of the onboarding endpoint.
export interface OnboardingResult {
    user: Record<string, unknown>;
    goals: NutritionTotals;
    adjustedForSafety: boolean;
}
