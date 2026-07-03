// ── Timezone-safe date helpers ─────────────────────────────────────────────
// Core idea: a CALENDAR DATE ("2026-06-17", the day you ate something) is NOT the
// same as an INSTANT in time. A naive `new Date("2026-06-17")` is parsed as UTC
// midnight and can shift to the previous/next day in the user's timezone. So we
// pass days around as "YYYY-MM-DD" STRINGS and format/compute them explicitly,
// matching the backend exactly so both agree on which day a log belongs to.

// Returns today's date as "YYYY-MM-DD" in the given IANA timezone.
//
// This MUST match how the backend keys DailySummary: backend/src/utils/date-tz.ts
// uses the same Intl "en-CA" formatting in the user's preferences timezone. Asking
// for the same day string guarantees the frontend reads the bucket the backend wrote.
export function todayInTimeZone(timeZone: string): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

// Calendar arithmetic on a "YYYY-MM-DD" string (no timezone shift — we treat the
// string as a bare calendar date). Used to compute range bounds like "30 days ago".
export function addDaysToDateString(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
}

// The SUNDAY→SATURDAY week containing `dateStr`. MIRRORS the backend helper
// (backend/src/utils/date-tz.ts getWeekRange) exactly so the strip's week always
// matches the weekly-deficit endpoint's week. Sunday start is deliberate: a
// calendar date's weekday is timezone-independent, so getUTCDay() on the bare
// date is safe. start = date − weekday, end = start + 6.
export function getWeekRange(dateStr: string): { start: string; end: string } {
    const [y, m, d] = dateStr.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
    const start = addDaysToDateString(dateStr, -weekday);
    return { start, end: addDaysToDateString(start, 6) };
}

// Format a "YYYY-MM-DD" calendar date as e.g. "Wed, 11 Jun". Parsed via local
// components (not Date("YYYY-MM-DD"), which is UTC and can shift the day).
export function formatDateLabel(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}

// Shorter label for chart axes, e.g. "11 Jun".
export function formatDateShort(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
    });
}

// Add whole months to a "YYYY-MM-DD" string (calendar arithmetic).
export function addMonthsToDateString(dateStr: string, months: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCMonth(dt.getUTCMonth() + months);
    return dt.toISOString().slice(0, 10);
}

// Epoch day number for a "YYYY-MM-DD" string — for linear interpolation by date.
export function dateStringToDayNumber(dateStr: string): number {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
