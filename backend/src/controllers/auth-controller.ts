import { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth-service";
import { LoginInput, RegisterInput } from "../types/auth";
import { UnauthorizedError } from "../models/client-error";
import { User } from "../models/user";
import { StatusCode } from "../models/enums";
import { calculateEnergy } from "../utils/energy";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class AuthController extends BaseController {

    public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await authService.register(req.body as RegisterInput);
            this.sendSuccess(res, result, StatusCode.Created);
        } catch (err) {
            next(err);
        }
    };

    public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await authService.login(req.body as LoginInput);
            this.sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    };

    public me = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = req.user?._id;
            if (!id) throw new UnauthorizedError("Authentication required");

            const user = await User.findById(id).exec();
            if (!user) throw new UnauthorizedError("User no longer exists");

            // Lazy backfill: accounts onboarded before bmr/maintenance existed get
            // their energy values computed from their stored profile and persisted.
            const p = user.profile;
            if (
                user.maintenanceCalories == null &&
                p &&
                typeof p.weightKg === "number" &&
                typeof p.heightCm === "number" &&
                typeof p.age === "number" &&
                (p.sex === "male" || p.sex === "female")
            ) {
                const { bmr, maintenanceCalories } = calculateEnergy(
                    {
                        weightKg: p.weightKg,
                        heightCm: p.heightCm,
                        age: p.age,
                        sex: p.sex,
                    },
                    user.activityLevel ?? "sedentary"
                );
                user.bmr = bmr;
                user.maintenanceCalories = maintenanceCalories;
                await user.save();
            }

            this.sendSuccess(res, { user: user.toSafeObject() });
        } catch (err) {
            next(err);
        }
    };

}

export const authController = new AuthController();
