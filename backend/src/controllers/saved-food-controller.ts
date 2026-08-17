import { NextFunction, Request, Response } from "express";
import { savedFoodService } from "../services/saved-food-service";
import { aiService } from "../services/ai-service";
import {
    CreateSavedFoodFromLogInput,
    CreateSavedFoodInput,
    ScanLabelInput,
    UpdateSavedFoodInput,
} from "../types/saved-food";
import { UnauthorizedError } from "../models/client-error";
import { StatusCode } from "../models/enums";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class SavedFoodController extends BaseController {

    public create = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const saved = await savedFoodService.createForUser(userId, req.body as CreateSavedFoodInput);
            this.sendSuccess(res, saved, StatusCode.Created);
        } catch (err) {
            next(err);
        }
    };

    // GET /api/saved-foods?q=  — optional name filter for quick picking.
    public list = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const q = typeof req.query.q === "string" ? req.query.q : undefined;
            const rows = await savedFoodService.list(userId, q);
            this.sendSuccess(res, rows);
        } catch (err) {
            next(err);
        }
    };

    public update = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const saved = await savedFoodService.update(
                userId,
                String(req.params.id),
                req.body as UpdateSavedFoodInput
            );
            this.sendSuccess(res, saved);
        } catch (err) {
            next(err);
        }
    };

    public remove = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            await savedFoodService.remove(userId, String(req.params.id));
            this.sendSuccess(res, { deleted: true, id: req.params.id });
        } catch (err) {
            next(err);
        }
    };

    // POST /api/saved-foods/from-log/:logId — converts a logged meal's absolute
    // totals into per-100 (see the service for how the amount is resolved).
    public createFromLog = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const saved = await savedFoodService.createFromLog(
                userId,
                String(req.params.logId),
                req.body as CreateSavedFoodFromLogInput
            );
            this.sendSuccess(res, saved, StatusCode.Created);
        } catch (err) {
            next(err);
        }
    };

    // POST /api/saved-foods/scan-label — reads a label photo with the AI and
    // returns the parsed values. Creates NOTHING: the user confirms/edits in the
    // UI, then the normal create endpoint saves it.
    public scanLabel = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            this.requireUserId(req); // auth-gated (the AI call costs money)
            const { imageBase64 } = req.body as ScanLabelInput;
            const result = await aiService.readNutritionLabel(imageBase64);
            this.sendSuccess(res, result);
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

export const savedFoodController = new SavedFoodController();
