import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { compactDecrypt, base64url, CompactEncrypt } from 'jose';
import { redirect } from 'next/navigation';

// src/lib/middleware.ts
var SALT_LENGTH = 16;
var ITERATIONS = 1e5;
var ENC = "A256GCM";
var ALG = "dir";
function getSecret() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET env var is required");
  return secret;
}
var te = new TextEncoder();
var td = new TextDecoder();
async function deriveKeyRaw(secret, salt) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    256
  );
  return new Uint8Array(bits);
}
function toHex(buf) {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex) {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex length");
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}
var encrypt = async (text) => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyBytes = await deriveKeyRaw(getSecret(), salt);
  const jwe = await new CompactEncrypt(te.encode(text)).setProtectedHeader({ alg: ALG, enc: ENC }).encrypt(keyBytes);
  return `${toHex(salt)}:${jwe}`;
};
var decrypt = async (encryptedText) => {
  if (!encryptedText) throw new Error("Empty encrypted text");
  const firstColon = encryptedText.indexOf(":");
  if (firstColon === -1) {
    return legacyDecrypt(encryptedText);
  }
  const saltHex = encryptedText.slice(0, firstColon);
  const jwe = encryptedText.slice(firstColon + 1);
  const dotCount = (jwe.match(/\./g) || []).length;
  if (dotCount !== 4) {
    return legacyDecrypt(encryptedText);
  }
  try {
    const salt = fromHex(saltHex);
    const keyBytes = await deriveKeyRaw(getSecret(), salt);
    const { plaintext } = await compactDecrypt(jwe, keyBytes);
    return td.decode(plaintext);
  } catch (e) {
    console.error("Decryption failed (jwe path):", e);
    throw new Error("Decryption failed");
  }
};
async function legacyDecrypt(encryptedText) {
  const parts = encryptedText.split(":");
  if (parts.length !== 4) {
    console.error(
      "Invalid encrypted format (legacy). Received:",
      encryptedText
    );
    throw new Error("Invalid encrypted format");
  }
  throw new Error(
    "Legacy encryption format no longer supported in Edge version"
  );
}
function generateStateBase64Url(bytes = 16) {
  const rnd = new Uint8Array(bytes);
  crypto.getRandomValues(rnd);
  return base64url.encode(rnd);
}

// src/lib/cookies.ts
async function setSessionCookies(data) {
  const c = await cookies();
  const encryptedData = await encrypt(JSON.stringify(data));
  const name = getCookieName();
  const age = getMaxCookiesAge();
  c.set(name, encryptedData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: age,
    path: "/"
  });
}
async function readCookies() {
  const c = await cookies();
  return c.get(getCookieName())?.value;
}
async function clearSessionCookies() {
  const c = await cookies();
  c.delete(getCookieName());
}

// src/lib/api.ts
var ApiError = class extends Error {
  constructor(error) {
    super();
    this.title = error.title ?? "";
    this.status = error.status;
    this.detail = error.detail ?? "";
  }
  toString() {
    return `${this.title} - ${this.status} - ${this.detail.toString()}`;
  }
};
var isApiError = (error) => {
  if (error instanceof ApiError) return true;
  return false;
};
var handleApiServerError = async (response) => {
  try {
    const contentType = response.headers.get("content-type");
    if (response.status === 401) {
      return {
        error: true,
        status: response.status,
        message: "No autorizado. Por favor, inicia sesi\xF3n nuevamente."
      };
    }
    if (contentType?.includes("application/json")) {
      const error = await response.json();
      console.error("API Error:", { error, url: response.url });
      return {
        error: true,
        status: response.status,
        message: getErrorMessage(error)
      };
    } else {
      const errorText = await response.text();
      console.error("API Error on text:", { error: errorText, url: response });
      return {
        error: true,
        status: response.status,
        message: errorText || "Ocurri\xF3 un error inesperado"
      };
    }
  } catch (err) {
    console.error("Error parsing response:", err, response.url);
    return {
      error: true,
      status: response.status,
      message: "Unexpected server error"
    };
  }
};
var buildApiResponseAsync = async (response) => {
  try {
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return await Promise.resolve({
        data: null,
        error: false,
        status: response.status
      });
    }
    const data = await response.json();
    return await Promise.resolve({
      data,
      error: false,
      status: response.status
    });
  } catch (e) {
    if (isApiError(e)) {
      return { ...e, title: e.title, error: true };
    }
    return { status: 500, error: true };
  }
};
var getErrorMessage = (error) => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error instanceof ApiError) return error.detail;
  if (isApiError(error)) return error.detail;
  if (Array.isArray(error)) {
    return error.map((e) => e.detail).join(", ");
  }
  return "Ocurri\xF3 un error inesperado...";
};

