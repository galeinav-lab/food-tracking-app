import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth-slice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        // Server data (logs, goals, summaries) intentionally stays OUT of Redux —
        // components fetch it on demand via the service layer.
    },
});

// Inferred types — the single source of truth for the store's shape.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
