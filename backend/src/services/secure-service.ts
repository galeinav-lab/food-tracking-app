import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { appConfig } from "../utils/app-config";

export interface TokenPayload {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    [key: string]: unknown;
}

class SecureService {

    // Hash a plaintext password. Owned here so the User model stays free of
    // hashing concerns (no bcrypt in the model).
    public hashPassword(plain: string): Promise<string> {
        return bcrypt.hash(plain, 12);
    }

    // Compare a plaintext password against a stored hash.
    public comparePassword(plain: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plain, hash);
    }

    public generateToken(user: TokenPayload): string {
        const { passwordHash: _ignored, ...safe } = user as Record<string, unknown>;
        const options: SignOptions = { expiresIn: "7d" };
        return jwt.sign({ user: safe }, appConfig.secretKey, options);
    }

    public verifyToken(token: string): TokenPayload | null {
        if (!token) return null;
        try {
            const decoded = jwt.verify(token, appConfig.secretKey) as { user: TokenPayload };
            return decoded.user ?? null;
        } catch {
            return null;
        }
    }

}

export const secureService = new SecureService();
