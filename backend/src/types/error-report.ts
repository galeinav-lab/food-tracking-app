import { ErrorReportSource } from "../models/error-report";

// Payload the client may POST to /api/error-report. Everything is optional
// except nothing — we want to capture crashes even with partial context.
// NOTE: identity (userId/email) is enriched server-side from the token when
// present; auth headers/tokens are NEVER accepted or stored.
export interface CreateErrorReportInput {
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

// What we hand back to the client after saving — just enough to show the id.
export interface CreateErrorReportResult {
    errorId: string;
}
