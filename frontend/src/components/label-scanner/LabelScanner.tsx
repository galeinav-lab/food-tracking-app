import { type ChangeEvent, type FormEvent, type JSX, useCallback, useEffect, useRef, useState } from "react";
import { savedFoodService } from "../../services/saved-food.service";
import { toastBus } from "../../services/toast-bus";
import { ApiError } from "../../services/http-client";
import { IScanLabelResult, ILabelValues } from "../../models/saved-food";
import { INutrition } from "../../models/nutrition";
import SavedFoodForm, { SavedFoodFormValues } from "../saved-food-form/SavedFoodForm";
import "./LabelScanner.css";

interface LabelScannerProps {
    // Called after the food is saved, so the sheet can close/refresh.
    onSaved: () => void;
}

type Stage = "camera" | "reading" | "serving" | "confirm";

// Cap the captured frame so the base64 payload stays well under the server's
// ~5MB guard while keeping label text legible.
const MAX_CAPTURE_WIDTH = 1280;
const JPEG_QUALITY = 0.82;

const MACRO_KEYS: (keyof INutrition)[] = ["calories", "protein", "carbs", "fat", "fiber"];

// Which macros the AI couldn't read (null) — surfaced in the confirm form.
function unreadKeysOf(values: ILabelValues): (keyof INutrition)[] {
    return MACRO_KEYS.filter((k) => values[k] === null);
}

// Scale raw per-serving values to per-100 once the user supplies the serving size.
function toPer100(values: ILabelValues, servingSize: number): ILabelValues {
    const factor = 100 / servingSize;
    const scale = (v: number | null): number | null =>
        v === null ? null : Math.round(v * factor * 100) / 100;
    return {
        calories: scale(values.calories),
        protein: scale(values.protein),
        carbs: scale(values.carbs),
        fat: scale(values.fat),
        fiber: scale(values.fiber),
    };
}

