import { http } from "./http-client";
import { IAddWaterInput, IWaterDayResult } from "../models/water";

// Routes confirmed against backend/src/routes/water.routes.ts.
export const waterService = {
    // POST /api/water — add (or subtract, if negative) an amount to a day.
    add(input: IAddWaterInput): Promise<IWaterDayResult> {
        return http.post<IWaterDayResult>("/water", input);
    },

    // GET /api/water — today's total (user tz).
    getToday(): Promise<IWaterDayResult> {
        return http.get<IWaterDayResult>("/water");
    },

    // GET /api/water?date=YYYY-MM-DD
    getDay(date: string): Promise<IWaterDayResult> {
        return http.get<IWaterDayResult>("/water", { params: { date } });
    },

    // GET /api/water?from=&to=
    getRange(from: string, to: string): Promise<IWaterDayResult[]> {
        return http.get<IWaterDayResult[]>("/water", { params: { from, to } });
    },
};
