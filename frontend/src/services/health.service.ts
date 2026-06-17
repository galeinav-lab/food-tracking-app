import { rawHttp } from "./http-client";

export interface IHealthStatus {
    status: string;
}

// NOTE: GET /api/health is the ONE endpoint that does NOT use the { success, data }
// envelope — the backend returns a bare { status: "ok" }. So it uses the raw axios
// instance (bypassing the unwrap helper) and reads response.data directly.
// Confirmed against backend/src/app.ts.
export const healthService = {
    async checkHealth(): Promise<IHealthStatus> {
        const response = await rawHttp.get<IHealthStatus>("/health");
        return response.data;
    },
};
