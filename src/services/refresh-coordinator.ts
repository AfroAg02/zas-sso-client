// Coordinador para orquestar un único refresh concurrente por token
// usando el servicio refreshSession que ya persiste la sesión en cookies.

import { refreshSession, getCookiesSession } from "./server-actions";

// Colores ANSI para logs de depuración
const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";

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

// Mantenemos un mapa de promesas activas por token para evitar condiciones de carrera entre usuarios
// y evitar múltiples peticiones concurrentes para el mismo token.
const activeRefreshes = new Map<string, Promise<string | null>>();

// Mantenemos un set de tokens fallidos para evitar reintentos infinitos si el token ya no es válido
const failedTokens = new Set<string>();

export async function getValidToken(
  currentRefreshToken: string | undefined,
): Promise<string | null> {
  if (!currentRefreshToken) {
    return null;
  }
  // DEBUG: show incoming refresh token summary
  try {
    const payload = parseJwtPayload(currentRefreshToken ?? null);
    console.log(
      `${FgGreen}[refresh-coordinator] getValidToken called for refreshToken=${maskToken(
        currentRefreshToken,
      )} payload=${
        payload
          ? JSON.stringify({
              sub: payload.sub,
              exp: payload.exp,
              iat: payload.iat,
            })
          : "n/a"
      }${Reset}`,
    );
    if (payload?.exp) {
      try {
        console.log(
          `${FgGreen}[refresh-coordinator] refreshToken exp: ${new Date(
            payload.exp * 1000,
          ).toISOString()} (${payload.exp})${Reset}`,
        );
      } catch {}
    }
  } catch (err) {
    console.warn(
      `${FgRed}[refresh-coordinator] Error decoding refresh token: ${err}${Reset}`,
    );
  }

  // 1. Si el token ya falló anteriormente, no intentamos de nuevo (blacklist temporal en memoria)
  if (failedTokens.has(currentRefreshToken)) {
    console.warn(
      `${FgRed}[refresh-coordinator] refreshToken is blacklisted (failed before): ${maskToken(
        currentRefreshToken,
      )}${Reset}`,
    );
    return null;
  }

  // 2. Si ya hay un refresco en marcha para ESTE token, devolvemos la promesa existente
  const existingPromise = activeRefreshes.get(currentRefreshToken);
  if (existingPromise) {
    return existingPromise;
  }

  // 3. Creamos la promesa única para este token
  const refreshPromise = (async () => {
    try {
      console.log(
        `${FgGreen}[refresh-coordinator] Starting refreshSession for ${maskToken(
          currentRefreshToken,
        )}${Reset}`,
      );
      const result = await refreshSession(currentRefreshToken);

      console.log(
        `${FgGreen}[refresh-coordinator] refreshSession result status=${result?.status} error=${
          result?.error ? "yes" : "no"
        }${Reset}`,
      );

      if (result?.error && result?.data) {
        console.warn(
          `${FgRed}[refresh-coordinator] refreshSession detail: ${JSON.stringify(result.data)}${Reset}`,
        );
      }

      if (result.error) {
        console.error(
          FgRed +
            `[refresh-coordinator] ❌ refreshSession devolvió error (status=${result.status})` +
            Reset,
        );
        // Si es un error 400-499 (cliente/auth), marcamos como fallido para no reintentar
        if (result.status && result.status >= 400 && result.status < 500) {
          failedTokens.add(currentRefreshToken);
          console.warn(
            `${FgRed}[refresh-coordinator] Marking refresh token as failed (no-retry): ${maskToken(currentRefreshToken)}${Reset}`,
          );
        }
        return null;
      }

      // refreshSession ya guardó la sesión en cookies; leemos el nuevo accessToken
      const session = await getCookiesSession();

      // DEBUG: log session tokens masked and parsed
      try {
        console.log(
          `${FgGreen}[refresh-coordinator] getCookiesSession returned session present=${session ? "yes" : "no"}${Reset}`,
        );
        if (session?.tokens) {
          console.log(
            `${FgGreen}[refresh-coordinator] new accessToken=${maskToken(session.tokens.accessToken)} refreshToken=${maskToken(session.tokens.refreshToken)}${Reset}`,
          );
          const accessPayload = parseJwtPayload(
            session.tokens.accessToken ?? null,
          );
          if (accessPayload?.exp) {
            console.log(
              `${FgGreen}[refresh-coordinator] accessToken exp: ${new Date(accessPayload.exp * 1000).toISOString()} (${accessPayload.exp})${Reset}`,
            );
          }
          if (accessPayload?.iat) {
            console.log(
              `${FgGreen}[refresh-coordinator] accessToken iat: ${new Date(accessPayload.iat * 1000).toISOString()} (${accessPayload.iat})${Reset}`,
            );
          }
        }
      } catch (err) {
        console.warn(
          `${FgRed}[refresh-coordinator] Error logging session tokens: ${err}${Reset}`,
        );
      }

      // Si todo fue bien, nos aseguramos de que no esté en fallidos (por si acaso)
      failedTokens.delete(currentRefreshToken);

      console.log(
        FgGreen +
          "[refresh-coordinator] ✅ Token refrescado correctamente" +
          Reset,
      );

      return session.tokens?.accessToken ?? null;
    } catch (error) {
      console.error(
        FgRed +
          "[refresh-coordinator] ❌ Error inesperado durante el refresh" +
          Reset,
        error,
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
