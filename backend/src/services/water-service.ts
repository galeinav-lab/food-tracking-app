import { Types } from "mongoose";
import { WaterDay } from "../models/water-day";
import { User } from "../models/user";
import { UnauthorizedError, ValidationError } from "../models/client-error";
import { AddWaterInput, WaterDayResult } from "../types/water";
import { toDateStringInTz } from "../utils/date-tz";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFilter = any;

const DEFAULT_TZ = "Asia/Jerusalem";

class WaterService {

    private async getTimezone(userId: string): Promise<string> {
        const user = await User.findById(userId, "preferences.timezone").lean().exec();
        if (!user) throw new UnauthorizedError("User not found");
        return user.preferences?.timezone || DEFAULT_TZ;
    }

    // Add (or subtract, if negative) an amount to a day's running total. Clamps ≥ 0.
    public async addAmount(userId: string, input: AddWaterInput): Promise<WaterDayResult> {
        const timezone = await this.getTimezone(userId);
        const date = input.date ?? toDateStringInTz(new Date(), timezone);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new ValidationError("date must be YYYY-MM-DD");
        }

        const uid = new Types.ObjectId(userId);
        const filter: AnyFilter = { userId: uid, date };
        const doc = await WaterDay.findOneAndUpdate(
            filter,
            { $inc: { waterMl: input.amountMl } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).exec();

        // Never let the running total go negative (undo past zero).
        if (doc.waterMl < 0) {
            doc.waterMl = 0;
            await doc.save();
        }

        return { date, waterMl: doc.waterMl };
    }

    public async getDay(userId: string, date: string): Promise<WaterDayResult> {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new ValidationError("date must be YYYY-MM-DD");
        }
        const uid = new Types.ObjectId(userId);
        const filter: AnyFilter = { userId: uid, date };
        const doc = await WaterDay.findOne(filter).lean().exec();
        return { date, waterMl: doc?.waterMl ?? 0 };
    }

    // Today (user tz) if no date given.
    public async getDayOrToday(userId: string, date?: string): Promise<WaterDayResult> {
        const d = date ?? toDateStringInTz(new Date(), await this.getTimezone(userId));
        return this.getDay(userId, d);
    }

    public async getRange(userId: string, from: string, to: string): Promise<WaterDayResult[]> {
        const uid = new Types.ObjectId(userId);
        const filter: AnyFilter = { userId: uid, date: { $gte: from, $lte: to } };
        const docs = await WaterDay.find(filter).sort({ date: 1 }).lean().exec();
        return docs.map((d) => ({ date: d.date, waterMl: d.waterMl }));
    }

}

export const waterService = new WaterService();
