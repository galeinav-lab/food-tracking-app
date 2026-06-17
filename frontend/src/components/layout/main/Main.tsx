import { type JSX } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "../../auth/login/Login";
import Register from "../../auth/register/Register";
import ProtectedRoute from "../../protected-route/ProtectedRoute";
import RequireOnboarding from "../../require-onboarding/RequireOnboarding";
import RedirectIfOnboarded from "../../redirect-if-onboarded/RedirectIfOnboarded";
import Home from "../../home/Home";
import History from "../../history/History";
import Weight from "../../weight/Weight";
import WeeklyCalories from "../../weekly-calories/WeeklyCalories";
import Settings from "../../settings/Settings";
import GoalsEdit from "../../goals-edit/GoalsEdit";
import OnboardingWizard from "../../onboarding/OnboardingWizard";
import "./Main.css";

// Main owns the app's routing. The bottom nav + logging sheet (in Layout) sit
// fixed below it for the authenticated, onboarded app.
function Main(): JSX.Element {
    return (
        <main className="content">
            <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected (must be authenticated) */}
                <Route element={<ProtectedRoute />}>
                    {/* Onboarding: only for users who haven't completed it. */}
                    <Route element={<RedirectIfOnboarded />}>
                        <Route path="/onboarding" element={<OnboardingWizard />} />
                    </Route>

                    {/* Main app: only once onboarding is complete. */}
                    <Route element={<RequireOnboarding />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/weight" element={<Weight />} />
                        <Route path="/weekly" element={<WeeklyCalories />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/settings/goals" element={<GoalsEdit />} />
                    </Route>
                </Route>

                {/* Unknown routes -> home (which enforces auth + onboarding). */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </main>
    );
}

export default Main;
