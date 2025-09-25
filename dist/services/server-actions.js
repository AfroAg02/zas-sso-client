"use server";
import { getEndpoints } from "../init-config";
import { clearSessionCookies, readCookies, setSessionCookies, } from "../lib/cookies";
import { decrypt } from "../lib/crypto";
import { buildApiResponseAsync, handleApiServerError } from "../lib/api";
// Tipos
//# Almacenar sesión en cookies
export const persistUserSessionInCookies = async (session, callbacks) => {
    try {
        const data = {
            tokens: session.tokens,
            user: {
                id: session.user?.id,
                name: session.user?.name,
                emails: session.user?.emails,
                phones: session.user?.phones,
                photoUrl: session.user?.photoUrl,
            },
        };
        await setSessionCookies(data);
        callbacks?.onSuccess?.();
    }
    catch (error) {
        console.error("Error persisting session in cookies:", error);
        callbacks?.onError?.(error);
        throw error;
    }
};
//# Eliminar sesión de las cookies
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
// Autenticar con credenciales
export const authenticateWithTokens = async (credentials, callbacks) => {
    try {
        const userResponse = await fetchUser(credentials.accessToken);
        if (!userResponse.data)
            return userResponse;
        await persistUserSessionInCookies({
            user: userResponse.data,
            tokens: credentials,
        });
        callbacks?.onSuccess?.();
        console.log("User authenticated successfully:", userResponse);
        return {
            data: userResponse.data,
            status: userResponse.status,
            error: false,
        };
    }
    catch (error) {
        console.error("Error authenticating with credentials:", error);
        callbacks?.onError?.(error);
        return { data: null, status: 500, error: true };
    }
};
// Refrescar token
export const refreshTokens = async (callbacks) => {
    try {
        const session = await getCookiesSession();
        if (!session?.tokens?.refreshToken)
            throw new Error("No session");
        const { refresh, me } = getEndpoints();
        const response = await fetch(refresh, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
        });
        if (!response.ok)
            return handleApiServerError(response);
        const tokens = await response.json();
        let user = session.user;
        if (!user && tokens.accessToken) {
            const userResponse = await fetchUser(tokens.accessToken, me);
            if (!userResponse.data)
                return handleApiServerError(response);
            user = userResponse.data;
        }
        if (!user)
            return handleApiServerError(response);
        await persistUserSessionInCookies({ user, tokens });
        callbacks?.onSuccess?.();
    }
    catch (error) {
        await deleteCookiesSession();
        callbacks?.onError?.(error);
        console.error("Error refreshing tokens:", error);
    }
};
// Obtener información de usuario
const fetchUser = async (accessToken, endpoint) => {
    const { me } = getEndpoints();
    const url = endpoint || me;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok)
        return handleApiServerError(response);
    return buildApiResponseAsync(response);
};
export const getCookiesSession = async () => {
    const encryptedSession = await readCookies();
    if (!encryptedSession) {
        return { user: null, tokens: null, shouldClear: false };
    }
    try {
        const decryptedData = await decrypt(encryptedSession);
        const sessionData = JSON.parse(decryptedData);
        if (!sessionData || !sessionData.tokens) {
            return { user: null, tokens: null, shouldClear: true };
        }
        return JSON.parse(decryptedData);
    }
    catch {
        return { user: null, tokens: null, shouldClear: true };
    }
};
//# sourceMappingURL=server-actions.js.map