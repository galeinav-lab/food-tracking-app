import { http } from "./http-client";
import { IUser } from "../models/user";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export const userService = {
    // PUT /api/user/activity-level — backend recomputes maintenance and returns
    // the updated user (the BMR formula stays on the backend).
    async setActivityLevel(activityLevel: ActivityLevel): Promise<IUser> {
        const data = await http.put<{ user: IUser }>("/user/activity-level", { activityLevel });
        return data.user;
    },

    // PUT /api/user/water-target — set the daily water target (ml).
    async setWaterTarget(waterTargetMl: number): Promise<IUser> {
        const data = await http.put<{ user: IUser }>("/user/water-target", { waterTargetMl });
        return data.user;
    },
};
