import Joi from "joi";

export const setActivityLevelSchema = Joi.object({
    activityLevel: Joi.string().valid("sedentary", "light", "moderate", "active").required(),
});

export const setWaterTargetSchema = Joi.object({
    // 100 ml .. 20,000 ml (0.1 L .. 20 L) — sane bounds.
    waterTargetMl: Joi.number().integer().min(100).max(20000).required(),
});
