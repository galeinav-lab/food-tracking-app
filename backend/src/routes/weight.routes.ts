import { Router } from "express";
import { weightController } from "../controllers/weight-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { validateBody } from "../middleware/validate-middleware";
import { addWeightSchema } from "../validation/weight.validation";

export const weightRouter = Router();

weightRouter.use(tokenMiddleware.validateToken.bind(tokenMiddleware));

weightRouter.post("/", validateBody(addWeightSchema), weightController.add);
weightRouter.get("/", weightController.list);
weightRouter.delete("/:id", weightController.remove);
