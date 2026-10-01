import React, { type JSX, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { clearAuthError, register } from "../../../store/auth-slice";
import "./Register.css";

function Register(): JSX.Element {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);

    // Backend requires firstName AND lastName (2–20 chars each), not a single name.
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        dispatch(clearAuthError());
    }, [dispatch]);

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await dispatch(register({ firstName, lastName, email, password }));
        // Navigation handled by the effect above when isAuthenticated flips true.
    };

    return (
        <div className="auth-container">
            <form className="card" onSubmit={handleSubmit}>
                <h1 className="form-title">Create account</h1>

                <div className="form-row">
                    <div className="form-field">
                        <label htmlFor="register-first">First name</label>
                        <input
                            id="register-first"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            minLength={2}
                            maxLength={20}
                            autoComplete="given-name"
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="register-last">Last name</label>
                        <input
                            id="register-last"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            minLength={2}
                            maxLength={20}
                            autoComplete="family-name"
                        />
                    </div>
                </div>

                <div className="form-field">
                    <label htmlFor="register-email">Email</label>
                    <input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>

                <div className="form-field">
                    <label htmlFor="register-password">Password</label>
                    <input
                        id="register-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                    />
                </div>

                {error && <p className="error-text">{error}</p>}

                <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                    {loading ? "Creating account…" : "Create account"}
                </button>

                <p className="switch-text">
                    Already have an account?{" "}
                    <Link to="/login" className="link">
                        Log in
                    </Link>
                </p>
            </form>
        </div>
    );
}

export default Register;
