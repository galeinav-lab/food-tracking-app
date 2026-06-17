import { NextFunction, Request, Response } from "express";

const SENSITIVE_KEYS = new Set(["password", "passwordHash", "token", "authorization"]);

function redact(body: unknown): unknown {
    if (!body || typeof body !== "object") return body;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[redacted]" : value;
    }
    return out;
}

class LoggerMiddleware {

    public consoleLog(request: Request, _response: Response, next: NextFunction) {
        console.log(`${request.method} ${request.originalUrl}`, redact(request.body));
        next();
    }

}

export const loggerMiddleware = new LoggerMiddleware();
