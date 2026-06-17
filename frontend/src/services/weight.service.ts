import { http } from "./http-client";
import { IAddWeightInput, IWeightEntry } from "../models/weight";

export interface IWeightRange {
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
    days?: number;
}

export interface IWeightDeleteResult {
    deleted: boolean;
    id: string;
}

// Routes confirmed against backend/src/routes/weight.routes.ts.
export const weightService = {
    // POST /api/weight — upsert today's (or a given date's) entry.
    add(input: IAddWeightInput): Promise<IWeightEntry> {
        return http.post<IWeightEntry>("/weight", input);
    },

    // GET /api/weight?from=&to=&days= — ascending by date.
    list(range: IWeightRange = {}): Promise<IWeightEntry[]> {
        return http.get<IWeightEntry[]>("/weight", { params: range });
    },

    // DELETE /api/weight/:id
    remove(id: string): Promise<IWeightDeleteResult> {
        return http.delete<IWeightDeleteResult>(`/weight/${id}`);
    },
};
