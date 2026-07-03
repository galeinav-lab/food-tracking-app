// ── Refresh / selected-day context ─────────────────────────────────────────
// This is a "React Context": a way to share state with a whole subtree WITHOUT
// passing props down through every level ("prop drilling"). We use it instead of
// Redux because this is transient UI state, not core app data. It lets two far-apart
// components — the logging sheet (in Layout) and the dashboard (in a route) — agree on:
//   - selectedDate: which day the dashboard shows (week strip + past-day logging)
//   - refreshKey/bump: a counter we increment to make children re-fetch after a change.
import { type JSX, type ReactNode, createContext, useContext, useMemo, useState } from "react";
import { useAppSelector } from "../store/hooks";
import { todayInTimeZone } from "../utils/date";
interface RefreshContextValue {
    refreshKey: number;
    bump: () => void;
    timeZone: string;
    selectedDate: string; // YYYY-MM-DD in the user's timezone
    setSelectedDate: (date: string) => void;
}

const FALLBACK_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const RefreshContext = createContext<RefreshContextValue>({
    refreshKey: 0,
    bump: () => {},
    timeZone: FALLBACK_TZ,
    selectedDate: todayInTimeZone(FALLBACK_TZ),
    setSelectedDate: () => {},
});

export function RefreshProvider({ children }: { children: ReactNode }): JSX.Element {
    const timeZone = useAppSelector((state) => state.auth.user?.preferences.timezone) ?? FALLBACK_TZ;
    const [refreshKey, setRefreshKey] = useState(0);
    // Defaults to today; the week strip changes it. Past data is viewed in place.
    const [selectedDate, setSelectedDate] = useState<string>(() => todayInTimeZone(timeZone));

    // `useMemo` keeps the context value object stable between renders (new identity
    // only when a dependency actually changes), so consumers don't re-render needlessly.
    const value = useMemo(
        () => ({
            refreshKey,
            bump: () => setRefreshKey((k) => k + 1), // increment => children re-fetch
            timeZone,
            selectedDate,
            setSelectedDate,
        }),
        [refreshKey, timeZone, selectedDate]
    );
    return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

// Custom hook so components just call useRefresh() instead of useContext(RefreshContext).
export function useRefresh(): RefreshContextValue {
    return useContext(RefreshContext);
}
