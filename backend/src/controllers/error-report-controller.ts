import { NextFunction, Request, Response } from "express";
import { errorReportService } from "../services/error-report-service";
import { secureService } from "../services/secure-service";
import { CreateErrorReportInput } from "../types/error-report";
import { StatusCode } from "../models/enums";
import { errorReportViewHtml } from "../views/error-report-view";
import { BaseController } from "./base-controller";

const BEARER_PREFIX = "Bearer ";

class ErrorReportController extends BaseController {

    // Public (optional auth). Testers may crash before OR after login, so we never
    // require a token — but if a valid one is present we trust it for identity.
    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const input = req.body as CreateErrorReportInput;
            const identity = this.identityFromToken(req);
            const result = await errorReportService.createReport(input, identity);
            this.sendSuccess(res, result, StatusCode.Created);
        } catch (err) {
            next(err);
        }
    };

    // Admin-only (guarded by adminMiddleware on the route). Most recent first.
    public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 200;
            const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 200;
            const reports = await errorReportService.listRecent(safeLimit);
            this.sendSuccess(res, reports);
        } catch (err) {
            next(err);
        }
    };

    // Serves the read-only viewer HTML shell (no secret inside — it asks for the
    // admin key and sends it as a header when fetching the data from `list`).
    public view = (_req: Request, res: Response): void => {
        // Relax helmet's default CSP for THIS response only so the page's inline
        // style/script run. `connect-src 'self'` still allows the data fetch.
        res.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'"
        );
        res.type("html").send(errorReportViewHtml);
    };

    // Extract identity from a Bearer token if present/valid. We read ONLY the id and
    // email from the verified payload — the token itself is never stored.
    private identityFromToken(req: Request): { userId?: string; userEmail?: string } | undefined {
        const header = req.headers.authorization;
        if (!header || !header.startsWith(BEARER_PREFIX)) return undefined;
        const payload = secureService.verifyToken(header.slice(BEARER_PREFIX.length));
        if (!payload) return undefined;
        return { userId: payload._id, userEmail: payload.email };
    }

}

export const errorReportController = new ErrorReportController();
