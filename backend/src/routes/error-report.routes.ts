import { Router } from "express";
import { errorReportController } from "../controllers/error-report-controller";
import { adminMiddleware } from "../middleware/admin-middleware";
import { validateBody } from "../middleware/validate-middleware";
import { createErrorReportSchema } from "../validation/error-report.validation";

export const errorReportRouter = Router();

// Public (optional auth): testers' clients post crash reports here.
errorReportRouter.post("/", validateBody(createErrorReportSchema), errorReportController.create);

// Read-only viewer page (HTML shell only; the data fetch below still needs the key).
errorReportRouter.get("/view", errorReportController.view);

// Admin-only: read the crash inbox (secret key via x-admin-key header or ?key=).
errorReportRouter.get(
    "/",
    adminMiddleware.requireAdminKey.bind(adminMiddleware),
    errorReportController.list
);
