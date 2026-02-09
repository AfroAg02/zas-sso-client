"use server";

import { ApiResponse } from "../types/fetch/api";
import { getEndpoints, getAppUrl } from "../init-config";
import { readCookies, setSessionCookies, clearSessionCookies } from "../lib/cookies";
import { decrypt } from "../lib/crypto";
import { SessionData, Tokens, User } from "../types";
import { buildApiResponseAsync, handleApiServerError } from "../lib/api";
import { getJWTClaims } from "../edge"; 
// --- Configuración de Logs ---
const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgCyan = "\x1b[36m";

/**
 * Almacena de forma segura la sesión del usuario en las cookies.
 * @param session Objeto con los tokens y datos del usuario.
 * @param callbacks Funciones opcionales de éxito o error.
 */
export const persistUserSessionInCookies = async (
  session: SessionData,
  callbacks?: { onSuccess?: () => void; onError?: (error: unknown) => void },
) => {
  try {
    // Solo guardamos tokens y lo necesario para mantener la sesión ligera
    const data: SessionData = {
      tokens: session.tokens as Tokens,
      user: session.user, // Mantenemos el usuario si viene incluido
      shouldClear: false,
    };

    await setSessionCookies(data);
    callbacks?.onSuccess?.();
  } catch (error) {
    console.error(
      FgRed +
        "[persistUserSessionInCookies] Error persistiendo sesión:" +
        Reset,
      error,
    );
    callbacks?.onError?.(error);
    throw error;
  }
};

/**
 * Elimina las cookies de sesión y limpia el estado de autenticación.
 */
export const deleteCookiesSession = async (callbacks?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  try {
    await clearSessionCookies();
    callbacks?.onSuccess?.();
  } catch (error) {
    console.error(
      FgRed + "[deleteCookiesSession] Error al eliminar cookies:" + Reset,
      error,
    );
    callbacks?.onError?.(error);
    throw error;
  }
};

/**
 * Autentica al usuario por primera vez tras un login exitoso.
 */
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
    return { data: userResponse.data, status: 200, error: false };
  } catch (error) {
    console.error(
      FgRed +
        "[authenticateWithTokens] Error en autenticación inicial:" +
        Reset,
      error,
    );
    callbacks?.onError?.(error);
    return { data: null, status: 500, error: true };
  }
};

/**
 * Intenta guardar cookies solo si el contexto lo permite (Server Action o Route Handler)
 */
const safeSetCookies = async (data: SessionData) => {
  try {
    const appUrl = getAppUrl();
    const endpoint = appUrl ? `${appUrl}/api/sso/login` : "/api/sso/login";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return true;
  } catch (e) {
    // Si falla, es porque estamos en un Server Component Render
    console.warn(
      FgYellow +
        "[Session] No se pudieron persistir cookies en el render. Se usarán tokens en memoria." +
        Reset,
    );
    return false;
  }
};

/**
 * Realiza el refresh contra tu API backend.
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

    if (!response.ok) return { success: false };
    const tokens: Tokens = await response.json();
    return { success: true, tokens };
  } catch (error) {
    console.error(FgRed + "[refreshTokens] Error fatal:" + Reset, error);
    return { success: false };
  }
};

/**
 * Función principal para obtener la sesión.
 * Soporta refresco en caliente durante el renderizado.
 */
export const getCookiesSession = async (): Promise<SessionData> => {
  const encryptedSession = await readCookies();
  if (!encryptedSession)
    return { user: null, tokens: null, shouldClear: false };

  try {
    const decryptedData = await decrypt(encryptedSession);
    const session = JSON.parse(decryptedData) as SessionData;

    if (!session?.tokens?.accessToken) {
      return { user: null, tokens: null, shouldClear: true };
    }

    const claims = getJWTClaims(session.tokens.accessToken);
    const now = new Date();
    const isExpired =
      !claims?.expiresAt || now.getTime() >= claims.expiresAt.getTime();

    if (isExpired) {
      console.log(
        FgCyan + "[getCookiesSession] ⚠️ Token expirado detectado." + Reset,
      );

      const res = await refreshTokens(session.tokens.refreshToken);

      if (res.success && res.tokens) {
        const newSession = {
          ...session,
          tokens: res.tokens,
          shouldClear: false,
        };

        // Intentamos guardar, pero si falla (por estar en render),
        // al menos devolvemos la sesión nueva para este request.
        await safeSetCookies(newSession);

        console.log(
          FgGreen +
            "[getCookiesSession] ✅ Sesión actualizada (Memoria)" +
            Reset,
        );
        return newSession;
      }

      console.log(FgRed + "[getCookiesSession] ❌ Refresh fallido." + Reset);
      return { user: null, tokens: null, shouldClear: true };
    }

    return session;
  } catch (error) {
    console.error(
      FgRed + "[getCookiesSession] Error decodificando sesión:" + Reset,
      error,
    );
    return { user: null, tokens: null, shouldClear: true };
  }
};

/**
 * Obtiene el usuario. Se suele usar después de getCookiesSession.
 */
export const fetchUser = async (
  accessToken: string,
): Promise<ApiResponse<User>> => {
  const { me } = getEndpoints();
  try {
    const response = await fetch(me, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return handleApiServerError(response);
    return buildApiResponseAsync<User>(response);
  } catch (error) {
    return { data: null as any, status: 500, error: true };
  }
};
