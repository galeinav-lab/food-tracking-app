import { NextFunction, Request, Response } from "express";
import { onboardingService } from "../services/onboarding-service";
import { OnboardingInput } from "../types/onboarding";
import { UnauthorizedError } from "../models/client-error";
import { BaseController } from "./base-controller";

interface AuthedRequest extends Request {
    user?: { _id: string;[key: string]: unknown };
}

class OnboardingController extends BaseController {

    public submit = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = this.requireUserId(req);
            const result = await onboardingService.completeOnboarding(
                userId,
                req.body as OnboardingInput
            );
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

export const onboardingController = new OnboardingController();
