import Joi from "joi";

// Macros per 100 units. Non-negative and bounded to catch obvious typos
// (nothing edible is 10,000 kcal per 100 g).
const per100Schema = Joi.object({
    calories: Joi.number().min(0).max(2000).required(),
    protein: Joi.number().min(0).max(200).required(),
    carbs: Joi.number().min(0).max(200).required(),
    fat: Joi.number().min(0).max(200).required(),
    fiber: Joi.number().min(0).max(200).required(),
});

export const createSavedFoodSchema = Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    baseUnit: Joi.string().valid("g", "ml").required(),
    per100: per100Schema.required(),
    // 'barcode' is intentionally not accepted (reserved, not produced today).
    source: Joi.string().valid("manual", "ai", "label").optional(),
});

// POST /api/saved-foods/scan-label — the image only; nothing is saved here.
// Base64 of ~7.5MB of binary; the route's own 10mb JSON parser backs this up.
export const scanLabelSchema = Joi.object({
    imageBase64: Joi.string().min(100).max(10_000_000).required(),
});

// Partial edit — at least one field must be present.
export const updateSavedFoodSchema = Joi.object({
    name: Joi.string().trim().min(1).max(120).optional(),
    baseUnit: Joi.string().valid("g", "ml").optional(),
    per100: per100Schema.optional(),
}).min(1);

// amount/baseUnit are optional: the service infers them from the log when it can
// and returns a clear 400 asking for them when it can't.
export const savedFoodFromLogSchema = Joi.object({
    name: Joi.string().trim().min(1).max(120).optional(),
    amount: Joi.number().greater(0).max(100000).optional(),
    baseUnit: Joi.string().valid("g", "ml").optional(),
});

export const logSavedFoodSchema = Joi.object({
    savedFoodId: Joi.string().required(),
    amount: Joi.number().greater(0).max(100000).required(),
    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});
