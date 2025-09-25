/**
 * Barrel file for auth-sso public API.
 *
 * Centraliza todos los exports importantes para que los consumidores puedan importar desde
 * `auth-sso` sin conocer la estructura interna de carpetas.
 *
 * NOTA: Si en el futuro algún export se considera interno, muévelo a la sección marcada
 * como "internos" o elimínalo de aquí para evitar breaking changes innecesarios.
 */

// ---- Inicialización / Config (solo API pública necesaria) ----
// Mantén la superficie mínima necesaria para consumir el paquete.
export { getRedirectUri, initSSO, SSO } from "./init-config";

// ---- Proveedor principal y contexto ----
export {
  AuthProvider,
  useAuthContext,
  type AuthContextState,
} from "./context/auth-context";
export { default as SSOProvider } from "./providers/sso-provider";

// ---- Hooks de cliente ----
export { default as Refresh } from "./hooks/refresh";
export { useAuth } from "./hooks/use-auth";
export {
  usePermissionCheck,
  usePermissions,
} from "./permissions-control/hooks";

// ---- Server actions públicas ----
// Exponemos únicamente sign out para limpiar la sesión. El resto queda interno.
export {
  deleteCookiesSession as serverSignOut,
  getCookiesSession as getServerSession,
} from "./services/server-actions";

// ---- Permisos (server) ----
export {
  checkPermission,
  fetchMyPermissions,
} from "./permissions-control/server";

// ---- Utils de navegación / login ----
export { getJWTClaims } from "./lib/decode";
export { getLoginUrl, redirectToLogin } from "./lib/url";

// ---- Tipos ----
export type * from "./types";

// ---- Handlers (ej: callback SSO) ----
export { handlers as ssoHandlers } from "./services/handlers";

// parseRedirectUrl, cookies y crypto permanecen internos (no exportados) para reducir superficie pública.

// ---- Nota ----
// Si necesitas ampliar la API vuelve a exportar desde aquí para mantener consistencia.

// Default export (opcional). Se deja sin definir para forzar imports nombrados y evitar tree-shaking pobre.
// export default SSO; // <-- Descomenta si quieres un default.
