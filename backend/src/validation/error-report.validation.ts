import Joi from "joi";

// Lenient on purpose: a crashing client may only have partial context, and we
// never want validation to block capturing a report. `stripUnknown` (in the
// validate middleware) drops any field not listed here — so smuggled-in
// `authorization`/`token`/`password` keys are discarded before we ever see them.
export const createErrorReportSchema = Joi.object({
    source: Joi.string()
        .valid("boundary", "interceptor", "window", "manual", "unknown")
        .optional(),
    message: Joi.string().allow("").max(4000).optional(),
    stack: Joi.string().allow("").max(12000).optional(),
    componentOrScreen: Joi.string().allow("").max(300).optional(),
    route: Joi.string().allow("").max(500).optional(),
    apiUrl: Joi.string().allow("").max(1000).optional(),
    httpMethod: Joi.string().allow("").max(10).optional(),
    httpStatus: Joi.number().integer().min(0).max(599).optional(),
    backendError: Joi.string().allow("").max(8000).optional(),
    userNote: Joi.string().allow("").max(2000).optional(),
    userAgent: Joi.string().allow("").max(1000).optional(),
    clientTimestamp: Joi.string().allow("").max(40).optional(),
    userId: Joi.string().allow("").max(100).optional(),
    userEmail: Joi.string().allow("").max(254).optional(),
});
