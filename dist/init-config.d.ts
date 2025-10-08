import { SSOInitOptions } from "./types";
export declare function getConfig(): {
    NEXT_PUBLIC_APP_URL: string | undefined;
    NEXT_PUBLIC_SSO_URL: string;
    REDIRECT_URI: string;
    MAX_COOKIES_AGE: number;
    COOKIE_SESSION_NAME: string;
    ENDPOINTS: {
        login: string;
        refresh: string;
        me: string;
    };
    AUTOMATIC_REDIRECT_ON_REFRESH: boolean;
};
export declare function getAppUrl(): string | undefined;
export declare function getSsoUrl(): string;
export declare function getRedirectUri(): string;
export declare function getEndpoints(): {
    login: string;
    refresh: string;
    me: string;
};
export declare function initSSO(options: SSOInitOptions): {
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