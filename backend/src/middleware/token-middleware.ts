// ── Auth middleware ────────────────────────────────────────────────────────
// "Middleware" = a function that runs BETWEEN the request arriving and the route
// handler. This one is the gatekeeper for protected routes: it checks the JWT and
// either lets the request continue (next()) or rejects it. Routes opt in by doing
// `router.use(tokenMiddleware.validateToken)` (see the *.routes.ts files).
//
// How the token travels: on login the frontend gets a JWT, stores it, and sends it
// on every request as the header `Authorization: Bearer <token>`. This reads it back.
import { Request, Response, NextFunction } from "express";
import { secureService } from "../services/secure-service";
import { UnauthorizedError } from "../models/client-error";

const BEARER_PREFIX = "Bearer ";

class TokenMiddleware {

    public validateToken(request: Request, response: Response, next: NextFunction) {
        // Expected format: "Authorization: Bearer eyJhbGci..." — reject if missing.
        const header = request.headers.authorization;
        if (!header || !header.startsWith(BEARER_PREFIX)) {
            return next(new UnauthorizedError("Unauthorized"));
        }

        // Strip "Bearer " to get the raw token, then verify its signature. A null
        // result means invalid/expired/forged → 401.
        const token = header.slice(BEARER_PREFIX.length);
        const user = secureService.verifyToken(token);
        if (!user) return next(new UnauthorizedError("Unauthorized"));

        // Stash the decoded user on the request so downstream controllers can read
        // `req.user._id` without re-decoding. (`as any` because Express's Request
        // type doesn't know about our custom `.user` field.)
        (request as any).user = user;
        next(); // hand off to the next middleware / the route handler
    }

}

export const tokenMiddleware = new TokenMiddleware();
