import { User } from "../models/user";
import { UnauthorizedError } from "../models/client-error";
import { OnboardingInput, OnboardingResult } from "../types/onboarding";
import { calculateEnergy } from "../utils/energy";
import { aiService } from "./ai-service";
import { goalsService } from "./goals-service";

class OnboardingService {

    public async completeOnboarding(
        userId: string,
        input: OnboardingInput
    ): Promise<OnboardingResult> {
        const user = await User.findById(userId).exec();
        if (!user) throw new UnauthorizedError("User not found");

        // 1. Compute goals via AI, then server-side safety clamp.
        const { goals, adjustedForSafety } = await aiService.calculateGoals(input);

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
        await goalsService.setGoals(userId, goals);

        return { user: user.toSafeObject(), goals, adjustedForSafety };
    }

}

export const onboardingService = new OnboardingService();
