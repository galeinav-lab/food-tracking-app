import { Document, Model, Schema, Types, model } from "mongoose";

export interface IGoal extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    createdAt: Date;
    updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        calories: { type: Number, required: true, default: 2000 },
        protein: { type: Number, required: true, default: 150 },
        carbs: { type: Number, required: true, default: 200 },
        fat: { type: Number, required: true, default: 65 },
        fiber: { type: Number, required: true, default: 30 },
    },
    { timestamps: true }
);

export const Goal: Model<IGoal> = model<IGoal>("Goal", GoalSchema, "goals");
