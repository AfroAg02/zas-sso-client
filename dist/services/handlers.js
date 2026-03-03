import { NextResponse } from "next/server";
import { getRedirectUri, getAppUrl, getErrorRedirectUrl } from "../init-config";
import { parseRedirectUrl } from "../lib/parse-redirect-url"; // Ajusta ruta real
import { authenticateWithTokens } from "./server-actions"; // Ajusta ruta real
import { clearSessionCookies, setSessionCookies } from "../lib/cookies";
import htmlError from "../utils/html-page-error";
// Orígenes permitidos (puedes ampliar)
/**
 * Devuelve los segundos restantes hasta el `exp` de un JWT.
 * Retorna `null` si el token no parece ser un JWT o no contiene `exp`.
 */
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
function jsonError(message, status, origin, extra) {
    const res = NextResponse.json({ ok: false, error: message, ...extra }, { status });
    return res;
}
export async function POST(request) {
    const data = (await request.json());
    try {
        await setSessionCookies(data);
        return NextResponse.json({ ok: true });
    }
    catch (e) {
        return jsonError("Failed to set session cookies", 500, null);
    }
}
export async function DELETE(request) {
    const data = (await request.json());
    try {
        await clearSessionCookies();
        return NextResponse.json({ ok: true });
    }
    catch (e) {
        return jsonError("Failed to clear session cookies", 500, null);
    }
}
export async function GET(request) {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);
    // Parámetros esperados
    const accessToken = url.searchParams.get("accessToken");
    const refreshToken = url.searchParams.get("refreshToken");
    // calcular tiempo restante si el accessToken es JWT
    const accessTokenRemaining = getTokenRemainingSeconds(accessToken);
    // Unifica: usa "redirect" (o "redirectTo"). Aquí uso "redirect".
    // Helper local para aplicar la lógica de redirección de error o JSON
    const handleError = (message, status, extra) => {
        const errorRedirectUrl = getErrorRedirectUrl();
        if (errorRedirectUrl) {
            // Si hay URL de redirección de error, priorizarla
            const redirectUrl = new URL(errorRedirectUrl);
            // Pasar información mínima del error como query si se desea
            redirectUrl.searchParams.set("error", message);
            redirectUrl.searchParams.set("status", String(status));
            return NextResponse.redirect(redirectUrl, { status: 302 });
        }
        // Fallback: respuesta JSON como antes
        return htmlError(message, status);
    };
    if (!accessToken)
        return handleError("Missing accessToken", 400);
    if (!refreshToken)
        return handleError("Missing refreshToken", 400);
    const result = await authenticateWithTokens({ accessToken, refreshToken });
    if (result.error || !result.data) {
        return handleError("Invalid credentials or user fetch failed", result.status || 401, { origin });
    }
    const redirectUri = getRedirectUri();
    // Redirección segura (sanitize)
    const safeUrl = new URL(parseRedirectUrl(redirectUri, getAppUrl() || url.origin));
    safeUrl.searchParams.delete("accessToken");
    safeUrl.searchParams.delete("refreshToken");
    safeUrl.searchParams.delete("state");
    if (accessTokenRemaining != null) {
        safeUrl.searchParams.set("accessTokenExpiresIn", String(accessTokenRemaining));
    }
    const safeRedirect = safeUrl.toString();
    const res = NextResponse.redirect(safeRedirect, { status: 302 });
    return res;
}
export const handlers = { GET, POST, DELETE };
//# sourceMappingURL=handlers.js.map