// Coordinador para orquestar un único refresh concurrente por token
// usando el servicio refreshSession que ya persiste la sesión en cookies.

import { refreshSession } from "./server-actions";

// Colores ANSI para logs de depuración
const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgCyan = "\x1b[36m";
const FgGray = "\x1b[90m";

const TAG = "[refresh-coordinator]";

// Helpers for logging and token inspection
const maskToken = (t?: string | null) => {
  if (!t) return "none";
  try {
    if (t.length <= 10) return "****";
    return `${t.slice(0, 6)}...${t.slice(-4)}`;
  } catch {
    return "****";
  }
};

const parseJwtPayload = (token?: string | null) => {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const buff = Buffer.from(normalized, "base64");
    const json = buff.toString("utf8");
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
};

/** Calcula segundos restantes de un JWT */
function tokenRemainingSeconds(token?: string | null): number | null {
  const p = parseJwtPayload(token);
  if (!p?.exp) return null;
  return Math.max(0, Math.floor((p.exp * 1000 - Date.now()) / 1000));
}

/** Formatea segundos a "Xm Ys" o "expired" */
function fmtRemaining(secs: number | null): string {
  if (secs === null) return "n/a";
  if (secs <= 0) return "⚠️ EXPIRED (0s)";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Mantenemos un mapa de promesas activas por token para evitar condiciones de carrera entre usuarios
// y evitar múltiples peticiones concurrentes para el mismo token.
const activeRefreshes = new Map<string, Promise<string | null>>();

// Mantenemos un set de tokens fallidos para evitar reintentos infinitos si el token ya no es válido
// Cada entrada guarda: { addedAt, reason, status, endpoint }
const failedTokens = new Map<
  string,
  { addedAt: string; reason: string; status?: number; endpoint?: string }
>();

// Cache de refreshes exitosos: oldRefreshToken → { newAccessToken, cachedAt }
// Esto evita que un nuevo render con la cookie vieja intente refrescar un token ya rotado.
const recentlyRefreshed = new Map<
  string,
  { newAccessToken: string; cachedAt: number }
>();

// Tiempo máximo que un resultado cacheado es válido (5 minutos)
const REFRESH_CACHE_TTL_MS = 5 * 60 * 1000;

/** Limpia entradas expiradas del cache de refreshes exitosos */
function cleanRefreshCache() {
  const now = Date.now();
  recentlyRefreshed.forEach((entry, key) => {
    if (now - entry.cachedAt > REFRESH_CACHE_TTL_MS) {
      recentlyRefreshed.delete(key);
    }
  });
}

/** Diagnóstico: imprime el estado actual de la blacklist */
function logBlacklistState() {
  if (failedTokens.size === 0) {
    console.log(`${FgGray}${TAG} 📋 Blacklist: empty${Reset}`);
    return;
  }
  console.log(
    `${FgYellow}${TAG} 📋 Blacklist state (${failedTokens.size} entries):${Reset}`,
  );
  failedTokens.forEach((info, token) => {
    console.log(
      `${FgYellow}${TAG}   └─ token=${maskToken(token)} addedAt=${info.addedAt} reason="${info.reason}" status=${info.status ?? "n/a"} endpoint=${info.endpoint ?? "n/a"}${Reset}`,
    );
  });
}

export async function getValidToken(
  currentRefreshToken: string | undefined,
): Promise<string | null> {
  const now = new Date().toISOString();
  console.log(
    `${FgCyan}${TAG} ════════════════════════════════════════${Reset}`,
  );
  console.log(`${FgCyan}${TAG} getValidToken() called at ${now}${Reset}`);

  if (!currentRefreshToken) {
    console.warn(
      `${FgRed}${TAG} ❌ No refresh token provided — cannot refresh${Reset}`,
    );
    return null;
  }

  // Token info
  const payload = parseJwtPayload(currentRefreshToken);
  const refreshRemaining = tokenRemainingSeconds(currentRefreshToken);
  console.log(
    `${FgGreen}${TAG} refreshToken=${maskToken(currentRefreshToken)}${Reset}`,
  );
  console.log(
    `${FgGreen}${TAG} refreshToken payload: sub=${payload?.sub ?? "n/a"} iat=${payload?.iat ?? "n/a"} exp=${payload?.exp ?? "n/a"}${Reset}`,
  );
  if (payload?.exp) {
    console.log(
      `${FgGreen}${TAG} refreshToken expires: ${new Date(payload.exp * 1000).toISOString()} — remaining: ${FgYellow}${fmtRemaining(refreshRemaining)}${Reset}`,
    );
  }

  // Estado de blacklist
  logBlacklistState();

  // 1. Si el token ya falló anteriormente, no intentamos de nuevo (blacklist temporal en memoria)
  const blacklistEntry = failedTokens.get(currentRefreshToken);
  if (blacklistEntry) {
    console.warn(
      `${FgRed}${TAG} 🚫 BLACKLISTED — token=${maskToken(currentRefreshToken)}${Reset}`,
    );
    console.warn(
      `${FgRed}${TAG}   └─ Blacklisted at: ${blacklistEntry.addedAt}${Reset}`,
    );
    console.warn(
      `${FgRed}${TAG}   └─ Reason: ${blacklistEntry.reason}${Reset}`,
    );
    console.warn(
      `${FgRed}${TAG}   └─ Original status: ${blacklistEntry.status ?? "n/a"}${Reset}`,
    );
    console.warn(
      `${FgRed}${TAG}   └─ Endpoint used: ${blacklistEntry.endpoint ?? "n/a"}${Reset}`,
    );
    console.log(
      `${FgCyan}${TAG} ════════════════════════════════════════${Reset}`,
    );
    return null;
  }

  // 1.5 Cache de refreshes exitosos: si ya refrescamos este token recientemente, devolver el resultado cacheado
  cleanRefreshCache();
  const cachedResult = recentlyRefreshed.get(currentRefreshToken);
  if (cachedResult) {
    const cacheAgeMs = Date.now() - cachedResult.cachedAt;
    const cachedRemaining = tokenRemainingSeconds(cachedResult.newAccessToken);
    console.log(
      `${FgGreen}${TAG} 💾 CACHE HIT — this refresh token was already refreshed ${Math.round(cacheAgeMs / 1000)}s ago${Reset}`,
    );
    console.log(
      `${FgGreen}${TAG}   └─ Cached accessToken: ${maskToken(cachedResult.newAccessToken)} remaining=${FgYellow}${fmtRemaining(cachedRemaining)}${Reset}`,
    );
    if (cachedRemaining !== null && cachedRemaining > 0) {
      console.log(
        `${FgGreen}${TAG}   └─ Returning cached token (still valid)${Reset}`,
      );
      console.log(
        `${FgCyan}${TAG} ════════════════════════════════════════${Reset}`,
      );
      return cachedResult.newAccessToken;
    } else {
      console.log(
        `${FgYellow}${TAG}   └─ Cached token expired — removing from cache, will re-refresh${Reset}`,
      );
      recentlyRefreshed.delete(currentRefreshToken);
    }
  }

  // 2. Si ya hay un refresco en marcha para ESTE token, devolvemos la promesa existente
  const existingPromise = activeRefreshes.get(currentRefreshToken);
  if (existingPromise) {
    console.log(
      `${FgYellow}${TAG} ⏳ Refresh already in-flight for this token — awaiting existing promise${Reset}`,
    );
    return existingPromise;
  }

  // 3. Creamos la promesa única para este token
  console.log(
    `${FgGreen}${TAG} 🚀 No active refresh — starting new refreshSession()${Reset}`,
  );

  const refreshPromise = (async () => {
    const startTime = Date.now();
    try {
      console.log(
        `${FgGreen}${TAG} Starting refreshSession for ${maskToken(currentRefreshToken)}${Reset}`,
      );
      const result = await refreshSession(currentRefreshToken);
      const elapsed = Date.now() - startTime;

      console.log(
        `${FgGreen}${TAG} refreshSession completed in ${elapsed}ms — status=${result?.status} error=${
          result?.error ? "yes" : "no"
        }${Reset}`,
      );

      if (result?.error && result?.data) {
        console.warn(
          `${FgRed}${TAG} refreshSession error detail: ${JSON.stringify(result.data)}${Reset}`,
        );
      }

      if (result.error) {
        const reason =
          result.status === 500
            ? `Server/network error (status=${result.status})`
            : `Client/auth error (status=${result.status})`;

        console.error(
          `${FgRed}${TAG} ❌ refreshSession devolvió error — status=${result.status} elapsed=${elapsed}ms${Reset}`,
        );

        // Si es un error 400-499 (cliente/auth), marcamos como fallido para no reintentar
        if (result.status && result.status >= 400 && result.status < 500) {
          failedTokens.set(currentRefreshToken, {
            addedAt: new Date().toISOString(),
            reason,
            status: result.status,
            endpoint: "(from refreshSession)",
          });
          console.warn(
            `${FgRed}${TAG} 🚫 ADDED TO BLACKLIST: token=${maskToken(currentRefreshToken)}${Reset}`,
          );
          console.warn(`${FgRed}${TAG}   └─ Reason: ${reason}${Reset}`);
          console.warn(`${FgRed}${TAG}   └─ Status: ${result.status}${Reset}`);
          logBlacklistState();
        } else {
          console.warn(
            `${FgYellow}${TAG} ⚠️ NOT blacklisting (status=${result.status} is not 4xx) — will retry on next request${Reset}`,
          );
        }
        return null;
      }

      // Usamos los tokens devueltos directamente por refreshSession
      const newAccessToken = result.tokens?.accessToken ?? null;

      // DEBUG: log new tokens masked and parsed
      console.log(
        `${FgGreen}${TAG} ✅ refreshSession returned tokens present=${result.tokens ? "yes" : "no"}${Reset}`,
      );
      if (result.tokens) {
        const newAccessRemaining = tokenRemainingSeconds(
          result.tokens.accessToken,
        );
        const newRefreshRemaining = tokenRemainingSeconds(
          result.tokens.refreshToken,
        );
        console.log(
          `${FgGreen}${TAG}   └─ new accessToken=${maskToken(result.tokens.accessToken)} remaining=${FgYellow}${fmtRemaining(newAccessRemaining)}${Reset}`,
        );
        console.log(
          `${FgGreen}${TAG}   └─ new refreshToken=${maskToken(result.tokens.refreshToken)} remaining=${FgYellow}${fmtRemaining(newRefreshRemaining)}${Reset}`,
        );
        const accessPayload = parseJwtPayload(result.tokens.accessToken);
        if (accessPayload) {
          console.log(
            `${FgGreen}${TAG}   └─ accessToken iat=${accessPayload.iat ? new Date(accessPayload.iat * 1000).toISOString() : "n/a"} exp=${accessPayload.exp ? new Date(accessPayload.exp * 1000).toISOString() : "n/a"}${Reset}`,
          );
        }
      }

      // Si todo fue bien, nos aseguramos de que no esté en fallidos (por si acaso)
      if (failedTokens.has(currentRefreshToken)) {
        failedTokens.delete(currentRefreshToken);
        console.log(
          `${FgGreen}${TAG} 🗑️ Removed token from blacklist after successful refresh${Reset}`,
        );
      }

      // Guardar en cache para que renders posteriores con la cookie vieja no re-intenten
      if (newAccessToken) {
        recentlyRefreshed.set(currentRefreshToken, {
          newAccessToken,
          cachedAt: Date.now(),
        });
        console.log(
          `${FgGreen}${TAG} 💾 CACHED: old refreshToken=${maskToken(currentRefreshToken)} → new accessToken=${maskToken(newAccessToken)} (TTL=${REFRESH_CACHE_TTL_MS / 1000}s)${Reset}`,
        );
      }

      console.log(
        `${FgGreen}${TAG} ✅ Token refrescado correctamente en ${elapsed}ms${Reset}`,
      );

      console.log(
        `${FgCyan}${TAG} ════════════════════════════════════════${Reset}`,
      );
      return newAccessToken;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(
        `${FgRed}${TAG} ❌ EXCEPTION during refresh (${elapsed}ms): ${error instanceof Error ? error.message : String(error)}${Reset}`,
      );
      if (error instanceof Error && error.stack) {
        console.error(`${FgGray}${TAG} Stack: ${error.stack}${Reset}`);
      }
      if (error && typeof error === "object" && "cause" in error) {
        console.error(
          `${FgRed}${TAG} Cause: ${String((error as any).cause)}${Reset}`,
        );
      }
      console.log(
        `${FgCyan}${TAG} ════════════════════════════════════════${Reset}`,
      );
      return null;
    } finally {
      // Importante: limpiamos la promesa para este token al terminar
      activeRefreshes.delete(currentRefreshToken);
    }
  })();

  // Guardamos la promesa en el mapa
  activeRefreshes.set(currentRefreshToken, refreshPromise);

  return refreshPromise;
}
