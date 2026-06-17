import { Router } from "express";
import { onboardingController } from "../controllers/onboarding-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { validateBody } from "../middleware/validate-middleware";
import { onboardingSchema } from "../validation/onboarding.validation";

export const onboardingRouter = Router();

onboardingRouter.use(tokenMiddleware.validateToken.bind(tokenMiddleware));

onboardingRouter.post("/", validateBody(onboardingSchema), onboardingController.submit);
