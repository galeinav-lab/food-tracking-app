import { type JSX } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

// Gate the main app behind completed onboarding. Auth itself is enforced by
// ProtectedRoute upstream. A missing/undefined flag is treated as NOT completed
// (so pre-existing accounts are routed through onboarding).
function RequireOnboarding(): JSX.Element {
    const user = useAppSelector((state) => state.auth.user);
    const onboarded = user?.onboardingCompleted === true;
    return onboarded ? <Outlet /> : <Navigate to="/onboarding" replace />;
}

export default RequireOnboarding;
