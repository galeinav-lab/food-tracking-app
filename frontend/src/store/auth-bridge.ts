import { store } from "./store";
import { logout } from "./auth-slice";
import { tokenStore } from "../services/token-store";
import { setReportIdentityProvider } from "../services/error-reporter";

/**
 * Connects the Redux auth state to the framework-agnostic token seam that
 * http-client reads from. This keeps the service layer decoupled from Redux:
 * http-client never imports the store — it only knows about tokenStore, and this
 * bridge keeps tokenStore in sync with Redux and routes 401s back to a logout.
 *
 * Call once at app start (see index.tsx), AFTER the store is created.
 */
export function connectAuthToHttp(): void {
    // Seed the token seam from the (already-rehydrated) store state.
    tokenStore.setToken(store.getState().auth.token);

    // Keep the seam in sync whenever auth state changes (login, logout, refresh).
    let lastToken = store.getState().auth.token;
    store.subscribe(() => {
        const nextToken = store.getState().auth.token;
        if (nextToken !== lastToken) {
            lastToken = nextToken;
            tokenStore.setToken(nextToken);
        }
    });

    // A 401 from the backend means the session is dead — dispatch logout so the
    // store + localStorage are cleared and the UI can react via useAppSelector.
    tokenStore.setOnUnauthorized(() => {
        store.dispatch(logout());
    });

    // Let the crash reporter tag reports with the current user (id + email only —
    // never the token). Reads live from the store on each report.
    setReportIdentityProvider(() => {
        const user = store.getState().auth.user;
        return { userId: user?._id, userEmail: user?.email };
    });
}
