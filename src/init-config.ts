import { buildMiddlewareConfig, createSSOMiddleware } from "./lib/middleware";
import { handlers as ssoHandlers } from "./services/handlers";
import { SSOInitOptions } from "./types";

export let NEXT_PUBLIC_APP_URL: string | undefined =
  process.env.NEXT_PUBLIC_APP_URL; // Cambia esto por la URL real de tu app
export let NEXT_PUBLIC_SSO_URL: string =
  "https://login.zasdistributor.com/login"; // Cambia esto por la URL real del SSO
export let REDIRECT_URI: string = "/"; // Cambia esto por la URL real de tu app

// Auth/session config movido desde lib/config.ts
export let MAX_COOKIES_AGE = 60 * 60 * 24 * 7; // 7 días (permite override)
export let COOKIE_SESSION_NAME = "session"; // este sí puede cambiar via initSSO cookieName
export const ENDPOINTS = {
  login: `https://api.zasdistributor.com/api/auth/login`,
  refresh: `https://api.zasdistributor.com/api/auth/refresh`,
  me: `https://api.zasdistributor.com/api/users/me`,
};

export let AUTOMATIC_REDIRECT_ON_REFRESH = true; // permite override

// Getters para asegurar lectura del valor actualizado incluso con ordenes de importación
export function getRedirectUri() {
  return REDIRECT_URI;
}
export function getAppUrl() {
  return NEXT_PUBLIC_APP_URL;
}
export function getSsoUrl() {
  return NEXT_PUBLIC_SSO_URL;
}
export function getCookieName() {
  return COOKIE_SESSION_NAME;
}
export function getMaxCookiesAge() {
  return MAX_COOKIES_AGE;
}
export function getEndpoints() {
  return ENDPOINTS;
}

export function getAutomaticRedirectOnRefresh() {
  return AUTOMATIC_REDIRECT_ON_REFRESH;
}

export function initSSO(config: SSOInitOptions) {
  const middleware = createSSOMiddleware(config);

  if (config.appUrl) {
    NEXT_PUBLIC_APP_URL = config.appUrl;
  }
  if (config.ssoUrl) {
    NEXT_PUBLIC_SSO_URL = config.ssoUrl;
  }

  if (config.redirectUri) {
    REDIRECT_URI = config.redirectUri;
  }

  if (config.cookieName) COOKIE_SESSION_NAME = config.cookieName;
  if (
    typeof config.cookieMaxAgeSeconds === "number" &&
    config.cookieMaxAgeSeconds > 0
  ) {
    MAX_COOKIES_AGE = config.cookieMaxAgeSeconds;
  }
  if (config.endpoints) {
    if (config.endpoints.login) ENDPOINTS.login = config.endpoints.login;
    if (config.endpoints.refresh) ENDPOINTS.refresh = config.endpoints.refresh;
    if (config.endpoints.me) ENDPOINTS.me = config.endpoints.me;
  }

  if (typeof config.automaticRedirectOnRefresh === "boolean") {
    AUTOMATIC_REDIRECT_ON_REFRESH = config.automaticRedirectOnRefresh;
  }

  const mwConfig = buildMiddlewareConfig(config.protectedRoutes);
  return { middleware, config: mwConfig, handlers: ssoHandlers } as const;
}

export const SSO = { init: initSSO };
