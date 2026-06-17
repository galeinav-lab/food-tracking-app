import { Router } from "express";
import { authController } from "../controllers/auth-controller";
import { tokenMiddleware } from "../middleware/token-middleware";
import { authLimiter } from "../middleware/rate-limit-middleware";
import { validateBody } from "../middleware/validate-middleware";
import { loginSchema, registerSchema } from "../validation/auth.validation";

export const authRouter = Router();

// Public, rate-limited, validated
authRouter.post("/register", authLimiter, validateBody(registerSchema), authController.register);
authRouter.post("/login", authLimiter, validateBody(loginSchema), authController.login);

// Protected: returns the currently authenticated user
authRouter.get("/me", tokenMiddleware.validateToken.bind(tokenMiddleware), authController.me);
