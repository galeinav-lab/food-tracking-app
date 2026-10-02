import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "../../services/error-reporter";
import "./ErrorBoundary.css";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    errorId: string | null;
    detail: string | null;
}

// A React "error boundary": catches render-time crashes anywhere below it and shows
// a friendly fallback instead of a blank white screen. NOTE: this MUST be a class
// component — React only supports error boundaries via these two lifecycle methods,
// there's no hook equivalent. (Boundaries catch render errors, NOT errors in event
// handlers or async code — those are handled by the axios interceptor / global hooks.)
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = { hasError: false, errorId: null, detail: null };

    // Runs during render when a child throws → flip to the fallback UI. Must be pure
    // (no side effects) and just return the new state.
    public static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
        return { hasError: true };
    }

    // Runs AFTER the fallback renders → the place for side effects (logging/reporting).
    public componentDidCatch(error: Error, info: ErrorInfo): void {
        const stack = `${error.stack ?? ""}\n--- component stack ---${info.componentStack ?? ""}`;
        // Fire-and-forget; update the fallback with the id once we have it.
        void reportError({
            source: "boundary",
            message: error.message,
            stack,
            componentOrScreen: "ErrorBoundary",
            route: window.location.pathname,
        }).then((errorId) => {
            this.setState({ errorId, detail: error.message });
        });
    }

    private handleTryAgain = (): void => {
        this.setState({ hasError: false, errorId: null, detail: null });
    };

    private handleReload = (): void => {
        window.location.reload();
    };

    public render(): ReactNode {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="eb">
                <div className="eb-card glass rise-in">
                    <div className="eb-emoji" aria-hidden="true">😕</div>
                    <h1 className="eb-title">Something went wrong</h1>
                    <p className="eb-text">
                        This has been reported automatically. You can try again, or reload the app.
                    </p>

                    {this.state.errorId && (
                        <p className="eb-id">
                            Reference: <span>#{this.state.errorId}</span>
                        </p>
                    )}

                    <div className="eb-actions">
                        <button type="button" className="btn btn-primary" onClick={this.handleTryAgain}>
                            Try again
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={this.handleReload}>
                            Reload app
                        </button>
                    </div>

                    {this.state.detail && (
                        <details className="eb-details">
                            <summary>Technical details</summary>
                            <pre className="eb-pre">{this.state.detail}</pre>
                        </details>
                    )}
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
