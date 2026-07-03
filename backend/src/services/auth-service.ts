// ── AuthService ────────────────────────────────────────────────────────────
// The "service layer" for auth: business rules for register/login live here, kept
// separate from the controller (HTTP) and the model (DB schema). It extends
// BaseService to inherit generic CRUD, and leans on secureService for crypto.
import { IUserModel, User } from "../models/user";
import { ConflictError, UnauthorizedError, ValidationError } from "../models/client-error";
import { AuthResult, LoginInput, RegisterInput, SafeUser } from "../types/auth";
import { BaseService } from "./base-service";
import { secureService, TokenPayload } from "./secure-service";

class AuthService extends BaseService<IUserModel> {

    public constructor() {
        super(User);
    }

    public async register(input: RegisterInput): Promise<AuthResult> {
        if (!input.email || !input.password) {
            throw new ValidationError("Email and password are required");
        }

        const existing = await User.findOne({ email: input.email.toLowerCase() }).exec();
        if (existing) throw new ConflictError("Email already in use");

        // Hash via secureService (the model just stores the hash).
        const passwordHash = await secureService.hashPassword(input.password);
        const user = await User.create({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            passwordHash,
        });

        return this.buildAuthResult(user);
    }

    public async login(input: LoginInput): Promise<AuthResult> {
        if (!input.email || !input.password) {
            throw new ValidationError("Email and password are required");
        }

        // `.select("+passwordHash")` re-includes the hash for THIS query only — the
        // schema marks it `select:false` so it's normally never loaded/returned.
        const user = await User.findOne({ email: input.email.toLowerCase() })
            .select("+passwordHash")
            .exec();

        // Same generic "Invalid email or password" whether the email doesn't exist
        // OR the password is wrong. This prevents "user enumeration" — an attacker
        // can't tell which emails are registered by reading different error messages.
        if (!user) throw new UnauthorizedError("Invalid email or password");

        const ok = await secureService.comparePassword(input.password, user.passwordHash);
        if (!ok) throw new UnauthorizedError("Invalid email or password");

        return this.buildAuthResult(user);
    }

    private buildAuthResult(user: IUserModel): AuthResult {
        const safe = user.toSafeObject() as SafeUser;
        // Mongoose ObjectId → string so JWT decoders and the token middleware
        // can compare it without coercion.
        safe._id = String(safe._id);
        const token = secureService.generateToken(safe as TokenPayload);
        return { user: safe, token };
    }

}

export const authService = new AuthService();
