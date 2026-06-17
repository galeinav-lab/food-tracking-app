import Anthropic from "@anthropic-ai/sdk";
import { appConfig } from "../utils/app-config";
import { NutritionCache } from "../models/nutrition-cache";
import { BadGatewayError } from "../models/client-error";
import { NutritionTotals, ParsedFoodItem, ParsedNutrition } from "../types/nutrition";
import { CalculatedGoals, OnboardingInput } from "../types/onboarding";

const SYSTEM_PROMPT = `You are a nutrition analysis assistant. The user will describe what they ate in plain language; you respond with the parsed nutrition.

Return ONLY valid JSON matching this exact shape — no markdown, no code fences, no prose, no commentary:

{
  "items": [
    {
      "name": "string",
      "quantity": number,
      "unit": "string",
      "nutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "fiber": number
      }
    }
  ],
  "totals": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number
  }
}

Rules:
- Macros are in grams; calories in kcal.
- "totals" must equal the sum of each item's nutrition.
- If a quantity isn't given, assume one typical serving and set quantity=1, unit="serving".
- Provide your best nutritional estimate based on common reference values; never refuse.
- Output the JSON object only.`;

const GOALS_SYSTEM_PROMPT = `You are a nutrition planning assistant. Given a person's stats and weight goal, compute sensible recommended DAILY nutrition targets.

Return ONLY valid JSON in this exact shape — no markdown, no code fences, no prose, no commentary:

{ "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number }

Rules:
- calories in kcal; protein, carbs, fat, fiber in grams.
- Estimate maintenance calories with Mifflin-St Jeor and adjust for the goal (deficit to lose, surplus to gain).
- Use SAFE, SUSTAINABLE rates of weight change (roughly up to 1% of bodyweight per week to lose, less to gain). Do NOT produce extreme or unsafe calorie targets even if the requested target weight or timeframe is aggressive.
- Never recommend below ~1200 kcal/day for women or ~1500 kcal/day for men.
- Protein roughly 1.6–2.2 g per kg bodyweight; fat at least ~0.6 g per kg; remaining calories from carbs; fiber about 14 g per 1000 kcal.
- Output the JSON object only.`;

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1024;

// Server-side safety bounds (applied regardless of what the AI returns).
const KCAL_PER_KG = 7700;
const ABSOLUTE_FLOOR_MALE = 1500;
const ABSOLUTE_FLOOR_FEMALE = 1200;
const ABSOLUTE_CEIL = 5000;

export interface AnalyzeFoodOptions {
    /**
     * Extra context for the model — prepended to the user message and bypasses
     * cache (since context can shift the response). Used for the "edit" flow:
     * pass the previous description so the model knows this is a revision.
     */
    previousDescription?: string;
}

class AIService {
    private client: Anthropic | null = null;

    private getClient(): Anthropic {
        if (!this.client) {
            if (!appConfig.anthropicApiKey) {
                throw new BadGatewayError(
                    "ANTHROPIC_API_KEY is not configured on the server"
                );
            }
            this.client = new Anthropic({ apiKey: appConfig.anthropicApiKey });
        }
        return this.client;
    }

    public async analyzeFood(
        description: string,
        opts: AnalyzeFoodOptions = {}
    ): Promise<ParsedNutrition> {
        const skipCache = Boolean(opts.previousDescription);
        const key = this.normalizeKey(description);

        // Cache check (skipped when caller provided extra context)
        if (!skipCache) {
            const cached = await NutritionCache.findOne({ key }).exec();
            if (cached) {
                await NutritionCache.updateOne({ key }, { $inc: { hitCount: 1 } }).exec();
                return {
                    items: cached.items as unknown as ParsedFoodItem[],
                    totals: cached.totals as unknown as NutritionTotals,
                };
            }
        }

        // AI call
        const parsed = await this.callAnthropic(description, opts);

        // Write through (best-effort; only when no extra context was used)
        if (!skipCache) {
            try {
                await NutritionCache.create({
                    key,
                    items: parsed.items as unknown as unknown[],
                    totals: parsed.totals as unknown as Record<string, unknown>,
                    hitCount: 0,
                });
            } catch (err) {
                console.warn("NutritionCache write skipped:", (err as Error).message);
            }
        }

        return parsed;
    }

    /**
     * Ask the AI for recommended daily nutrition goals for a person, then
     * VALIDATE + CLAMP the result server-side so we never trust an unsafe target.
     */
    public async calculateGoals(input: OnboardingInput): Promise<CalculatedGoals> {
        let response;
        try {
            response = await this.getClient().messages.create({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: [
                    {
                        type: "text",
                        text: GOALS_SYSTEM_PROMPT,
                        cache_control: { type: "ephemeral" },
                    },
                ],
                messages: [{ role: "user", content: this.buildGoalsMessage(input) }],
            });
        } catch (err) {
            if (err instanceof Anthropic.APIError) {
                throw new BadGatewayError(`AI service failed (${err.status}): ${err.message}`);
            }
            throw new BadGatewayError(`AI service unreachable: ${(err as Error).message}`);
        }

        const textBlock = response.content.find((b) => b.type === "text");
        if (!textBlock || textBlock.type !== "text") {
            throw new BadGatewayError("AI response contained no text block");
        }

        const aiGoals = this.parseGoals(textBlock.text);
        return this.applySafetyClamp(aiGoals, input);
    }

