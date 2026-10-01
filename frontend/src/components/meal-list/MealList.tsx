import { type JSX, useEffect, useState } from "react";
import { foodService } from "../../services/food.service";
import { ApiError } from "../../services/http-client";
import { IFoodLog } from "../../models/food-log";
import MealCard from "../meal-card/MealCard";
import Skeleton, { SkeletonGroup } from "../skeleton/Skeleton";
import "./MealList.css";

interface MealListProps {
    // The dashboard's selected calendar day (YYYY-MM-DD, user tz).
    date: string;
    // Bumping this re-fetches the day's meals (e.g. after logging a meal).
    refreshKey: number;
    // Bubbled from a card after edit/remove so the whole day (list + dashboard) refreshes.
    onChanged: () => void;
}

function MealList({ date, refreshKey, onChanged }: MealListProps): JSX.Element {
    const [logs, setLogs] = useState<IFoodLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);

        foodService
            .getDay(date)
            .then((day) => {
                if (active) setLogs(day.logs);
            })
            .catch((err) => {
                if (active) setError(err instanceof ApiError ? err.message : "Failed to load meals");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [date, refreshKey]);

    return (
        <div className="meal-list">
            <h2 className="meal-list-title">Meals</h2>

            {loading && (
                <SkeletonGroup label="Loading meals" className="card-list">
                    <Skeleton shape="block" height="132px" />
                    <Skeleton shape="block" height="132px" />
                </SkeletonGroup>
            )}
            {error && <p className="meal-list-error">{error}</p>}
            {!loading && !error && logs.length === 0 && (
                <p className="meal-list-hint">No meals logged for this day.</p>
            )}

            {!loading && !error && logs.length > 0 && (
                <div className="card-list stagger">
                    {logs.map((meal) => (
                        <MealCard key={meal._id} meal={meal} onChanged={onChanged} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default MealList;
