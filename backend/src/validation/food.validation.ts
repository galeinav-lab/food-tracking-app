import Joi from "joi";

export const logFoodSchema = Joi.object({
    description: Joi.string().trim().min(2).max(500).required(),
    // Calendar day in the user's timezone (supports logging to a past day).
    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});

export const editFoodSchema = Joi.object({
    description: Joi.string().trim().min(2).max(500).required(),
});
