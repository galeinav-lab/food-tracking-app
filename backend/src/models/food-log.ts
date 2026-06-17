import { Document, Model, Schema, Types, model } from "mongoose";

export interface INutrition {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
}

export interface IFoodItem {
    name: string;
    quantity: number;
    unit: string;
    nutrition: INutrition;
}

export interface IFoodLog extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    description: string;
    items: IFoodItem[];
    totals: INutrition;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}

const nutritionSchema = new Schema<INutrition>(
    {
        calories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
        fiber: { type: Number, default: 0 },
    },
    { _id: false }
);

const foodItemSchema = new Schema<IFoodItem>(
    {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, default: "g" },
        nutrition: { type: nutritionSchema, default: () => ({}) },
    },
    { _id: false }
);

const FoodLogSchema = new Schema<IFoodLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        description: { type: String, required: true },
        items: { type: [foodItemSchema], default: [] },
        totals: { type: nutritionSchema, default: () => ({}) },
        date: { type: Date, required: true, default: Date.now, index: true },
    },
    { timestamps: true }
);

FoodLogSchema.index({ userId: 1, date: -1 });

export const FoodLog: Model<IFoodLog> = model<IFoodLog>("FoodLog", FoodLogSchema, "food_logs");
