import { type JSX } from "react";
import { BrowserRouter } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ErrorBoundary from "./components/error-boundary/ErrorBoundary";
import ToastHost from "./components/toast/ToastHost";
import ReportProblemButton from "./components/report-problem/ReportProblemButton";

function App(): JSX.Element {
    return (
        <>
            {/* A render crash below shows the friendly fallback instead of a blank screen. */}
            <ErrorBoundary>
                <BrowserRouter>
                    <Layout />
                </BrowserRouter>
            </ErrorBoundary>

            {/* Kept OUTSIDE the boundary so toasts + report button survive a fallback. */}
            <ToastHost />
            <ReportProblemButton />
        </>
    );
}

export default App;
