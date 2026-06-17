import Joi from "joi";

export const registerSchema = Joi.object({
    firstName: Joi.string().trim().min(2).max(20).required(),
    lastName: Joi.string().trim().min(2).max(20).required(),
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().min(6).max(128).required(),
});

export const loginSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().min(1).max(128).required(),
});
