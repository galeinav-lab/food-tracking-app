import { User } from "../models/user";
import { UnauthorizedError } from "../models/client-error";
import { OnboardingInput, OnboardingResult } from "../types/onboarding";
import { calculateEnergy } from "../utils/energy";
import { aiService } from "./ai-service";
import { goalsService } from "./goals-service";
import { foodService } from "./food-service";

class OnboardingService {

    public async completeOnboarding(
        userId: string,
        input: OnboardingInput
    ): Promise<OnboardingResult> {
        const user = await User.findById(userId).exec();
        if (!user) throw new UnauthorizedError("User not found");

        // 1. Compute goals via AI, then server-side safety clamp.
        const { goals, adjustedForSafety } = await aiService.calculateGoals(input);

        // Re-running onboarding (recalculating targets) applies from today on:
        // pin past days to the maintenance they were logged under first.
        const oldMaintenance = this.currentMaintenance(user);
        if (oldMaintenance !== null) {
            await foodService.freezeTargetsBeforeToday(userId, oldMaintenance);
        }

        // 2. Save the profile fields on the user.
        user.profile = {
            weightKg: input.weightKg,
            heightCm: input.heightCm,
            age: input.age,
            sex: input.sex,
        };
        user.goalType = input.goalType;
        user.targetWeightKg = input.targetWeightKg;
        user.timeframeMonths = input.timeframeMonths;

        // Deterministic BMR + maintenance from the submitted profile (formula, not AI).
        // Uses the user's activity level (defaults to sedentary until set in Settings).
        const { bmr, maintenanceCalories } = calculateEnergy(
            {
                weightKg: input.weightKg,
                heightCm: input.heightCm,
                age: input.age,
                sex: input.sex,
            },
            user.activityLevel ?? "sedentary"
        );
        user.bmr = bmr;
        user.maintenanceCalories = maintenanceCalories;

        user.onboardingCompleted = true;
        await user.save();

        // 3. Write the computed goals to the SAME source the dashboard/settings
        //    read — the Goal collection, via goalsService.setGoals (not User.goals).
        await goalsService.setGoals(userId, goals); // also applies them to today
        await foodService.applyTargetsToToday(userId, { maintenance: maintenanceCalories });

        return { user: user.toSafeObject(), goals, adjustedForSafety };
    }

    // The maintenance the user had BEFORE this submit: the stored value, else
    // recomputed from the stored profile (energy.ts owns the formula), else null
    // (first-time onboarding — nothing to freeze).
    private currentMaintenance(user: {
        maintenanceCalories?: number;
        activityLevel?: "sedentary" | "light" | "moderate" | "active";
        profile?: { weightKg?: number; heightCm?: number; age?: number; sex?: "male" | "female" };
    }): number | null {
        if (typeof user.maintenanceCalories === "number" && user.maintenanceCalories > 0) {
            return user.maintenanceCalories;
        }
        const p = user.profile;
        if (p?.weightKg && p?.heightCm && p?.age && p?.sex) {
            return calculateEnergy(
                { weightKg: p.weightKg, heightCm: p.heightCm, age: p.age, sex: p.sex },
                user.activityLevel ?? "sedentary"
            ).maintenanceCalories;
        }
        return null;
    }

}

export const onboardingService = new OnboardingService();
