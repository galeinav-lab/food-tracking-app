import { NextFunction, Request, Response } from "express";
import { waterService } from "../services/water-service";
import { AddWaterInput } from "../types/water";
import { UnauthorizedError } from "../models/client-error";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class WaterController extends BaseController {

    public add = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const result = await waterService.addAmount(userId, req.body as AddWaterInput);
            this.sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    };

    public get = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const { from, to, date } = req.query;
            if (from && to) {
                const rows = await waterService.getRange(userId, String(from), String(to));
                this.sendSuccess(res, rows);
            } else {
                const result = await waterService.getDayOrToday(
                    userId,
                    date ? String(date) : undefined
                );
                this.sendSuccess(res, result);
            }
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

export const waterController = new WaterController();
