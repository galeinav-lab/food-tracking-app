// ── AIService ──────────────────────────────────────────────────────────────
// Wraps the Anthropic (Claude) API to turn plain-language food ("2 eggs and toast")
// into structured nutrition JSON, and to compute onboarding goals. Three ideas
// worth understanding here:
//   1. PROMPT DESIGN — a strict "system prompt" forces JSON-only output.
//   2. CACHE-ASIDE — we check our DB cache before paying for an API call.
//   3. NEVER TRUST THE LLM — every response is JSON-parsed AND shape-validated,
//      and goals are clamped to safe bounds, before we use it.
import Anthropic from "@anthropic-ai/sdk";
import { appConfig } from "../utils/app-config";
import { NutritionCache } from "../models/nutrition-cache";
import { BadGatewayError, ValidationError } from "../models/client-error";
import { NutritionTotals, ParsedFoodItem, ParsedNutrition } from "../types/nutrition";
import { CalculatedGoals, OnboardingInput } from "../types/onboarding";
import { LabelValues, ScanLabelResult } from "../types/saved-food";
import { SavedFoodBaseUnit } from "../models/saved-food";

// The model's raw (pre-conversion) label read, exactly as the prompt specifies.
interface RawLabelRead {
    name: string | null;
    basis: "per100" | "perServing";
    servingSize: number | null;
    servingUnit: string | null;
    baseUnit: SavedFoodBaseUnit;
    values: LabelValues;
}

const isNumberOrNull = (v: unknown): v is number | null =>
    v === null || (typeof v === "number" && Number.isFinite(v));

// Scale a nullable macro, keeping null as null and rounding to 2dp.
const scaleOrNull = (v: number | null, factor: number): number | null =>
    v == null ? null : Math.round(v * factor * 100) / 100;

// The "system prompt" sets the model's role/rules for the whole conversation. We
// demand raw JSON (no prose, no ``` fences) and give the EXACT schema, so the reply
// is machine-parseable. Pinning the output shape like this is the key to reliably
// using an LLM as a structured-data function rather than a chatbot.
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

// Reads a photographed nutrition label. Bilingual on purpose: Israeli products are
// commonly Hebrew-only or Hebrew/English, so the Hebrew nutrition vocabulary is
// spelled out rather than left to chance. `null` over guessing is the core rule —
// a hallucinated macro would silently poison every future log of this food.
const LABEL_SYSTEM_PROMPT = `You read nutrition labels from photographs and output structured data.

Return ONLY valid JSON matching this exact shape — no markdown, no code fences, no prose, no commentary:

{
  "name": string | null,
  "basis": "per100" | "perServing",
  "servingSize": number | null,
  "servingUnit": string | null,
  "baseUnit": "g" | "ml",
  "values": {
    "calories": number | null,
    "protein": number | null,
    "carbs": number | null,
    "fat": number | null,
    "fiber": number | null
  }
}

Rules:
- Read the numbers exactly as printed on the label. NEVER estimate, infer, or invent a value.
- If a nutrient is not shown on the label (or you cannot read it confidently), return null for it. Returning null is CORRECT and expected; a wrong number is much worse than null.
- "basis": use "per100" if the column you read is per 100 g / per 100 ml. Use "perServing" if it is per serving / per unit / per package.
- If BOTH a per-100 column and a per-serving column exist, ALWAYS read the per-100 column and set basis to "per100".
- "servingSize" + "servingUnit": the serving size if the label states it (e.g. 30 g -> servingSize 30, servingUnit "g"). null if not stated.
- "baseUnit": "g" for solids, "ml" for liquids/drinks. Infer from the label's units.
- calories in kcal (if only kJ is shown, convert: kcal = kJ / 4.184). Protein, carbs, fat, fiber in grams.
- "name": the product name if legible, else null.
- The label may be in Hebrew, English, or bilingual. Read either language. Hebrew terms:
  אנרגיה / קלוריות / קלוריות (אנרגיה) = calories
  חלבונים / חלבון = protein
  פחמימות = carbs (note: מתוכן סוכרים = "of which sugars", that is NOT total carbs)
  שומנים / שומן = fat (note: מתוכן חומצות שומן רוויות = "of which saturates", NOT total fat)
  סיבים תזונתיים / סיבים = fiber
  ל-100 גרם / ל-100 מ"ל / לכל 100 גרם = per 100 g / per 100 ml
  מנה / גודל מנה / ל-מנה = serving / serving size
  נתרן = sodium (ignore), סוכרים = sugars (ignore)
- If the image is not a nutrition label, or is too blurry/dark to read any values, return every value as null.
- Output the JSON object only.`;

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

