import * as next_server from 'next/server';
import { NextResponse } from 'next/server';

declare function GET(request: Request): Promise<NextResponse<any>>;
declare const handlers: {
    GET: typeof GET;
};

type Tokens = {
    accessToken: string;
    refreshToken: string;
};
interface Email {
    address: string;
    isVerified: boolean;
}
interface Phone {
    countryId: number;
    number: string;
    isVerified: boolean;
}
interface User {
    id: number;
    name: string;
    emails: Email[];
    phones: Phone[];
    photoUrl: string;
}
type SessionData = {
    user: User | null;
    tokens: Tokens | null;
    shouldClear?: boolean;
};
type Credentials = {
    email?: string;
    phoneNumberCountryId?: number;
    phoneNumber?: string;
    password: string;
};
interface SSOInitOptions {
    protectedRoutes?: string[];
    cookieName?: string;
    appUrl?: string;
    ssoUrl?: string;
    redirectUri?: string;
    cookieMaxAgeSeconds?: number;
    endpoints?: Partial<{
        login: string;
        refresh: string;
        me: string;
    }>;
}

declare function getRedirectUri(): string;
declare function initSSO(config: SSOInitOptions): {
    readonly middleware: (req: next_server.NextRequest) => Promise<next_server.NextResponse<unknown>>;
    readonly config: {
        readonly matcher: string[];
    } | {
        readonly matcher: readonly ["/(.*)"];
    };
    readonly handlers: {
        GET: typeof GET;
    };
};
declare const SSO: {
    init: typeof initSSO;
};

interface Permission {
    id: number;
    name: string;
    code: string;
    description: string;
    entity: string;
    type: number;
    roleId: number;
    roleName: string;
    roleCode: string;
}
declare function fetchMyPermissions(): Promise<Permission[]>;
declare function checkPermission(code: string): Promise<boolean>;

declare const deleteCookiesSession: (callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}) => Promise<void>;
declare const getCookiesSession: () => Promise<SessionData>;

declare function getJWTClaims(jwtToken: string): {
    iat: any;
    exp: any;
    issuedAt: Date | null;
    expiresAt: Date | null;
} | null;

/**
 * Construye la URL de login SSO incluyendo un "state" aleatorio y el redirect de callback.
 */
declare const getLoginUrl: () => string;
type RedirectToLoginOptions = {
    /** Si true, añade la ruta actual como parámetro "from" para uso posterior */
    preservePath?: boolean;
    /** Usa replace() en vez de push/navigation normal (solo cliente) */
    replace?: boolean;
    /** Nombre de la query donde guardar el path actual (por defecto from) */
    fromParamName?: string;
};
/**
 * Redirige al login tanto en entorno server (middleware / server component / route handler)
 * como en cliente (componentes con "use client").
 *
 * En server usa next/navigation.redirect (lanza excepción controlada para cortar render).
 * En cliente usa window.location.assign o replace según la opción.
 */
declare function redirectToLogin(opts?: RedirectToLoginOptions): undefined;

export { type Credentials as C, type Email as E, type Permission as P, type SessionData as S, type Tokens as T, type User as U, SSO as a, getCookiesSession as b, checkPermission as c, deleteCookiesSession as d, getJWTClaims as e, fetchMyPermissions as f, getRedirectUri as g, getLoginUrl as h, initSSO as i, handlers as j, type Phone as k, type SSOInitOptions as l, redirectToLogin as r };
