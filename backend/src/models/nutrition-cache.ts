// ── NutritionCache model ───────────────────────────────────────────────────
// Stores AI nutrition results keyed by a normalized food description, so the same
// meal isn't re-analyzed (and re-paid for) every time. See AIService's cache-aside.
import { Document, Model, Schema, Types, model } from "mongoose";

export interface INutritionCache extends Document {
    _id: Types.ObjectId;
    key: string;
    items: unknown[];
    totals: Record<string, unknown>;
    hitCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const NutritionCacheSchema = new Schema<INutritionCache>(
    {
        // `unique: true` enforces one cache row per key at the DB level (a second
        // insert with the same key throws) — that's our dedupe guarantee.
        key: { type: String, required: true, unique: true, index: true },
        items: { type: [Schema.Types.Mixed], default: [] },
        totals: { type: Schema.Types.Mixed, default: {} },
        hitCount: { type: Number, default: 0 }, // analytics: how often this was reused
    },
    { timestamps: true }
);

// A TTL ("time to live") index: MongoDB automatically DELETES any doc whose
// createdAt is older than expireAfterSeconds (90 days here). Self-cleaning cache —
// no cron job needed. TTL indexes only work on a Date field.
NutritionCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const NutritionCache: Model<INutritionCache> = model<INutritionCache>(
    "NutritionCache",
    NutritionCacheSchema,
    "nutrition_caches"
);
