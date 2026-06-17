import "dotenv/config";

class AppConfig {
    public readonly secretKey = process.env.JWT_SECRET || "dev-only-change-me";
    public readonly mongodbConnectionString =
        process.env.MONGO_URI || "mongodb://localhost:27017/food_track";
    public readonly anthropicApiKey = process.env.ANTHROPIC_API_KEY || "";
    public readonly port = Number(process.env.PORT) || 3000;
    // Secret that unlocks the admin error-report inbox (GET /api/error-report).
    // Unset => the inbox is locked for everyone (fail-closed).
    public readonly adminReportKey = process.env.ADMIN_REPORT_KEY || "";
    // Allowed browser origin(s) for CORS — the deployed frontend URL (set this to
    // your Vercel URL in production). Comma-separated to allow more than one.
    // localhost:3000 is always allowed for local dev (see app.ts).
    public readonly clientUrl = process.env.CLIENT_URL || "";
    public readonly isProduction = process.env.NODE_ENV === "production";
}

export const appConfig = new AppConfig();
