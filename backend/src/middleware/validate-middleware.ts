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
