"use server";

import { ApiResponse } from "../types/fetch/api";
import { getEndpoints } from "../init-config";
import {
  clearSessionCookies,
  readCookies,
  setSessionCookies,
} from "../lib/cookies";
import { decrypt } from "../lib/crypto";
import { SessionData, Tokens, User } from "../types";
import { buildApiResponseAsync, handleApiServerError } from "../lib/api";
import { getJWTClaims } from "@/edge";

// Tipos

//# Almacenar sesión en cookies
export const persistUserSessionInCookies = async (
  session: SessionData,
  callbacks?: { onSuccess?: () => void; onError?: (error: unknown) => void },
) => {
  try {
    const data: SessionData = {
      tokens: session.tokens as Tokens,
      user: null,
    };

    await setSessionCookies(data);

    callbacks?.onSuccess?.();
  } catch (error) {
    console.error("Error persisting session in cookies:", error);
    callbacks?.onError?.(error);
    throw error;
  }
};

//# Eliminar sesión de las cookies
export const deleteCookiesSession = async (callbacks?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  try {
    await clearSessionCookies();

    callbacks?.onSuccess?.();
  } catch (error) {
    callbacks?.onError?.(error);
    throw error;
  }
};

// Autenticar con credenciales
export const authenticateWithTokens = async (
  credentials: Tokens,
  callbacks?: { onSuccess?: () => void; onError?: (error: unknown) => void },
): Promise<ApiResponse<User | null>> => {
  try {
    const userResponse = await fetchUser(credentials.accessToken);
    if (!userResponse.data) return userResponse;

    await persistUserSessionInCookies({
      user: userResponse.data,
      tokens: credentials,
    });
    callbacks?.onSuccess?.();
    return {
      data: userResponse.data,
      status: userResponse.status,
      error: false,
    };
  } catch (error) {
    console.error("Error authenticating with credentials:", error);
    callbacks?.onError?.(error);
    return { data: null, status: 500, error: true };
  }
};

// Refrescar token
export const refreshTokens = async (
  refreshToken?: string,
): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    console.log(
      FgYellow + "[refreshTokens] Iniciando refresh de tokens" + Reset,
    );
    const token =
      refreshToken ?? (await getCookiesSession()).tokens?.refreshToken;
    if (!token) throw new Error("No session");

    const { refresh, me } = getEndpoints();
    const response = await fetch(refresh, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token }),
    });

    if (!response.ok) {
      const errorRes = await handleApiServerError(response);
      return { success: false, message: errorRes.message };
    }
    let user: User | null = null;
    const tokens: Tokens = await response.json();
    if (tokens.accessToken) {
      const userResponse = await fetchUser(tokens.accessToken, me);
      if (!userResponse.data) {
        return {
          success: false,
          message: (userResponse as any)?.message || "Failed to fetch user",
        };
      }
      user = userResponse.data;
    }
    if (!user) return { success: false, message: "User not identified" };

    await persistUserSessionInCookies({ user, tokens });
    return { success: true };
  } catch (error) {
    await deleteCookiesSession();
    console.error("Error refreshing tokens:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Obtener información de usuario
const fetchUser = async (
  accessToken: string,
  endpoint?: string,
): Promise<ApiResponse<User>> => {
  const { me } = getEndpoints();
  const url = endpoint || me;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return handleApiServerError(response);
  return buildApiResponseAsync<User>(response);
};
// Colores comunes (solo para depuración local, no influyen en la lógica)
const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";

console.log(FgGreen + "✔ Configuración cargada correctamente" + Reset);
console.log(FgRed + "✘ Error en el motor de autenticación" + Reset);

export const getCookiesSession = async (): Promise<SessionData> => {
  // Obtener sesion de la cookie
  const encryptedSession = await readCookies();

  if (!encryptedSession) {
    return { user: null, tokens: null, shouldClear: false };
  }

  try {
    const decryptedData = await decrypt(encryptedSession);
    const sessionData = JSON.parse(decryptedData) as SessionData;

    if (!sessionData || !sessionData.tokens) {
      return { user: null, tokens: null, shouldClear: true };
    }

    // Validar claims del token para detectar expiración o manipulación antes de usar la sesión.
    const claims = getJWTClaims(sessionData.tokens.accessToken);
    const now = new Date();
    const minutesLeft = claims?.expiresAt
      ? Math.round((claims.expiresAt.getTime() - now.getTime()) / 60000)
      : null;

    console.log(
      FgYellow + "[getCookiesSession] Verificando expiración del token" + Reset,
      {
        expiresAt: claims?.expiresAt?.toISOString() ?? null,
        now: now.toISOString(),
        minutesLeft,
      },
    );

    const isExpired =
      !claims?.expiresAt || now.getTime() >= claims.expiresAt.getTime();

    if (isExpired) {
      // Si el access token está expirado, intentar refrescar con el refresh token de la sesión
      try {
        console.log(
          FgYellow +
            "[getCookiesSession] Token expirado, iniciando proceso de refresh" +
            Reset,
        );
        await refreshTokens(sessionData.tokens.refreshToken);
      } catch (e) {
        console.error(
          "Error while trying to refresh expired token from session",
          e,
        );
      }

      // Volver a leer la sesión desde las cookies después del refresh
      const refreshedEncrypted = await readCookies();
      if (!refreshedEncrypted) {
        return { user: null, tokens: null, shouldClear: true };
      }

      try {
        const refreshedDecrypted = await decrypt(refreshedEncrypted);
        const refreshedSession = JSON.parse(refreshedDecrypted) as SessionData;
        if (!refreshedSession || !refreshedSession.tokens) {
          return { user: null, tokens: null, shouldClear: true };
        }
        const userData = await fetchUser(refreshedSession.tokens.accessToken);
        return {
          user: userData.data ?? null,
          tokens: refreshedSession.tokens,
          shouldClear: false,
        };
      } catch {
        return { user: null, tokens: null, shouldClear: true };
      }
    }

    // Token válido: usar el access token actual
    const userData = await fetchUser(sessionData.tokens.accessToken);
    return {
      user: userData.data ?? null,
      tokens: sessionData.tokens,
      shouldClear: false,
    };
  } catch {
    return { user: null, tokens: null, shouldClear: true };
  }
};
