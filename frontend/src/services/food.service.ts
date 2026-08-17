import { http } from "./http-client";
import { IDayView, IEditFoodInput, IFoodLog, ILogFoodInput } from "../models/food-log";
import { IDailySummary } from "../models/daily-summary";
import { IWeeklyDeficit } from "../models/deficit";
import { ILogSavedFoodInput } from "../models/saved-food";

// Query params for GET /api/food/history (backend parses these as date bounds).
export interface IHistoryQuery {
    from?: string; // ISO timestamp
    to?: string; // ISO timestamp
}

// Query params for GET /api/food/summaries (backend requires both, YYYY-MM-DD).
export interface ISummaryQuery {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
}

// Payload of DELETE /api/food/log/:id (backend sends { deleted, id }).
export interface IDeleteResult {
    deleted: boolean;
    id: string;
}

// Routes confirmed against backend/src/routes/food.routes.ts.
export const foodService = {
    // POST /api/food/log
    logFood(input: ILogFoodInput): Promise<IFoodLog> {
        return http.post<IFoodLog>("/food/log", input);
    },

    // POST /api/food/log-saved — logs a saved food by amount (NO AI call). The
    // server scales per100 and creates a normal FoodLog, so the day's summary /
    // rings / deficit update exactly like a regular meal.
    logSavedFood(input: ILogSavedFoodInput): Promise<IFoodLog> {
        return http.post<IFoodLog>("/food/log-saved", input);
    },

    // PUT /api/food/log/:id — re-analyzes the description as an edit, returns updated log.
    editLog(id: string, input: IEditFoodInput): Promise<IFoodLog> {
        return http.put<IFoodLog>(`/food/log/${id}`, input);
    },

    // DELETE /api/food/log/:id
    deleteLog(id: string): Promise<IDeleteResult> {
        return http.delete<IDeleteResult>(`/food/log/${id}`);
    },

    // GET /api/food/history?from=&to=
    getHistory(query: IHistoryQuery = {}): Promise<IFoodLog[]> {
        return http.get<IFoodLog[]>("/food/history", { params: query });
    },

    // GET /api/food/day/:date  (date is "YYYY-MM-DD")
    getDay(date: string): Promise<IDayView> {
        return http.get<IDayView>(`/food/day/${date}`);
    },

    // GET /api/food/summaries?from=&to=  (both "YYYY-MM-DD", ascending by date)
    getSummaries(query: ISummaryQuery): Promise<IDailySummary[]> {
        return http.get<IDailySummary[]>("/food/summaries", { params: query });
    },

    // GET /api/food/deficit?date=YYYY-MM-DD — weekly (Sun–Sat) deficit for the week
    // containing `date` (defaults to the current week server-side). The single
    // source of truth for both weekly components; no deficit math on the client.
    getWeeklyDeficit(date?: string): Promise<IWeeklyDeficit> {
        return http.get<IWeeklyDeficit>("/food/deficit", { params: date ? { date } : {} });
    },
};
