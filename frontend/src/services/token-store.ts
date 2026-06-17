/**
 * Framework-agnostic token + session seam for the API layer.
 *
 * http-client's request interceptor reads the JWT from here, and its 401 handler
 * calls notifyUnauthorized(). This module deliberately knows nothing about Redux
 * so the service layer stays framework-agnostic.
 *
 * The wiring lives in store/auth-bridge.ts: it pushes the Redux auth token into
 * setToken() whenever it changes, and registers an onUnauthorized handler that
 * dispatches logout(). Token persistence across refresh is handled by the auth
 * slice (localStorage), so there is no storage concern in this file.
 */

let currentToken: string | null = null;

let onUnauthorized: () => void = () => {
    // no-op until the bridge registers a handler
};

export const tokenStore = {
    getToken(): string | null {
        return currentToken;
    },

    setToken(token: string | null): void {
        currentToken = token;
    },

    clearToken(): void {
        currentToken = null;
    },

    setOnUnauthorized(handler: () => void): void {
        onUnauthorized = handler;
    },

    notifyUnauthorized(): void {
        onUnauthorized();
    },
};
