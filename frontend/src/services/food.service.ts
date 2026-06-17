import { http } from "./http-client";
import { IDayView, IEditFoodInput, IFoodLog, ILogFoodInput } from "../models/food-log";
import { IDailySummary } from "../models/daily-summary";

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
};
