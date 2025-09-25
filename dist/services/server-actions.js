"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookiesSession = exports.refreshTokens = exports.authenticateWithTokens = exports.deleteCookiesSession = exports.persistUserSessionInCookies = void 0;
const init_config_1 = require("../init-config");
const cookies_1 = require("../lib/cookies");
const crypto_1 = require("../lib/crypto");
const api_1 = require("@/lib/api");
// Tipos
//# Almacenar sesión en cookies
const persistUserSessionInCookies = async (session, callbacks) => {
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
        await (0, cookies_1.setSessionCookies)(data);
        callbacks?.onSuccess?.();
    }
    catch (error) {
        console.error("Error persisting session in cookies:", error);
        callbacks?.onError?.(error);
        throw error;
    }
};
exports.persistUserSessionInCookies = persistUserSessionInCookies;
//# Eliminar sesión de las cookies
const deleteCookiesSession = async (callbacks) => {
    try {
        await (0, cookies_1.clearSessionCookies)();
        callbacks?.onSuccess?.();
    }
    catch (error) {
        callbacks?.onError?.(error);
        throw error;
    }
};
exports.deleteCookiesSession = deleteCookiesSession;
// Autenticar con credenciales
const authenticateWithTokens = async (credentials, callbacks) => {
    try {
        const userResponse = await fetchUser(credentials.accessToken);
        if (!userResponse.data)
            return userResponse;
        await (0, exports.persistUserSessionInCookies)({
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
exports.authenticateWithTokens = authenticateWithTokens;
// Refrescar token
const refreshTokens = async (callbacks) => {
    try {
        const session = await (0, exports.getCookiesSession)();
        if (!session?.tokens?.refreshToken)
            throw new Error("No session");
        const { refresh, me } = (0, init_config_1.getEndpoints)();
        const response = await fetch(refresh, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
        });
        if (!response.ok)
            return (0, api_1.handleApiServerError)(response);
        const tokens = await response.json();
        let user = session.user;
        if (!user && tokens.accessToken) {
            const userResponse = await fetchUser(tokens.accessToken, me);
            if (!userResponse.data)
                return (0, api_1.handleApiServerError)(response);
            user = userResponse.data;
        }
        if (!user)
            return (0, api_1.handleApiServerError)(response);
        await (0, exports.persistUserSessionInCookies)({ user, tokens });
        callbacks?.onSuccess?.();
    }
    catch (error) {
        await (0, exports.deleteCookiesSession)();
        callbacks?.onError?.(error);
        console.error("Error refreshing tokens:", error);
    }
};
exports.refreshTokens = refreshTokens;
// Obtener información de usuario
const fetchUser = async (accessToken, endpoint) => {
    const { me } = (0, init_config_1.getEndpoints)();
    const url = endpoint || me;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok)
        return (0, api_1.handleApiServerError)(response);
    return (0, api_1.buildApiResponseAsync)(response);
};
const getCookiesSession = async () => {
    const encryptedSession = await (0, cookies_1.readCookies)();
    if (!encryptedSession) {
        return { user: null, tokens: null, shouldClear: false };
    }
    try {
        const decryptedData = await (0, crypto_1.decrypt)(encryptedSession);
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
exports.getCookiesSession = getCookiesSession;
//# sourceMappingURL=server-actions.js.map