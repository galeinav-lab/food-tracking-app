import { Response } from "express";
import { StatusCode } from "../models/enums";

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
