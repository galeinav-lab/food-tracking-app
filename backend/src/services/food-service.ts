import { Types } from "mongoose";
import { FoodLog, IFoodItem, IFoodLog } from "../models/food-log";
import { DailySummary, IDailySummary } from "../models/daily-summary";
import { Goal } from "../models/goal";
import { User } from "../models/user";
import { ExerciseEntry } from "../models/exercise-entry";
import {
    ForbiddenError,
    ResourceNotFound,
    UnauthorizedError,
    ValidationError,
} from "../models/client-error";
import { EditFoodInput, HistoryRange, LogFoodInput, SummaryRange } from "../types/food";
import { WeeklyDeficitResult } from "../types/deficit";
import { LogSavedFoodInput } from "../types/saved-food";
import { NutritionTotals } from "../types/nutrition";
import { BaseService } from "./base-service";
import { aiService } from "./ai-service";
import { savedFoodService } from "./saved-food-service";
import {
    addDaysToDateString,
    endOfDayUtc,
    getWeekRange,
    startOfDayUtc,
    toDateStringInTz,
} from "../utils/date-tz";
import {
    ActivityLevel,
    DEFAULT_ACTIVITY_LEVEL,
    DeficitDayInput,
    calculateEnergy,
    computeWeeklyDeficit,
} from "../utils/energy";

// See note on TS2589 — see food-service edits for the original rationale.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFilter = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUpdate = any;

const ZERO_TOTALS: NutritionTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
const DEFAULT_TZ = "Asia/Jerusalem";

// Keep scaled macros tidy (avoids float noise like 0.30000000000000004).
const round2 = (n: number): number => Math.round(n * 100) / 100;

class FoodService extends BaseService<IFoodLog> {

    public constructor() {
        super(FoodLog);
    }

    public async logFood(userId: string, input: LogFoodInput): Promise<IFoodLog> {
        const parsed = await aiService.analyzeFood(input.description);
        const totals = parsed.totals ?? this.sumItems(parsed.items);

        return this.createLogAndRecompute(userId, {
            description: input.description,
            items: parsed.items,
            totals,
            date: input.date,
        });
    }

    /**
     * Log a SAVED food — no AI call. Scales the food's per-100 macros by the
     * amount (factor = amount / 100) and then goes through the EXACT SAME
     * creation path as an AI-parsed meal (createLogAndRecompute), so the
     * resulting FoodLog is indistinguishable downstream: history, macros, the
     * daily summary and the weekly deficit all keep working untouched.
     */
    public async logSavedFood(userId: string, input: LogSavedFoodInput): Promise<IFoodLog> {
        if (!(input.amount > 0)) {
            throw new ValidationError("amount must be greater than 0");
        }

        // Ownership is enforced inside savedFoodService.getOwned (single place).
        const saved = await savedFoodService.getOwned(userId, input.savedFoodId);

        const factor = input.amount / 100;
        const totals: NutritionTotals = {
            calories: round2(saved.per100.calories * factor),
            protein: round2(saved.per100.protein * factor),
            carbs: round2(saved.per100.carbs * factor),
            fat: round2(saved.per100.fat * factor),
            fiber: round2(saved.per100.fiber * factor),
        };

        // One item, measured in the food's own base unit — the same {name, quantity,
        // unit, nutrition} shape the AI produces.
        const items: IFoodItem[] = [
            {
                name: saved.name,
                quantity: input.amount,
                unit: saved.baseUnit,
                nutrition: totals,
            },
        ];

        return this.createLogAndRecompute(userId, {
            description: `${saved.name} (${input.amount} ${saved.baseUnit})`,
            items,
            totals,
            date: input.date,
        });
    }

    /**
     * THE single FoodLog creation path (used by both AI meals and saved foods):
     * resolves the target calendar day in the user's tz, stores the log, then
     * rebuilds that day's DailySummary from source. Anything that creates a food
     * log must go through here so no parallel bookkeeping can appear.
     */
    private async createLogAndRecompute(
        userId: string,
        input: { description: string; items: IFoodItem[]; totals: NutritionTotals; date?: string }
    ): Promise<IFoodLog> {
        const timezone = await this.getUserTimezone(userId);

        // Resolve the target calendar day (user tz). Past-day logging is supported.
        const todayString = toDateStringInTz(new Date(), timezone);
        const dateString = input.date ?? todayString;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            throw new ValidationError("date must be YYYY-MM-DD");
        }

