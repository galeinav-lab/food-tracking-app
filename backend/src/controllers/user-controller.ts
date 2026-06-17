import { NextFunction, Request, Response } from "express";
import { userService } from "../services/user-service";
import { SetActivityLevelInput, SetWaterTargetInput } from "../types/user";
import { UnauthorizedError } from "../models/client-error";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class UserController extends BaseController {

    public setActivityLevel = async (
        req: AuthedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const user = await userService.setActivityLevel(userId, req.body as SetActivityLevelInput);
            this.sendSuccess(res, { user });
        } catch (err) {
            next(err);
        }
    };

    public setWaterTarget = async (
        req: AuthedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const user = await userService.setWaterTarget(userId, req.body as SetWaterTargetInput);
            this.sendSuccess(res, { user });
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

export const userController = new UserController();
