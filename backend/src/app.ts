import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { appConfig } from "./utils/app-config";
import { loggerMiddleware } from "./middleware/logger-middleware";
import { errorMiddleware } from "./middleware/error-middleware";
import { authRouter } from "./routes/auth.routes";
import { foodRouter } from "./routes/food.routes";
import { goalsRouter } from "./routes/goals.routes";
import { onboardingRouter } from "./routes/onboarding.routes";
import { weightRouter } from "./routes/weight.routes";
import { userRouter } from "./routes/user.routes";
import { exerciseRouter } from "./routes/exercise.routes";
import { waterRouter } from "./routes/water.routes";
import { errorReportRouter } from "./routes/error-report.routes";
import { savedFoodRouter } from "./routes/saved-food.routes";

export const app = express();

// Security headers (helmet) first
app.use(helmet());

// CORS: allow local dev + the deployed frontend origin(s) from CLIENT_URL.
// CLIENT_URL may be a comma-separated list (e.g. prod URL + a custom domain).
const allowedOrigins: string[] = [
    "http://localhost:3000",
    ...appConfig.clientUrl
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
];

app.use(
    cors({
        origin(origin, callback) {
            // Allow non-browser requests (no Origin header), e.g. health checks/curl.
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`Origin ${origin} is not allowed by CORS`));
        },
    })
);

// Core middleware.
// The label-scan route carries a base64 photo (~1.4MB for a 1MB JPEG), which the
// default 100kb JSON limit would reject with a 413 before our code ever runs.
// Give ONLY that path a larger parser — registered first, so body-parser marks the
// body as read and the default parser below skips it. Every other route keeps the
// tight default limit.
app.use("/api/saved-foods/scan-label", express.json({ limit: "10mb" }));
app.use(express.json());
app.use(loggerMiddleware.consoleLog);

// Health check (public, no auth)
app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

// API routes
app.use("/api/auth", authRouter);
app.use("/api/food", foodRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/weight", weightRouter);
app.use("/api/user", userRouter);
app.use("/api/exercise", exerciseRouter);
app.use("/api/water", waterRouter);
app.use("/api/saved-foods", savedFoodRouter);
app.use("/api/error-report", errorReportRouter);

// Error handlers MUST come last
app.use(errorMiddleware.routeNotFound);
app.use(errorMiddleware.catchAll);
