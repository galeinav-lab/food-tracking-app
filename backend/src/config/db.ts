import mongoose from "mongoose";
import { appConfig } from "../utils/app-config";

export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(appConfig.mongodbConnectionString);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection failed:", err);
        process.exit(1);
    }
}
