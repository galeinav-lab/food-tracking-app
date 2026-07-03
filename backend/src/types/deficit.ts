import { WeeklyDeficitMath } from "../utils/energy";

// What foodService.getWeeklyDeficit returns: the pure math result plus the week
// bounds (Sunday–Saturday) and the maintenance figure the calculation used, so
// the display never has to re-derive any of it.
export interface WeeklyDeficitResult extends WeeklyDeficitMath {
    weekStart: string; // Sunday, YYYY-MM-DD
    weekEnd: string; // Saturday, YYYY-MM-DD
    maintenance: number; // kcal/day used for every day of this week
}
