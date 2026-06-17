import { Router } from "express";
import { foodController } from "../controllers/food-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { validateBody } from "../middleware/validate-middleware";
import { editFoodSchema, logFoodSchema } from "../validation/food.validation";

export const foodRouter = Router();

foodRouter.use(tokenMiddleware.validateToken.bind(tokenMiddleware));

foodRouter.post("/log", validateBody(logFoodSchema), foodController.logFood);
foodRouter.put("/log/:id", validateBody(editFoodSchema), foodController.editLog);
foodRouter.delete("/log/:id", foodController.deleteLog);
foodRouter.get("/history", foodController.getHistory);
foodRouter.get("/day/:date", foodController.getDay);
foodRouter.get("/summaries", foodController.getSummaries);
