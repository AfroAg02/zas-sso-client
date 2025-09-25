import { ApiResponse } from "@/types/fetch/api";
import { SessionData, Tokens, User } from "../types";
export declare const persistUserSessionInCookies: (session: SessionData, callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}) => Promise<void>;
export declare const deleteCookiesSession: (callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}) => Promise<void>;
export declare const authenticateWithTokens: (credentials: Tokens, callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}) => Promise<ApiResponse<User | null>>;
export declare const refreshTokens: (callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}) => Promise<import("@/lib/api").ApiResponse<unknown> | undefined>;
export declare const getCookiesSession: () => Promise<SessionData>;
//# sourceMappingURL=server-actions.d.ts.map