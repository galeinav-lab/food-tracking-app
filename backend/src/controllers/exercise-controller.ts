import { NextFunction, Request, Response } from "express";
import { exerciseService } from "../services/exercise-service";
import { AddExerciseInput, ExerciseRange } from "../types/exercise";
import { UnauthorizedError } from "../models/client-error";
import { StatusCode } from "../models/enums";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class ExerciseController extends BaseController {

    public add = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const entry = await exerciseService.add(userId, req.body as AddExerciseInput);
            this.sendSuccess(res, entry, StatusCode.Created);
        } catch (err) {
            next(err);
        }
    };

    public list = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const range: ExerciseRange = {
                date: req.query.date ? String(req.query.date) : undefined,
                from: req.query.from ? String(req.query.from) : undefined,
                to: req.query.to ? String(req.query.to) : undefined,
            };
            const entries = await exerciseService.list(userId, range);
            this.sendSuccess(res, entries);
        } catch (err) {
            next(err);
        }
    };

    public remove = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            await exerciseService.remove(userId, String(req.params.id));
            this.sendSuccess(res, { deleted: true, id: req.params.id });
        } catch (err) {
            next(err);
        }
    };

    private requireUserId(req: AuthedRequest): string {
        const id = req.user?._id;
        if (!id) throw new UnauthorizedError("Authentication required");
        return id;
    }

}

export const exerciseController = new ExerciseController();
