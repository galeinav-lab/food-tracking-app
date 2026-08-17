import { Router } from "express";
import { savedFoodController } from "../controllers/saved-food-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { validateBody } from "../middleware/validate-middleware";
import {
    createSavedFoodSchema,
    savedFoodFromLogSchema,
    scanLabelSchema,
    updateSavedFoodSchema,
} from "../validation/saved-food.validation";

export const savedFoodRouter = Router();

savedFoodRouter.use(tokenMiddleware.validateToken.bind(tokenMiddleware));

savedFoodRouter.post("/", validateBody(createSavedFoodSchema), savedFoodController.create);
savedFoodRouter.get("/", savedFoodController.list);

// Specific routes BEFORE the parameterized ones, or "/from-log" / "/scan-label"
// would be captured as an :id (the /deficit lesson).
savedFoodRouter.post(
    "/from-log/:logId",
    validateBody(savedFoodFromLogSchema),
    savedFoodController.createFromLog
);

// Reads a label photo and returns parsed values — saves nothing.
savedFoodRouter.post("/scan-label", validateBody(scanLabelSchema), savedFoodController.scanLabel);

savedFoodRouter.put("/:id", validateBody(updateSavedFoodSchema), savedFoodController.update);
savedFoodRouter.delete("/:id", savedFoodController.remove);
