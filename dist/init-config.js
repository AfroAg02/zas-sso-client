"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSO = exports.ENDPOINTS = exports.COOKIE_SESSION_NAME = exports.MAX_COOKIES_AGE = exports.REDIRECT_URI = exports.NEXT_PUBLIC_SSO_URL = exports.NEXT_PUBLIC_APP_URL = void 0;
exports.getRedirectUri = getRedirectUri;
exports.getAppUrl = getAppUrl;
exports.getSsoUrl = getSsoUrl;
exports.getCookieName = getCookieName;
exports.getMaxCookiesAge = getMaxCookiesAge;
exports.getEndpoints = getEndpoints;
exports.initSSO = initSSO;
const middleware_1 = require("./lib/middleware");
const handlers_1 = require("./services/handlers");
exports.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL; // Cambia esto por la URL real de tu app
exports.NEXT_PUBLIC_SSO_URL = "http://localhost:3001/login"; // Cambia esto por la URL real del SSO
exports.REDIRECT_URI = "/"; // Cambia esto por la URL real de tu app
// Auth/session config movido desde lib/config.ts
exports.MAX_COOKIES_AGE = 60 * 60 * 24 * 7; // 7 días (permite override)
exports.COOKIE_SESSION_NAME = "session"; // este sí puede cambiar via initSSO cookieName
exports.ENDPOINTS = {
    login: `https://api.zasdistributor.com/api/auth/login`,
    refresh: `https://api.zasdistributor.com/api/auth/refresh`,
    me: `https://api.zasdistributor.com/api/users/me`,
};
// Getters para asegurar lectura del valor actualizado incluso con ordenes de importación
function getRedirectUri() {
    return exports.REDIRECT_URI;
}
function getAppUrl() {
    return exports.NEXT_PUBLIC_APP_URL;
}
function getSsoUrl() {
    return exports.NEXT_PUBLIC_SSO_URL;
}
function getCookieName() {
    return exports.COOKIE_SESSION_NAME;
}
function getMaxCookiesAge() {
    return exports.MAX_COOKIES_AGE;
}
function getEndpoints() {
    return exports.ENDPOINTS;
}
function initSSO(config) {
    const middleware = (0, middleware_1.createSSOMiddleware)(config);
    if (config.appUrl) {
        exports.NEXT_PUBLIC_APP_URL = config.appUrl;
    }
    if (config.ssoUrl) {
        exports.NEXT_PUBLIC_SSO_URL = config.ssoUrl;
    }
    if (config.redirectUri) {
        exports.REDIRECT_URI = config.redirectUri;
    }
    if (config.cookieName)
        exports.COOKIE_SESSION_NAME = config.cookieName;
    if (typeof config.cookieMaxAgeSeconds === "number" &&
        config.cookieMaxAgeSeconds > 0) {
        exports.MAX_COOKIES_AGE = config.cookieMaxAgeSeconds;
    }
    if (config.endpoints) {
        if (config.endpoints.login)
            exports.ENDPOINTS.login = config.endpoints.login;
        if (config.endpoints.refresh)
            exports.ENDPOINTS.refresh = config.endpoints.refresh;
        if (config.endpoints.me)
            exports.ENDPOINTS.me = config.endpoints.me;
    }
    const mwConfig = (0, middleware_1.buildMiddlewareConfig)(config.protectedRoutes);
    return { middleware, config: mwConfig, handlers: handlers_1.handlers };
}
exports.SSO = { init: initSSO };
//# sourceMappingURL=init-config.js.map