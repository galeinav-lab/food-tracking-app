import { Types } from "mongoose";
import { ISavedFood, SavedFood, SavedFoodBaseUnit } from "../models/saved-food";
import { FoodLog, IFoodItem } from "../models/food-log";
import {
    ForbiddenError,
    ResourceNotFound,
    ValidationError,
} from "../models/client-error";
import {
    CreateSavedFoodFromLogInput,
    CreateSavedFoodInput,
    UpdateSavedFoodInput,
} from "../types/saved-food";
import { NutritionTotals } from "../types/nutrition";
import { BaseService } from "./base-service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFilter = any;

// Keep stored macros tidy (avoids 0.30000000000000004 float noise in the DB).
const round2 = (n: number): number => Math.round(n * 100) / 100;

// Maps the AI's free-text units onto our two base units, with a multiplier to
// normalize into that base (kg -> g x1000, l -> ml x1000).
const UNIT_MAP: Record<string, { base: SavedFoodBaseUnit; factor: number }> = {
    g: { base: "g", factor: 1 },
    gr: { base: "g", factor: 1 },
    gram: { base: "g", factor: 1 },
    grams: { base: "g", factor: 1 },
    kg: { base: "g", factor: 1000 },
    kilogram: { base: "g", factor: 1000 },
    kilograms: { base: "g", factor: 1000 },
    ml: { base: "ml", factor: 1 },
    milliliter: { base: "ml", factor: 1 },
    milliliters: { base: "ml", factor: 1 },
    millilitre: { base: "ml", factor: 1 },
    millilitres: { base: "ml", factor: 1 },
    cc: { base: "ml", factor: 1 },
    l: { base: "ml", factor: 1000 },
    liter: { base: "ml", factor: 1000 },
    liters: { base: "ml", factor: 1000 },
    litre: { base: "ml", factor: 1000 },
    litres: { base: "ml", factor: 1000 },
};

class SavedFoodService extends BaseService<ISavedFood> {

    public constructor() {
        super(SavedFood);
    }

    // Named createForUser (not create) so it doesn't clash with the inherited
    // generic BaseService.create(input) signature.
    public async createForUser(userId: string, input: CreateSavedFoodInput): Promise<ISavedFood> {
        return SavedFood.create({
            userId: new Types.ObjectId(userId),
            name: input.name,
            baseUnit: input.baseUnit,
            per100: this.roundTotals(input.per100),
            source: input.source ?? "manual",
        });
    }

    // The user's saved foods, A→Z. `q` filters by name (case-insensitive contains)
    // for the quick-pick search in the logging flow.
    public async list(userId: string, q?: string): Promise<ISavedFood[]> {
        const filter: AnyFilter = { userId: new Types.ObjectId(userId) };
        if (q && q.trim()) {
            // Escape regex metacharacters so a user typing "100% milk" can't break
            // (or inject into) the query.
            const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.name = { $regex: safe, $options: "i" };
        }
        return SavedFood.find(filter).sort({ name: 1 }).exec();
    }

    // Shared ownership gate — used by update/remove here AND by foodService when
    // logging a saved food, so the check exists in exactly one place.
    public async getOwned(userId: string, id: string): Promise<ISavedFood> {
        if (!Types.ObjectId.isValid(id)) {
            throw new ValidationError("Invalid saved food id");
        }
        const doc = await SavedFood.findById(id).exec();
        if (!doc) throw new ResourceNotFound(0);
        if (String(doc.userId) !== userId) {
            throw new ForbiddenError("This saved food doesn't belong to you");
        }
        return doc;
    }

    public async update(
        userId: string,
        id: string,
        input: UpdateSavedFoodInput
    ): Promise<ISavedFood> {
        const doc = await this.getOwned(userId, id);
        if (input.name !== undefined) doc.name = input.name;
        if (input.baseUnit !== undefined) doc.baseUnit = input.baseUnit;
        if (input.per100 !== undefined) doc.per100 = this.roundTotals(input.per100);
        await doc.save();
        return doc;
    }

    public async remove(userId: string, id: string): Promise<void> {
        const doc = await this.getOwned(userId, id);
        await doc.deleteOne();
    }

