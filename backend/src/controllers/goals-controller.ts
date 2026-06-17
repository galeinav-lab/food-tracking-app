import { NextFunction, Request, Response } from "express";
import { goalsService } from "../services/goals-service";
import { SetGoalsInput } from "../types/goals";
import { UnauthorizedError } from "../models/client-error";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class GoalsController extends BaseController {

    public getGoals = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const goals = await goalsService.getGoals(userId);
            this.sendSuccess(res, goals);
        } catch (err) {
            next(err);
        }
    };

    public setGoals = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const goals = await goalsService.setGoals(userId, req.body as SetGoalsInput);
            this.sendSuccess(res, goals);
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

export const goalsController = new GoalsController();
