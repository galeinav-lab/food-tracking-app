// ── Energy math ────────────────────────────────────────────────────────────
// Deterministic nutrition formulas (NOT an AI call) — "pure functions": same input
// always gives the same output, no side effects, trivially testable.
//
// The concepts:
//   BMR (Basal Metabolic Rate) = calories your body burns at complete rest.
//   Maintenance / TDEE = BMR × an activity factor = calories to hold your weight.
//   Eat below maintenance → lose; above → gain. These numbers drive the goals.

// Activity multipliers applied to BMR to get maintenance calories. Named so they're
// easy to change/extend. "sedentary" is the default ("without exercise").
// `as const` freezes the object so its values are literal types, not just `number`.
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

// ── Weekly calorie-deficit math (pure, no DB) ──────────────────────────────
// The single source of truth for the deficit model:
//   dailyBurn    = maintenance + exercise logged that day
//   dailyDeficit = dailyBurn − caloriesEaten   (negative = surplus; sign is kept)
//   weeklyDeficit = Σ dailyDeficit over LOGGED days only
// ~7700 kcal ≈ 1 kg of body fat, so projectedKg = weeklyDeficit / 7700, and the
// weekly target is one full kg (7700) → progressToTarget = weeklyDeficit / 7700.

export const KCAL_PER_KG = 7700;
export const WEEKLY_TARGET_KCAL = 7700; // ≈ 1 kg/week

export interface DailyDeficitInput {
    maintenance: number;
    exerciseCalories: number;
    caloriesEaten: number;
}

// One day's deficit. Signed on purpose: eating over your burn yields a NEGATIVE
// number (surplus). Never floor at 0 — a surplus day must pull the weekly sum down.
export function computeDailyDeficit(input: DailyDeficitInput): number {
    return input.maintenance + input.exerciseCalories - input.caloriesEaten;
}

// Input for one calendar day of the week. `caloriesEaten: null` means "no food
// logged that day" — unknown intake, NOT zero intake.
export interface DeficitDayInput {
    date: string; // YYYY-MM-DD
    maintenance: number;
    exerciseCalories: number;
    caloriesEaten: number | null;
}

// Per-day result: un-logged days keep their exercise/maintenance numbers for
// display but carry deficit:null + logged:false, and are EXCLUDED from the sum.
export interface DeficitDayResult {
    date: string;
    maintenance: number;
    exercise: number;
    eaten: number | null;
    deficit: number | null;
    logged: boolean;
}

export interface WeeklyDeficitMath {
    weeklyDeficit: number;
    projectedKg: number; // weeklyDeficit / 7700 (negative = projected gain)
    progressToTarget: number; // weeklyDeficit / WEEKLY_TARGET_KCAL, uncapped
    loggedDayCount: number;
    perDay: DeficitDayResult[];
}

// Pure aggregation over a set of days (typically the 7 days of a Sun–Sat week).
// WHY exclude un-logged days: a day with no food logs means "didn't track", not
// "ate nothing" — treating it as eaten=0 would credit a huge fake deficit. The
// same applies to exercise-only days (workout logged, food unknown).
export function computeWeeklyDeficit(days: DeficitDayInput[]): WeeklyDeficitMath {
    const perDay: DeficitDayResult[] = days.map((d) => {
        const logged = d.caloriesEaten != null;
        return {
            date: d.date,
            maintenance: Math.round(d.maintenance),
            exercise: Math.round(d.exerciseCalories),
            eaten: logged ? Math.round(d.caloriesEaten as number) : null,
            deficit: logged
                ? Math.round(
                      computeDailyDeficit({
                          maintenance: d.maintenance,
                          exerciseCalories: d.exerciseCalories,
                          caloriesEaten: d.caloriesEaten as number,
                      })
                  )
                : null,
            logged,
        };
    });

    const loggedDays = perDay.filter((d) => d.logged);
    const weeklyDeficit = loggedDays.reduce((acc, d) => acc + (d.deficit as number), 0);

    return {
        weeklyDeficit,
        projectedKg: weeklyDeficit / KCAL_PER_KG,
        progressToTarget: weeklyDeficit / WEEKLY_TARGET_KCAL,
        loggedDayCount: loggedDays.length,
        perDay,
    };
}
