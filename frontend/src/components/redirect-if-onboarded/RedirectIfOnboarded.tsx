import { type JSX } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

// For /onboarding: a user who already completed onboarding shouldn't see the wizard.
function RedirectIfOnboarded(): JSX.Element {
    const user = useAppSelector((state) => state.auth.user);
    return user?.onboardingCompleted === true ? <Navigate to="/" replace /> : <Outlet />;
}

export default RedirectIfOnboarded;
