import Joi from "joi";
import { MUSCLE_GROUPS } from "../models/strength-exercise";

// Bounds mirror the Mongoose schema so a bad payload is rejected at the edge with
// a readable 400 instead of surfacing as a Mongoose validation error later.
const muscleGroup = Joi.string().valid(...MUSCLE_GROUPS);
const name = Joi.string().trim().min(1).max(80);
const sets = Joi.number().integer().min(1).max(50);
const reps = Joi.number().integer().min(1).max(500);
// Decimals allowed on purpose (2.5 kg plates, 0.5 kg micro-loading). Any float
// noise is rounded to 2dp by the service before it's stored.
const weightKg = Joi.number().min(0).max(1000);

export const createStrengthExerciseSchema = Joi.object({
    muscleGroup: muscleGroup.required(),
    name: name.required(),
    sets: sets.required(),
    reps: reps.required(),
    weightKg: weightKg.optional(),
});

export const updateStrengthExerciseSchema = Joi.object({
    muscleGroup: muscleGroup.optional(),
    name: name.optional(),
    sets: sets.optional(),
    reps: reps.optional(),
    weightKg: weightKg.optional(),
}).min(1);
