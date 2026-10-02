import { type JSX, useEffect } from "react";
import { useAppSelector } from "../../store/hooks";
import { useRefresh } from "../../context/refresh-context";
import DailyDashboard from "../daily-dashboard/DailyDashboard";
import DateStrip from "../date-strip/DateStrip";
import WeeklyRing from "../weekly-ring/WeeklyRing";
import Water from "../water/Water";
import MealList from "../meal-list/MealList";
import ExerciseList from "../exercise-list/ExerciseList";
import { formatDateLabel, todayInTimeZone } from "../../utils/date";
import "./Home.css";

// Protected "/" dashboard. The week strip controls a SELECTED DATE (shared via
// context with the logging sheet); all day-data below renders that date in place.
// Logging happens in the bottom-sheet and bumps the refresh signal.
function Home(): JSX.Element {
    const firstName = useAppSelector((state) => state.auth.user?.firstName) ?? "there";
    const { refreshKey, bump, timeZone, selectedDate, setSelectedDate } = useRefresh();

    const today = todayInTimeZone(timeZone);
    const isToday = selectedDate === today;

    // Snap back to today whenever the dashboard is (re)entered via navigation.
    // Logging while already on Home doesn't remount this route, so the post-log
    // refresh still shows the day you logged to (incl. past days).
    useEffect(() => {
        setSelectedDate(todayInTimeZone(timeZone));
    }, [timeZone, setSelectedDate]);

    return (
        <div className="home">
            {/* Week strip at the very top of the dashboard, above the main content. */}
            <DateStrip timeZone={timeZone} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            <header className="home-greet">
                <p className="home-hi">Hi, {firstName}</p>
                <p className="home-date">{isToday ? "Today" : formatDateLabel(selectedDate)}</p>
            </header>

            <DailyDashboard date={selectedDate} refreshKey={refreshKey} />

            <div className="home-row">
                <WeeklyRing date={selectedDate} refreshKey={refreshKey} />
                <Water date={selectedDate} refreshKey={refreshKey} />
            </div>

            <MealList date={selectedDate} refreshKey={refreshKey} onChanged={bump} />

            <ExerciseList date={selectedDate} refreshKey={refreshKey} onChanged={bump} />
        </div>
    );
}

export default Home;
