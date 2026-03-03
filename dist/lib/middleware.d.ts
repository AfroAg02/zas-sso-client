import { NextRequest, NextResponse } from "next/server";
import { SSOInitOptions } from "../types";
/**
 * Determina si un pathname está dentro de alguno de los prefijos protegidos.
 *
 * Además, cualquier ruta que contenga "dashboard" se considera protegida.
 */
declare function isProtected(pathname: string, protectedRoutes: string[] | null): boolean;
/**
 * Determina si el pathname apunta a un asset estático de Next.
 *
 * Se expone por compatibilidad, aunque ya no se usa para refresco.
 */
declare function isStaticAsset(pathname: string): boolean;
/**
 * Construye el array de matchers para exportarlo en `config`.
 *
 * - Si se pasan rutas protegidas, genera matchers del tipo `/ruta/:path*`.
 * - Si no, protege todo excepto assets de Next.
 */
export declare function buildMiddlewareConfig(protectedRoutes?: string[]): {
    readonly matcher: readonly ["/((?!_next/|static/).*)"];
} | {
    readonly matcher: string[];
};
/**
 * Crea un middleware de SSO que:
 *  - Verifica si la ruta requiere auth (según prefijos / heurística).
 *  - Si no requiere auth, deja pasar.
 *  - Si requiere auth y NO hay sesión => redirige a login con callbackUrl.
 *  - No realiza ningún refresco automático de tokens.
 */
export declare function createSSOMiddleware(options?: SSOInitOptions): (req: NextRequest) => Promise<NextResponse<unknown>>;
export declare const _internal: {
    isProtected: typeof isProtected;
    isStaticAsset: typeof isStaticAsset;
    buildMiddlewareConfig: typeof buildMiddlewareConfig;
};
export {};
//# sourceMappingURL=middleware.d.ts.map