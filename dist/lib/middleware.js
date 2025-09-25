"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._internal = void 0;
exports.buildMiddlewareConfig = buildMiddlewareConfig;
exports.createSSOMiddleware = createSSOMiddleware;
const server_1 = require("next/server");
const server_actions_1 = require("../services/server-actions");
const url_1 = require("./url");
/** Determina si un pathname está dentro de alguno de los prefijos protegidos. */
function isProtected(pathname, protectedRoutes) {
    if (!protectedRoutes)
        return true; // sin lista => todo protegido
    return protectedRoutes.some((prefix) => {
        if (!prefix)
            return false;
        if (prefix === "/")
            return true;
        return pathname === prefix || pathname.startsWith(prefix + "/");
    });
}
/** Construye el array de matchers para exportarlo en `config`. */
function buildMiddlewareConfig(protectedRoutes) {
    if (protectedRoutes && protectedRoutes.length) {
        const unique = Array.from(new Set(protectedRoutes));
        const matcher = unique.map((r) => {
            const cleaned = r.endsWith("/") ? r.slice(0, -1) : r; // quitar slash final
            return cleaned === "/" ? "/:path*" : `${cleaned}/:path*`;
        });
        return { matcher };
    }
    // Sin rutas => proteger todo (excepto assets de Next, opcional). Para simplificar todo.
    return { matcher: ["/(.*)"] };
}
/**
 * Crea un middleware de SSO que:
 *  - Verifica si la ruta requiere auth (según prefijos). Si no, deja pasar.
 *  - Si requiere auth y NO hay sesión => redirige a login con callbackUrl.
 *  - Si requiere auth y hay sesión => continúa.
 */
function createSSOMiddleware(options) {
    const protectedRoutes = options?.protectedRoutes?.length
        ? options?.protectedRoutes
        : null;
    return async function middleware(req) {
        const { pathname } = req.nextUrl;
        // Si no necesita auth, continuar.
        if (!isProtected(pathname, protectedRoutes)) {
            return server_1.NextResponse.next();
        }
        // Leer sesión (cifrada) y validar que tenga usuario + tokens
        let hasSession = false;
        try {
            const session = await (0, server_actions_1.getCookiesSession)();
            hasSession = Boolean(session &&
                session.user &&
                session.tokens?.accessToken &&
                session.tokens?.refreshToken);
        }
        catch {
            hasSession = false;
        }
        if (hasSession)
            return server_1.NextResponse.next();
        const loginUrl = new URL((0, url_1.getLoginUrl)());
        loginUrl.searchParams.set("callbackUrl", req.url);
        return server_1.NextResponse.redirect(loginUrl);
    };
}
// Export util por compatibilidad con el archivo previo (opcional)
exports._internal = { isProtected, buildMiddlewareConfig };
//# sourceMappingURL=middleware.js.map