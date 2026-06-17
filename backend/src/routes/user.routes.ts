import { Router } from "express";
import { userController } from "../controllers/user-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { validateBody } from "../middleware/validate-middleware";
import { setActivityLevelSchema, setWaterTargetSchema } from "../validation/user.validation";

export const userRouter = Router();

userRouter.use(tokenMiddleware.validateToken.bind(tokenMiddleware));

userRouter.put(
    "/activity-level",
    validateBody(setActivityLevelSchema),
    userController.setActivityLevel
);

userRouter.put(
    "/water-target",
    validateBody(setWaterTargetSchema),
    userController.setWaterTarget
);
