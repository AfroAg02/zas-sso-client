"use server";

import { getAppUrl, getEndpoints } from "../init-config";
import { buildApiResponseAsync, handleApiServerError } from "../lib/api";
import {
  clearSessionCookies,
  readCookies,
  setSessionCookies,
} from "../lib/cookies";
import { SessionData, Tokens, User } from "../types";
import { ApiResponse } from "../types/fetch/api";
import { processSession } from "../services/session-logic";

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
    const sessionData: SessionData = {
      tokens: session.tokens as Tokens,
      user: session.user
        ? {
            id: session.user?.id,
            name: session.user?.name,
            emails: (session.user?.emails ?? [])
              .map((e) => ({
                address: e.address,
                isVerified: e.isVerified,
                active: e.active,
              }))
              .filter((e) => e.active),
            photoUrl: session.user?.photoUrl,
            phoneNumbers: (session.user?.phoneNumbers ?? [])
              .map((p) => ({
                number: p.number,
                isVerified: p.isVerified,
                country: p.country,
                countryId: p.countryId,
                active: p.active,
              }))
              .filter((e) => e.active),
          }
        : null, // Mantenemos el usuario si viene incluido
      shouldClear: false,
    };
    await setSessionCookies(sessionData);
    callbacks?.onSuccess?.();
  } catch (error) {
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
    if (!userResponse.data) {
      return userResponse;
    }

    await persistUserSessionInCookies({
      user: userResponse.data,
      tokens: credentials,
    });

    callbacks?.onSuccess?.();
    return { data: userResponse.data, status: 200, error: false };
  } catch (error) {
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
    return false;
  }
};

/**
 * Función principal para obtener la sesión.
 * Soporta refresco en caliente durante el renderizado.
 */
import { cache } from "react";

export const getCookiesSession = cache(async (): Promise<SessionData> => {
  const encryptedSession = await readCookies();
  const result = await processSession(encryptedSession);
  return result.session;
});

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

/**
 * Servicio explícito para refrescar la sesión usando un refresh token.
 *
 * - Llama al endpoint de refresh (o a una URL alterna si se provee).
 * - Usa authenticateWithTokens para obtener el usuario y persistir la sesión en cookies.
 * - Expone logs internos solo dentro de esta función para depuración.
 */
export const refreshSession = async (
  refreshToken: string,
  options?: { refreshUrl?: string },
): Promise<ApiResponse<User | null>> => {
  // Logs locales a esta función para depuración
  const Reset = "\x1b[0m";
  const FgRed = "\x1b[31m";

  const { refresh } = getEndpoints();
  const endpoint = options?.refreshUrl ?? refresh;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      let body: string | undefined;
      try {
        body = await response.text();
      } catch {
        body = undefined;
      }

      console.error(
        FgRed +
          `[refreshSession] ❌ Error de backend status=${
            response.status
          } body=${body ? body.slice(0, 500) : "<sin body>"}` +
          Reset,
      );

      return { data: null, status: response.status, error: true };
    }

    const tokens: Tokens = await response.json();

    // Reutilizamos authenticateWithTokens para obtener el usuario y persistir sesión
    return authenticateWithTokens(tokens);
  } catch (error) {
    console.error(
      FgRed +
        "[refreshSession] ❌ Error inesperado intentando refrescar la sesión" +
        Reset,
      error,
    );

    return { data: null, status: 500, error: true };
  }
};
