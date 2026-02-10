import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "../init-config";
import { FgCyan, FgMagenta, processSession, Reset } from "../services/session-logic";
import { encrypt } from "./crypto";
import { getSessionCookieOptions } from "./cookies";
import { SSOInitOptions } from "../types";
import { getLoginUrl } from "./url";

/** Determina si un pathname está dentro de alguno de los prefijos protegidos. */
function isProtected(pathname: string, protectedRoutes: string[] | null) {
  if (!protectedRoutes) return true; // sin lista => todo protegido
  return protectedRoutes.some((prefix) => {
    if (!prefix) return false;
    if (prefix === "/") return true;
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}

/** Construye el array de matchers para exportarlo en `config`. */
export function buildMiddlewareConfig(protectedRoutes?: string[]) {
  if (protectedRoutes && protectedRoutes.length) {
    const unique = Array.from(new Set(protectedRoutes));
    const matcher = unique.map((r) => {
      const cleaned = r.endsWith("/") ? r.slice(0, -1) : r; // quitar slash final
      return cleaned === "/" ? "/:path*" : `${cleaned}/:path*`;
    });
    return { matcher } as const;
  }
  // Sin rutas => proteger todo (excepto assets de Next, opcional). Para simplificar todo.
  return { matcher: ["/(.*)"] } as const;
}

/**
 * Crea un middleware de SSO que:
 *  - Verifica si la ruta requiere auth (según prefijos). Si no, deja pasar.
 *  - Si requiere auth y NO hay sesión => redirige a login con callbackUrl.
 *  - Si requiere auth y hay sesión => continúa.
 */
export function createSSOMiddleware(options?: SSOInitOptions) {
  const protectedRoutes = options?.protectedRoutes?.length
    ? options?.protectedRoutes
    : null;

  return async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Si no necesita auth, continuar.
    if (!isProtected(pathname, protectedRoutes)) {
      return NextResponse.next();
    }
    // console.log(FgCyan + "[middleware]  Entrando al middleware..." + Reset);
    // console.log(FgMagenta + "[middleware]  Search Params " + req.nextUrl.searchParams + Reset);
    // console.log(FgCyan + "[middleware]  URL completa " + req.nextUrl);
    // Leer sesión (cifrada) y validar que tenga usuario + tokens
    const cookieName = getConfig().COOKIE_SESSION_NAME;
    const encryptedCookie = req.cookies.get(cookieName)?.value;

    // Procesar: desencriptar, comprobar exp, refrescar si hace falta
    const { session, refreshed } = await processSession(encryptedCookie);

    const hasSession = Boolean(
      session &&
      session.user &&
      session.tokens?.accessToken &&
      session.tokens?.refreshToken,
    );

    if (hasSession) {
      const res = NextResponse.next();
      // IMPORTANTE: Si hubo refresh, inyectar la cookie nueva en la RESPONSE
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
          console.log(
            "[Middleware] 🍪 Cookie refrescada e inyectada en response",
          );
        } catch (e) {
          console.error("[Middleware] Error seteando cookie refrescada", e);
        }
      }
      return res;
    }

    const loginUrl = new URL(getLoginUrl());
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  };
}

// Export util por compatibilidad con el archivo previo (opcional)
export const _internal = { isProtected, buildMiddlewareConfig };
