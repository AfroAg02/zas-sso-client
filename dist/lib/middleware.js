import { NextResponse } from "next/server";
import { getConfig, getEndpoints } from "../init-config";
import { processSession } from "../services/session-logic";
import { getSessionCookieOptions } from "./cookies";
import { encrypt } from "./crypto";
import { getLoginUrl } from "./url";
/**
 * Calcula los segundos restantes hasta el `exp` de un JWT.
 */
function getTokenRemainingSeconds(token) {
    if (!token)
        return null;
    const parts = token.split(".");
    if (parts.length !== 3)
        return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    try {
        const payloadJson = Buffer.from(padded, "base64").toString("utf8");
        const payload = JSON.parse(payloadJson);
        if (!payload.exp)
            return null;
        const msLeft = payload.exp * 1000 - Date.now();
        return Math.max(0, Math.floor(msLeft / 1000));
    }
    catch {
        return null;
    }
}
/**
 * Llama al endpoint de refresh y devuelve los nuevos tokens, o null si falla.
 */
async function refreshTokens(refreshToken) {
    try {
        const { refresh } = getEndpoints();
        const response = await fetch(refresh, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            cache: "no-store",
        });
        if (!response.ok)
            return null;
        const tokens = await response.json();
        if (!tokens.accessToken || !tokens.refreshToken)
            return null;
        return tokens;
    }
    catch {
        return null;
    }
}
/**
 * Construye un SessionData con los nuevos tokens y el usuario existente.
 */
function buildRefreshedSession(oldSession, newTokens) {
    return {
        user: oldSession.user,
        tokens: newTokens,
        shouldClear: false,
    };
}
/**
 * Determina si un pathname está dentro de alguno de los prefijos protegidos.
 *
 * Además, cualquier ruta que contenga "dashboard" se considera protegida.
 */
function isProtected(pathname, protectedRoutes) {
    if (pathname.includes("dashboard"))
        return true;
    const routes = protectedRoutes && protectedRoutes.length
        ? protectedRoutes
        : ["/dashboard"]; // valor por defecto
    return routes.some((prefix) => {
        if (!prefix)
            return false;
        if (prefix === "/")
            return true;
        if (pathname === prefix)
            return true;
        return pathname.startsWith(prefix + "/");
    });
}
/**
 * Determina si el pathname apunta a un asset estático de Next.
 *
 * Se expone por compatibilidad, aunque ya no se usa para refresco.
 */
function isStaticAsset(pathname) {
    if (pathname.startsWith("/_next/"))
        return true;
    if (pathname.startsWith("/static/"))
        return true;
    return false;
}
/**
 * Construye el array de matchers para exportarlo en `config`.
 *
 * - Si se pasan rutas protegidas, genera matchers del tipo `/ruta/:path*`.
 * - Si no, protege todo excepto assets de Next.
 */
export function buildMiddlewareConfig(protectedRoutes) {
    if (!protectedRoutes || !protectedRoutes.length) {
        // Proteger todo excepto rutas internas de Next y estáticos
        return { matcher: ["/((?!_next/|static/).*)"] };
    }
    const unique = Array.from(new Set(protectedRoutes));
    const matcher = unique.map((route) => {
        if (!route || route === "/")
            return "/((?!_next/|static/).*)";
        // Asegurarse de que empieza con "/"
        const normalized = route.startsWith("/") ? route : `/${route}`;
        return `${normalized}/:path*`;
    });
    return { matcher };
}
/**
 * Crea un middleware de SSO que:
 *  - Verifica si la ruta requiere auth (según prefijos / heurística).
 *  - Si no requiere auth, deja pasar.
 *  - Si requiere auth y NO hay sesión => redirige a login con callbackUrl.
 *  - No realiza ningún refresco automático de tokens.
 */
export function createSSOMiddleware(options) {
    const protectedRoutes = options?.protectedRoutes?.length
        ? options.protectedRoutes
        : null;
    return async function middleware(req) {
        const { pathname } = req.nextUrl;
        if (!isProtected(pathname, protectedRoutes)) {
            return NextResponse.next();
        }
        const cookieName = getConfig().COOKIE_SESSION_NAME;
        const encryptedCookie = req.cookies.get(cookieName)?.value;
        const { session, refreshed } = await processSession(encryptedCookie);
        const hasSession = Boolean(session.tokens?.accessToken);
        if (!hasSession) {
            const loginUrl = new URL(getLoginUrl());
            loginUrl.searchParams.set("callbackUrl", req.url);
            return NextResponse.redirect(loginUrl);
        }
        const res = NextResponse.next();
        // Si el access token expiró (o está a punto) pero el refresh token sigue vigente,
        // refrescamos aquí en middleware donde sí podemos escribir cookies en la respuesta.
        const accessRemaining = getTokenRemainingSeconds(session.tokens?.accessToken ?? null);
        const refreshRemaining = getTokenRemainingSeconds(session.tokens?.refreshToken ?? null);
        if (accessRemaining != null &&
            accessRemaining <= 0 &&
            refreshRemaining != null &&
            refreshRemaining > 0 &&
            session.tokens?.refreshToken) {
            const newTokens = await refreshTokens(session.tokens.refreshToken);
            if (newTokens) {
                const refreshedSession = buildRefreshedSession(session, newTokens);
                try {
                    const encrypted = await encrypt(JSON.stringify(refreshedSession));
                    const opts = await getSessionCookieOptions();
                    res.cookies.set({
                        name: opts.name,
                        value: encrypted,
                        httpOnly: opts.httpOnly,
                        secure: opts.secure,
                        path: opts.path,
                        sameSite: opts.sameSite,
                        maxAge: opts.maxAge,
                    });
                }
                catch {
                    // Si falla la escritura de cookie, el render intentará refrescar en caliente
                }
            }
        }
        // processSession ya no refresca, pero mantenemos la firma por compatibilidad.
        if (refreshed && session) {
            try {
                const encrypted = await encrypt(JSON.stringify(session));
                const opts = await getSessionCookieOptions();
                res.cookies.set({
                    name: opts.name,
                    value: encrypted,
                    httpOnly: opts.httpOnly,
                    secure: opts.secure,
                    path: opts.path,
                    sameSite: opts.sameSite,
                    maxAge: opts.maxAge,
                });
            }
            catch {
                // Ignorar errores al intentar reescribir la cookie en middleware
            }
        }
        return res;
    };
}
// Expone utilidades internas para pruebas/uso avanzado
export const _internal = { isProtected, isStaticAsset, buildMiddlewareConfig };
//# sourceMappingURL=middleware.js.map