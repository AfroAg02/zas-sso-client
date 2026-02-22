// Coordinador para orquestar un único refresh concurrente por token
// usando el servicio refreshSession que ya persiste la sesión en cookies.

import { refreshSession, getCookiesSession } from "./server-actions";

// Colores ANSI para logs de depuración
const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";

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

  // 1. Si el token ya falló anteriormente, no intentamos de nuevo (blacklist temporal en memoria)
  if (failedTokens.has(currentRefreshToken)) {
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
      const result = await refreshSession(currentRefreshToken);

      if (result.error) {
        console.error(
          FgRed +
            `[refresh-coordinator] ❌ refreshSession devolvió error (status=${result.status})` +
            Reset,
        );
        // Si es un error 400-499 (cliente/auth), marcamos como fallido para no reintentar
        if (result.status && result.status >= 400 && result.status < 500) {
          failedTokens.add(currentRefreshToken);
        }
        return null;
      }

      // refreshSession ya guardó la sesión en cookies; leemos el nuevo accessToken
      const session = await getCookiesSession();

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
