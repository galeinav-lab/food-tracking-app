// Routes for the strength-training exercise LIST. Mounted at /api/strength —
// deliberately NOT under /api/exercise (the calorie-burn log), which is untouched.
import { Router } from "express";
import { strengthController } from "../controllers/strength-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { validateBody } from "../middleware/validate-middleware";
import {
    createStrengthExerciseSchema,
    updateStrengthExerciseSchema,
} from "../validation/strength.validation";

export const strengthRouter = Router();

strengthRouter.use(tokenMiddleware.validateToken.bind(tokenMiddleware));

// Collection routes first, parameterized ones after (the /deficit lesson).
strengthRouter.get("/", strengthController.list);
strengthRouter.post("/", validateBody(createStrengthExerciseSchema), strengthController.create);

strengthRouter.patch("/:id", validateBody(updateStrengthExerciseSchema), strengthController.update);
strengthRouter.delete("/:id", strengthController.remove);
