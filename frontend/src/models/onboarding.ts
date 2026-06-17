import { INutrition } from "./nutrition";
import { IUser } from "./user";

// Mirrors the backend POST /api/onboarding body (backend OnboardingInput).
export type Sex = "male" | "female";
export type GoalType = "lose" | "maintain" | "gain";

export interface IOnboardingInput {
    weightKg: number;
    heightCm: number;
    age: number;
    sex: Sex;
    goalType: GoalType;
    targetWeightKg: number;
    timeframeMonths: number;
}

// Mirrors the backend onboarding response (updated safe user + computed goals).
export interface IOnboardingResult {
    user: IUser;
    goals: INutrition;
    adjustedForSafety: boolean;
}