        // For "today" keep the real timestamp (so meals stay in logged order); for a
        // past day anchor at that day's local midnight so range queries bucket it on
        // the right calendar day (DST-safe via startOfDayUtc).
        const storedDate =
            dateString === todayString ? new Date() : startOfDayUtc(dateString, timezone);

        const log = await FoodLog.create({
            userId: new Types.ObjectId(userId),
            description: input.description,
            items: input.items,
            totals: input.totals,
            date: storedDate,
        });

        await this.recomputeDailySummary(userId, dateString, timezone);
        return log;
    }

    public async editLog(
        userId: string,
        logId: string,
        input: EditFoodInput
    ): Promise<IFoodLog> {
        if (!Types.ObjectId.isValid(logId)) {
            throw new ValidationError("Invalid log id");
        }

        const log = await FoodLog.findById(logId).exec();
        if (!log) throw new ResourceNotFound(0);
        if (String(log.userId) !== userId) {
            throw new ForbiddenError("This log doesn't belong to you");
        }

        const timezone = await this.getUserTimezone(userId);

        // Re-run AI WITH edit context (and the old description) so the model knows
        // it's a correction. Bypasses NutritionCache.
        const parsed = await aiService.analyzeFood(input.description, {
            previousDescription: log.description,
        });
        const newTotals = parsed.totals ?? this.sumItems(parsed.items);

        log.description = input.description;
        log.items = parsed.items;
        log.totals = newTotals;
        await log.save();

        // Recompute the day from source (editing the date isn't supported, so the
        // day is unchanged).
        await this.recomputeDailySummary(userId, toDateStringInTz(log.date, timezone), timezone);
        return log;
    }

    public async deleteLog(userId: string, logId: string): Promise<void> {
        if (!Types.ObjectId.isValid(logId)) {
            throw new ValidationError("Invalid log id");
        }

        const log = await FoodLog.findById(logId).exec();
        if (!log) throw new ResourceNotFound(0);
        if (String(log.userId) !== userId) {
            throw new ForbiddenError("This log doesn't belong to you");
        }

        const timezone = await this.getUserTimezone(userId);
        const dateString = toDateStringInTz(log.date, timezone);

        await log.deleteOne();

        // Recompute the day from source after removal.
        await this.recomputeDailySummary(userId, dateString, timezone);
    }

    public async getHistory(userId: string, range: HistoryRange): Promise<IFoodLog[]> {
        const filter: AnyFilter = { userId: new Types.ObjectId(userId) };
        if (range.from || range.to) {
            const dateFilter: Record<string, Date> = {};
            if (range.from) dateFilter.$gte = range.from;
            if (range.to) dateFilter.$lte = range.to;
            filter.date = dateFilter;
        }
        return FoodLog.find(filter).sort({ date: -1 }).exec();
    }

    public async getDay(
        userId: string,
        dateString: string
    ): Promise<{ logs: IFoodLog[]; summary: IDailySummary | null }> {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            throw new ValidationError("date must be YYYY-MM-DD");
        }

        const timezone = await this.getUserTimezone(userId);
        const start = startOfDayUtc(dateString, timezone);
        const end = endOfDayUtc(dateString, timezone);

        const logsFilter: AnyFilter = {
            userId: new Types.ObjectId(userId),
            date: { $gte: start, $lt: end },
        };
        const summaryFilter: AnyFilter = {
            userId: new Types.ObjectId(userId),
            date: dateString,
        };

        const [logs, summary] = await Promise.all([
            FoodLog.find(logsFilter).sort({ date: -1 }).exec(),
            DailySummary.findOne(summaryFilter).exec(),
        ]);

        return { logs, summary };
    }

    public async getSummaries(
        userId: string,
        range: SummaryRange
    ): Promise<IDailySummary[]> {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(range.from) || !/^\d{4}-\d{2}-\d{2}$/.test(range.to)) {
            throw new ValidationError("from and to must be YYYY-MM-DD");
        }
        if (range.from > range.to) {
            throw new ValidationError("from must be <= to");
        }
        const filter: AnyFilter = {
            userId: new Types.ObjectId(userId),
            date: { $gte: range.from, $lte: range.to },
        };
        return DailySummary.find(filter).sort({ date: 1 }).exec();
    }

    /**
     * Weekly calorie deficit for the SUNDAY–SATURDAY week containing `anchorDate`
     * (defaults to today in the user's timezone).
     *
     * Data sources — all existing, nothing re-derived:
     *  - maintenance: the user's stored maintenanceCalories (set at onboarding /
     *    activity change); falls back to the energy util if an old account is
     *    missing it. The Mifflin-St Jeor formula lives ONLY in utils/energy.ts.
     *  - caloriesEaten: DailySummary.totals.calories. Summaries are rebuilt from
     *    source by recomputeDailySummary on every food/exercise change, so this
     *    always reflects current logged data (no drift). A summary only exists
     *    for days WITH food logs — which is exactly the "logged day" signal.
     *  - exercise: summed fresh from ExerciseEntry per day (same values the
     *    recompute stores on the summary; reading entries also lets exercise-only
     *    days show their burn even though they're excluded from the sum).
     *
     * The actual math is the pure computeWeeklyDeficit in utils/energy.ts.
     */
    public async getWeeklyDeficit(
        userId: string,
        anchorDate?: string
    ): Promise<WeeklyDeficitResult> {
        const user = await User.findById(
            userId,
            "preferences.timezone maintenanceCalories activityLevel profile"
        )
            .lean()
            .exec();
        if (!user) throw new UnauthorizedError("User not found");
        const timezone = user.preferences?.timezone || DEFAULT_TZ;

        const anchor = anchorDate ?? toDateStringInTz(new Date(), timezone);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) {
            throw new ValidationError("date must be YYYY-MM-DD");
        }
        const { start, end } = getWeekRange(anchor);

        const maintenance = this.resolveMaintenance(user);

        // Both collections key days by the same YYYY-MM-DD string, so a plain
        // string range covers the week (summaries only exist for food-logged days).
        const uid = new Types.ObjectId(userId);
        const rangeFilter: AnyFilter = { userId: uid, date: { $gte: start, $lte: end } };
        const [summaries, exercises] = await Promise.all([
            DailySummary.find(rangeFilter).lean().exec(),
            ExerciseEntry.find(rangeFilter).lean().exec(),
        ]);

        const summaryByDate = new Map(summaries.map((s) => [s.date, s]));
        const exerciseByDate = new Map<string, number>();
        for (const e of exercises) {
            exerciseByDate.set(e.date, (exerciseByDate.get(e.date) ?? 0) + (e.caloriesBurned ?? 0));
        }

        // Build all 7 days of the week. caloriesEaten stays null for days without
        // food logs (incl. exercise-only days and future days) — the pure math
        // excludes those from the sum but keeps them in perDay for display.
        const days: DeficitDayInput[] = [];
        for (let i = 0; i < 7; i++) {
            const date = addDaysToDateString(start, i);
            const summary = summaryByDate.get(date);
            const logged = Boolean(summary && summary.logCount > 0);
            days.push({
                date,
                maintenance,
                exerciseCalories: exerciseByDate.get(date) ?? 0,
                caloriesEaten: logged && summary ? summary.totals?.calories ?? 0 : null,
            });
        }

        const math = computeWeeklyDeficit(days);
        return { weekStart: start, weekEnd: end, maintenance, ...math };
    }

    // Maintenance source, in priority order: (1) the persisted user.maintenanceCalories,
    // (2) recomputed via the energy util from the stored profile + activity level.
    // Never re-implements the formula — calculateEnergy is the single owner of it.
    private resolveMaintenance(user: {
        maintenanceCalories?: number;
        activityLevel?: ActivityLevel;
        profile?: { weightKg?: number; heightCm?: number; age?: number; sex?: "male" | "female" };
    }): number {
        if (typeof user.maintenanceCalories === "number" && user.maintenanceCalories > 0) {
            return user.maintenanceCalories;
        }
        const p = user.profile;
        if (p?.weightKg && p?.heightCm && p?.age && p?.sex) {
            return calculateEnergy(
                { weightKg: p.weightKg, heightCm: p.heightCm, age: p.age, sex: p.sex },
                user.activityLevel ?? DEFAULT_ACTIVITY_LEVEL
            ).maintenanceCalories;
        }
        throw new ValidationError(
            "Maintenance calories are not available yet — complete onboarding first."
        );
    }

    private async getUserTimezone(userId: string): Promise<string> {
        const user = await User.findById(userId, "preferences.timezone").lean().exec();
        if (!user) throw new UnauthorizedError("User not found");
        return user.preferences?.timezone || DEFAULT_TZ;
    }

    private sumItems(items: { nutrition: NutritionTotals }[]): NutritionTotals {
        return items.reduce(
            (acc, it) => ({
                calories: acc.calories + (it.nutrition.calories ?? 0),
                protein: acc.protein + (it.nutrition.protein ?? 0),
                carbs: acc.carbs + (it.nutrition.carbs ?? 0),
                fat: acc.fat + (it.nutrition.fat ?? 0),
                fiber: acc.fiber + (it.nutrition.fiber ?? 0),
            }),
            { ...ZERO_TOTALS }
        );
    }

    /**
     * Rebuild a day's DailySummary FROM SOURCE: re-sum every one of this user's
     * logs for that calendar day and reset logCount to the real count. Called by
     * log / edit / delete so the summary can never drift from the underlying logs.
     *
     * Zero-logs decision: if the day has no logs left, the summary doc is DELETED
     * (rather than zeroed). getDay then returns summary=null, which the dashboard
     * already renders as zeros — so no empty docs linger in the collection.
     */
    public async recomputeDailySummary(
        userId: string,
        dateString: string,
        timezone: string
    ): Promise<void> {
        const uid = new Types.ObjectId(userId);
        const start = startOfDayUtc(dateString, timezone);
        const end = endOfDayUtc(dateString, timezone);

        // Source of truth: all of this user's logs that fall in the day's UTC range
        // (the exact inverse of how the summary date string is computed).
        const logsFilter: AnyFilter = { userId: uid, date: { $gte: start, $lt: end } };
        const logs = await FoodLog.find(logsFilter).lean().exec();

        if (logs.length === 0) {
            const delFilter: AnyFilter = { userId: uid, date: dateString };
            await DailySummary.deleteOne(delFilter).exec();
            return;
        }

        const totals = logs.reduce(
            (acc, log) => ({
                calories: acc.calories + (log.totals?.calories ?? 0),
                protein: acc.protein + (log.totals?.protein ?? 0),
                carbs: acc.carbs + (log.totals?.carbs ?? 0),
                fat: acc.fat + (log.totals?.fat ?? 0),
                fiber: acc.fiber + (log.totals?.fiber ?? 0),
            }),
            { ...ZERO_TOTALS }
        );

        const goalFilter: AnyFilter = { userId: uid };
        const goal = await Goal.findOne(goalFilter).lean().exec();

        // Sum the day's exercise burn (stored on the summary for food-logged days).
        const exFilter: AnyFilter = { userId: uid, date: dateString };
        const exercises = await ExerciseEntry.find(exFilter).lean().exec();
        const exerciseBurned = exercises.reduce((acc, e) => acc + (e.caloriesBurned ?? 0), 0);

        const filter: AnyFilter = { userId: uid, date: dateString };
        const update: AnyUpdate = {
            $set: { totals, logCount: logs.length, exerciseBurned },
            $setOnInsert: { goalSnapshot: goal ?? {} },
        };
        await DailySummary.updateOne(filter, update, { upsert: true });
    }

}

export const foodService = new FoodService();