// src/services/server-actions.ts
var persistUserSessionInCookies = async (session, callbacks) => {
  try {
    const data = {
      tokens: session.tokens,
      user: {
        id: session.user?.id,
        name: session.user?.name,
        emails: session.user?.emails,
        phones: session.user?.phones,
        photoUrl: session.user?.photoUrl
      }
    };
    await setSessionCookies(data);
    callbacks?.onSuccess?.();
  } catch (error) {
    console.error("Error persisting session in cookies:", error);
    throw error;
  }
};
var deleteCookiesSession = async (callbacks) => {
  try {
    await clearSessionCookies();
    callbacks?.onSuccess?.();
  } catch (error) {
    callbacks?.onError?.(error);
    throw error;
  }
};
var authenticateWithTokens = async (credentials, callbacks) => {
  try {
    const userResponse = await fetchUser(credentials.accessToken);
    if (!userResponse.data) return userResponse;
    await persistUserSessionInCookies({
      user: userResponse.data,
      tokens: credentials
    });
    callbacks?.onSuccess?.();
    console.log("User authenticated successfully:", userResponse);
    return {
      data: userResponse.data,
      status: userResponse.status,
      error: false
    };
  } catch (error) {
    console.error("Error authenticating with credentials:", error);
    callbacks?.onError?.(error);
    return { data: null, status: 500, error: true };
  }
};
var fetchUser = async (accessToken, endpoint) => {
  const { me } = getEndpoints();
  const url = me;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) return handleApiServerError(response);
  return buildApiResponseAsync(response);
};
var getCookiesSession = async () => {
  const encryptedSession = await readCookies();
  if (!encryptedSession) {
    return { user: null, tokens: null, shouldClear: false };
  }
  try {
    const decryptedData = await decrypt(encryptedSession);
    const sessionData = JSON.parse(decryptedData);
    if (!sessionData || !sessionData.tokens) {
      return { user: null, tokens: null, shouldClear: true };
    }
    return JSON.parse(decryptedData);
  } catch {
    return { user: null, tokens: null, shouldClear: true };
  }
};
var getLoginUrl = () => {
  const state = generateStateBase64Url();
  const url = new URL(`${getSsoUrl()}`);
  url.searchParams.set("state", state);
  const redirectUri = `${getAppUrl()}/api/sso/callback`;
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
};
function redirectToLogin(opts = {}) {
  const {
    preservePath = false,
    replace = false,
    fromParamName = "from"
  } = opts;
  let loginUrl = getLoginUrl();
  if (preservePath) {
    const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : void 0;
    if (currentPath) {
      const urlObj = new URL(loginUrl);
      if (!urlObj.searchParams.get(fromParamName)) {
        urlObj.searchParams.set(fromParamName, currentPath);
      }
      loginUrl = urlObj.toString();
    }
  }
  if (typeof window === "undefined") {
    return redirect(loginUrl);
  }
  if (replace) {
    window.location.replace(loginUrl);
  } else {
    window.location.assign(loginUrl);
  }
}

