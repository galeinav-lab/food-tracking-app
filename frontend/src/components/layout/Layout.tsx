import { type JSX, useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { RefreshProvider } from "../../context/refresh-context";
import Main from "./main/Main";
import BottomNav from "../bottom-nav/BottomNav";
import LoggingSheet, { LogMode } from "../logging-sheet/LoggingSheet";
import "./Layout.css";

// App shell: routed content + a native bottom nav (replaces the old top header).
// The bottom nav + sheet only appear inside the authenticated, onboarded app.
function Layout(): JSX.Element {
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);
    const showShell = isAuthenticated && user?.onboardingCompleted === true;
    const [sheet, setSheet] = useState<{ open: boolean; mode: LogMode }>({
        open: false,
        mode: "meal",
    });

    return (
        <RefreshProvider>
            <div className="layout">
                {/* Shared static backdrop for the in-app pages (decorative only). */}
                {showShell && <div className="ambient" aria-hidden="true" />}
                <Main />
                {showShell && <BottomNav onAdd={(mode) => setSheet({ open: true, mode })} />}
                {showShell && (
                    <LoggingSheet
                        open={sheet.open}
                        mode={sheet.mode}
                        onClose={() => setSheet((s) => ({ ...s, open: false }))}
                    />
                )}
            </div>
        </RefreshProvider>
    );
}

export default Layout;
