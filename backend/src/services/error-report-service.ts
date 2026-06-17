import { ErrorReport, IErrorReport } from "../models/error-report";
import { CreateErrorReportInput, CreateErrorReportResult } from "../types/error-report";

// Unambiguous alphabet (no 0/O/1/I) so testers can read the id over the phone.
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ID_LENGTH = 6;

// Defensive scrub: even though the validation layer strips unknown keys, we also
// redact anything that looks like a secret inside free-text fields (a backend
// error body could echo an Authorization header, a token, etc.).
const SECRET_PATTERNS: RegExp[] = [
    /(authorization)\s*[:=]\s*\S+/gi,
    /(bearer)\s+[A-Za-z0-9._-]+/gi,
    /(password|passwordHash|pwd)\s*[:=]\s*\S+/gi,
    /(token|jwt|access_token|refresh_token|apiKey|api_key|secret)\s*[:=]\s*\S+/gi,
    // Bare JWTs (three base64url segments).
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
];

class ErrorReportService {

    private generateErrorId(): string {
        let id = "";
        for (let i = 0; i < ID_LENGTH; i++) {
            id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
        }
        return id;
    }

    private redact(value?: string): string | undefined {
        if (!value) return value;
        let out = value;
        for (const re of SECRET_PATTERNS) out = out.replace(re, "$1 [REDACTED]");
        return out;
    }

    // Persist a report and return its short id. Identity is taken from the verified
    // token when available (more trustworthy than client-supplied), else the body.
    public async createReport(
        input: CreateErrorReportInput,
        identity?: { userId?: string; userEmail?: string }
    ): Promise<CreateErrorReportResult> {
        const errorId = this.generateErrorId();

        const doc: Partial<IErrorReport> = {
            errorId,
            source: input.source ?? "unknown",
            message: this.redact(input.message),
            stack: this.redact(input.stack),
            componentOrScreen: input.componentOrScreen,
            route: input.route,
            apiUrl: input.apiUrl,
            httpMethod: input.httpMethod,
            httpStatus: input.httpStatus,
            backendError: this.redact(input.backendError),
            userNote: input.userNote,
            userAgent: input.userAgent,
            clientTimestamp: input.clientTimestamp,
            userId: identity?.userId ?? input.userId,
            userEmail: identity?.userEmail ?? input.userEmail,
        };

        await ErrorReport.create(doc);

        // Surface every captured crash in the server log too, tagged by id, so it's
        // findable both in the DB inbox and the logs.
        console.error(
            `[error-report #${errorId}] source=${doc.source} screen=${doc.componentOrScreen ?? "-"} ` +
            `api=${doc.httpMethod ?? ""} ${doc.apiUrl ?? "-"} status=${doc.httpStatus ?? "-"} ` +
            `user=${doc.userEmail ?? doc.userId ?? "anon"} :: ${doc.message ?? doc.backendError ?? "(no message)"}`
        );

        return { errorId };
    }

    // Admin inbox: most recent first. `.lean()` for a plain read-only payload.
    public async listRecent(limit = 200): Promise<IErrorReport[]> {
        return ErrorReport.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
            .exec() as unknown as IErrorReport[];
    }

}

export const errorReportService = new ErrorReportService();
