// ── Global error handler ───────────────────────────────────────────────────
// Express recognizes a middleware with FOUR params (err, req, res, next) as an
// error handler. It's registered LAST (see app.ts) so anything that throws or
// calls next(err) anywhere in the app funnels here — one place to log + shape the
// error response, instead of try/catch returning JSON in every controller.
import {NextFunction, Request, Response} from "express";
import {StatusCode} from "../models/enums";
import {RouteNotFound} from "../models/client-error";
import {appConfig} from "../utils/app-config";

class ErrorMiddleware {

    // `err: any` because anything could be thrown. Our own errors (client-error.ts)
    // carry a `.status`; unexpected ones default to 500.
    public catchAll(err: any, request: Request, response: Response, next: NextFunction) {
        const status = err.status ?? StatusCode.ServerError;
        const message = err.message ?? "Internal server error";
        // Log unexpected errors (500-range) with full stack + timestamp so they
        // don't silently vanish. Client errors (4xx) are intentional and only get
        // a one-line note (no stack) to keep the log readable.
        if (status >= 500) {
            console.error(
                `[${new Date().toISOString()}] [${request.method} ${request.originalUrl}] ${status}`,
                err
            );
        } else {
            console.warn(
                `[${new Date().toISOString()}] [${request.method} ${request.originalUrl}] ${status} ${message}`
            );
        }
        // Never leak internal 5xx details to users in production (the full error is
        // already logged above). 4xx messages are intentional/user-facing, so keep
        // them. In dev, return the real message to aid debugging.
        const safeMessage =
            status >= 500 && appConfig.isProduction ? "Internal server error" : message;

        // Clean, useful JSON for the client: message + status (keeps the existing
        // { success:false, error } shape and adds status for the reporter to capture).
        response.status(status).json({ success: false, error: safeMessage, status });
    }

    public routeNotFound(request: Request, response: Response, next: NextFunction) {
        next(new RouteNotFound(request.originalUrl));
    }

}

export const errorMiddleware = new ErrorMiddleware();
