import { http } from "./http-client";
import { IAddExerciseInput, IExerciseEntry } from "../models/exercise";

export interface IExerciseQuery {
    date?: string; // single day
    from?: string;
    to?: string;
}

export interface IExerciseDeleteResult {
    deleted: boolean;
    id: string;
}

// Routes confirmed against backend/src/routes/exercise.routes.ts.
export const exerciseService = {
    // POST /api/exercise
    add(input: IAddExerciseInput): Promise<IExerciseEntry> {
        return http.post<IExerciseEntry>("/exercise", input);
    },

    // GET /api/exercise?date=&from=&to=
    list(query: IExerciseQuery = {}): Promise<IExerciseEntry[]> {
        return http.get<IExerciseEntry[]>("/exercise", { params: query });
    },

    // DELETE /api/exercise/:id
    remove(id: string): Promise<IExerciseDeleteResult> {
        return http.delete<IExerciseDeleteResult>(`/exercise/${id}`);
    },
};
