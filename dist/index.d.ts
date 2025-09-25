import { S as SessionData, P as Permission } from './edge-C88i_8Tu.js';
export { C as Credentials, E as Email, k as Phone, a as SSO, l as SSOInitOptions, T as Tokens, U as User, c as checkPermission, f as fetchMyPermissions, e as getJWTClaims, h as getLoginUrl, g as getRedirectUri, b as getServerSession, i as initSSO, r as redirectToLogin, d as serverSignOut, j as ssoHandlers } from './edge-C88i_8Tu.js';
import * as react_jsx_runtime from 'react/jsx-runtime';
import React$1 from 'react';
import * as _tanstack_react_query from '@tanstack/react-query';
import 'next/server';

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

export { type AuthContextState, AuthProvider, Refresh, SSOProvider, SessionData, useAuth, useAuthContext, usePermissionCheck, usePermissions };
