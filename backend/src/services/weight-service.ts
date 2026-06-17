import { Types } from "mongoose";
import { WeightEntry, IWeightEntry } from "../models/weight-entry";
import { User } from "../models/user";
import {
    ForbiddenError,
    ResourceNotFound,
    UnauthorizedError,
    ValidationError,
} from "../models/client-error";
import { AddWeightInput, WeightRange } from "../types/weight";
import { addDaysToDateString, toDateStringInTz } from "../utils/date-tz";

// See note on TS2589 in food-service — loosen mongoose filter typing at the boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFilter = any;

const DEFAULT_TZ = "Asia/Jerusalem";

class WeightService {

    public async addOrUpdate(userId: string, input: AddWeightInput): Promise<IWeightEntry> {
        const user = await User.findById(userId).exec();
        if (!user) throw new UnauthorizedError("User not found");

        const timezone = user.preferences?.timezone || DEFAULT_TZ;
        const date = input.date ?? toDateStringInTz(new Date(), timezone);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new ValidationError("date must be YYYY-MM-DD");
        }

        const uid = new Types.ObjectId(userId);

        // Upsert: one entry per user per day — re-logging the same day overwrites.
        const filter: AnyFilter = { userId: uid, date };
        const entry = await WeightEntry.findOneAndUpdate(
            filter,
            { $set: { weightKg: input.weightKg } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).exec();

        // Keep the user's CURRENT profile weight in sync with the most recent entry
        // (logging an older date won't clobber the current weight).
        const latestFilter: AnyFilter = { userId: uid };
        const latest = await WeightEntry.findOne(latestFilter).sort({ date: -1 }).lean().exec();
        if (latest) {
            user.set("profile.weightKg", latest.weightKg);
            await user.save();
        }

        return entry as IWeightEntry;
    }

    public async list(userId: string, range: WeightRange): Promise<IWeightEntry[]> {
        const uid = new Types.ObjectId(userId);

        let from = range.from;
        let to = range.to;

        // ?days=N -> compute [today-(N-1), today] in the user's timezone.
        if (!from && range.days && range.days > 0) {
            const user = await User.findById(userId, "preferences.timezone").lean().exec();
            const timezone = user?.preferences?.timezone || DEFAULT_TZ;
            const today = toDateStringInTz(new Date(), timezone);
            from = addDaysToDateString(today, -(range.days - 1));
            to = to ?? today;
        }

        const filter: AnyFilter = { userId: uid };
        if (from || to) {
            const dateFilter: Record<string, string> = {};
            if (from) dateFilter.$gte = from;
            if (to) dateFilter.$lte = to;
            filter.date = dateFilter;
        }

        // Ascending by date — easier for charting.
        return WeightEntry.find(filter).sort({ date: 1 }).exec();
    }

    public async remove(userId: string, id: string): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new ValidationError("Invalid id");
        }
        const entry = await WeightEntry.findById(id).exec();
        if (!entry) throw new ResourceNotFound(0);
        if (String(entry.userId) !== userId) {
            throw new ForbiddenError("This entry doesn't belong to you");
        }
        await entry.deleteOne();
    }

}

export const weightService = new WeightService();