    /**
     * Create a SavedFood from an already-logged (AI-parsed) meal.
     *
     * THE CONVERSION PROBLEM: a FoodLog stores ABSOLUTE macros for whatever amount
     * was eaten, but a SavedFood stores macros PER 100 units. To convert we need
     * to know what amount those totals represent:
     *
     *     per100 = totals / (amount / 100)
     *
     * How the amount is resolved, in priority order:
     *  1. The caller supplies `amount` + `baseUnit` (authoritative — the user knows
     *     what they ate). The frontend prompts for this.
     *  2. Otherwise INFER from the log's own items: if every item's unit maps to the
     *     same base unit (g/ml — incl. kg/l, normalized), sum the quantities.
     *     e.g. items [chicken 150 g, rice 100 g] -> 250 g.
     *  3. If inference fails — the AI used non-mass units like "serving", "cup",
     *     "piece", or the items mix g with ml — we DON'T guess (a wrong amount
     *     silently corrupts every future log of this food). We throw a 400 naming
     *     the problem, and the client re-submits with amount + baseUnit.
     */
    public async createFromLog(
        userId: string,
        logId: string,
        input: CreateSavedFoodFromLogInput
    ): Promise<ISavedFood> {
        if (!Types.ObjectId.isValid(logId)) {
            throw new ValidationError("Invalid log id");
        }
        const log = await FoodLog.findById(logId).exec();
        if (!log) throw new ResourceNotFound(0);
        if (String(log.userId) !== userId) {
            throw new ForbiddenError("This log doesn't belong to you");
        }

        // 1 + 2: explicit amount wins, else infer from the log's items.
        let amount = input.amount;
        let baseUnit = input.baseUnit;
        if (amount == null || baseUnit == null) {
            const inferred = this.inferAmountFromItems(log.items);
            if (!inferred) {
                // 3: ask the client for the amount instead of guessing.
                throw new ValidationError(
                    "This meal's amount is unclear (its items aren't measured in g or ml). " +
                    "Send `amount` and `baseUnit` ('g' or 'ml') for what this meal represented."
                );
            }
            amount = inferred.amount;
            baseUnit = inferred.baseUnit;
        }

        if (!(amount > 0)) {
            throw new ValidationError("amount must be greater than 0");
        }

        const factor = amount / 100; // totals = per100 * factor  =>  per100 = totals / factor
        const per100: NutritionTotals = {
            calories: log.totals.calories / factor,
            protein: log.totals.protein / factor,
            carbs: log.totals.carbs / factor,
            fat: log.totals.fat / factor,
            fiber: log.totals.fiber / factor,
        };

        return SavedFood.create({
            userId: new Types.ObjectId(userId),
            name: input.name?.trim() || log.description.slice(0, 120),
            baseUnit,
            per100: this.roundTotals(per100),
            source: "ai", // it originated from an AI-parsed log
        });
    }

    // Returns the log's total amount ONLY when every item agrees on one base unit.
    private inferAmountFromItems(
        items: IFoodItem[]
    ): { amount: number; baseUnit: SavedFoodBaseUnit } | null {
        if (!items || items.length === 0) return null;

        let base: SavedFoodBaseUnit | null = null;
        let total = 0;

        for (const item of items) {
            const mapped = UNIT_MAP[String(item.unit ?? "").trim().toLowerCase()];
            if (!mapped) return null; // "serving", "cup", "piece", ... -> can't infer
            if (base && mapped.base !== base) return null; // mixed g + ml -> can't infer
            base = mapped.base;
            const qty = Number(item.quantity);
            if (!Number.isFinite(qty) || qty <= 0) return null;
            total += qty * mapped.factor;
        }

        return base && total > 0 ? { amount: total, baseUnit: base } : null;
    }

    private roundTotals(t: NutritionTotals): NutritionTotals {
        return {
            calories: round2(t.calories),
            protein: round2(t.protein),
            carbs: round2(t.carbs),
            fat: round2(t.fat),
            fiber: round2(t.fiber),
        };
    }

}

export const savedFoodService = new SavedFoodService();
