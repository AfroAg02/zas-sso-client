export interface CustomApiError {
    title?: string;
    status: number;
    detail?: string;
}
export declare class ApiError extends Error {
    title: string;
    status: number;
    detail: string;
    constructor(error: CustomApiError & object);
    toString(): string;
}
export type ApiResponse<T> = {
    data?: T;
    error: boolean;
    status: number;
    message?: string;
} & CustomApiError;
export type ApiStatusResponse = {
    status: number;
};
export declare const isApiError: (error: unknown) => error is ApiError;
export declare const handleApiServerError: <T>(response: Response) => Promise<ApiResponse<T>>;
export declare const buildApiResponseAsync: <T>(response: Response) => Promise<ApiResponse<T>>;
export declare const getErrorMessage: (error: unknown) => string;
//# sourceMappingURL=api.d.ts.map