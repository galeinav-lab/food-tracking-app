import { type FormEvent, type JSX, useState } from "react";
import {
    TESTING_ENABLED,
    getLastContext,
    reportError,
} from "../../services/error-reporter";
import { toastBus } from "../../services/toast-bus";
import Sheet from "../sheet/Sheet";
import "./ReportProblemButton.css";

// Persistent corner button (testing build only). Lets a tester describe what they
// were trying to do — the thing automation can't capture — and attaches the last
// error context so the report is actionable.
function ReportProblemButton(): JSX.Element | null {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    // Compiled out of the production experience: render nothing unless testing.
    if (!TESTING_ENABLED) return null;

    const submit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);

        const ctx = getLastContext();
        const errorId = await reportError({
            source: "manual",
            userNote: note.trim() || "(no note)",
            componentOrScreen: ctx.componentOrScreen ?? "manual-report",
            route: window.location.pathname,
            apiUrl: ctx.apiUrl,
            httpMethod: ctx.httpMethod,
            httpStatus: ctx.httpStatus,
            backendError: ctx.backendError,
            message: ctx.message,
            stack: ctx.stack,
        });

        setBusy(false);
        setNote("");
        setOpen(false);
        toastBus.show({
            kind: "success",
            headline: "Thanks! Your report was sent.",
            errorId: errorId ?? undefined,
        });
    };

    return (
        <>
            {!open && (
                <button
                    type="button"
                    className="btn btn-secondary btn-sm glass-float rp-fab"
                    onClick={() => setOpen(true)}
                    aria-label="Report a problem"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="rp-fab-label">Report</span>
                </button>
            )}

            {/* The typed note lives in state here, so closing (incl. a scrim tap)
                never loses it — reopening restores the draft. */}
            {open && (
                <Sheet title="Report a problem" ariaLabel="Report a problem" onClose={() => setOpen(false)}>
                    <form onSubmit={submit}>
                        <label className="field-label rp-label" htmlFor="rp-note">
                            What were you doing?
                        </label>
                        <textarea
                            id="rp-note"
                            className="input rp-textarea"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={4}
                            placeholder="e.g. I tried to log a chicken salad and it didn't save"
                            autoFocus
                        />
                        <p className="rp-hint">We'll attach the latest technical details automatically.</p>
                        <div className="rp-actions">
                            <button type="submit" className="btn btn-primary" disabled={busy}>
                                {busy ? "Sending…" : "Send report"}
                            </button>
                        </div>
                    </form>
                </Sheet>
            )}
        </>
    );
}

export default ReportProblemButton;
