import { SSOInitOptions } from "./types";
export declare let NEXT_PUBLIC_APP_URL: string | undefined;
export declare let NEXT_PUBLIC_SSO_URL: string;
export declare let REDIRECT_URI: string;
export declare let MAX_COOKIES_AGE: number;
export declare let COOKIE_SESSION_NAME: string;
export declare const ENDPOINTS: {
    login: string;
    refresh: string;
    me: string;
};
export declare function getRedirectUri(): string;
export declare function getAppUrl(): string | undefined;
export declare function getSsoUrl(): string;
export declare function getCookieName(): string;
export declare function getMaxCookiesAge(): number;
export declare function getEndpoints(): {
    login: string;
    refresh: string;
    me: string;
};
export declare function initSSO(config: SSOInitOptions): {
    readonly middleware: (req: import("next/server").NextRequest) => Promise<import("next/server").NextResponse<unknown>>;
    readonly config: {
        readonly matcher: string[];
    } | {
        readonly matcher: readonly ["/(.*)"];
    };
    readonly handlers: {
        GET: typeof import("./services/handlers").GET;
    };
};
export declare const SSO: {
    init: typeof initSSO;
};
//# sourceMappingURL=init-config.d.ts.map