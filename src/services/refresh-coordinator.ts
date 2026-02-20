// Coordinador para orquestar un único refresh concurrente
// usando el servicio refreshSession que ya persiste la sesión en cookies.

import { refreshSession, getCookiesSession } from "./server-actions";

// Colores ANSI para logs de depuración
const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";

let refreshPromise: Promise<string | null> | null = null;

export async function getValidToken(
  currentRefreshToken: string | undefined,
): Promise<string | null> {
  if (!currentRefreshToken) {
    return null;
  }

  // Si ya hay un refresco en marcha, todos esperan la misma promesa
  if (refreshPromise) {
    return refreshPromise;
  }

  // Si no hay refresco, creamos la promesa única
  refreshPromise = (async () => {
    try {
      const result = await refreshSession(currentRefreshToken);

      if (result.error) {
        console.error(
          FgRed +
            `[refresh-coordinator] ❌ refreshSession devolvió error (status=${result.status})` +
            Reset,
        );
        return null;
      }

      // refreshSession ya guardó la sesión en cookies; leemos el nuevo accessToken
      const session = await getCookiesSession();
      const hasAccess = Boolean(session.tokens?.accessToken);

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
      // Importante: limpiamos la promesa para futuros intentos
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
