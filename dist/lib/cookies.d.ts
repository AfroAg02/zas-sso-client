import { SessionData } from "../types";
export declare function setSessionCookies(data: SessionData): Promise<void>;
export declare function getSessionCookieOptions(): Promise<{
    name: string;
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
}>;
export declare function readCookies(): Promise<string | undefined>;
export declare function clearSessionCookies(): Promise<void>;
//# sourceMappingURL=cookies.d.ts.map