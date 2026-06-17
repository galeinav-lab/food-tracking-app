import { NextFunction, Request, Response } from "express";
import { weightService } from "../services/weight-service";
import { AddWeightInput, WeightRange } from "../types/weight";
import { UnauthorizedError } from "../models/client-error";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class WeightController extends BaseController {

    public add = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const entry = await weightService.addOrUpdate(userId, req.body as AddWeightInput);
            this.sendSuccess(res, entry);
        } catch (err) {
            next(err);
        }
    };

    public list = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const range: WeightRange = {
                from: req.query.from ? String(req.query.from) : undefined,
                to: req.query.to ? String(req.query.to) : undefined,
                days: req.query.days ? Number(req.query.days) : undefined,
            };
            const entries = await weightService.list(userId, range);
            this.sendSuccess(res, entries);
        } catch (err) {
            next(err);
        }
    };

    public remove = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            await weightService.remove(userId, String(req.params.id));
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

export const weightController = new WeightController();
