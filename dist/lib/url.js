"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoginUrl = void 0;
exports.redirectToLogin = redirectToLogin;
const navigation_1 = require("next/navigation");
const init_config_1 = require("../init-config");
const crypto_1 = require("./crypto");
/**
 * Construye la URL de login SSO incluyendo un "state" aleatorio y el redirect de callback.
 */
const getLoginUrl = () => {
    const state = (0, crypto_1.generateStateBase64Url)();
    const url = new URL(`${(0, init_config_1.getSsoUrl)()}`);
    url.searchParams.set("state", state);
    const redirectUri = `${(0, init_config_1.getAppUrl)()}/api/sso/callback`;
    url.searchParams.set("redirect_uri", redirectUri);
    return url.toString();
};
exports.getLoginUrl = getLoginUrl;
/**
 * Redirige al login tanto en entorno server (middleware / server component / route handler)
 * como en cliente (componentes con "use client").
 *
 * En server usa next/navigation.redirect (lanza excepción controlada para cortar render).
 * En cliente usa window.location.assign o replace según la opción.
 */
function redirectToLogin(opts = {}) {
    const { preservePath = false, replace = false, fromParamName = "from", } = opts;
    let loginUrl = (0, exports.getLoginUrl)();
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
        return (0, navigation_1.redirect)(loginUrl);
    }
    if (replace) {
        window.location.replace(loginUrl);
    }
    else {
        window.location.assign(loginUrl);
    }
}
//# sourceMappingURL=url.js.map