import { Types } from "mongoose";
import { Goal, IGoal } from "../models/goal";
import { SetGoalsInput } from "../types/goals";
import { BaseService } from "./base-service";

class GoalsService extends BaseService<IGoal> {

    public constructor() {
        super(Goal);
    }

    public async getGoals(userId: string): Promise<IGoal> {
        const uid = new Types.ObjectId(userId);
        const existing = await Goal.findOne({ userId: uid }).exec();
        if (existing) return existing;
        return Goal.create({ userId: uid }); // schema defaults fill the macros
    }

    public async setGoals(userId: string, input: SetGoalsInput): Promise<IGoal> {
        const uid = new Types.ObjectId(userId);
        const updated = await Goal.findOneAndUpdate(
            { userId: uid },
            { $set: { ...input, userId: uid } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).exec();
        return updated!;
    }

}

export const goalsService = new GoalsService();
