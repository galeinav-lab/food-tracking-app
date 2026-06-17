import { type JSX, type ReactNode, createContext, useContext, useMemo, useState } from "react";
import { useAppSelector } from "../store/hooks";
import { todayInTimeZone } from "../utils/date";

// Shared dashboard "day" signal (NOT server data, NOT Redux). Lets the logging
// sheet (in Layout) and the dashboard (in a route) agree on:
//  - which day is selected (week strip + past-day logging), and
//  - a refresh tick to re-fetch that day after a change.
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

    const value = useMemo(
        () => ({
            refreshKey,
            bump: () => setRefreshKey((k) => k + 1),
            timeZone,
            selectedDate,
            setSelectedDate,
        }),
        [refreshKey, timeZone, selectedDate]
    );
    return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export function useRefresh(): RefreshContextValue {
    return useContext(RefreshContext);
}
