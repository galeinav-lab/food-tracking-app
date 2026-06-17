import { Request, Response, NextFunction } from "express";
import { appConfig } from "../utils/app-config";
import { ForbiddenError } from "../models/client-error";

/**
 * Guards the admin-only error-report inbox.
 *
 * Access requires a secret key matching ADMIN_REPORT_KEY, supplied either as an
 * `x-admin-key` header or a `?key=` query param (handy from a browser).
 *
 * Fail-closed: if ADMIN_REPORT_KEY is unset, NOBODY gets in.
 */
class AdminMiddleware {

    public requireAdminKey(request: Request, _response: Response, next: NextFunction): void {
        const expected = appConfig.adminReportKey;
        if (!expected) {
            return next(new ForbiddenError("Admin access is not configured"));
        }

        const headerKey = request.header("x-admin-key");
        const queryKey = typeof request.query.key === "string" ? request.query.key : undefined;
        const provided = headerKey ?? queryKey;

        if (!provided || provided !== expected) {
            return next(new ForbiddenError("Forbidden"));
        }

        next();
    }

}

export const adminMiddleware = new AdminMiddleware();
