import { http } from "./http-client";
import { IGoal, ISetGoalsInput } from "../models/goal";

// Routes confirmed against backend/src/routes/goals.routes.ts.
export const goalsService = {
    // GET /api/goals
    getGoals(): Promise<IGoal> {
        return http.get<IGoal>("/goals");
    },

    // PUT /api/goals
    setGoals(input: ISetGoalsInput): Promise<IGoal> {
        return http.put<IGoal>("/goals", input);
    },
};
