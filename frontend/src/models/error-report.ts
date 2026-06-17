// Mirrors backend CreateErrorReportInput (backend/src/types/error-report.ts).
export type ErrorReportSource =
    | "boundary"
    | "interceptor"
    | "window"
    | "manual"
    | "unknown";

export interface IErrorReportInput {
    source?: ErrorReportSource;
    message?: string;
    stack?: string;
    componentOrScreen?: string;
    route?: string;
    apiUrl?: string;
    httpMethod?: string;
    httpStatus?: number;
    backendError?: string;
    userNote?: string;
    userAgent?: string;
    clientTimestamp?: string;
    userId?: string;
    userEmail?: string;
}

export interface IErrorReportResult {
    errorId: string;
}
