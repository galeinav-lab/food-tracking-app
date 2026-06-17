import Joi from "joi";

export const onboardingSchema = Joi.object({
    weightKg: Joi.number().positive().max(500).required(),
    heightCm: Joi.number().min(50).max(300).required(),
    age: Joi.number().integer().min(13).max(120).required(),
    sex: Joi.string().valid("male", "female").required(),
    goalType: Joi.string().valid("lose", "maintain", "gain").required(),
    targetWeightKg: Joi.number().positive().max(500).required(),
    timeframeMonths: Joi.number().integer().min(1).max(12).required(),
});
