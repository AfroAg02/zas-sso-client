import { getEndpoints } from "../init-config";
import { decrypt } from "../lib/crypto";
import { getJWTClaims } from "../lib/decode";
// --- Logging Colors ---
export const Reset = "\x1b[0m";
export const FgRed = "\x1b[31m";
export const FgGreen = "\x1b[32m";
export const FgYellow = "\x1b[33m";
export const FgCyan = "\x1b[36m";
export const FgMagenta = "\x1b[35m";
/**
 * Realiza el refresh contra tu API backend.
 * Devuelve los nuevos tokens o falla.
 */
export const refreshTokens = async (refreshToken) => {
    console.log(FgYellow + "[refreshTokens] 🔄 Refrescando tokens en backend..." + Reset);
    const { refresh } = getEndpoints();
    try {
        const response = await fetch(refresh, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            cache: "no-store",
        });
        if (!response.ok) {
            console.error(FgRed + `[refreshTokens] Falló con status ${response.status}` + Reset);
            return { success: false };
        }
        const tokens = await response.json();
        console.log(FgGreen + "[refreshTokens] ✅ Tokens refrescados exitosamente." + Reset);
        return { success: true, tokens };
    }
    catch (error) {
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
export async function processSession(encryptedSession, forcedAccessToken) {
    const emptySession = {
        user: null,
        tokens: null,
        shouldClear: false,
    };
    if (!encryptedSession) {
        return { session: emptySession, refreshed: false };
    }
    try {
        const decryptedData = await decrypt(encryptedSession);
        let session = JSON.parse(decryptedData);
        // --- CAMBIO CLAVE: Sincronización con el Middleware ---
        if (forcedAccessToken && session.tokens) {
            console.log(FgGreen + "[processSession] 🚀 Sincronizando sesión con token del Middleware" + Reset);
            session.tokens.accessToken = forcedAccessToken;
            // Retornamos refreshed: false porque el refresh ocurrió en el Middleware, 
            // no aquí, así evitamos intentar guardar cookies en fase de render.
            return { session, refreshed: false };
        }
        if (!session?.tokens?.accessToken) {
            return {
                session: { ...emptySession, shouldClear: true },
                refreshed: false,
            };
        }
        const claims = getJWTClaims(session.tokens.accessToken);
        const now = new Date();
        const isExpired = !claims?.expiresAt || now.getTime() >= claims.expiresAt.getTime();
        const timeToExpire = claims?.expiresAt ? claims.expiresAt.getTime() - now.getTime() : 0;
        console.log(FgYellow + `[processSession] ⏱️ Token expira en ${Math.floor(timeToExpire / 60000)}m` + Reset);
        if (isExpired) {
            // Esta parte solo se ejecutará si el Middleware NO capturó la expiración
            console.log(FgCyan + "[processSession] ⚠️ Token expirado detectado." + Reset);
            const res = await refreshTokens(session.tokens.refreshToken);
            if (res.success && res.tokens) {
                session = { ...session, tokens: res.tokens, shouldClear: false };
                return { session, refreshed: true };
            }
            else {
                console.log(FgRed + "[processSession] ❌ Refresh fallido. Sesión invalidada." + Reset);
                return {
                    session: { ...emptySession, shouldClear: true },
                    refreshed: false,
                };
            }
        }
        return { session, refreshed: false };
    }
    catch (error) {
        console.error(FgRed + "[processSession] Error procesando sesión:" + Reset, error);
        return {
            session: { ...emptySession, shouldClear: true },
            refreshed: false,
            error,
        };
    }
}
//# sourceMappingURL=session-logic.js.map