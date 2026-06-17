import { type JSX, useEffect, useState } from "react";
import { toastBus, ToastMessage } from "../../services/toast-bus";
import "./ToastHost.css";

const AUTO_DISMISS_MS = 9000;

// Renders the live toast stack. Subscribes to the framework-agnostic toastBus so
// non-React code (axios interceptor, global handlers) can raise toasts.
function ToastHost(): JSX.Element {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        return toastBus.subscribe((toast) => {
            setToasts((prev) => [...prev, toast]);
        });
    }, []);

    const dismiss = (id: number): void => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="toast-host" role="region" aria-label="Notifications" aria-live="polite">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
            ))}
        </div>
    );
}

interface ToastItemProps {
    toast: ToastMessage;
    onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps): JSX.Element {
    const [copied, setCopied] = useState(false);

    // Auto-dismiss success/info; keep errors until dismissed so testers can read
    // and copy the details.
    useEffect(() => {
        if (toast.kind === "error") return;
        const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
        return () => window.clearTimeout(timer);
    }, [toast.kind, onDismiss]);

    const copy = async (): Promise<void> => {
        const text = [toast.errorId ? `#${toast.errorId}` : "", toast.details ?? ""]
            .filter(Boolean)
            .join("\n");
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className={`toast toast-${toast.kind}`} role="alert">
            <div className="toast-row">
                <p className="toast-headline">{toast.headline}</p>
                <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss">
                    ×
                </button>
            </div>

            {toast.errorId && <span className="toast-id">#{toast.errorId}</span>}

            {toast.details && (
                <details className="toast-details">
                    <summary>Details</summary>
                    <pre className="toast-pre">{toast.details}</pre>
                    <button type="button" className="toast-copy" onClick={copy}>
                        {copied ? "Copied" : "Copy"}
                    </button>
                </details>
            )}
        </div>
    );
}

export default ToastHost;
