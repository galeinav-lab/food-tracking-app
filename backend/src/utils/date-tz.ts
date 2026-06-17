/**
 * Timezone-aware date helpers built on Intl.DateTimeFormat (no extra deps).
 *
 * The pattern for converting "calendar date in some tz" → "UTC instant":
 *   1. Pretend the YYYY-MM-DD is midnight UTC (a "guess").
 *   2. Ask Intl what wall-clock time that UTC instant maps to in the target tz.
 *   3. The difference is the tz offset at that moment. Subtract it from the guess
 *      to land on actual midnight in that tz, expressed as UTC.
 *
 * This handles DST correctly because the offset is computed per-instant.
 */

/** Format a Date as YYYY-MM-DD in the given IANA timezone. */
export function toDateStringInTz(date: Date, timeZone: string): string {
    // "en-CA" formats numeric dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

/** Offset of `timeZone` at the given UTC instant, in milliseconds. */
function tzOffsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asIfUtc = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour") === 24 ? 0 : get("hour"), // Intl quirk: "24" on midnight
        get("minute"),
        get("second")
    );
    return asIfUtc - date.getTime();
}

/**
 * UTC instant for midnight at the start of `yyyymmdd` in the given timezone.
 * Used as the lower bound for a "logs on this day" range query.
 */
export function startOfDayUtc(yyyymmdd: string, timeZone: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) {
        throw new Error(`Invalid date string: ${yyyymmdd}`);
    }
    const guess = new Date(`${yyyymmdd}T00:00:00Z`);
    const offset = tzOffsetMs(guess, timeZone);
    return new Date(guess.getTime() - offset);
}

/** UTC instant for midnight at the END of `yyyymmdd` (= start of the next day). */
export function endOfDayUtc(yyyymmdd: string, timeZone: string): Date {
    const start = startOfDayUtc(yyyymmdd, timeZone);
    return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Calendar arithmetic on a "YYYY-MM-DD" string (no timezone shift — treats the
 * string as a bare calendar date). e.g. addDaysToDateString("2026-06-11", -29).
 */
export function addDaysToDateString(yyyymmdd: string, days: number): string {
    const [y, m, d] = yyyymmdd.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
}
