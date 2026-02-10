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
import { processSession } from "../services/session-logic";;
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
  // console.log(
  //   FgMagenta +
  //     "[persistUserSessionInCookies]  Entrando a persistUserSessionInCookies..." +
  //     Reset,
  // );

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
    // console.log(
    //   FgCyan +
    //     "[persistUserSessionInCookies]" +
    //     JSON.stringify(sessionData) +
    //     Reset,
    // );
    await setSessionCookies(sessionData);
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
  // console.log(
  //   FgMagenta +
  //     "[authenticateWithTokens]  Entrando a authenticateWithTokens..." +
  //     Reset,
  // );
  // console.log(
  //   FgCyan +
  //     "[authenticateWithTokens]  credentials." +
  //     JSON.stringify(credentials) +
  //     Reset,
  // );
  try {
    const userResponse = await fetchUser(credentials.accessToken);
    if (!userResponse.data) {
      console.log(
        FgRed +
          "[authenticateWithTokens]  No se obtuvo usuario válido." +
          Reset,
      );

      return userResponse;
    }

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
 * Función principal para obtener la sesión.
 * Soporta refresco en caliente durante el renderizado.
 */
import { cache } from 'react';
import { headers } from 'next/headers';
// Importa tus utilidades actuales
// import { readCookies, processSession, safeSetCookies, ... } from './auth';

export const getCookiesSession = cache(async (): Promise<SessionData> => {
  const headersList = await headers();
  
  // 1. PRIORIDAD: Intentar leer el token inyectado por el Middleware
  // Esto evita desencriptar y evita el SEGUNDO refresh (el que da 401)
  const tokenFromMiddleware = headersList.get('x-zas-access-token');

  if (tokenFromMiddleware) {
    /* Si el middleware ya nos dio el token, devolvemos una sesión mínima 
       o una sesión parcial. Si necesitas el objeto 'user' completo, 
       puedes inyectar también un header 'x-zas-user' en el middleware 
       o desencriptar aquí solo si es estrictamente necesario.
    */
    console.log(FgGreen + "[getCookiesSession] ✅ Usando token fresco del Middleware" + Reset);
    
    // Si necesitas reconstruir la sesión completa (user + tokens)
    // podrías desencriptar la cookie una vez, pero YA TIENES el accessToken válido.
    const encryptedSession = await readCookies();
    const result = await processSession(encryptedSession, tokenFromMiddleware); 
    return result.session;
  }

  // 2. FALLBACK: Si no hay header (ej. rutas no protegidas o fallos), lógica original
  console.log(FgYellow + "[getCookiesSession] 🔄 No hay header del middleware, disparo manual..." + Reset);
  
  const encryptedSession = await readCookies();
  const result = await processSession(encryptedSession);

  if (result.refreshed) {
    console.log(FgGreen + "[getCookiesSession] 🔄 Sesión refrescada en render..." + Reset);
    const saved = await safeSetCookies(result.session);
    // ... tu lógica de logs de persistencia
  }

  return result.session;
});

/**
 * Obtiene el usuario. Se suele usar después de getCookiesSession.
 */
export const fetchUser = async (
  accessToken: string,
): Promise<ApiResponse<User>> => {
  const { me } = getEndpoints();
  // console.log(FgMagenta + "[fetchUser]  Entrando a fetchUser..." + Reset);
  try {
    const response = await fetch(me, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // console.log(FgCyan + "[fetchUser]  Respuesta del me" + response.ok + Reset);

    if (!response.ok) return handleApiServerError(response);
    return buildApiResponseAsync<User>(response);
  } catch (error) {
    return { data: null as any, status: 500, error: true };
  }
};
