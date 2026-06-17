import { app } from "./app";
import { connectDB } from "./config/db";
import { appConfig } from "./utils/app-config";

async function start(): Promise<void> {
    await connectDB();
    app.listen(appConfig.port, () => {
        console.log(`Server listening on http://localhost:${appConfig.port}`);
        console.log(`Health check: http://localhost:${appConfig.port}/api/health`);
    });
}

start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
