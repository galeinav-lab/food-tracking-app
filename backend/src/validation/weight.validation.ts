import Joi from "joi";

export const addWeightSchema = Joi.object({
    weightKg: Joi.number().min(20).max(500).required(),
    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});
