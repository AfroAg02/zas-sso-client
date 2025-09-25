import { NextRequest } from "next/server";
import { SSOInitOptions } from "../types";
/** Determina si un pathname está dentro de alguno de los prefijos protegidos. */
declare function isProtected(pathname: string, protectedRoutes: string[] | null): boolean;
/** Construye el array de matchers para exportarlo en `config`. */
export declare function buildMiddlewareConfig(protectedRoutes?: string[]): {
    readonly matcher: string[];
} | {
    readonly matcher: readonly ["/(.*)"];
};
/**
 * Crea un middleware de SSO que:
 *  - Verifica si la ruta requiere auth (según prefijos). Si no, deja pasar.
 *  - Si requiere auth y NO hay sesión => redirige a login con callbackUrl.
 *  - Si requiere auth y hay sesión => continúa.
 */
export declare function createSSOMiddleware(options?: SSOInitOptions): (req: NextRequest) => Promise<any>;
export declare const _internal: {
    isProtected: typeof isProtected;
    buildMiddlewareConfig: typeof buildMiddlewareConfig;
};
export {};
//# sourceMappingURL=middleware.d.ts.map