import { type JSX } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

// Logic-only guard (renders no markup of its own, so it has no CSS file):
// gate child routes behind authentication, redirecting to /login otherwise.
function ProtectedRoute(): JSX.Element {
    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