// Camera → AI label read → confirm/edit → save as a normal SavedFood.
// Never auto-saves: the confirm step is always shown.
function LabelScanner({ onSaved }: LabelScannerProps): JSX.Element {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [stage, setStage] = useState<Stage>("camera");
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [scan, setScan] = useState<IScanLabelResult | null>(null);
    const [servingInput, setServingInput] = useState("");

    // Release the camera — called on unmount and whenever we leave the camera stage.
    const stopCamera = useCallback((): void => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    const startCamera = useCallback(async (): Promise<void> => {
        setCameraError(null);
        // Not available on http:// (except localhost) or in old browsers.
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("Camera isn't available in this browser. Upload a photo instead.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } }, // rear camera on phones
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {
                    /* autoplay guard — the preview still renders once ready */
                });
            }
        } catch (err) {
            const name = err instanceof DOMException ? err.name : "";
            if (name === "NotAllowedError" || name === "SecurityError") {
                setCameraError(
                    "Camera permission was denied. Allow camera access in your browser settings, or upload a photo instead."
                );
            } else if (name === "NotFoundError" || name === "OverconstrainedError") {
                setCameraError("No camera found on this device. Upload a photo instead.");
            } else {
                setCameraError("Couldn't start the camera. Upload a photo instead.");
            }
        }
    }, []);

    // Start the camera on mount / when returning to the camera stage; always
    // release it on unmount so the device light goes off.
    useEffect(() => {
        if (stage === "camera") {
            void startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [stage, startCamera, stopCamera]);

    // Send a captured/selected image to the AI.
    const readLabel = async (imageBase64: string): Promise<void> => {
        setStage("reading");
        setError(null);
        try {
            const result = await savedFoodService.scanLabel(imageBase64);
            setScan(result);
            // Per-serving label with no readable serving size -> ask the user for it
            // rather than guessing a portion.
            setStage(result.needsServingSize ? "serving" : "confirm");
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Couldn't read the label — please try a clearer photo."
            );
            setStage("camera");
        }
    };

    // Grab the current video frame, downscale, and encode as JPEG base64.
    const capture = (): void => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) {
            setError("The camera isn't ready yet — give it a second.");
            return;
        }
        const scaleFactor = Math.min(1, MAX_CAPTURE_WIDTH / video.videoWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scaleFactor);
        canvas.height = Math.round(video.videoHeight * scaleFactor);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            setError("Couldn't capture the photo on this device.");
            return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        void readLabel(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    // Fallback when the camera is unavailable/denied: pick or shoot a photo.
    const onFilePicked = (e: ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") void readLabel(reader.result);
        };
        reader.onerror = () => setError("Couldn't read that image file.");
        reader.readAsDataURL(file);
    };

    // Per-serving label: convert with the size the user just entered.
    const submitServing = (e: FormEvent): void => {
        e.preventDefault();
        if (!scan) return;
        const size = Number(servingInput);
        if (servingInput.trim() === "" || !Number.isFinite(size) || size <= 0) {
            setError("Enter a serving size greater than 0.");
            return;
        }
        setError(null);
        setScan({
            ...scan,
            values: toPer100(scan.values, size),
            servingSize: size,
            valuesArePer100: true,
            needsServingSize: false,
        });
        setStage("confirm");
    };

    // Confirmed -> create a normal SavedFood (source 'label').
    const saveFood = async (values: SavedFoodFormValues): Promise<void> => {
        setSaving(true);
        setError(null);
        try {
            const food = await savedFoodService.create({
                name: values.name,
                baseUnit: values.baseUnit,
                per100: values.per100,
                source: "label",
            });
            toastBus.show({ kind: "success", headline: `Saved “${food.name}” to your foods` });
            onSaved();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save food");
            setSaving(false);
        }
    };

    const retake = (): void => {
        setScan(null);
        setServingInput("");
        setError(null);
        setStage("camera");
    };

    // ── Reading ─────────────────────────────────────────────────────────
    if (stage === "reading") {
        return (
            <div className="ls-reading">
                <div className="ls-spinner" aria-hidden="true" />
                <p className="ls-reading-text">Reading the label…</p>
                <p className="ls-reading-sub">This takes a few seconds.</p>
            </div>
        );
    }

    // ── Serving size prompt (per-serving label, size unreadable) ────────
    if (stage === "serving" && scan) {
        return (
            <form className="ls-serving" onSubmit={submitServing}>
                <h2 className="ls-serving-title">What's one serving?</h2>
                <p className="ls-serving-hint">
                    This label lists values <strong>per serving</strong>, but the serving size
                    wasn't readable. Enter it so we can store the macros per 100 {scan.baseUnit}.
                </p>
                <div className="ls-serving-row">
                    <input
                        className="ls-input"
                        type="number"
                        min="1"
                        step="1"
                        inputMode="decimal"
                        placeholder="e.g. 30"
                        value={servingInput}
                        onChange={(e) => setServingInput(e.target.value)}
                        autoFocus
                    />
                    <span className="ls-serving-unit">{scan.baseUnit}</span>
                </div>
                {error && <p className="ls-error">{error}</p>}
                <div className="ls-serving-actions">
                    <button type="submit" className="ls-primary">
                        Continue
                    </button>
                    <button type="button" className="ls-secondary" onClick={retake}>
                        Retake photo
                    </button>
                </div>
            </form>
        );
    }

    // ── Confirm / edit (never auto-saves) ───────────────────────────────
    if (stage === "confirm" && scan) {
        const unread = unreadKeysOf(scan.values);
        return (
            <div className="ls-confirm">
                <p className="ls-confirm-banner">
                    Check the values below — the AI read them off the photo.
                    {unread.length > 0 && " Some weren't on the label; add them if you know them."}
                </p>
                <SavedFoodForm
                    title="Confirm food"
                    submitLabel="Save food"
                    initialName={scan.name ?? ""}
                    initialBaseUnit={scan.baseUnit}
                    initialPer100={scan.values}
                    unreadKeys={unread}
                    busy={saving}
                    error={error}
                    onSubmit={(v) => void saveFood(v)}
                    onCancel={retake}
                    cancelLabel="Retake"
                />
            </div>
        );
    }

    // ── Camera ──────────────────────────────────────────────────────────
    return (
        <div className="ls">
            {!cameraError && (
                <>
                    <div className="ls-viewport">
                        <video ref={videoRef} className="ls-video" playsInline muted autoPlay />
                        <div className="ls-frame" aria-hidden="true" />
                    </div>
                    <p className="ls-tip">
                        Fill the frame with the nutrition table — straight on, good light.
                    </p>
                    <button type="button" className="ls-shutter" onClick={capture}>
                        <span className="ls-shutter-ring" aria-hidden="true" />
                        <span className="ls-shutter-label">Scan label</span>
                    </button>
                </>
            )}

            {cameraError && <p className="ls-camera-error">{cameraError}</p>}
            {error && <p className="ls-error">{error}</p>}

            {/* Always available: works as a camera fallback AND for existing photos.
                `capture="environment"` opens the rear camera directly on phones. */}
            <label className="ls-upload">
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onFilePicked}
                    hidden
                />
                {cameraError ? "Upload a photo of the label" : "…or upload a photo"}
            </label>
        </div>
    );
}

export default LabelScanner;
