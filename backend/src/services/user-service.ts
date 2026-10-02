import { User } from "../models/user";
import { UnauthorizedError } from "../models/client-error";
import { SetActivityLevelInput, SetWaterTargetInput } from "../types/user";
import { calculateEnergy } from "../utils/energy";
import { foodService } from "./food-service";

class UserService {

    // Set the user's activity level and recompute maintenance from their stored
    // profile (BMR formula stays here on the backend — never on the frontend).
    public async setActivityLevel(
        userId: string,
        input: SetActivityLevelInput
    ): Promise<Record<string, unknown>> {
        const user = await User.findById(userId).exec();
        if (!user) throw new UnauthorizedError("User not found");

        // A new activity level changes maintenance from today on: pin past days to
        // the maintenance they were logged under before overwriting it.
        if (typeof user.maintenanceCalories === "number" && user.maintenanceCalories > 0) {
            await foodService.freezeTargetsBeforeToday(userId, user.maintenanceCalories);
        }

        user.activityLevel = input.activityLevel;

        const p = user.profile;
        if (
            p &&
            typeof p.weightKg === "number" &&
            typeof p.heightCm === "number" &&
            typeof p.age === "number" &&
            (p.sex === "male" || p.sex === "female")
        ) {
            const { bmr, maintenanceCalories } = calculateEnergy(
                { weightKg: p.weightKg, heightCm: p.heightCm, age: p.age, sex: p.sex },
                input.activityLevel
            );
            user.bmr = bmr;
            user.maintenanceCalories = maintenanceCalories;
        }

        await user.save();
        if (typeof user.maintenanceCalories === "number") {
            await foodService.applyTargetsToToday(userId, { maintenance: user.maintenanceCalories });
        }
        return user.toSafeObject();
    }

    // Edit the daily water target (ml). Same User source the dashboard reads.
    public async setWaterTarget(
        userId: string,
        input: SetWaterTargetInput
    ): Promise<Record<string, unknown>> {
        const user = await User.findById(userId).exec();
        if (!user) throw new UnauthorizedError("User not found");

        user.waterTargetMl = input.waterTargetMl;
        await user.save();
        return user.toSafeObject();
    }

}

export const userService = new UserService();
