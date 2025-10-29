// config.ts
import { buildMiddlewareConfig, createSSOMiddleware } from "./lib/middleware";
import { handlers as ssoHandlers } from "./services/handlers";
import { SSOInitOptions } from "./types";

// Objeto de configuración centralizado (mutable)
const config = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SSO_URL: "https://login.zasdistributor.com/login",
  REDIRECT_URI: "/",
  REGISTER_REDIRECT_URI: "/",
  MAX_COOKIES_AGE: 60 * 60 * 24 * 7,
  COOKIE_SESSION_NAME: "session",
  ENDPOINTS: {
    login: `https://api.zasdistributor.com/api/auth/login`,
    refresh: `https://api.zasdistributor.com/api/auth/refresh`,
    me: `https://api.zasdistributor.com/api/users/me`,
  },
  AUTOMATIC_REDIRECT_ON_REFRESH: true,
};

// Getters (aseguran que siempre se lea el valor actualizado)
export function getConfig() {
  return config;
}
export function getAppUrl() {
  return config.NEXT_PUBLIC_APP_URL;
}
export function getSsoUrl() {
  return config.NEXT_PUBLIC_SSO_URL;
}
export function getRedirectUri() {
  return config.REDIRECT_URI;
}

export function getregisterCallbackUri() {
  return config.REGISTER_REDIRECT_URI;
}
export function getEndpoints() {
  return config.ENDPOINTS;
}

// Inicializador para sobrescribir valores
export function initSSO(options: SSOInitOptions) {
  if (options.appUrl) config.NEXT_PUBLIC_APP_URL = options.appUrl;
  if (options.ssoUrl) config.NEXT_PUBLIC_SSO_URL = options.ssoUrl;
  if (options.redirectUri) config.REDIRECT_URI = options.redirectUri;
  if (options.registerCallbackUri)
    config.REGISTER_REDIRECT_URI = options.registerCallbackUri;
  if (options.cookieName) config.COOKIE_SESSION_NAME = options.cookieName;
  if (typeof options.cookieMaxAgeSeconds === "number") {
    config.MAX_COOKIES_AGE = options.cookieMaxAgeSeconds;
  }
  if (options.endpoints) {
    config.ENDPOINTS = { ...config.ENDPOINTS, ...options.endpoints };
  }
  if (typeof options.automaticRedirectOnRefresh === "boolean") {
    config.AUTOMATIC_REDIRECT_ON_REFRESH = options.automaticRedirectOnRefresh;
  }

  const middleware = createSSOMiddleware(options);
  const mwConfig = buildMiddlewareConfig(options.protectedRoutes);

  return { middleware, config: mwConfig, handlers: ssoHandlers } as const;
}

export const SSO = { init: initSSO };
