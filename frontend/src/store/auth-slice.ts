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

export const { logout, clearAuthError, userUpdated } = authSlice.actions;
export default authSlice.reducer;
