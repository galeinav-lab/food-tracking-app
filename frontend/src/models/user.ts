import { INutrition } from "./nutrition";

// Mirrors backend IUserPreferences.
export interface IUserPreferences {
    units: "metric" | "imperial";
    timezone: string;
}

// Mirrors backend IUserProfile (onboarding-collected body stats, metric).
export interface IUserProfile {
    weightKg?: number;
    heightCm?: number;
    age?: number;
    sex?: "male" | "female";
}

// Safe user — mirrors backend `toSafeObject()` output (never includes passwordHash).
// `goals` reuses the shared nutrition shape (calories/protein/carbs/fat/fiber).
// Timestamps arrive as ISO strings over JSON. The backend serializes the id as `_id`.
export interface IUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    goals: INutrition;
    preferences: IUserPreferences;
    // Onboarding-collected profile + weight goal (present once onboarded).
    profile?: IUserProfile;
    goalType?: "lose" | "maintain" | "gain";
    targetWeightKg?: number;
    timeframeMonths?: number;
    activityLevel?: "sedentary" | "light" | "moderate" | "active";
    // Deterministic energy values (Mifflin-St Jeor); set at onboarding / backfilled.
    bmr?: number;
    maintenanceCalories?: number;
    // Daily water target in ml (default 3000 = 3 L).
    waterTargetMl?: number;
    // false/undefined => the user still needs to complete onboarding.
    onboardingCompleted?: boolean;
    createdAt: string;
    updatedAt: string;
}
