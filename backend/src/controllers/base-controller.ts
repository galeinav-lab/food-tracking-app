// ── BaseController ─────────────────────────────────────────────────────────
// Abstract base that every controller extends. Its job is the LAYERED-ARCHITECTURE
// split: controllers handle HTTP (read the request, send a response) and delegate
// the actual work to services. Centralizing the response shape here means every
// endpoint returns the SAME JSON "envelope" — the frontend can rely on one shape.
import { Response } from "express";
import { StatusCode } from "../models/enums";

// The "response envelope" pattern: success responses are { success:true, data },
// errors are { success:false, error }. A discriminated union on `success` lets the
// frontend narrow the type safely (if success is true, `data` exists).
export interface SuccessEnvelope<T> {
    success: true;
    data: T;
}

export interface ErrorEnvelope {
    success: false;
    error: string;
}

export abstract class BaseController {

    protected sendSuccess<T>(res: Response, data: T, status: StatusCode = StatusCode.OK): Response {
        const body: SuccessEnvelope<T> = { success: true, data };
        return res.status(status).json(body);
    }

    protected sendError(res: Response, message: string, status: StatusCode = StatusCode.ServerError): Response {
        const body: ErrorEnvelope = { success: false, error: message };
        return res.status(status).json(body);
    }

}
