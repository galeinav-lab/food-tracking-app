import { Types } from "mongoose";
import { ExerciseEntry, IExerciseEntry } from "../models/exercise-entry";
import { User } from "../models/user";
import {
    ForbiddenError,
    ResourceNotFound,
    UnauthorizedError,
    ValidationError,
} from "../models/client-error";
import { AddExerciseInput, ExerciseRange } from "../types/exercise";
import { toDateStringInTz } from "../utils/date-tz";
import { foodService } from "./food-service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFilter = any;

const DEFAULT_TZ = "Asia/Jerusalem";

class ExerciseService {

    private async getTimezone(userId: string): Promise<string> {
        const user = await User.findById(userId, "preferences.timezone").lean().exec();
        if (!user) throw new UnauthorizedError("User not found");
        return user.preferences?.timezone || DEFAULT_TZ;
    }

    public async add(userId: string, input: AddExerciseInput): Promise<IExerciseEntry> {
        const timezone = await this.getTimezone(userId);
        const date = input.date ?? toDateStringInTz(new Date(), timezone);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new ValidationError("date must be YYYY-MM-DD");
        }

        const entry = await ExerciseEntry.create({
            userId: new Types.ObjectId(userId),
            date,
            type: input.type,
            caloriesBurned: input.caloriesBurned,
            durationMin: input.durationMin,
            note: input.note,
        });

        // Keep the day's DailySummary exercise burn in sync (food-day summaries only).
        await foodService.recomputeDailySummary(userId, date, timezone);
        return entry;
    }

    public async list(userId: string, range: ExerciseRange): Promise<IExerciseEntry[]> {
        const uid = new Types.ObjectId(userId);
        const filter: AnyFilter = { userId: uid };

        if (range.date) {
            filter.date = range.date;
        } else if (range.from || range.to) {
            const dateFilter: Record<string, string> = {};
            if (range.from) dateFilter.$gte = range.from;
            if (range.to) dateFilter.$lte = range.to;
            filter.date = dateFilter;
        }

        return ExerciseEntry.find(filter).sort({ date: -1, createdAt: -1 }).exec();
    }

    public async remove(userId: string, id: string): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new ValidationError("Invalid id");
        }
        const entry = await ExerciseEntry.findById(id).exec();
        if (!entry) throw new ResourceNotFound(0);
        if (String(entry.userId) !== userId) {
            throw new ForbiddenError("This entry doesn't belong to you");
        }

        const date = entry.date;
        const timezone = await this.getTimezone(userId);
        await entry.deleteOne();

        // Recompute the day's summary burn after removal.
        await foodService.recomputeDailySummary(userId, date, timezone);
    }

}

export const exerciseService = new ExerciseService();
