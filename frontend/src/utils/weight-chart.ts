// ── Weight trajectory ──────────────────────────────────────────────────────
// Derives the "actual vs target" chart series + progress summary from the user's
// logged entries and their onboarding goal. Lifted verbatim out of the Weight
// page so this math has ONE home — any other view of the trajectory calls this
// rather than re-deriving it. Behaviour is unchanged.
import { IUser } from "../models/user";
import { IWeightEntry } from "../models/weight";
import { addMonthsToDateString, dateStringToDayNumber } from "./date";

export interface WeightChartPoint {
    date: string;
    actual: number | null;
    target: number | null;
}

export interface WeightChartModel {
    chartData: WeightChartPoint[];
    // Padded y-axis range so small changes don't look dramatic (undefined = auto).
    yDomain?: [number, number];
    // One-line progress sentence, or null when there's no goal to compare against.
    summary: string | null;
    // Latest logged weight (falls back to the onboarding profile weight).
    current: number | null;
    targetWeight: number | null;
    // Short status word ("On track", "Goal reached!", …) — the tail of `summary`,
    // exposed separately for callers that want the verdict without the numbers.
    status: string | null;
}

export function buildWeightChart(
    entries: IWeightEntry[],
    user: IUser | null | undefined,
    today: string
): WeightChartModel {
    const hasEntries = entries.length > 0;
    const goalType = user?.goalType;

    // Start point: earliest entry if logged, else the profile's (original) weight.
    const startWeight = hasEntries ? entries[0].weightKg : user?.profile?.weightKg ?? null;
    const startDate = hasEntries ? entries[0].date : today;

    // Maintain => flat target at the start weight; otherwise the onboarding target.
    const targetWeight = goalType === "maintain" ? startWeight : user?.targetWeightKg ?? null;
    const timeframe = user?.timeframeMonths ?? null;
    const endDate = startDate && timeframe ? addMonthsToDateString(startDate, timeframe) : null;

    const sDays = dateStringToDayNumber(startDate);
    const eDays = endDate ? dateStringToDayNumber(endDate) : sDays;

    const targetAt = (dateStr: string): number | null => {
        if (startWeight == null) return null;
        if (goalType === "maintain" || targetWeight == null || eDays <= sDays) {
            return startWeight;
        }
        const dDays = dateStringToDayNumber(dateStr);
        const t = Math.max(0, Math.min(1, (dDays - sDays) / (eDays - sDays)));
        return startWeight + (targetWeight - startWeight) * t;
    };

    // Union of actual dates + trajectory endpoints, sorted ascending.
    const dateSet = new Set<string>();
    entries.forEach((en) => dateSet.add(en.date));
    dateSet.add(startDate);
    if (endDate) dateSet.add(endDate);
    const dates = Array.from(dateSet).sort();

    const entryByDate = new Map(entries.map((en) => [en.date, en.weightKg]));
    const chartData: WeightChartPoint[] = dates.map((date) => ({
        date,
        actual: entryByDate.get(date) ?? null,
        target: targetAt(date),
    }));

    // Y domain padded so small changes don't look dramatic.
    const weights: number[] = entries.map((en) => en.weightKg);
    if (startWeight != null) weights.push(startWeight);
    if (targetWeight != null) weights.push(targetWeight);
    let yDomain: [number, number] | undefined;
    if (weights.length > 0) {
        const minW = Math.min(...weights);
        const maxW = Math.max(...weights);
        const pad = Math.max(1, (maxW - minW) * 0.15);
        yDomain = [Math.floor(minW - pad), Math.ceil(maxW + pad)];
    }

    // Progress summary.
    const current = hasEntries ? entries[entries.length - 1].weightKg : startWeight;
    let summary: string | null = null;
    let status: string | null = null;
    if (current != null && targetWeight != null) {
        const toGo = Math.abs(current - targetWeight);
        if (toGo < 0.1) {
            status = "Goal reached!";
        } else if (goalType === "maintain") {
            status = "Maintaining";
        } else {
            const tToday = targetAt(today);
            const diff = tToday != null ? current - tToday : 0;
            const tol = 0.5;
            if (goalType === "gain") {
                status = diff > tol ? "Ahead of schedule" : diff < -tol ? "A bit behind" : "On track";
            } else {
                status = diff < -tol ? "Ahead of schedule" : diff > tol ? "A bit behind" : "On track";
            }
        }
        summary =
            `Current ${current.toFixed(1)} kg · Target ${targetWeight.toFixed(1)} kg · ` +
            `${toGo.toFixed(1)} kg to go · ${status}`;
    }

    return { chartData, yDomain, summary, current, targetWeight, status };
}
