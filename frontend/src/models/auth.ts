import { IUser } from "./user";

// Body for POST /api/auth/register. Mirrors backend RegisterInput.
export interface IRegisterInput {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

// Body for POST /api/auth/login. Mirrors backend LoginInput.
export interface ILoginInput {
    email: string;
    password: string;
}

// Payload of register/login — mirrors backend AuthResult.
export interface IAuthResult {
    user: IUser;
    token: string;
}
