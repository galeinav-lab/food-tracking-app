import { Request, Response, NextFunction } from "express";
import { secureService } from "../services/secure-service";
import { UnauthorizedError } from "../models/client-error";

const BEARER_PREFIX = "Bearer ";

class TokenMiddleware {

    public validateToken(request: Request, response: Response, next: NextFunction) {
        const header = request.headers.authorization;
        if (!header || !header.startsWith(BEARER_PREFIX)) {
            return next(new UnauthorizedError("Unauthorized"));
        }

        const token = header.slice(BEARER_PREFIX.length);
        const user = secureService.verifyToken(token);
        if (!user) return next(new UnauthorizedError("Unauthorized"));

        (request as any).user = user;
        next();
    }

}

export const tokenMiddleware = new TokenMiddleware();
