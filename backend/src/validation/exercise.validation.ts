import Joi from "joi";

export const addExerciseSchema = Joi.object({
    type: Joi.string().trim().min(1).max(80).required(),
    caloriesBurned: Joi.number().min(0).max(20000).required(),
    durationMin: Joi.number().min(0).max(1440).optional(),
    note: Joi.string().trim().max(280).allow("").optional(),
    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});
