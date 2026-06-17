import { type JSX } from "react";
import { addDaysToDateString, todayInTimeZone } from "../../utils/date";
import "./DateStrip.css";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

interface DateStripProps {
    timeZone: string;
    selectedDate: string; // YYYY-MM-DD
    onSelectDate: (date: string) => void;
}

// Horizontal week strip (last 7 days ending today). Tapping a day SELECTS it as
// the dashboard's active date (data re-renders in place — no navigation). The
// selected day is highlighted; today is marked with a dot.
function DateStrip({ timeZone, selectedDate, onSelectDate }: DateStripProps): JSX.Element {
    const today = todayInTimeZone(timeZone);

    const days: string[] = [];
    for (let i = 6; i >= 0; i--) days.push(addDaysToDateString(today, -i));

    const weekday = (d: string): string => {
        const [y, m, dd] = d.split("-").map(Number);
        return DOW[new Date(y, m - 1, dd).getDay()];
    };
    const dayNum = (d: string): number => Number(d.slice(8, 10));

    return (
        <div className="datestrip" role="group" aria-label="Select day">
            {days.map((d) => {
                const isSelected = d === selectedDate;
                const isToday = d === today;
                const cls = ["ds-day", isSelected ? "ds-active" : "", isToday ? "ds-today" : ""]
                    .filter(Boolean)
                    .join(" ");
                return (
                    <button
                        key={d}
                        type="button"
                        className={cls}
                        aria-pressed={isSelected}
                        aria-label={isToday ? `${d} (today)` : d}
                        onClick={() => onSelectDate(d)}
                    >
                        <span className="ds-dow">{weekday(d)}</span>
                        <span className="ds-num">{dayNum(d)}</span>
                        {isToday && <span className="ds-dot" aria-hidden="true" />}
                    </button>
                );
            })}
        </div>
    );
}

export default DateStrip;
