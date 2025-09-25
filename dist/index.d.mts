import * as next_server from 'next/server';
import { NextResponse } from 'next/server';
import * as react_jsx_runtime from 'react/jsx-runtime';
import React$1 from 'react';
import * as _tanstack_react_query from '@tanstack/react-query';

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

interface AuthContextState extends SessionData {
    isLoading: boolean;
    error: string | null;
    status: "loading" | "authenticated" | "unauthenticated";
    setSession: (session: SessionData) => void;
    signOut: (callbacks?: {
        onSuccess?: () => void;
        onError?: (error: unknown) => void;
    }) => Promise<void> | void;
    reloadSession: () => Promise<void>;
}
declare const AuthProvider: ({ children }: {
    children: React$1.ReactNode;
}) => react_jsx_runtime.JSX.Element;
declare function useAuthContext(): AuthContextState;

type Props = {
    children: React.ReactNode;
};
declare function SSOProvider({ children }: Readonly<Props>): react_jsx_runtime.JSX.Element;

declare function Refresh({ children }: {
    children: React.ReactNode;
}): react_jsx_runtime.JSX.Element;

declare const useAuth: () => AuthContextState;

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

/**
 * usePermissions
 * Usa la server function fetchMyPermissions (session interna) para traer los permisos del usuario.
 */
declare function usePermissions(options?: {
    enabled?: boolean;
    staleTime?: number;
}): _tanstack_react_query.UseQueryResult<Permission[], Error>;
/**
 * usePermissionCheck
 * Verifica un código de permiso usando la server function checkPermission.
 */
declare function usePermissionCheck(code: string | undefined, options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
}): _tanstack_react_query.UseQueryResult<boolean, Error>;

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

export { type AuthContextState, AuthProvider, type Credentials, type Email, type Phone, Refresh, SSO, type SSOInitOptions, SSOProvider, type SessionData, type Tokens, type User, checkPermission, fetchMyPermissions, getJWTClaims, getLoginUrl, getRedirectUri, getCookiesSession as getServerSession, initSSO, redirectToLogin, deleteCookiesSession as serverSignOut, handlers as ssoHandlers, useAuth, useAuthContext, usePermissionCheck, usePermissions };
