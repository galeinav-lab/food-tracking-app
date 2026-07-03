// ── Auth slice (Redux Toolkit) ─────────────────────────────────────────────
// A "slice" bundles one piece of global state + the reducers that change it.
// Redux is our ONE source of truth for auth (who's logged in + the token); the
// rest of the app reads it with useAppSelector and changes it with dispatch().
// Key RTK pieces below: createSlice, createAsyncThunk, reducers vs extraReducers.
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authService } from "../services/auth.service";
import { ApiError } from "../services/http-client";
import { IAuthResult, ILoginInput, IRegisterInput } from "../models/auth";
import { IUser } from "../models/user";

// localStorage keys for token persistence (see auth-slice header note + report).
const TOKEN_KEY = "ft_token";
const USER_KEY = "ft_user";

export interface AuthState {
    user: IUser | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

// Rehydrate auth from localStorage on app start so a refresh keeps the session.
function loadInitialState(): AuthState {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);

    let user: IUser | null = null;
    if (userRaw) {
        try {
            user = JSON.parse(userRaw) as IUser;
        } catch {
            user = null;
        }
    }

    return {
        user,
        token,
        isAuthenticated: Boolean(token),
        loading: false,
        error: null,
    };
}

// --- Async thunks (call the framework-agnostic services) ---
// `createAsyncThunk` wraps an async operation and auto-dispatches three actions
// over its lifecycle: pending (started) → fulfilled (success) → rejected (failed).
// We handle those three in `extraReducers` below to flip loading/error/user state.
// `rejectWithValue` lets us send a clean error string to the `.rejected` case.

export const login = createAsyncThunk<IAuthResult, ILoginInput, { rejectValue: string }>(
    "auth/login",
    async (input, { rejectWithValue }) => {
        try {
            return await authService.login(input);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Login failed";
            return rejectWithValue(message);
        }
    }
);

export const register = createAsyncThunk<IAuthResult, IRegisterInput, { rejectValue: string }>(
    "auth/register",
    async (input, { rejectWithValue }) => {
        try {
            return await authService.register(input);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Registration failed";
            return rejectWithValue(message);
        }
    }
);

const authSlice = createSlice({
    name: "auth",
    initialState: loadInitialState(),
    // `reducers` = synchronous state changes you trigger directly (dispatch(logout())).
    // RTK uses Immer under the hood, so "mutating" state here (state.user = null) is
    // SAFE — Immer turns it into an immutable update behind the scenes.
    reducers: {
        logout(state) {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        },
        clearAuthError(state) {
            state.error = null;
        },
        // Replace the current user (e.g. after onboarding flips onboardingCompleted).
        userUpdated(state, action: PayloadAction<IUser>) {
            state.user = action.payload;
            localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
        },
    },
    // `extraReducers` responds to actions defined ELSEWHERE — here, the pending/
    // fulfilled/rejected actions from the login & register thunks above.
    extraReducers: (builder) => {
        const onPending = (state: AuthState) => {
            state.loading = true;
            state.error = null;
        };

        const onFulfilled = (state: AuthState, action: PayloadAction<IAuthResult>) => {
            state.loading = false;
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.error = null;
            localStorage.setItem(TOKEN_KEY, action.payload.token);
            localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
        };

        // rejectValue is string; the rejected action carries it on `payload`.
        const onRejected = (state: AuthState, action: { payload?: string }) => {
            state.loading = false;
            state.error = action.payload ?? "Something went wrong";
        };

        builder
            .addCase(login.pending, onPending)
            .addCase(login.fulfilled, onFulfilled)
            .addCase(login.rejected, onRejected)
            .addCase(register.pending, onPending)
            .addCase(register.fulfilled, onFulfilled)
            .addCase(register.rejected, onRejected);
    },
});

// createSlice auto-generates "action creators" from the reducer names above —
// export them so components can dispatch(logout()), etc. The reducer is the default
// export and gets registered in store.ts.
export const { logout, clearAuthError, userUpdated } = authSlice.actions;
export default authSlice.reducer;
