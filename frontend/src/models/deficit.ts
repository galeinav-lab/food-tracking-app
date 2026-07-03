// Mirrors backend WeeklyDeficitResult (GET /api/food/deficit). One source of truth
// for the weekly deficit — the frontend does NO deficit math of its own.

export interface IDeficitDay {
    date: string; // YYYY-MM-DD
    maintenance: number;
    exercise: number;
    eaten: number | null; // null => no food logged that day (unknown, not zero)
    deficit: number | null; // null when not logged; signed (negative = surplus)
    logged: boolean;
}

export interface IWeeklyDeficit {
    weekStart: string; // Sunday, YYYY-MM-DD
    weekEnd: string; // Saturday, YYYY-MM-DD
    maintenance: number;
    weeklyDeficit: number; // signed sum over logged days
    projectedKg: number; // weeklyDeficit / 7700 (negative = projected gain)
    progressToTarget: number; // weeklyDeficit / 7700, uncapped, can be negative
    loggedDayCount: number;
    perDay: IDeficitDay[]; // all 7 days of the Sun–Sat week
}
