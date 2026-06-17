import { Router } from "express";
import { waterController } from "../controllers/water-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { validateBody } from "../middleware/validate-middleware";
import { addWaterSchema } from "../validation/water.validation";

export const waterRouter = Router();

waterRouter.use(tokenMiddleware.validateToken.bind(tokenMiddleware));

waterRouter.post("/", validateBody(addWaterSchema), waterController.add);
waterRouter.get("/", waterController.get);
