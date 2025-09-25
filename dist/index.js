"use strict";
/**
 * Barrel file for auth-sso public API.
 *
 * Centraliza todos los exports importantes para que los consumidores puedan importar desde
 * `auth-sso` sin conocer la estructura interna de carpetas.
 *
 * NOTA: Si en el futuro algún export se considera interno, muévelo a la sección marcada
 * como "internos" o elimínalo de aquí para evitar breaking changes innecesarios.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ssoHandlers = exports.redirectToLogin = exports.getLoginUrl = exports.getJWTClaims = exports.fetchMyPermissions = exports.checkPermission = exports.serverSignOut = exports.usePermissions = exports.usePermissionCheck = exports.useAuth = exports.Refresh = exports.SSOProvider = exports.useAuthContext = exports.AuthProvider = exports.SSO = exports.initSSO = exports.getRedirectUri = void 0;
// ---- Inicialización / Config (solo API pública necesaria) ----
// Mantén la superficie mínima necesaria para consumir el paquete.
var init_config_1 = require("./init-config");
Object.defineProperty(exports, "getRedirectUri", { enumerable: true, get: function () { return init_config_1.getRedirectUri; } });
Object.defineProperty(exports, "initSSO", { enumerable: true, get: function () { return init_config_1.initSSO; } });
Object.defineProperty(exports, "SSO", { enumerable: true, get: function () { return init_config_1.SSO; } });
// ---- Proveedor principal y contexto ----
var auth_context_1 = require("./context/auth-context");
Object.defineProperty(exports, "AuthProvider", { enumerable: true, get: function () { return auth_context_1.AuthProvider; } });
Object.defineProperty(exports, "useAuthContext", { enumerable: true, get: function () { return auth_context_1.useAuthContext; } });
var sso_provider_1 = require("./providers/sso-provider");
Object.defineProperty(exports, "SSOProvider", { enumerable: true, get: function () { return __importDefault(sso_provider_1).default; } });
// ---- Hooks de cliente ----
var refresh_1 = require("./hooks/refresh");
Object.defineProperty(exports, "Refresh", { enumerable: true, get: function () { return __importDefault(refresh_1).default; } });
var use_auth_1 = require("./hooks/use-auth");
Object.defineProperty(exports, "useAuth", { enumerable: true, get: function () { return use_auth_1.useAuth; } });
var hooks_1 = require("./permissions-control/hooks");
Object.defineProperty(exports, "usePermissionCheck", { enumerable: true, get: function () { return hooks_1.usePermissionCheck; } });
Object.defineProperty(exports, "usePermissions", { enumerable: true, get: function () { return hooks_1.usePermissions; } });
// ---- Server actions públicas ----
// Exponemos únicamente sign out para limpiar la sesión. El resto queda interno.
var server_actions_1 = require("./services/server-actions");
Object.defineProperty(exports, "serverSignOut", { enumerable: true, get: function () { return server_actions_1.deleteCookiesSession; } });
// ---- Permisos (server) ----
var server_1 = require("./permissions-control/server");
Object.defineProperty(exports, "checkPermission", { enumerable: true, get: function () { return server_1.checkPermission; } });
Object.defineProperty(exports, "fetchMyPermissions", { enumerable: true, get: function () { return server_1.fetchMyPermissions; } });
// ---- Utils de navegación / login ----
var decode_1 = require("./lib/decode");
Object.defineProperty(exports, "getJWTClaims", { enumerable: true, get: function () { return decode_1.getJWTClaims; } });
var url_1 = require("./lib/url");
Object.defineProperty(exports, "getLoginUrl", { enumerable: true, get: function () { return url_1.getLoginUrl; } });
Object.defineProperty(exports, "redirectToLogin", { enumerable: true, get: function () { return url_1.redirectToLogin; } });
// ---- Handlers (ej: callback SSO) ----
var handlers_1 = require("./services/handlers");
Object.defineProperty(exports, "ssoHandlers", { enumerable: true, get: function () { return handlers_1.handlers; } });
// parseRedirectUrl, cookies y crypto permanecen internos (no exportados) para reducir superficie pública.
// ---- Nota ----
// Si necesitas ampliar la API vuelve a exportar desde aquí para mantener consistencia.
// Default export (opcional). Se deja sin definir para forzar imports nombrados y evitar tree-shaking pobre.
// export default SSO; // <-- Descomenta si quieres un default.
//# sourceMappingURL=index.js.map