// src/lib/middleware.ts
function isProtected(pathname, protectedRoutes) {
  if (!protectedRoutes) return true;
  return protectedRoutes.some((prefix) => {
    if (!prefix) return false;
    if (prefix === "/") return true;
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}
function buildMiddlewareConfig(protectedRoutes) {
  if (protectedRoutes && protectedRoutes.length) {
    const unique = Array.from(new Set(protectedRoutes));
    const matcher = unique.map((r) => {
      const cleaned = r.endsWith("/") ? r.slice(0, -1) : r;
      return cleaned === "/" ? "/:path*" : `${cleaned}/:path*`;
    });
    return { matcher };
  }
  return { matcher: ["/(.*)"] };
}
function createSSOMiddleware(options) {
  const protectedRoutes = options?.protectedRoutes?.length ? options?.protectedRoutes : null;
  return async function middleware(req) {
    const { pathname } = req.nextUrl;
    if (!isProtected(pathname, protectedRoutes)) {
      return NextResponse.next();
    }
    let hasSession = false;
    try {
      const session = await getCookiesSession();
      hasSession = Boolean(
        session && session.user && session.tokens?.accessToken && session.tokens?.refreshToken
      );
    } catch {
      hasSession = false;
    }
    if (hasSession) return NextResponse.next();
    const loginUrl = new URL(getLoginUrl());
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  };
}

// src/lib/parse-redirect-url.ts
function parseRedirectUrl(redirectTo, baseOrigin) {
  let target;
  try {
    if (/^https?:\/\//i.test(redirectTo)) {
      const rUrl = new URL(redirectTo);
      target = rUrl.origin === baseOrigin ? rUrl.toString() : baseOrigin + "/";
    } else {
      target = new URL(
        redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`,
        baseOrigin
      ).toString();
    }
  } catch {
    target = baseOrigin + "/";
  }
  return target;
}

// src/services/handlers.ts
function jsonError(message, status, origin, extra) {
  const res = NextResponse.json(
    { ok: false, error: message, ...extra },
    { status }
  );
  return res;
}
async function GET(request) {
  request.headers.get("origin");
  const url = new URL(request.url);
  console.log("[  ]SSO Callback URL:", url.toString());
  const accessToken = url.searchParams.get("accessToken");
  const refreshToken = url.searchParams.get("refreshToken");
  if (!accessToken) return jsonError("Missing accessToken", 400);
  if (!refreshToken) return jsonError("Missing refreshToken", 400);
  const result = await authenticateWithTokens(
    { accessToken, refreshToken },
    { onError: (e) => console.error("[callback] authenticate error", e) }
  );
  if (result.error || !result.data) {
    return jsonError(
      "Invalid credentials or user fetch failed",
      result.status || 401);
  }
  const redirectUri = getRedirectUri();
  console.log("Authentication successful:", redirectUri);
  const safeUrl = new URL(parseRedirectUrl(redirectUri, url.origin));
  safeUrl.searchParams.delete("accessToken");
  safeUrl.searchParams.delete("refreshToken");
  safeUrl.searchParams.delete("state");
  const safeRedirect = safeUrl.toString();
  const res = NextResponse.redirect(safeRedirect, { status: 302 });
  return res;
}
var handlers = { GET };

// src/init-config.ts
var NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
var NEXT_PUBLIC_SSO_URL = "http://localhost:3001/login";
var REDIRECT_URI = "/";
var MAX_COOKIES_AGE = 60 * 60 * 24 * 7;
var COOKIE_SESSION_NAME = "session";
var ENDPOINTS = {
  login: `https://api.zasdistributor.com/api/auth/login`,
  refresh: `https://api.zasdistributor.com/api/auth/refresh`,
  me: `https://api.zasdistributor.com/api/users/me`
};
function getRedirectUri() {
  return REDIRECT_URI;
}
function getAppUrl() {
  return NEXT_PUBLIC_APP_URL;
}
function getSsoUrl() {
  return NEXT_PUBLIC_SSO_URL;
}
function getCookieName() {
  return COOKIE_SESSION_NAME;
}
function getMaxCookiesAge() {
  return MAX_COOKIES_AGE;
}
function getEndpoints() {
  return ENDPOINTS;
}
function initSSO(config) {
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
  if (typeof config.cookieMaxAgeSeconds === "number" && config.cookieMaxAgeSeconds > 0) {
    MAX_COOKIES_AGE = config.cookieMaxAgeSeconds;
  }
  if (config.endpoints) {
    if (config.endpoints.login) ENDPOINTS.login = config.endpoints.login;
    if (config.endpoints.refresh) ENDPOINTS.refresh = config.endpoints.refresh;
    if (config.endpoints.me) ENDPOINTS.me = config.endpoints.me;
  }
  const mwConfig = buildMiddlewareConfig(config.protectedRoutes);
  return { middleware, config: mwConfig, handlers };
}
var SSO = { init: initSSO };

// src/lib/decode.ts
function getJWTClaims(jwtToken) {
  if (!jwtToken) return null;
  try {
    const payloadBase64 = jwtToken.split(".")[1];
    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    const claims = JSON.parse(jsonPayload);
    const issuedAt = claims.iat ? new Date(claims.iat * 1e3) : null;
    const expiresAt = claims.exp ? new Date(claims.exp * 1e3) : null;
    return {
      iat: claims.iat,
      exp: claims.exp,
      issuedAt,
      expiresAt
    };
  } catch (e) {
    console.error("Token inv\xE1lido", e);
    return null;
  }
}

// src/permissions-control/lib.ts
var ENDPOINTS2 = {
  permissions: `https://api.zasdistributor.com/api/me/permissions`,
  check: (code) => `https://api.zasdistributor.com/api/me/permissions/${encodeURIComponent(code)}/check`
};

// src/permissions-control/server.ts
function authHeaders(token) {
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}
async function fetchMyPermissions() {
  const session = await getCookiesSession();
  if (!session?.tokens?.accessToken) throw new Error("No session");
  const res = await fetch(ENDPOINTS2.permissions, {
    method: "GET",
    headers: { ...authHeaders(session.tokens.accessToken) },
    cache: "no-store"
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error(`Failed to load permissions (${res.status})`);
  }
  return res.json();
}
async function checkPermission(code) {
  const session = await getCookiesSession();
  if (!session?.tokens?.accessToken) throw new Error("No session");
  const res = await fetch(ENDPOINTS2.check(code), {
    method: "GET",
    headers: { ...authHeaders(session.tokens.accessToken) },
    cache: "no-store"
  });
  if (res.status === 200) return true;
  if (res.status === 403) return false;
  if (res.status === 401) throw new Error("Unauthorized");
  if (res.status === 400) {
    const body = await res.json();
    throw new Error(body?.detail || "Invalid request");
  }
  throw new Error(`Unexpected status ${res.status}`);
}

export { SSO, checkPermission, fetchMyPermissions, getCookiesSession, getJWTClaims, getLoginUrl, getRedirectUri, initSSO, redirectToLogin, deleteCookiesSession as serverSignOut };
//# sourceMappingURL=edge.mjs.map
//# sourceMappingURL=edge.mjs.map