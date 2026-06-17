import Joi from "joi";

export const addWaterSchema = Joi.object({
    amountMl: Joi.number().integer().min(-5000).max(5000).required(),
    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});
