/**
 * Framework-agnostic toast pub/sub (same seam idea as token-store).
 *
 * Non-React code (the axios interceptor, the global error handlers) can call
 * `toastBus.show(...)` without importing React; the <ToastHost> component
 * subscribes and renders. This keeps the service layer free of React.
 */

export type ToastKind = "error" | "success" | "info";

export interface ToastMessage {
    id: number;
    kind: ToastKind;
    headline: string;
    // Real technical text the tester can expand + copy (kept out of the headline).
    details?: string;
    // Short error id from the backend, shown as "#ABC123".
    errorId?: string;
}

export type ToastInput = Omit<ToastMessage, "id">;

type Listener = (toast: ToastMessage) => void;

let nextId = 1;
const listeners = new Set<Listener>();

export const toastBus = {
    show(input: ToastInput): ToastMessage {
        const toast: ToastMessage = { ...input, id: nextId++ };
        listeners.forEach((listener) => listener(toast));
        return toast;
    },

    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
};
