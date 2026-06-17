import axios from "axios";
import { IApiResponse } from "../models/api-response";
import { IErrorReportInput, IErrorReportResult } from "../models/error-report";
import { toastBus } from "./toast-bus";

/**
 * Central crash reporter for the friends-and-family testing build.
 *
 * - POSTs reports to /api/error-report using its OWN bare axios instance (no
 *   interceptors) so a failing report can never re-trigger the reporter (no loop).
 * - Never attaches the auth token or any header secret; identity is passed as
 *   plain userId/email from the registered provider, and the backend also enriches
 *   from the verified token on its side.
 * - All of this is gated behind REACT_APP_TESTING so it's trivial to disable for
 *   production (see TESTING_ENABLED).
 */

// CRA needs REACT_APP_. Set REACT_APP_TESTING=true to enable verbose capture,
// toasts, and the "Report a problem" button. Unset/false => fully disabled.
export const TESTING_ENABLED = process.env.REACT_APP_TESTING === "true";

// Same default as http-client. Duplicated (not imported) on purpose to avoid a
// circular import: http-client imports this module for the interceptor.
const API_BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:5000/api";

const reporterHttp = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// --- Identity (wired from the Redux store via auth-bridge, no React import here) ---

type IdentityProvider = () => { userId?: string; userEmail?: string };
let identityProvider: IdentityProvider = () => ({});

export function setReportIdentityProvider(provider: IdentityProvider): void {
    identityProvider = provider;
}

// --- Last error context (so the manual "Report a problem" form can attach it) ---

export interface ErrorContext {
    apiUrl?: string;
    httpMethod?: string;
    httpStatus?: number;
    backendError?: string;
    message?: string;
    stack?: string;
    componentOrScreen?: string;
}

let lastContext: ErrorContext = {};

export function captureContext(ctx: ErrorContext): void {
    lastContext = ctx;
}

export function getLastContext(): ErrorContext {
    return lastContext;
}

// --- Secret scrubbing (defense in depth; backend scrubs again) ---

const SECRET_PATTERNS: RegExp[] = [
    /(authorization)\s*[:=]\s*\S+/gi,
    /(bearer)\s+[A-Za-z0-9._-]+/gi,
    /(password|passwordHash|pwd)\s*[:=]\s*\S+/gi,
    /(token|jwt|access_token|refresh_token|apiKey|api_key|secret)\s*[:=]\s*\S+/gi,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
];

function redact(value?: string): string | undefined {
    if (!value) return value;
    let out = value;
    for (const re of SECRET_PATTERNS) out = out.replace(re, "$1 [REDACTED]");
    return out;
}

// --- Reporting ---

// POST a report. Returns the short errorId, or null if disabled/failed. Never throws.
export async function reportError(partial: IErrorReportInput): Promise<string | null> {
    if (!TESTING_ENABLED) return null;
    try {
        const identity = identityProvider();
        const payload: IErrorReportInput = {
            source: "unknown",
            userAgent: navigator.userAgent,
            route: window.location.pathname + window.location.search,
            clientTimestamp: new Date().toISOString(),
            ...partial,
            // Re-apply redaction AFTER the spread so partial values are scrubbed too.
            message: redact(partial.message),
            stack: redact(partial.stack),
            backendError: redact(partial.backendError),
            userNote: partial.userNote,
            userId: partial.userId ?? identity.userId,
            userEmail: partial.userEmail ?? identity.userEmail,
        };

        const res = await reporterHttp.post<IApiResponse<IErrorReportResult>>(
            "/error-report",
            payload
        );
        const body = res.data;
        return body.success ? body.data.errorId : null;
    } catch {
        // The reporter must never surface its own failure to the tester.
        return null;
    }
}

// Build a compact, copyable technical blob for the toast/fallback "details".
export function buildDetails(p: IErrorReportInput): string {
    const lines: string[] = [];
    const call = `${p.httpMethod ?? ""} ${p.apiUrl ?? ""}`.trim();
    if (call) lines.push(call);
    if (typeof p.httpStatus === "number") lines.push(`Status: ${p.httpStatus}`);
    if (p.backendError) lines.push(`Server: ${p.backendError}`);
    if (p.message && p.message !== p.backendError) lines.push(p.message);
    if (p.componentOrScreen) lines.push(`Where: ${p.componentOrScreen}`);
    if (p.stack) lines.push(p.stack.split("\n").slice(0, 5).join("\n"));
    return lines.join("\n");
}

// Report + show a friendly, dismissable toast. Used by the interceptor and the
// global handlers. No-op (no toast, no report) when testing is disabled.
export async function reportAndToast(
    partial: IErrorReportInput,
    headline: string
): Promise<string | null> {
    if (!TESTING_ENABLED) return null;
    const errorId = await reportError(partial);
    toastBus.show({
        kind: "error",
        headline,
        details: buildDetails(partial),
        errorId: errorId ?? undefined,
    });
    return errorId;
}

// --- Global handlers (uncaught errors + unhandled promise rejections) ---

let installed = false;

export function installGlobalErrorHandlers(): void {
    if (installed || !TESTING_ENABLED) return;
    installed = true;

    window.addEventListener("error", (event: ErrorEvent) => {
        const err = event.error instanceof Error ? event.error : undefined;
        void reportAndToast(
            {
                source: "window",
                message: event.message || err?.message,
                stack: err?.stack,
                componentOrScreen: "window.onerror",
            },
            "Something went wrong. This has been reported."
        );
    });

    window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
        const reason: unknown = event.reason;
        // Skip API errors the interceptor already reported (no import of ApiError
        // here — just check the marker it set) to avoid duplicate reports.
        if (
            reason &&
            typeof reason === "object" &&
            (reason as { reported?: boolean }).reported === true
        ) {
            return;
        }
        const err = reason instanceof Error ? reason : undefined;
        void reportAndToast(
            {
                source: "window",
                message: err?.message ?? String(reason),
                stack: err?.stack,
                componentOrScreen: "unhandledrejection",
            },
            "Something went wrong. This has been reported."
        );
    });
}
