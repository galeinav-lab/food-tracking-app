import { NextFunction, Request, Response } from "express";
import { strengthService } from "../services/strength-service";
import { MUSCLE_GROUPS, MuscleGroup } from "../models/strength-exercise";
import {
    CreateStrengthExerciseInput,
    UpdateStrengthExerciseInput,
} from "../types/strength";
import { UnauthorizedError, ValidationError } from "../models/client-error";
import { StatusCode } from "../models/enums";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class StrengthController extends BaseController {

    // GET /api/strength?muscleGroup=chest
    public list = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const rows = await strengthService.list(userId, this.parseMuscleGroup(req));
            this.sendSuccess(res, rows);
        } catch (err) {
            next(err);
        }
    };

    public create = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const created = await strengthService.createForUser(
                userId,
                req.body as CreateStrengthExerciseInput
            );
            this.sendSuccess(res, created, StatusCode.Created);
        } catch (err) {
            next(err);
        }
    };

    public update = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const updated = await strengthService.update(
                userId,
                String(req.params.id),
                req.body as UpdateStrengthExerciseInput
            );
            this.sendSuccess(res, updated);
        } catch (err) {
            next(err);
        }
    };

    public remove = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            await strengthService.remove(userId, String(req.params.id));
            this.sendSuccess(res, { deleted: true, id: req.params.id });
        } catch (err) {
            next(err);
        }
    };

    // Query strings skip validateBody (it only covers the body), so the filter is
    // validated here: unknown group => 400 rather than a silent empty list.
    private parseMuscleGroup(req: AuthedRequest): MuscleGroup | undefined {
        const raw = req.query.muscleGroup;
        if (raw === undefined || raw === "") return undefined;
        if (typeof raw !== "string" || !MUSCLE_GROUPS.includes(raw as MuscleGroup)) {
            throw new ValidationError(
                "muscleGroup must be one of: " + MUSCLE_GROUPS.join(", ")
            );
        }
        return raw as MuscleGroup;
    }

    private requireUserId(req: AuthedRequest): string {
        const id = req.user?._id;
        if (!id) throw new UnauthorizedError("Authentication required");
        return id;
    }

}

export const strengthController = new StrengthController();