// Guard rails for the uploaded photo (base64 chars ≈ 4/3 × bytes).
const MAX_IMAGE_BASE64_CHARS = 7_000_000; // ~5MB of image
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

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

    // "Lazy initialization": the SDK client is created on first use, not at startup.
    // Benefit — the server can boot (and serve non-AI routes) even if the API key is
    // missing; we only fail when something actually needs the AI.
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

        // CACHE-ASIDE pattern: look in our own DB first; only call the (slow, paid)
        // AI on a miss, then write the result back for next time. Skipped for edits
        // because the extra "this is a correction" context can change the answer.
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

    /**
     * Read a photographed nutrition label into structured per-100 macros.
     * Saves nothing — the caller shows the result for the user to confirm/edit.
     *
     * Pipeline: validate the image → Claude vision (image block + the strict
     * JSON-only label prompt) → defensive parse + shape guard → convert to per-100.
     *
     * PER-SERVING CONVERSION: if the label was printed per serving AND the serving
     * size is known, we convert here (per100 = value / servingSize * 100). If the
     * serving size is unknown we DO NOT guess a portion — we return the raw
     * per-serving values with valuesArePer100:false + needsServingSize:true so the
     * UI can ask the user for the serving size and convert with a real number.
     */
    public async readNutritionLabel(imageBase64: string): Promise<ScanLabelResult> {
        const { data, mediaType } = this.prepareImage(imageBase64);

        let response;
        try {
            response = await this.getClient().messages.create({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: [
                    {
                        type: "text",
                        text: LABEL_SYSTEM_PROMPT,
                        cache_control: { type: "ephemeral" },
                    },
                ],
                messages: [
                    {
                        role: "user",
                        content: [
                            // Vision: the photo travels as an image content block.
                            {
                                type: "image",
                                source: { type: "base64", media_type: mediaType, data },
                            },
                            {
                                type: "text",
                                text: "Read this nutrition label and return the JSON described in your instructions.",
                            },
                        ],
                    },
                ],
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

        const parsed = this.parseLabel(textBlock.text);
        return this.toPer100(parsed);
    }

    // Accepts a raw base64 string or a data: URL; validates size + media type.
    private prepareImage(input: string): { data: string; mediaType: SupportedImageType } {
        const trimmed = input.trim();

        let mediaType: SupportedImageType = "image/jpeg";
        let data = trimmed;

        const dataUrl = /^data:([a-zA-Z0-9/+.-]+);base64,(.*)$/s.exec(trimmed);
        if (dataUrl) {
            const declared = dataUrl[1].toLowerCase();
            if (!SUPPORTED_IMAGE_TYPES.includes(declared as SupportedImageType)) {
                throw new ValidationError(
                    `Unsupported image type "${declared}". Use JPEG, PNG, WebP or GIF.`
                );
            }
            mediaType = declared as SupportedImageType;
            data = dataUrl[2];
        }

        data = data.replace(/\s/g, "");
        if (data.length < 100) {
            throw new ValidationError("The image looks empty. Please retake the photo.");
        }
        if (data.length > MAX_IMAGE_BASE64_CHARS) {
            throw new ValidationError(
                "That photo is too large (max ~5MB). Please retake it at a lower resolution."
            );
        }
        if (!/^[A-Za-z0-9+/]+=*$/.test(data)) {
            throw new ValidationError("The image data is not valid base64.");
        }

        return { data, mediaType };
    }

    // Same defensive treatment as the food/goals parsing: strip fences, try/catch
    // the JSON, then verify the SHAPE before trusting any of it.
    private parseLabel(text: string): RawLabelRead {
        const cleaned = text
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

        let parsed: unknown;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new BadGatewayError(
                "Couldn't read the label — please try a clearer photo."
            );
        }

        if (!this.isRawLabelRead(parsed)) {
            throw new BadGatewayError(
                "Couldn't read the label — please try a clearer photo."
            );
        }

        // Every value null => the model saw no readable label at all.
        const v = parsed.values;
        const allNull =
            v.calories == null &&
            v.protein == null &&
            v.carbs == null &&
            v.fat == null &&
            v.fiber == null;
        if (allNull) {
            throw new BadGatewayError(
                "Couldn't read any nutrition values — try a clearer, straight-on photo of the label."
            );
        }

        return parsed;
    }

    // Convert a per-serving read into per-100 when we legitimately can.
    private toPer100(raw: RawLabelRead): ScanLabelResult {
        const baseUnit: SavedFoodBaseUnit = raw.baseUnit === "ml" ? "ml" : "g";
        const base: ScanLabelResult = {
            name: raw.name,
            baseUnit,
            basis: raw.basis,
            servingSize: raw.servingSize,
            servingUnit: raw.servingUnit,
            values: raw.values,
            valuesArePer100: true,
            needsServingSize: false,
        };

        if (raw.basis === "per100") return base;

        // Per-serving with a usable serving size -> convert.
        if (raw.servingSize != null && raw.servingSize > 0) {
            const factor = 100 / raw.servingSize;
            return {
                ...base,
                values: {
                    calories: scaleOrNull(raw.values.calories, factor),
                    protein: scaleOrNull(raw.values.protein, factor),
                    carbs: scaleOrNull(raw.values.carbs, factor),
                    fat: scaleOrNull(raw.values.fat, factor),
                    fiber: scaleOrNull(raw.values.fiber, factor),
                },
                valuesArePer100: true,
            };
        }

        // Per-serving, serving size unknown -> hand back the RAW numbers, flagged.
        // Guessing a portion here would silently corrupt the stored food.
        return { ...base, valuesArePer100: false, needsServingSize: true };
    }

    private isRawLabelRead(value: unknown): value is RawLabelRead {
        if (!value || typeof value !== "object") return false;
        const v = value as Record<string, unknown>;
        if (v.basis !== "per100" && v.basis !== "perServing") return false;
        if (v.baseUnit !== "g" && v.baseUnit !== "ml") return false;
        if (!(typeof v.name === "string" || v.name === null)) return false;
        if (!isNumberOrNull(v.servingSize)) return false;
        if (!(typeof v.servingUnit === "string" || v.servingUnit === null)) return false;
        if (!v.values || typeof v.values !== "object") return false;
        const m = v.values as Record<string, unknown>;
        return (
            isNumberOrNull(m.calories) &&
            isNumberOrNull(m.protein) &&
            isNumberOrNull(m.carbs) &&
            isNumberOrNull(m.fat) &&
            isNumberOrNull(m.fiber)
        );
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
        // Mifflin-St Jeor equation — the standard estimate of BMR (Basal Metabolic
        // Rate = calories burned at complete rest). The +5 / -161 is the sex constant.
        const bmr =
            10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
        // Maintenance = BMR × an activity multiplier (1.4 ≈ lightly active). Eat at
        // maintenance to hold weight; below it to lose, above it to gain.
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

    // Build a stable cache key. Lowercasing + sorting the words means "toast and eggs"
    // and "eggs and toast" produce the SAME key, so they share one cached result.
    // (Trade-off: it's fuzzy — different word order with the same words collides.)
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
                max_tokens: MAX_TOKENS, // hard cap on the reply length (cost/safety)
                system: [
                    {
                        type: "text",
                        text: SYSTEM_PROMPT,
                        // Anthropic PROMPT CACHING: the (long, unchanging) system prompt
                        // is cached on their side, so repeated calls are cheaper/faster.
                        cache_control: { type: "ephemeral" },
                    },
                ],
                // "messages" is the conversation; we send a single user turn. The
                // model replies in `response.content` as blocks (we want the text one).
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

    // A TypeScript "type guard" (note the return type `value is ParsedNutrition`):
    // it checks the shape at RUNTIME and, if true, tells the compiler the value is
    // that type. Essential when the input is `unknown` (parsed LLM JSON) — we verify
    // every field before trusting it, so a malformed AI reply fails loudly here.
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
