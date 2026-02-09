/**
 * Barrel file for auth-sso public API.
 *
 * Centraliza todos los exports importantes para que los consumidores puedan importar desde
 * `auth-sso` sin conocer la estructura interna de carpetas.
 *
 * NOTA: Si en el futuro algún export se considera interno, muévelo a la sección marcada
 * como "internos" o elimínalo de aquí para evitar breaking changes innecesarios.
 */
export { getRedirectUri, initSSO, getregisterCallbackUri, SSO, getConfig, } from "./init-config";
export { AuthProvider, useAuthContext, type AuthContextState, } from "./context/auth-context";
export { default as SSOProvider } from "./providers/sso-provider";
export { useAuth } from "./hooks/use-auth";
export { usePermissionCheck, usePermissions, } from "./permissions-control/hooks";
export { deleteCookiesSession as serverSignOut, getCookiesSession as getServerSession, } from "./services/server-actions";
export { checkPermission, fetchMyPermissions, } from "./permissions-control/server";
export { getJWTClaims } from "./lib/decode";
export { getLoginUrl, redirectToLogin } from "./lib/url";
export type * from "./types";
export { handlers as ssoHandlers } from "./services/handlers";
export { createSSOMiddleware, buildMiddlewareConfig } from "./lib/middleware";
//# sourceMappingURL=index.d.ts.map