// ── Validation middleware ──────────────────────────────────────────────────
// A "higher-order function": validateBody(schema) RETURNS a middleware function.
// That lets each route pass its own Joi schema, e.g. validateBody(logFoodSchema).
// Why validate at the edge? So controllers/services can trust req.body is the right
// shape — never sanitize the same thing in five places. This is the "validate at the
// boundary" idea, and `stripUnknown` also drops unexpected keys (a security win).
import { NextFunction, Request, Response } from "express";
import { ObjectSchema } from "joi";
import { ValidationError } from "../models/client-error";

/**
 * Build an Express middleware that validates `req.body` against a Joi schema.
 * On success: replaces `req.body` with the sanitized (stripped, coerced) value.
 * On failure: forwards a ValidationError to the global error handler.
 */
export const validateBody = (schema: ObjectSchema) =>
    (req: Request, _res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });
        if (error) {
            const message = error.details.map((d) => d.message).join("; ");
            return next(new ValidationError(message));
        }
        req.body = value;
        next();
    };
