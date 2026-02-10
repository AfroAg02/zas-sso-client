"use server";
import { getAppUrl, getEndpoints } from "../init-config";
import { buildApiResponseAsync, handleApiServerError } from "../lib/api";
import { clearSessionCookies, readCookies, setSessionCookies, } from "../lib/cookies";
import { processSession } from "./session-logic";
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
export const persistUserSessionInCookies = async (session, callbacks) => {
    // console.log(
    //   FgMagenta +
    //     "[persistUserSessionInCookies]  Entrando a persistUserSessionInCookies..." +
    //     Reset,
    // );
    try {
        // Solo guardamos tokens y lo necesario para mantener la sesión ligera
        const sessionData = {
            tokens: session.tokens,
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
    }
    catch (error) {
        console.error(FgRed +
            "[persistUserSessionInCookies] Error persistiendo sesión:" +
            Reset, error);
        callbacks?.onError?.(error);
        throw error;
    }
};
/**
 * Elimina las cookies de sesión y limpia el estado de autenticación.
 */
export const deleteCookiesSession = async (callbacks) => {
    try {
        await clearSessionCookies();
        callbacks?.onSuccess?.();
    }
    catch (error) {
        console.error(FgRed + "[deleteCookiesSession] Error al eliminar cookies:" + Reset, error);
        callbacks?.onError?.(error);
        throw error;
    }
};
/**
 * Autentica al usuario por primera vez tras un login exitoso.
 */
export const authenticateWithTokens = async (credentials, callbacks) => {
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
            console.log(FgRed +
                "[authenticateWithTokens]  No se obtuvo usuario válido." +
                Reset);
            return userResponse;
        }
        await persistUserSessionInCookies({
            user: userResponse.data,
            tokens: credentials,
        });
        callbacks?.onSuccess?.();
        return { data: userResponse.data, status: 200, error: false };
    }
    catch (error) {
        console.error(FgRed +
            "[authenticateWithTokens] Error en autenticación inicial:" +
            Reset, error);
        callbacks?.onError?.(error);
        return { data: null, status: 500, error: true };
    }
};
/**
 * Intenta guardar cookies solo si el contexto lo permite (Server Action o Route Handler)
 */
const safeSetCookies = async (data) => {
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
    }
    catch (e) {
        // Si falla, es porque estamos en un Server Component Render
        console.warn(FgYellow +
            "[Session] No se pudieron persistir cookies en el render. Se usarán tokens en memoria." +
            Reset);
        return false;
    }
};
/**
 * Función principal para obtener la sesión.
 * Soporta refresco en caliente durante el renderizado.
 */
export const getCookiesSession = async () => {
    const encryptedSession = await readCookies();
    // Usamos lógica compartida
    const result = await processSession(encryptedSession);
    if (result.refreshed) {
        console.log(FgGreen +
            "[getCookiesSession] 🔄 Sesión refrescada, intentando persistir..." +
            Reset);
        // Intentamos guardar mediante API call si estamos en Server Component,
        // o esto funcionará si estamos en Server Action.
        const saved = await safeSetCookies(result.session);
        if (saved) {
            console.log(FgGreen +
                "[getCookiesSession] ✅ Persistencia OK (API/Actions)." +
                Reset);
        }
        else {
            console.log(FgYellow +
                "[getCookiesSession] ⚠️ Persistencia en espera (Render Phase). El cliente debe sincronizar." +
                Reset);
        }
    }
    return result.session;
};
/**
 * Obtiene el usuario. Se suele usar después de getCookiesSession.
 */
export const fetchUser = async (accessToken) => {
    const { me } = getEndpoints();
    // console.log(FgMagenta + "[fetchUser]  Entrando a fetchUser..." + Reset);
    try {
        const response = await fetch(me, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        // console.log(FgCyan + "[fetchUser]  Respuesta del me" + response.ok + Reset);
        if (!response.ok)
            return handleApiServerError(response);
        return buildApiResponseAsync(response);
    }
    catch (error) {
        return { data: null, status: 500, error: true };
    }
};
//# sourceMappingURL=server-actions.js.map