import { type JSX } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import SavedFoods from "../../saved-foods/SavedFoods";
import Strength from "../../strength/Strength";
import OnboardingWizard from "../../onboarding/OnboardingWizard";
import "./Main.css";

// Main owns the app's routing. The bottom nav + logging sheet (in Layout) sit
// fixed below it for the authenticated, onboarded app.
function Main(): JSX.Element {
    const { pathname } = useLocation();

    return (
        <main className="content">
            {/* Page transition: keyed by path so each new page fades in. Opacity only
                and no held fill-mode — a transform here would turn this wrapper into
                the containing block for the pages' position: fixed layers (e.g. the
                strength editor sheet). */}
            <div key={pathname} className="fade-in">
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
                            <Route path="/saved-foods" element={<SavedFoods />} />
                            <Route path="/strength" element={<Strength />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/settings/goals" element={<GoalsEdit />} />
                        </Route>
                    </Route>

                    {/* Unknown routes -> home (which enforces auth + onboarding). */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </main>
    );
}

export default Main;
