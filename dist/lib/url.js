import { redirect as nextRedirect } from "next/navigation";
import { getAppUrl, getSsoUrl } from "../init-config";
import { generateStateBase64Url } from "./crypto";
/**
 * Construye la URL de login SSO incluyendo un "state" aleatorio y el redirect de callback.
 */
export const getLoginUrl = () => {
    const state = generateStateBase64Url();
    const url = new URL(`${getSsoUrl()}`);
    url.searchParams.set("state", state);
    const redirectUri = `${getAppUrl()}/api/sso/callback`;
    url.searchParams.set("redirect_uri", redirectUri);
    return url.toString();
};
/**
 * Redirige al login tanto en entorno server (middleware / server component / route handler)
 * como en cliente (componentes con "use client").
 *
 * En server usa next/navigation.redirect (lanza excepción controlada para cortar render).
 * En cliente usa window.location.assign o replace según la opción.
 */
export function redirectToLogin(opts = {}) {
    const { preservePath = false, replace = false, fromParamName = "from", } = opts;
    let loginUrl = getLoginUrl();
    if (preservePath) {
        // Solo añadimos el path actual si estamos en cliente y tenemos window
        const currentPath = typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : undefined;
        if (currentPath) {
            const urlObj = new URL(loginUrl);
            // Evita sobrescribir si ya existe
            if (!urlObj.searchParams.get(fromParamName)) {
                urlObj.searchParams.set(fromParamName, currentPath);
            }
            loginUrl = urlObj.toString();
        }
    }
    if (typeof window === "undefined") {
        // Entorno server
        return nextRedirect(loginUrl);
    }
    if (replace) {
        window.location.replace(loginUrl);
    }
    else {
        window.location.assign(loginUrl);
    }
}
//# sourceMappingURL=url.js.map