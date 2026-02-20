import { decrypt } from "../lib/crypto";
import { getJWTClaims } from "../lib/decode";
import { SessionData } from "../types";

// Colores locales para logging de expiración
const Reset = "\x1b[0m";
const FgOrange = "\x1b[38;5;208m"; // Naranja aproximado

/**
 * Procesa la sesión cifrada:
 * 1. Desencripta.
 * 2. Valida que existan tokens mínimos.
 *
 * Retorna el objeto de sesión (sin refrescar tokens),
 * y un flag 'refreshed' siempre en false.
 */
export async function processSession(
  encryptedSession: string | undefined,
): Promise<{
  session: SessionData;
  refreshed: boolean;
  error?: any;
}> {
  const emptySession: SessionData = {
    user: null,
    tokens: null,
    shouldClear: false,
  };

  if (!encryptedSession) {
    return { session: emptySession, refreshed: false };
  }

  try {
    const decryptedData = await decrypt(encryptedSession);
    let session = JSON.parse(decryptedData) as SessionData;

    if (!session?.tokens?.accessToken) {
      return {
        session: { ...emptySession, shouldClear: true },
        refreshed: false,
      };
    }

    // Log del tiempo restante de vigencia del accessToken
    try {
      const claims = getJWTClaims(session.tokens.accessToken);
      if (claims?.expiresAt) {
        const now = new Date();
        const diffMs = claims.expiresAt.getTime() - now.getTime();
        // Minutos restantes reales (puede ser negativo si ya expiró)
        const minutesLeft = diffMs / 60000;

        const minutesLeftRounded = Math.round(minutesLeft * 100) / 100; // 2 decimales
        const expiresAtIso = claims.expiresAt.toISOString();
        // En producción no logueamos este dato para evitar ruido; si se necesita,
        // puede reactivarse temporalmente durante debugging.
      }
    } catch {
      // Si falla el decode, simplemente no logueamos el tiempo restante
    }

    return { session: { ...session, shouldClear: false }, refreshed: false };
  } catch (error) {
    return {
      session: { ...emptySession, shouldClear: true },
      refreshed: false,
      error,
    };
  }
}
