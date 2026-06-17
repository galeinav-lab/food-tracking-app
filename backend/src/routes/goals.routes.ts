import { Router } from "express";
import { goalsController } from "../controllers/goals-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { validateBody } from "../middleware/validate-middleware";
import { setGoalsSchema } from "../validation/goals.validation";

export const goalsRouter = Router();

goalsRouter.use(tokenMiddleware.validateToken.bind(tokenMiddleware));

goalsRouter.get("/", goalsController.getGoals);
goalsRouter.put("/", validateBody(setGoalsSchema), goalsController.setGoals);
