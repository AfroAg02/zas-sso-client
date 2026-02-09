import { SSOInitOptions } from "./types";
export declare function getConfig(): {
    NEXT_PUBLIC_APP_URL: string | undefined;
    NEXT_PUBLIC_SSO_URL: string | undefined;
    REDIRECT_URI: string;
    REGISTER_REDIRECT_URI: string | undefined;
    MAX_COOKIES_AGE: number;
    COOKIE_SESSION_NAME: string;
    ENDPOINTS: {
        login: string;
        refresh: string;
        me: string;
    };
    AUTOMATIC_REDIRECT_ON_REFRESH: boolean;
    DEBUG: boolean;
};
export declare function getAppUrl(): string | undefined;
export declare function getSsoUrl(): string | undefined;
export declare function getRedirectUri(): string;
export declare function getregisterCallbackUri(): string | undefined;
export declare function getEndpoints(): {
    login: string;
    refresh: string;
    me: string;
};
export declare function getDebug(): boolean;
export declare function initSSO(options: SSOInitOptions): {
    readonly middleware: (req: import("next/server").NextRequest) => Promise<import("next/server").NextResponse<unknown>>;
    readonly config: {
        readonly matcher: string[];
    } | {
        readonly matcher: readonly ["/(.*)"];
    };
    readonly handlers: {
        GET: typeof import("./services/handlers").GET;
        POST: typeof import("./services/handlers").POST;
        DELETE: typeof import("./services/handlers").DELETE;
    };
};
export declare const SSO: {
    init: typeof initSSO;
};
//# sourceMappingURL=init-config.d.ts.map