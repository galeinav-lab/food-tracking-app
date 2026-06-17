import Joi from "joi";

// Reasonable upper bounds — block typos like 200000 calories.
const macro = (max: number) => Joi.number().min(0).max(max);

export const setGoalsSchema = Joi.object({
    calories: macro(20000).optional(),
    protein: macro(1000).optional(),
    carbs: macro(2000).optional(),
    fat: macro(1000).optional(),
    fiber: macro(500).optional(),
}).min(1); // at least one field must be present
