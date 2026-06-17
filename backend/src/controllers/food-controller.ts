import { NextFunction, Request, Response } from "express";
import { foodService } from "../services/food-service";
import { EditFoodInput, HistoryRange, LogFoodInput, SummaryRange } from "../types/food";
import { UnauthorizedError } from "../models/client-error";
import { StatusCode } from "../models/enums";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class FoodController extends BaseController {

    public logFood = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const log = await foodService.logFood(userId, req.body as LogFoodInput);
            this.sendSuccess(res, log, StatusCode.Created);
        } catch (err) {
            next(err);
        }
    };

    public editLog = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const log = await foodService.editLog(
                userId,
                String(req.params.id),
                req.body as EditFoodInput
            );
            this.sendSuccess(res, log);
        } catch (err) {
            next(err);
        }
    };

    public deleteLog = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            await foodService.deleteLog(userId, String(req.params.id));
            this.sendSuccess(res, { deleted: true, id: req.params.id });
        } catch (err) {
            next(err);
        }
    };

    public getHistory = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const range: HistoryRange = {
                from: req.query.from ? new Date(String(req.query.from)) : undefined,
                to: req.query.to ? new Date(String(req.query.to)) : undefined,
            };
            const logs = await foodService.getHistory(userId, range);
            this.sendSuccess(res, logs);
        } catch (err) {
            next(err);
        }
    };

    public getDay = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const day = await foodService.getDay(userId, String(req.params.date));
            this.sendSuccess(res, day);
        } catch (err) {
            next(err);
        }
    };

    public getSummaries = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const range: SummaryRange = {
                from: String(req.query.from ?? ""),
                to: String(req.query.to ?? ""),
            };
            const summaries = await foodService.getSummaries(userId, range);
            this.sendSuccess(res, summaries);
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

export const foodController = new FoodController();
