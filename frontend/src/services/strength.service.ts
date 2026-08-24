import { http } from "./http-client";
import {
    ICreateStrengthExerciseInput,
    IStrengthDeleteResult,
    IStrengthExercise,
    IUpdateStrengthExerciseInput,
    MuscleGroup,
} from "../models/strength";

// Routes confirmed against backend/src/routes/strength.routes.ts.
export const strengthService = {
    // GET /api/strength?muscleGroup=  — the page omits the filter and slices the
    // list in memory, so switching tabs never hits the network.
    list(muscleGroup?: MuscleGroup): Promise<IStrengthExercise[]> {
        return http.get<IStrengthExercise[]>("/strength", {
            params: muscleGroup ? { muscleGroup } : {},
        });
    },

    // POST /api/strength
    create(input: ICreateStrengthExerciseInput): Promise<IStrengthExercise> {
        return http.post<IStrengthExercise>("/strength", input);
    },

    // PATCH /api/strength/:id — partial, so a weight bump sends { weightKg } only.
    update(id: string, input: IUpdateStrengthExerciseInput): Promise<IStrengthExercise> {
        return http.patch<IStrengthExercise>(`/strength/${id}`, input);
    },

    // DELETE /api/strength/:id
    remove(id: string): Promise<IStrengthDeleteResult> {
        return http.delete<IStrengthDeleteResult>(`/strength/${id}`);
    },
};
