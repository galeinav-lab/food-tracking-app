import { Document, Model, Schema, Types, model } from "mongoose";

export interface IUserGoals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
}

export interface IUserPreferences {
    units: "metric" | "imperial";
    timezone: string;
}

export interface IUserProfile {
    weightKg?: number;
    heightCm?: number;
    age?: number;
    sex?: "male" | "female";
}

export interface IUserModel extends Document {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    goals: IUserGoals;
    preferences: IUserPreferences;
    // Onboarding-collected body profile + weight goal (all metric: kg/cm).
    profile?: IUserProfile;
    goalType?: "lose" | "maintain" | "gain";
    targetWeightKg?: number;
    timeframeMonths?: number;
    // Activity level drives the maintenance multiplier (see utils/energy.ts).
    activityLevel?: "sedentary" | "light" | "moderate" | "active";
    // Deterministic energy values (Mifflin-St Jeor); computed from profile, not AI.
    bmr?: number;
    maintenanceCalories?: number;
    // Daily water target in ml (editable in settings; default 3000 = 3 L).
    waterTargetMl?: number;
    onboardingCompleted: boolean;
    toSafeObject(): Record<string, unknown>;
}

const UserSchema = new Schema<IUserModel>(
    {
        firstName: {
            type: String,
            required: [true, "First Name is required"],
            trim: true,
            minlength: [2, "Must be at least 2 characters long"],
            maxlength: [20, "Maximum 20 characters long"],
        },
        lastName: {
            type: String,
            required: [true, "Last Name is required"],
            trim: true,
            minlength: [2, "Must be at least 2 characters long"],
            maxlength: [20, "Maximum 20 characters long"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
        goals: {
            calories: { type: Number, default: 2000 },
            protein: { type: Number, default: 150 },
            carbs: { type: Number, default: 200 },
            fat: { type: Number, default: 65 },
            fiber: { type: Number, default: 30 },
        },
        preferences: {
            units: { type: String, enum: ["metric", "imperial"], default: "metric" },
            timezone: { type: String, default: "Asia/Jerusalem" },
        },
        profile: {
            weightKg: { type: Number },
            heightCm: { type: Number },
            age: { type: Number },
            sex: { type: String, enum: ["male", "female"] },
        },
        goalType: { type: String, enum: ["lose", "maintain", "gain"] },
        targetWeightKg: { type: Number },
        timeframeMonths: { type: Number, min: 1, max: 12 },
        activityLevel: {
            type: String,
            enum: ["sedentary", "light", "moderate", "active"],
            default: "sedentary",
        },
        bmr: { type: Number },
        maintenanceCalories: { type: Number },
        waterTargetMl: { type: Number, default: 3000 },
        onboardingCompleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// NOTE: password hashing/comparison lives in secureService, not on the model —
// the model just stores the already-hashed passwordHash.

UserSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    return obj;
};

export const User: Model<IUserModel> = model<IUserModel>("User", UserSchema, "users");
