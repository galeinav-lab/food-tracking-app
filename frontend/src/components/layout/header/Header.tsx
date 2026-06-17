import { type JSX } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { logout } from "../../../store/auth-slice";
import "./Header.css";

function Header(): JSX.Element {
    const dispatch = useAppDispatch();
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);

    return (
        <header className="header">
            <Link to="/" className="brand">
                Nutrition Tracker
            </Link>

            {isAuthenticated && user && (
                <div className="header-right">
                    <Link to="/history" className="header-link">
                        History
                    </Link>
                    <Link to="/weight" className="header-link">
                        Weight
                    </Link>
                    <Link to="/weekly" className="header-link">
                        Weekly
                    </Link>
                    <Link to="/settings" className="header-link">
                        Settings
                    </Link>
                    <span className="user-name">
                        {user.firstName} {user.lastName}
                    </span>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => dispatch(logout())}
                    >
                        Log out
                    </button>
                </div>
            )}
        </header>
    );
}

export default Header;
