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
        key: { type: String, required: true, unique: true, index: true },
        items: { type: [Schema.Types.Mixed], default: [] },
        totals: { type: Schema.Types.Mixed, default: {} },
        hitCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Auto-delete cached entries after 90 days
NutritionCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const NutritionCache: Model<INutritionCache> = model<INutritionCache>(
    "NutritionCache",
    NutritionCacheSchema,
    "nutrition_caches"
);
