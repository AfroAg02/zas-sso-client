// config.ts
import { buildMiddlewareConfig, createSSOMiddleware } from "./lib/middleware";
import { handlers as ssoHandlers } from "./services/handlers";
import { SSOInitOptions } from "./types";

// Normaliza URLs para evitar dobles slashes al concatenar rutas.
function normalizeUrl(url?: string) {
  if (!url) return url;
  if (url === "/") return "/"; // Mantener raíz si se diera el caso
  return url.replace(/\/+$/, ""); // Elimina todos los slashes de cierre
}

// Parse boolean env values safely, handling quotes and common truthy forms
function parseBooleanEnv(val?: string): boolean {
  if (!val) return false;
  const clean = val.trim().replace(/^['"]|['"]$/g, "");
  return /^(true|1|yes|on)$/i.test(clean);
}

const apiBase = normalizeUrl(
  process.env.NEXT_PUBLIC_API_URL || "https://api.zasdistributor.com",
);

const refreshEndpointEnv = process.env.NEXT_PUBLIC_REFRESH_ENDPOINT?.trim();
const debugEnv = parseBooleanEnv(process.env.SSO_DEBUG);

const config = {
  NEXT_PUBLIC_APP_URL: normalizeUrl(process.env.NEXT_PUBLIC_APP_URL),
  NEXT_PUBLIC_SSO_URL: normalizeUrl(
    process.env.NEXT_PUBLIC_SSO_URL ?? "https://login.zasdistributor.com/login",
  ),
  REDIRECT_URI: "/",
  REGISTER_REDIRECT_URI: normalizeUrl(
    process.env.NEXT_PUBLIC_REGISTER_CALLBACK_URL ?? "/",
  ),
  MAX_COOKIES_AGE: 60 * 60 * 24 * 7,
  COOKIE_SESSION_NAME: "session",
  ENDPOINTS: {
    login: `${apiBase}/auth/login`,
    refresh:
      refreshEndpointEnv && refreshEndpointEnv.length > 0
        ? refreshEndpointEnv
        : `${apiBase}/auth/refresh`,
    me: `${apiBase}/users/me`,
  },
  AUTOMATIC_REDIRECT_ON_REFRESH: true,
  DEBUG: debugEnv || false,
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
  if (config.DEBUG) {
    console.log(
      "Register Callback URI: on GET CONFIG",
      config.REGISTER_REDIRECT_URI,
    );
  }
  return config.REGISTER_REDIRECT_URI;
}
export function getEndpoints() {
  return config.ENDPOINTS;
}
export function getDebug() {
  return config.DEBUG;
}

// Inicializador para sobrescribir valores
export function initSSO(options: SSOInitOptions) {
  console.log("Initializing SSO with options:", options);
  if (options.appUrl) config.NEXT_PUBLIC_APP_URL = normalizeUrl(options.appUrl);
  if (options.ssoUrl) config.NEXT_PUBLIC_SSO_URL = normalizeUrl(options.ssoUrl);
  if (options.redirectUri) config.REDIRECT_URI = options.redirectUri;
  if (options.registerCallbackUri)
    config.REGISTER_REDIRECT_URI = normalizeUrl(options.registerCallbackUri);
  if (options.cookieName) config.COOKIE_SESSION_NAME = options.cookieName;
  if (typeof options.cookieMaxAgeSeconds === "number") {
    config.MAX_COOKIES_AGE = options.cookieMaxAgeSeconds;
  }
  if (options.endpoints) {
    // No toca los endpoints existentes, pero evita duplicar slashes si el override incluye base repetida.
    const normalizedOverrides = Object.fromEntries(
      Object.entries(options.endpoints).map(([k, v]) => [
        k,
        typeof v === "string" ? v.replace(/([^:]\/)\/+/g, "$1/") : v,
      ]),
    );
    config.ENDPOINTS = { ...config.ENDPOINTS, ...normalizedOverrides };
  }
  if (typeof options.automaticRedirectOnRefresh === "boolean") {
    config.AUTOMATIC_REDIRECT_ON_REFRESH = options.automaticRedirectOnRefresh;
  }
  if (typeof options.debug === "boolean") {
    config.DEBUG = options.debug;
  }

  const middleware = createSSOMiddleware(options);
  const mwConfig = buildMiddlewareConfig(options.protectedRoutes);

  return { middleware, config: mwConfig, handlers: ssoHandlers } as const;
}

export const SSO = { init: initSSO };
