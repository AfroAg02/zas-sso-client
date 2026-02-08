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
import { getJWTClaims } from "../edge"; // Eliminado el @

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
      shouldClear: false
    };

    await setSessionCookies(data);
    callbacks?.onSuccess?.();
  } catch (error) {
    console.error(FgRed + "[persistUserSessionInCookies] Error persistiendo sesión:" + Reset, error);
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
    console.error(FgRed + "[deleteCookiesSession] Error al eliminar cookies:" + Reset, error);
    callbacks?.onError?.(error);
    throw error;
  }
};

/**
 * Obtiene el perfil del usuario desde la API externa.
 * @param accessToken Token de acceso actual.
 * @param endpoint URL opcional del perfil.
 */
const fetchUser = async (
  accessToken: string,
  endpoint?: string,
): Promise<ApiResponse<User>> => {
  try {
    const { me } = getEndpoints();
    const url = endpoint || me;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store", // Evitar datos cacheados en autenticación
    });

    if (!response.ok) return handleApiServerError(response);
    return buildApiResponseAsync<User>(response);
  } catch (error) {
    console.error(FgRed + "[fetchUser] Error en fetch de usuario:" + Reset, error);
    return { data: null as any, status: 500, error: true };
  }
};

/**
 * Realiza el intercambio de un refresh token por nuevos tokens de acceso.
 * Evita llamar a getCookiesSession para no crear bucles infinitos.
 * @param refreshToken El token de refresco almacenado.
 */
export const refreshTokens = async (
  refreshToken: string,
): Promise<{ success: boolean; message?: string; data?: Tokens }> => {
  try {
    console.log(FgYellow + "[refreshTokens] 🔄 Iniciando rotación de tokens..." + Reset);
    
    const { refresh } = getEndpoints();
    const response = await fetch(refresh, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const errorRes = await handleApiServerError(response);
      console.log(FgRed + "[refreshTokens] ❌ Fallo en el servidor de identidad" + Reset);
      return { success: false, message: errorRes.message };
    }

    const newTokens: Tokens = await response.json();
    console.log(FgGreen + "[refreshTokens] ✅ Tokens renovados exitosamente" + Reset);

    return { success: true, data: newTokens };
  } catch (error) {
    console.error(FgRed + "[refreshTokens] Error crítico en el proceso de refresh:" + Reset, error);
    return { success: false, message: "Critical refresh error" };
  }
};

/**
 * Orquestador principal de la sesión. 
 * Lee, valida, refresca si es necesario y devuelve la sesión activa.
 */
export const getCookiesSession = async (): Promise<SessionData> => {
  const encryptedSession = await readCookies();

  if (!encryptedSession) {
    return { user: null, tokens: null, shouldClear: false };
  }

  try {
    const decryptedData = await decrypt(encryptedSession);
    let sessionData = JSON.parse(decryptedData) as SessionData;

    if (!sessionData || !sessionData.tokens) {
      return { user: null, tokens: null, shouldClear: true };
    }

    // Análisis de expiración mediante el JWT
    const claims = getJWTClaims(sessionData.tokens.accessToken);
    const now = new Date();
    const isExpired = !claims?.expiresAt || now.getTime() >= claims.expiresAt.getTime();

    if (isExpired) {
      console.log(FgCyan + "[getCookiesSession] ⚠️ Token expirado. Intentando refresh..." + Reset);
      
      const refreshResult = await refreshTokens(sessionData.tokens.refreshToken);

      if (refreshResult.success && refreshResult.data) {
        // Obtenemos los datos del usuario con el nuevo token
        const userRes = await fetchUser(refreshResult.data.accessToken);
        
        const updatedSession: SessionData = {
          tokens: refreshResult.data,
          user: userRes.data ?? null,
          shouldClear: false
        };

        // Guardar nuevos tokens en cookies
        await persistUserSessionInCookies(updatedSession);
        return updatedSession;
      } else {
        // Si el refresh falla, la sesión ya no es válida
        console.log(FgRed + "[getCookiesSession] 🚫 Refresh fallido. Limpiando sesión." + Reset);
        await deleteCookiesSession();
        return { user: null, tokens: null, shouldClear: true };
      }
    }

    // Token aún válido: Si no tenemos el usuario en la sesión, lo buscamos
    if (!sessionData.user) {
        const userData = await fetchUser(sessionData.tokens.accessToken);
        sessionData.user = userData.data ?? null;
    }

    return sessionData;
  } catch (error) {
    console.error(FgRed + "[getCookiesSession] Error procesando sesión:" + Reset, error);
    return { user: null, tokens: null, shouldClear: true };
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
    console.error(FgRed + "[authenticateWithTokens] Error en autenticación inicial:" + Reset, error);
    callbacks?.onError?.(error);
    return { data: null, status: 500, error: true };
  }
};