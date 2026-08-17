import { http } from "./http-client";
import {
    ICreateSavedFoodFromLogInput,
    ICreateSavedFoodInput,
    ISavedFood,
    ISavedFoodDeleteResult,
    IScanLabelResult,
    IUpdateSavedFoodInput,
} from "../models/saved-food";

// Routes confirmed against backend/src/routes/saved-food.routes.ts.
export const savedFoodService = {
    // POST /api/saved-foods
    create(input: ICreateSavedFoodInput): Promise<ISavedFood> {
        return http.post<ISavedFood>("/saved-foods", input);
    },

    // GET /api/saved-foods?q=  — q filters by name (case-insensitive contains).
    list(q?: string): Promise<ISavedFood[]> {
        return http.get<ISavedFood[]>("/saved-foods", { params: q ? { q } : {} });
    },

    // PUT /api/saved-foods/:id
    update(id: string, input: IUpdateSavedFoodInput): Promise<ISavedFood> {
        return http.put<ISavedFood>(`/saved-foods/${id}`, input);
    },

    // DELETE /api/saved-foods/:id
    remove(id: string): Promise<ISavedFoodDeleteResult> {
        return http.delete<ISavedFoodDeleteResult>(`/saved-foods/${id}`);
    },

    // POST /api/saved-foods/from-log/:logId — turns a logged AI meal into a saved
    // food. Omitting amount/baseUnit lets the server infer them; it returns 400
    // (ApiError) asking for them when the log's units are ambiguous.
    createFromLog(logId: string, input: ICreateSavedFoodFromLogInput = {}): Promise<ISavedFood> {
        return http.post<ISavedFood>(`/saved-foods/from-log/${logId}`, input);
    },

    // POST /api/saved-foods/scan-label — AI reads a photographed nutrition label.
    // Saves NOTHING: returns the parsed values for the user to confirm/edit, then
    // the normal create() call stores it.
    scanLabel(imageBase64: string): Promise<IScanLabelResult> {
        return http.post<IScanLabelResult>("/saved-foods/scan-label", { imageBase64 });
    },
};
