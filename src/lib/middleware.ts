import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "../init-config";
import { processSession } from "../services/session-logic";
import { SSOInitOptions } from "../types";
import { getSessionCookieOptions } from "./cookies";
import { encrypt } from "./crypto";
import { getLoginUrl } from "./url";

/**
 * Determina si un pathname está dentro de alguno de los prefijos protegidos.
 *
 * Además, cualquier ruta que contenga "dashboard" se considera protegida.
 */
function isProtected(pathname: string, protectedRoutes: string[] | null) {
  if (pathname.includes("dashboard")) return true;

  const routes =
    protectedRoutes && protectedRoutes.length
      ? protectedRoutes
      : ["/dashboard"]; // valor por defecto

  return routes.some((prefix) => {
    if (!prefix) return false;
    if (prefix === "/") return true;
    if (pathname === prefix) return true;
    return pathname.startsWith(prefix + "/");
  });
}

/**
 * Determina si el pathname apunta a un asset estático de Next.
 *
 * Se expone por compatibilidad, aunque ya no se usa para refresco.
 */
function isStaticAsset(pathname: string) {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/static/")) return true;
  return false;
}

/**
 * Construye el array de matchers para exportarlo en `config`.
 *
 * - Si se pasan rutas protegidas, genera matchers del tipo `/ruta/:path*`.
 * - Si no, protege todo excepto assets de Next.
 */
export function buildMiddlewareConfig(protectedRoutes?: string[]) {
  if (!protectedRoutes || !protectedRoutes.length) {
    // Proteger todo excepto rutas internas de Next y estáticos
    return { matcher: ["/((?!_next/|static/).*)"] } as const;
  }

  const unique = Array.from(new Set(protectedRoutes));

  const matcher = unique.map((route) => {
    if (!route || route === "/") return "/((?!_next/|static/).*)";
    // Asegurarse de que empieza con "/"
    const normalized = route.startsWith("/") ? route : `/${route}`;
    return `${normalized}/:path*`;
  });

  return { matcher } as const;
}

/**
 * Crea un middleware de SSO que:
 *  - Verifica si la ruta requiere auth (según prefijos / heurística).
 *  - Si no requiere auth, deja pasar.
 *  - Si requiere auth y NO hay sesión => redirige a login con callbackUrl.
 *  - No realiza ningún refresco automático de tokens.
 */
export function createSSOMiddleware(options?: SSOInitOptions) {
  const protectedRoutes = options?.protectedRoutes?.length
    ? options.protectedRoutes
    : null;

  return async function middleware(req: NextRequest) {
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
      } catch {
        // Ignorar errores al intentar reescribir la cookie en middleware
      }
    }

    return res;
  };
}

// Expone utilidades internas para pruebas/uso avanzado
export const _internal = { isProtected, isStaticAsset, buildMiddlewareConfig };
