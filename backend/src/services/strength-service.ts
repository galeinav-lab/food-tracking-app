// ── StrengthService ────────────────────────────────────────────────────────
// CRUD for the user's persistent strength-training list. Deliberately isolated:
// it touches ONLY the `strength_exercises` collection — no DailySummary, no
// recompute, no energy math. Nothing here can affect calories or the deficit.
import { Types } from "mongoose";
import {
    IStrengthExercise,
    MuscleGroup,
    StrengthExercise,
} from "../models/strength-exercise";
import {
    ForbiddenError,
    ResourceNotFound,
    ValidationError,
} from "../models/client-error";
import {
    CreateStrengthExerciseInput,
    UpdateStrengthExerciseInput,
} from "../types/strength";
import { BaseService } from "./base-service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFilter = any;

// Keeps stored weights tidy (no 62.50000000000001 from a client's arithmetic).
const round2 = (n: number): number => Math.round(n * 100) / 100;

class StrengthService extends BaseService<IStrengthExercise> {

    public constructor() {
        super(StrengthExercise);
    }

    // Named createForUser (not create) so it doesn't clash with the inherited
    // generic BaseService.create(input) signature — same as savedFoodService.
    public async createForUser(
        userId: string,
        input: CreateStrengthExerciseInput
    ): Promise<IStrengthExercise> {
        return StrengthExercise.create({
            userId: new Types.ObjectId(userId),
            muscleGroup: input.muscleGroup,
            name: input.name,
            sets: input.sets,
            reps: input.reps,
            weightKg: round2(input.weightKg ?? 0),
        });
    }

    // The user's exercises, oldest first (createdAt asc) so the list keeps a
    // stable order the user built up — editing a row never reshuffles it.
    public async list(userId: string, muscleGroup?: MuscleGroup): Promise<IStrengthExercise[]> {
        const filter: AnyFilter = { userId: new Types.ObjectId(userId) };
        if (muscleGroup) filter.muscleGroup = muscleGroup;
        return StrengthExercise.find(filter).sort({ createdAt: 1 }).exec();
    }

    // Single ownership gate for update/remove: 404 when it doesn't exist,
    // 403 when it exists but belongs to someone else.
    public async getOwned(userId: string, id: string): Promise<IStrengthExercise> {
        if (!Types.ObjectId.isValid(id)) {
            throw new ValidationError("Invalid exercise id");
        }
        const doc = await StrengthExercise.findById(id).exec();
        if (!doc) throw new ResourceNotFound(0);
        if (String(doc.userId) !== userId) {
            throw new ForbiddenError("This exercise doesn't belong to you");
        }
        return doc;
    }

    public async update(
        userId: string,
        id: string,
        input: UpdateStrengthExerciseInput
    ): Promise<IStrengthExercise> {
        const doc = await this.getOwned(userId, id);
        if (input.muscleGroup !== undefined) doc.muscleGroup = input.muscleGroup;
        if (input.name !== undefined) doc.name = input.name;
        if (input.sets !== undefined) doc.sets = input.sets;
        if (input.reps !== undefined) doc.reps = input.reps;
        if (input.weightKg !== undefined) doc.weightKg = round2(input.weightKg);
        await doc.save();
        return doc;
    }

    public async remove(userId: string, id: string): Promise<void> {
        const doc = await this.getOwned(userId, id);
        await doc.deleteOne();
    }

}

export const strengthService = new StrengthService();
