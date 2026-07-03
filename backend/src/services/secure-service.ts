// ── SecureService ──────────────────────────────────────────────────────────
// All the cryptography in one place: password hashing (bcrypt) and JWT
// signing/verifying. Keeping it isolated means the rest of the app never touches
// raw crypto — it just asks this service "hash this", "is this token valid?".
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { appConfig } from "../utils/app-config";

// The shape we put INSIDE the JWT. Whatever goes here is readable by anyone who
// has the token (JWTs are signed, not encrypted) — so never put secrets/passwords
// in here. The `[key: string]: unknown` index signature allows extra user fields.
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
    // bcrypt is a SLOW, salted one-way hash: the `12` is the "cost factor" (2^12
    // rounds) — deliberately slow so brute-forcing stolen hashes is expensive.
    // bcrypt also generates a random salt per password, so two identical passwords
    // hash differently. Hashing is one-way: we can never get the original back,
    // we can only re-hash a guess and compare (see comparePassword).
    public hashPassword(plain: string): Promise<string> {
        return bcrypt.hash(plain, 12);
    }

    // Re-hashes `plain` with the salt embedded in `hash` and checks if they match.
    // This is how login works without ever storing/seeing the real password.
    public comparePassword(plain: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plain, hash);
    }

    // Sign a JWT (JSON Web Token). `jwt.sign` builds a token = header + payload +
    // a signature made from our secret key. Anyone can READ the payload, but only
    // someone with the secret can produce a valid signature — that's what proves
    // the token came from us. `expiresIn: "7d"` bakes an expiry into the token.
    public generateToken(user: TokenPayload): string {
        // Defensively strip passwordHash before it ever goes into the token.
        const { passwordHash: _ignored, ...safe } = user as Record<string, unknown>;
        const options: SignOptions = { expiresIn: "7d" };
        return jwt.sign({ user: safe }, appConfig.secretKey, options);
    }

    // Verify a token's signature + expiry with our secret. If the token is expired,
    // tampered with, or signed by someone else, `jwt.verify` THROWS — we catch it
    // and return null, which the auth middleware treats as "not logged in".
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
