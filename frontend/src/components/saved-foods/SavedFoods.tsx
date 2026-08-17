import { type JSX, useCallback, useEffect, useState } from "react";
import { savedFoodService } from "../../services/saved-food.service";
import { ApiError } from "../../services/http-client";
import { ISavedFood } from "../../models/saved-food";
import SavedFoodForm, { SavedFoodFormValues } from "../saved-food-form/SavedFoodForm";
import "./SavedFoods.css";

const fmt = (n: number): string => Math.round(n).toLocaleString();

// Manage the user's saved foods: search, create (manual), edit, delete.
// Saved foods store macros PER 100 g/ml; logging scales them by amount / 100.
function SavedFoods(): JSX.Element {
    const [foods, setFoods] = useState<ISavedFood[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    // Form state — the shared SavedFoodForm handles the fields; we just track
    // whether it's open and which food (if any) is being edited.
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ISavedFood | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async (q: string) => {
        setLoading(true);
        setError(null);
        try {
            setFoods(await savedFoodService.list(q.trim() || undefined));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to load saved foods");
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce the search so typing doesn't fire a request per keystroke.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void load(query);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [query, load]);

    const openCreate = (): void => {
        setEditing(null);
        setFormError(null);
        setFormOpen(true);
    };

    const openEdit = (food: ISavedFood): void => {
        setEditing(food);
        setFormError(null);
        setFormOpen(true);
    };

    const closeForm = (): void => {
        setFormOpen(false);
        setEditing(null);
        setFormError(null);
    };

    const onSubmit = async (values: SavedFoodFormValues): Promise<void> => {
        setFormError(null);
        setSaving(true);
        try {
            if (editing) {
                await savedFoodService.update(editing._id, values);
            } else {
                await savedFoodService.create(values);
            }
            closeForm();
            await load(query);
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : "Failed to save food");
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (food: ISavedFood): Promise<void> => {
        setBusyId(food._id);
        setError(null);
        try {
            await savedFoodService.remove(food._id);
            await load(query);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to delete food");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="sf">
            <header className="sf-head">
                <h1 className="sf-title">Saved foods</h1>
                <button type="button" className="sf-add" onClick={openCreate}>
                    + New
                </button>
            </header>
            <p className="sf-intro">
                Foods you can log again in seconds — just pick an amount. Macros are stored per
                100&nbsp;g or 100&nbsp;ml.
            </p>

            <input
                className="sf-search"
                type="search"
                placeholder="Search your foods…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search saved foods"
            />

            {formOpen && (
                <div className="sf-form glass">
                    {/* Same form component the label scanner uses for its confirm step. */}
                    <SavedFoodForm
                        key={editing?._id ?? "new"}
                        title={editing ? "Edit food" : "New food"}
                        submitLabel={editing ? "Save changes" : "Create food"}
                        initialName={editing?.name}
                        initialBaseUnit={editing?.baseUnit}
                        initialPer100={editing?.per100}
                        busy={saving}
                        error={formError}
                        onSubmit={(v) => void onSubmit(v)}
                        onCancel={closeForm}
                    />
                </div>
            )}

            {loading && <p className="sf-hint">Loading…</p>}
            {error && <p className="sf-error">{error}</p>}

            {!loading && !error && foods.length === 0 && (
                <p className="sf-hint">
                    {query.trim()
                        ? `No saved foods match “${query.trim()}”.`
                        : "No saved foods yet. Tap “+ New” to add one, or save a logged meal from the dashboard."}
                </p>
            )}

            {!loading &&
                !error &&
                foods.map((food) => (
                    <div className="sf-card glass" key={food._id}>
                        <div className="sf-card-main">
                            <p className="sf-name">{food.name}</p>
                            <div className="sf-dots">
                                <span className="sf-dot sf-dot-cal">
                                    {fmt(food.per100.calories)} kcal
                                </span>
                                <span className="sf-dot">P {fmt(food.per100.protein)}g</span>
                                <span className="sf-dot">C {fmt(food.per100.carbs)}g</span>
                                <span className="sf-dot">F {fmt(food.per100.fat)}g</span>
                            </div>
                            <p className="sf-per">per 100 {food.baseUnit}</p>
                        </div>
                        <div className="sf-card-actions">
                            <button
                                type="button"
                                className="btn-mini"
                                onClick={() => openEdit(food)}
                                disabled={busyId === food._id}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                className="btn-mini btn-mini-danger"
                                onClick={() => onDelete(food)}
                                disabled={busyId === food._id}
                            >
                                {busyId === food._id ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                ))}
        </div>
    );
}

export default SavedFoods;
