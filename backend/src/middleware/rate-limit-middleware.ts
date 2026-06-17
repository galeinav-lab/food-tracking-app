import rateLimit from "express-rate-limit";

/**
 * Auth-route rate limiter.
 * 5 attempts per 15-minute window per IP. After the 5th attempt the client
 * gets a 429 with a JSON envelope until the window rolls over.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many attempts. Please try again in 15 minutes.",
    },
});
