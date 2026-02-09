import { getEndpoints } from "../init-config";
import { decrypt } from "../lib/crypto";
import { getJWTClaims } from "../lib/decode";
import { SessionData, Tokens } from "../types";

// --- Logging Colors ---
const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgCyan = "\x1b[36m";
const FgMagenta = "\x1b[35m";

/**
 * Realiza el refresh contra tu API backend.
 * Devuelve los nuevos tokens o falla.
 */
export const refreshTokens = async (refreshToken: string) => {
  console.log(
    FgYellow + "[refreshTokens] 🔄 Refrescando tokens en backend..." + Reset,
  );
  const { refresh } = getEndpoints();

  try {
    const response = await fetch(refresh, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        FgRed + `[refreshTokens] Falló con status ${response.status}` + Reset,
      );
      return { success: false };
    }
    const tokens: Tokens = await response.json();
    console.log(
      FgGreen + "[refreshTokens] ✅ Tokens refrescados exitosamente." + Reset,
    );
    return { success: true, tokens };
  } catch (error) {
    console.error(FgRed + "[refreshTokens] Error fatal:" + Reset, error);
    return { success: false };
  }
};

/**
 * Procesa la sesión cifrada:
 * 1. Desencripta.
 * 2. Verifica expiración de Access Token.
 * 3. Refresca si es necesario.
 *
 * Retorna el objeto de sesión (actualizado o no),
 * y un flag 'refreshed' para indicar si hubo cambios.
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

    const claims = getJWTClaims(session.tokens.accessToken);
    const now = new Date();
    // Margen de seguridad (ej: 10 segundos antes)
    const expiresAt = claims?.expiresAt ? new Date(claims.expiresAt) : null;

    // Si no hay expiracion, asumimos valido o inválido? Asumimos valido, pero JWT suele tener exp.
    const isExpired = expiresAt ? now.getTime() >= expiresAt.getTime() : false;

    if (isExpired) {
      console.log(
        FgCyan + "[processSession] ⚠️ Token expirado detectado." + Reset,
      );

      const res = await refreshTokens(session.tokens.refreshToken);

      if (res.success && res.tokens) {
        // Actualizamos sesión
        session = {
          ...session,
          tokens: res.tokens,
          shouldClear: false,
        };
        return { session, refreshed: true };
      } else {
        console.log(
          FgRed +
            "[processSession] ❌ Refresh fallido. Sesión invalidada." +
            Reset,
        );
        return {
          session: { ...emptySession, shouldClear: true },
          refreshed: false,
        };
      }
    }

    // Sesión válida sin cambios
    return { session, refreshed: false };
  } catch (error) {
    console.error(
      FgRed + "[processSession] Error procesando sesión:" + Reset,
      error,
    );
    // Si falla desencriptar o parsear, limpiamos cookies
    return {
      session: { ...emptySession, shouldClear: true },
      refreshed: false,
      error,
    };
  }
}
