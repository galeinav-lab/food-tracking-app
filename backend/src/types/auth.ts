export interface RegisterInput {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface SafeUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    [key: string]: unknown;
}

export interface AuthResult {
    user: SafeUser;
    token: string;
}
