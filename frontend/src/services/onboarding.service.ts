import { http } from "./http-client";
import { IOnboardingInput, IOnboardingResult } from "../models/onboarding";

// Route confirmed against backend/src/routes/onboarding.routes.ts.
export const onboardingService = {
    // POST /api/onboarding — sends the profile, the backend computes + saves goals.
    submit(input: IOnboardingInput): Promise<IOnboardingResult> {
        return http.post<IOnboardingResult>("/onboarding", input);
    },
};
