// ── HTTP client ────────────────────────────────────────────────────────────
// The single axios instance every service uses to talk to the backend. The big
// idea here is INTERCEPTORS — hooks that run on EVERY request/response in one
// place, so we don't repeat "attach token" / "handle errors" in every call:
//   • request interceptor  → adds the JWT auth header
//   • response interceptor → centralizes error handling (401 logout, auto-report,
//     and converting any failure into a typed ApiError the UI can catch).
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { IApiResponse, IErrorEnvelope } from "../models/api-response";
import { tokenStore } from "./token-store";
import { captureContext, reportAndToast } from "./error-reporter";

// A friendly, action-shaped headline for the tester (the real detail goes into
// the toast's collapsible section + the report, not here).
function friendlyHeadline(method?: string, status?: number): string {
    if (status === 0) return "Can't reach the server — check your connection.";
    if (method && method !== "GET") return "Couldn't save your changes. This has been reported.";
    return "Couldn't load some data. This has been reported.";
}

// CRA requires the REACT_APP_ prefix to expose env vars to the browser bundle.
// Backend runs on :5000 in dev (CRA owns :3000), so the default points there.
const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:5000/api";

/**
 * Error type the UI can catch and display. Carries the backend's error message
 * (from the { success:false, error } envelope) plus the HTTP status code.
 */
export class ApiError extends Error {
    public readonly status: number;
    // Set when the interceptor has already auto-reported this error, so the global
    // unhandledrejection handler can skip it (avoids a duplicate report).
    public reported = false;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

const instance = axios.create({
    baseURL: BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach the JWT as `Authorization: Bearer <token>` when present.
instance.interceptors.request.use((config) => {
    const token = tokenStore.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: flag 401 as logged-out, and normalize any error into an
// ApiError carrying the backend's message so the UI has something to show.
instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<IErrorEnvelope>) => {
        const status = error.response?.status ?? 0;
        const message =
            error.response?.data?.error ?? error.message ?? "Network error";

        if (status === 401) {
            // Session is no longer valid — clear it and notify the logout hook.
            // Normal session-expiry: don't auto-report or toast (it's expected).
            tokenStore.clearToken();
            tokenStore.notifyUnauthorized();
            return Promise.reject(new ApiError(message, status));
        }

        // Capture the failing call's real detail for the crash inbox + the manual
        // reporter, then auto-report and surface a friendly, dismissable toast.
        const httpMethod = error.config?.method?.toUpperCase();
        const apiUrl = error.config?.url;
        const context = {
            apiUrl,
            httpMethod,
            httpStatus: status,
            backendError: error.response?.data?.error,
            message,
            stack: error.stack,
        };
        captureContext(context);
        void reportAndToast(
            { source: "interceptor", ...context },
            friendlyHeadline(httpMethod, status)
        );

        // Mark as already-reported so a later unhandledrejection won't double-report.
        const apiError = new ApiError(message, status);
        apiError.reported = true;
        return Promise.reject(apiError);
    }
);

/**
 * Typed request that unwraps the backend's { success, data } envelope and returns
 * just the payload. Use for every endpoint EXCEPT /health (which is un-enveloped).
 */
async function request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await instance.request<IApiResponse<T>>(config);
    const body = response.data;

    // Defensive: a 2xx with success:false shouldn't happen (errors come back as
    // non-2xx and are handled in the interceptor), but guard so T stays honest.
    if (!body.success) {
        throw new ApiError(body.error, response.status);
    }
    return body.data;
}

export const http = {
    get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
        request<T>({ ...config, method: "GET", url }),
    post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
        request<T>({ ...config, method: "POST", url, data }),
    put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
        request<T>({ ...config, method: "PUT", url, data }),
    patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
        request<T>({ ...config, method: "PATCH", url, data }),
    delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
        request<T>({ ...config, method: "DELETE", url }),
};

// Raw axios instance for endpoints that do NOT use the envelope (only /health).
export const rawHttp = instance;
