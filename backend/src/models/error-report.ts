import { Document, Model, Schema, model } from "mongoose";

// Where the report originated on the client.
export type ErrorReportSource =
    | "boundary" // React error boundary (render crash)
    | "interceptor" // axios response interceptor (failed API call)
    | "window" // global window error / unhandledrejection
    | "manual" // tester pressed "Report a problem"
    | "unknown";

export interface IErrorReport extends Document {
    // Short human-friendly id shown to the tester (e.g. "A1B2C3").
    errorId: string;
    source: ErrorReportSource;
    message?: string;
    stack?: string;
    // Which screen/component the tester was on.
    componentOrScreen?: string;
    // SPA route/path at the time of the error.
    route?: string;
    // The failing API request (when source = interceptor).
    apiUrl?: string;
    httpMethod?: string;
    httpStatus?: number;
    // The backend's actual error message/body for that failed call.
    backendError?: string;
    // What the tester typed (manual reports).
    userNote?: string;
    userAgent?: string;
    // ISO timestamp captured on the client (server time is createdAt).
    clientTimestamp?: string;
    // Identity, if known (never store tokens/passwords).
    userId?: string;
    userEmail?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ErrorReportSchema = new Schema<IErrorReport>(
    {
        errorId: { type: String, required: true, unique: true, index: true },
        source: {
            type: String,
            enum: ["boundary", "interceptor", "window", "manual", "unknown"],
            default: "unknown",
            index: true,
        },
        message: { type: String },
        stack: { type: String },
        componentOrScreen: { type: String },
        route: { type: String },
        apiUrl: { type: String },
        httpMethod: { type: String },
        httpStatus: { type: Number },
        backendError: { type: String },
        userNote: { type: String },
        userAgent: { type: String },
        clientTimestamp: { type: String },
        userId: { type: String, index: true },
        userEmail: { type: String },
    },
    { timestamps: true }
);

export const ErrorReport: Model<IErrorReport> = model<IErrorReport>(
    "ErrorReport",
    ErrorReportSchema,
    "error_reports"
);
