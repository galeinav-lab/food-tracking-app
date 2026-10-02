import React, { type JSX, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { clearAuthError, login } from "../../../store/auth-slice";
import "../Auth.css";

function Login(): JSX.Element {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Clear any stale auth error when this form mounts.
    useEffect(() => {
        dispatch(clearAuthError());
    }, [dispatch]);

    // Redirect home once authenticated — covers a successful login AND a
    // logged-in user landing on /login.
    useEffect(() => {
        if (isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await dispatch(login({ email, password }));
        // Navigation is handled by the effect above when isAuthenticated flips true.
    };

    return (
        <div className="auth-container">
            <form className="card glass rise-in" onSubmit={handleSubmit}>
                <h1 className="form-title">Log in</h1>

                <div className="field">
                    <label className="field-label" htmlFor="login-email">Email</label>
                    <input
                        className="input"
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="login-password">Password</label>
                    <input
                        className="input"
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                </div>

                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}

                <button
                    className={loading ? "btn btn-primary btn-block btn-loading" : "btn btn-primary btn-block"}
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                >
                    {loading ? "Logging in…" : "Log in"}
                </button>

                <p className="switch-text">
                    No account?{" "}
                    <Link to="/register" className="link">
                        Register
                    </Link>
                </p>
            </form>
        </div>
    );
}

export default Login;
