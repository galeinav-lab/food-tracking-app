// Mirrors the backend response envelope (base-controller.ts + error-middleware.ts).
// Every endpoint EXCEPT GET /api/health wraps its payload in this shape.
export interface ISuccessEnvelope<T> {
    success: true;
    data: T;
}

export interface IErrorEnvelope {
    success: false;
    error: string;
}

export type IApiResponse<T> = ISuccessEnvelope<T> | IErrorEnvelope;
