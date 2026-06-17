import { Router } from "express";
import { exerciseController } from "../controllers/exercise-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { validateBody } from "../middleware/validate-middleware";
import { addExerciseSchema } from "../validation/exercise.validation";

export const exerciseRouter = Router();

exerciseRouter.use(tokenMiddleware.validateToken.bind(tokenMiddleware));

exerciseRouter.post("/", validateBody(addExerciseSchema), exerciseController.add);
exerciseRouter.get("/", exerciseController.list);
exerciseRouter.delete("/:id", exerciseController.remove);