    private buildGoalsMessage(p: OnboardingInput): string {
        return [
            "Compute recommended DAILY nutrition goals for this person:",
            `- Sex: ${p.sex}`,
            `- Age: ${p.age} years`,
            `- Height: ${p.heightCm} cm`,
            `- Current weight: ${p.weightKg} kg`,
            `- Goal: ${p.goalType} weight`,
            `- Target weight: ${p.targetWeightKg} kg`,
            `- Timeframe: ${p.timeframeMonths} month(s)`,
        ].join("\n");
    }

    private parseGoals(text: string): NutritionTotals {
        const cleaned = text
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

        let parsed: unknown;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new BadGatewayError("AI returned non-JSON output");
        }

        if (!this.isNutritionTotals(parsed)) {
            throw new BadGatewayError("AI goals response shape was invalid");
        }
        return parsed;
    }

    /**
     * Enforce safety regardless of the AI output:
     *  - estimate maintenance (Mifflin-St Jeor, light activity)
     *  - cap the deficit/surplus to a safe weekly rate of weight change
     *  - never below an absolute calorie floor (sex-based) or above a sane ceiling
     * Returns the clamped goals and a flag noting whether anything was adjusted.
     */
    private applySafetyClamp(aiGoals: NutritionTotals, p: OnboardingInput): CalculatedGoals {
        const bmr =
            10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
        const maintenance = bmr * 1.4;

        const absoluteFloor = p.sex === "female" ? ABSOLUTE_FLOOR_FEMALE : ABSOLUTE_FLOOR_MALE;

        let lowerBound = absoluteFloor;
        let upperBound = ABSOLUTE_CEIL;

        if (p.goalType === "lose") {
            // No faster than ~1% bodyweight/week.
            const maxDailyDeficit = (0.01 * p.weightKg * KCAL_PER_KG) / 7;
            lowerBound = Math.max(absoluteFloor, Math.round(maintenance - maxDailyDeficit));
        } else if (p.goalType === "gain") {
            // No faster than ~0.5% bodyweight/week.
            const maxDailySurplus = (0.005 * p.weightKg * KCAL_PER_KG) / 7;
            upperBound = Math.min(ABSOLUTE_CEIL, Math.round(maintenance + maxDailySurplus));
        }

        // Guard against a degenerate window for very small inputs.
        lowerBound = Math.min(lowerBound, upperBound);

        const aiCalories = Math.round(aiGoals.calories);
        const safeCalories = Math.min(Math.max(aiCalories, lowerBound), upperBound);

        const goals: NutritionTotals = {
            calories: safeCalories,
            protein: Math.max(0, Math.round(aiGoals.protein)),
            carbs: Math.max(0, Math.round(aiGoals.carbs)),
            fat: Math.max(0, Math.round(aiGoals.fat)),
            fiber: Math.max(0, Math.round(aiGoals.fiber)),
        };

        return { goals, adjustedForSafety: safeCalories !== aiCalories };
    }

    private normalizeKey(description: string): string {
        return description.toLowerCase().trim().split(/\s+/).sort().join(" ");
    }

    private buildUserMessage(description: string, opts: AnalyzeFoodOptions): string {
        if (opts.previousDescription) {
            return (
                `[Context: the user is correcting a previously logged entry. ` +
                `Original: "${opts.previousDescription}". ` +
                `Corrected version below — analyze the corrected version only.]\n\n` +
                description
            );
        }
        return description;
    }

    private async callAnthropic(
        description: string,
        opts: AnalyzeFoodOptions
    ): Promise<ParsedNutrition> {
        let response;
        try {
            response = await this.getClient().messages.create({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: [
                    {
                        type: "text",
                        text: SYSTEM_PROMPT,
                        cache_control: { type: "ephemeral" },
                    },
                ],
                messages: [{ role: "user", content: this.buildUserMessage(description, opts) }],
            });
        } catch (err) {
            if (err instanceof Anthropic.APIError) {
                throw new BadGatewayError(
                    `AI service failed (${err.status}): ${err.message}`
                );
            }
            throw new BadGatewayError(
                `AI service unreachable: ${(err as Error).message}`
            );
        }

        const textBlock = response.content.find((b) => b.type === "text");
        if (!textBlock || textBlock.type !== "text") {
            throw new BadGatewayError("AI response contained no text block");
        }

        return this.parseAndValidate(textBlock.text);
    }

    private parseAndValidate(text: string): ParsedNutrition {
        const cleaned = text
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

        let parsed: unknown;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new BadGatewayError("AI returned non-JSON output");
        }

        if (!this.isParsedNutrition(parsed)) {
            throw new BadGatewayError("AI response shape did not match ParsedNutrition");
        }

        return parsed;
    }

    private isParsedNutrition(value: unknown): value is ParsedNutrition {
        if (!value || typeof value !== "object") return false;
        const v = value as Record<string, unknown>;
        if (!Array.isArray(v.items)) return false;
        if (!this.isNutritionTotals(v.totals)) return false;
        for (const item of v.items) {
            if (!item || typeof item !== "object") return false;
            const it = item as Record<string, unknown>;
            if (typeof it.name !== "string") return false;
            if (typeof it.quantity !== "number") return false;
            if (typeof it.unit !== "string") return false;
            if (!this.isNutritionTotals(it.nutrition)) return false;
        }
        return true;
    }

    private isNutritionTotals(value: unknown): value is NutritionTotals {
        if (!value || typeof value !== "object") return false;
        const v = value as Record<string, unknown>;
        return (
            typeof v.calories === "number" &&
            typeof v.protein === "number" &&
            typeof v.carbs === "number" &&
            typeof v.fat === "number" &&
            typeof v.fiber === "number"
        );
    }
}

export const aiService = new AIService();
