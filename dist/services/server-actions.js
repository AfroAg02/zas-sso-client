"use server";
import { getAppUrl, getEndpoints } from "../init-config";
import { buildApiResponseAsync, handleApiServerError } from "../lib/api";
import { clearSessionCookies, readCookies, setSessionCookies, } from "../lib/cookies";
import { processSession } from "../services/session-logic";
/**
 * Almacena de forma segura la sesión del usuario en las cookies.
 * @param session Objeto con los tokens y datos del usuario.
 * @param callbacks Funciones opcionales de éxito o error.
 */
export const persistUserSessionInCookies = async (session, callbacks) => {
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
        await setSessionCookies(sessionData);
        callbacks?.onSuccess?.();
    }
    catch (error) {
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
        callbacks?.onError?.(error);
        throw error;
    }
};
/**
 * Autentica al usuario por primera vez tras un login exitoso.
 */
export const authenticateWithTokens = async (credentials, callbacks) => {
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
    }
    catch (error) {
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
        return false;
    }
};
/**
 * Función principal para obtener la sesión.
 * Soporta refresco en caliente durante el renderizado.
 */
import { cache } from "react";
export const getCookiesSession = cache(async () => {
    const encryptedSession = await readCookies();
    const result = await processSession(encryptedSession);
    const session = result.session;
    // Helper local: calcula segundos restantes de un JWT 'exp'
    function getTokenRemainingSeconds(token) {
        if (!token)
            return null;
        const parts = token.split(".");
        if (parts.length !== 3)
            return null; // no es JWT
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        try {
            const payloadJson = Buffer.from(padded, "base64").toString("utf8");
            const payload = JSON.parse(payloadJson);
            if (!payload.exp)
                return null;
            const msLeft = payload.exp * 1000 - Date.now();
            return Math.max(0, Math.floor(msLeft / 1000));
        }
        catch {
            return null;
        }
    }
    const accessTokenRemaining = getTokenRemainingSeconds(session.tokens?.accessToken ?? null);
    const refreshTokenRemaining = getTokenRemainingSeconds(session.tokens?.refreshToken ?? null);
    // Loguear en consola cada vez que se consulta la sesión, mostrando tiempo restante (con color)
    try {
        const Reset = "\x1b[0m";
        const FgCyan = "\x1b[36m";
        const FgYellow = "\x1b[33m";
        const acc = accessTokenRemaining != null ? `${accessTokenRemaining}s` : "n/a";
        const ref = refreshTokenRemaining != null ? `${refreshTokenRemaining}s` : "n/a";
        console.log(`${FgCyan}[getCookiesSession]${Reset} accessTokenExpiresIn=${FgYellow}${acc}${Reset} refreshTokenExpiresIn=${FgYellow}${ref}${Reset}`);
    }
    catch {
        // no bloquear por logging
    }
    return {
        ...session,
        tokenExpiry: {
            accessTokenExpiresIn: accessTokenRemaining,
            refreshTokenExpiresIn: refreshTokenRemaining,
        },
    };
});
/**
 * Obtiene el usuario. Se suele usar después de getCookiesSession.
 */
export const fetchUser = async (accessToken) => {
    const { me } = getEndpoints();
    try {
        const response = await fetch(me, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok)
            return handleApiServerError(response);
        return buildApiResponseAsync(response);
    }
    catch (error) {
        return { data: null, status: 500, error: true };
    }
};
/**
 * Servicio explícito para refrescar la sesión usando un refresh token.
 *
 * - Llama al endpoint de refresh (o a una URL alterna si se provee).
 * - Usa authenticateWithTokens para obtener el usuario y persistir la sesión en cookies.
 * - Expone logs internos solo dentro de esta función para depuración.
 */
export const refreshSession = async (refreshToken, options) => {
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
            let body;
            try {
                body = await response.text();
            }
            catch {
                body = undefined;
            }
            console.error(FgRed +
                `[refreshSession] ❌ Fallo al refrescar=${response.status} body=${body ? body.slice(0, 500) : "<sin body>"}` +
                Reset);
            console.error(FgRed +
                `[refreshSession] ❌ Peticion a url=${endpoint} con el token=${refreshToken} a las ${new Date().toISOString()}` +
                Reset);
            return { data: null, status: response.status, error: true };
        }
        const tokens = await response.json();
        // Reutilizamos authenticateWithTokens para obtener el usuario y persistir sesión
        return authenticateWithTokens(tokens);
    }
    catch (error) {
        console.error(FgRed +
            "[refreshSession] ❌ Error inesperado intentando refrescar la sesión" +
            Reset, error);
        return { data: null, status: 500, error: true };
    }
};
//# sourceMappingURL=server-actions.js.map