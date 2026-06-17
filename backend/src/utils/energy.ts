// Deterministic energy math (NOT an AI call). Pure + testable.

// Activity multipliers applied to BMR to get maintenance calories. Named so they're
// easy to change/extend. "sedentary" is the default ("without exercise").
export const ACTIVITY_FACTORS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;

export const DEFAULT_ACTIVITY_LEVEL: ActivityLevel = "sedentary";

export interface EnergyInput {
    weightKg: number;
    heightCm: number;
    age: number;
    sex: "male" | "female";
}

// Mifflin-St Jeor Basal Metabolic Rate (kcal/day).
export function calculateBmr({ weightKg, heightCm, age, sex }: EnergyInput): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return sex === "male" ? base + 5 : base - 161;
}

// Maintenance calories = BMR * activity factor for the given level.
export function calculateMaintenance(
    input: EnergyInput,
    activityLevel: ActivityLevel = DEFAULT_ACTIVITY_LEVEL
): number {
    return calculateBmr(input) * ACTIVITY_FACTORS[activityLevel];
}

// Both values, rounded to whole kcal for storage/display.
export function calculateEnergy(
    input: EnergyInput,
    activityLevel: ActivityLevel = DEFAULT_ACTIVITY_LEVEL
): { bmr: number; maintenanceCalories: number } {
    const bmr = calculateBmr(input);
    return {
        bmr: Math.round(bmr),
        maintenanceCalories: Math.round(bmr * ACTIVITY_FACTORS[activityLevel]),
    };
}
