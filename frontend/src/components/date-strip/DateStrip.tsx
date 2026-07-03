import { type JSX, useEffect, useState } from "react";
import { addDaysToDateString, formatDateShort, getWeekRange, todayInTimeZone } from "../../utils/date";
import "./DateStrip.css";

// Box 0 = Sunday … box 6 = Saturday (viewWeekStart is always a Sunday).
const DOW3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DateStripProps {
    timeZone: string;
    selectedDate: string; // YYYY-MM-DD
    onSelectDate: (date: string) => void;
}

// A FIXED Sunday–Saturday week strip. Today sits in its real weekday box; future
// days are greyed + not tappable. The strip follows the selected date's week, and
// prev/next arrows browse other weeks (never past the current week).
function DateStrip({ timeZone, selectedDate, onSelectDate }: DateStripProps): JSX.Element {
    const today = todayInTimeZone(timeZone);
    const currentWeekStart = getWeekRange(today).start;

    // The Sunday of the week currently displayed. Defaults to the selected date's
    // week and re-syncs whenever selectedDate changes (e.g. Home resets to today,
    // or a log bumps state) — so the strip and the deficit view stay on the same week.
    const [viewWeekStart, setViewWeekStart] = useState(() => getWeekRange(selectedDate).start);
    useEffect(() => {
        setViewWeekStart(getWeekRange(selectedDate).start);
    }, [selectedDate]);

    const weekEnd = addDaysToDateString(viewWeekStart, 6);
    const days = Array.from({ length: 7 }, (_, i) => addDaysToDateString(viewWeekStart, i));
    const dayNum = (d: string): number => Number(d.slice(8, 10));

    // Never browse into a fully-future week (can't log the future).
    const nextDisabled = viewWeekStart >= currentWeekStart;
    const atToday = viewWeekStart === currentWeekStart && selectedDate === today;

    const goPrev = (): void => setViewWeekStart(addDaysToDateString(viewWeekStart, -7));
    const goNext = (): void => {
        if (!nextDisabled) setViewWeekStart(addDaysToDateString(viewWeekStart, 7));
    };
    // Selecting today makes the sync effect snap the view back to the current week.
    const goToday = (): void => onSelectDate(today);

    return (
        <div className="datestrip">
            <div className="ds-head">
                <button type="button" className="ds-nav" onClick={goPrev} aria-label="Previous week">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </button>

                <span className="ds-range">
                    {formatDateShort(viewWeekStart)} – {formatDateShort(weekEnd)}
                </span>

                <button type="button" className="ds-today-btn" onClick={goToday} disabled={atToday}>
                    Today
                </button>

                <button type="button" className="ds-nav" onClick={goNext} disabled={nextDisabled} aria-label="Next week">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </button>
            </div>

            <div className="ds-week" role="group" aria-label="Select day">
                {days.map((d, i) => {
                    const isToday = d === today;
                    const isSelected = d === selectedDate;
                    const isFuture = d > today; // future days can't be logged
                    const cls = [
                        "ds-day",
                        isSelected ? "ds-active" : "",
                        isToday ? "ds-today" : "",
                        isFuture ? "ds-future" : "",
                    ]
                        .filter(Boolean)
                        .join(" ");
                    return (
                        <button
                            key={d}
                            type="button"
                            className={cls}
                            disabled={isFuture}
                            aria-pressed={isSelected}
                            aria-label={isToday ? `${d} (today)` : d}
                            onClick={() => onSelectDate(d)}
                        >
                            <span className="ds-dow">{DOW3[i]}</span>
                            <span className="ds-num">{dayNum(d)}</span>
                            {isToday && <span className="ds-dot" aria-hidden="true" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default DateStrip;
