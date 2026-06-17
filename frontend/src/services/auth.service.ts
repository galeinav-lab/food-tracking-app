import { http } from "./http-client";
import { IAuthResult, ILoginInput, IRegisterInput } from "../models/auth";
import { IUser } from "../models/user";

// Routes confirmed against backend/src/routes/auth.routes.ts.
export const authService = {
    // POST /api/auth/register
    register(input: IRegisterInput): Promise<IAuthResult> {
        return http.post<IAuthResult>("/auth/register", input);
    },

    // POST /api/auth/login
    login(input: ILoginInput): Promise<IAuthResult> {
        return http.post<IAuthResult>("/auth/login", input);
    },

    // GET /api/auth/me — backend sends { user }; unwrap to the user for the caller.
    async me(): Promise<IUser> {
        const data = await http.get<{ user: IUser }>("/auth/me");
        return data.user;
    },
};
