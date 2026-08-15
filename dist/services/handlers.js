import { NextResponse } from "next/server";
import { getRedirectUri, getAppUrl, getErrorRedirectUrl } from "../init-config";
import { parseRedirectUrl } from "../lib/parse-redirect-url";
import { authenticateWithTokens } from "./server-actions";
import { clearSessionCookies, setSessionCookies } from "../lib/cookies";
import htmlError from "../utils/html-page-error";
function jsonError(message, status, origin, extra) {
    const res = NextResponse.json({ ok: false, error: message, ...extra }, { status });
    return res;
}
/**
 * Helper para manejar errores en el callback: redirige a errorRedirectUrl si existe,
 * o devuelve una página HTML de error.
 */
function handleCallbackError(message, status, extra) {
    const errorRedirectUrl = getErrorRedirectUrl();
    if (errorRedirectUrl) {
        const redirectUrl = new URL(errorRedirectUrl);
        redirectUrl.searchParams.set("error", message);
        redirectUrl.searchParams.set("status", String(status));
        return NextResponse.redirect(redirectUrl, { status: 302 });
    }
    return htmlError(message, status);
}
/**
 * Procesa el callback de autenticación SSO con tokens recibidos de forma segura
 * en el cuerpo del POST (nunca en la URL).
 */
async function handleCallbackPost(request) {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);
    console.log("[SSO-FLOW][4/5] 📥 zas-sso-client (handleCallbackPost): POST recibido en /api/sso/callback", "\n  → URL:", url.toString(), "\n  → origin:", origin, "\n  → content-type:", request.headers.get("content-type"), "\n  → Los tokens vienen en el BODY del POST (seguro), no en la URL");
    const contentType = request.headers.get("content-type") || "";
    let accessToken = null;
    let refreshToken = null;
    let registerRedirect = null;
    if (contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")) {
        console.log("[SSO-FLOW][4/5] 📋 zas-sso-client: Parseando tokens desde FormData (formulario HTML)");
        const formData = await request.formData();
        accessToken = formData.get("accessToken");
        refreshToken = formData.get("refreshToken");
        registerRedirect = formData.get("registerRedirect");
    }
    else {
        console.log("[SSO-FLOW][4/5] 📋 zas-sso-client: Parseando tokens desde JSON body");
        const body = await request.json();
        accessToken = body.accessToken;
        refreshToken = body.refreshToken;
        registerRedirect = body.registerRedirect || null;
    }
    console.log("[SSO-FLOW][4/5] 🔍 zas-sso-client: Tokens extraídos del body", "\n  → accessToken presente:", !!accessToken, "\n  → refreshToken presente:", !!refreshToken, "\n  → accessToken preview:", accessToken ? accessToken.substring(0, 20) + "..." : "(vacío)");
    if (!accessToken)
        return handleCallbackError("Missing accessToken", 400);
    if (!refreshToken)
        return handleCallbackError("Missing refreshToken", 400);
    console.log("[SSO-FLOW][4/5] 🔄 zas-sso-client: Validando tokens con authenticateWithTokens (llama a /users/me)...");
    const result = await authenticateWithTokens({ accessToken, refreshToken });
    if (result.error || !result.data) {
        console.error("[SSO-FLOW][4/5] ❌ zas-sso-client: authenticateWithTokens falló", "\n  → status:", result.status, "\n  → error:", result.error);
        return handleCallbackError("Invalid credentials or user fetch failed", result.status || 401, { origin });
    }
    console.log("[SSO-FLOW][4/5] ✅ zas-sso-client: Tokens válidos, sesión persistida en cookie encriptada", "\n  → Usuario:", result.data?.name || result.data?.id || "(sin nombre)");
    // Si viene registerRedirect, usarlo como destino (flujo de registro);
    // de lo contrario, usar el redirectUri configurado (flujo de login).
    const appOrigin = getAppUrl() || url.origin;
    let safeRedirect;
    if (registerRedirect && registerRedirect.trim()) {
        const safeUrl = new URL(parseRedirectUrl(registerRedirect, appOrigin));
        safeUrl.searchParams.delete("accessToken");
        safeUrl.searchParams.delete("refreshToken");
        safeUrl.searchParams.delete("state");
        safeRedirect = safeUrl.toString();
        console.log("[SSO-FLOW][5/5] 🎯 zas-sso-client: Redirigiendo al register callback (sin tokens en URL)", "\n  → registerRedirect:", registerRedirect, "\n  → URL final:", safeRedirect, "\n  → La sesión ya está en la cookie httpOnly encriptada", "\n  → ✅ FLUJO REGISTRO COMPLETO — El usuario está autenticado");
    }
    else {
        const redirectUri = getRedirectUri();
        const safeUrl = new URL(parseRedirectUrl(redirectUri, appOrigin));
        safeUrl.searchParams.delete("accessToken");
        safeUrl.searchParams.delete("refreshToken");
        safeUrl.searchParams.delete("state");
        safeRedirect = safeUrl.toString();
        console.log("[SSO-FLOW][5/5] 🎯 zas-sso-client: Redirigiendo al dashboard (sin tokens en URL)", "\n  → redirectUri configurado:", redirectUri, "\n  → URL final:", safeRedirect, "\n  → La sesión ya está en la cookie httpOnly encriptada", "\n  → ✅ FLUJO COMPLETO — El usuario está autenticado");
    }
    return NextResponse.redirect(safeRedirect, { status: 302 });
}
export async function POST(request) {
    const url = new URL(request.url);
    const isCallback = url.pathname.endsWith("/callback");
    console.log("[SSO-FLOW] 📬 zas-sso-client POST handler", "\n  → pathname:", url.pathname, "\n  → isCallback:", isCallback, isCallback
        ? "→ Procesando callback SSO (tokens en body)"
        : "→ Procesando set-session (cookies internas)");
    if (isCallback) {
        return handleCallbackPost(request);
    }
    // Ruta de session: establecer cookies de sesión (uso interno del SDK)
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
    const url = new URL(request.url);
    const hasTokens = url.searchParams.has("accessToken") ||
        url.searchParams.has("refreshToken");
    console.log("[SSO-FLOW] 📭 zas-sso-client GET handler", "\n  → pathname:", url.pathname, "\n  → hasTokens en URL:", hasTokens, hasTokens
        ? "→ ⚠️ RECHAZADO: tokens en GET es inseguro"
        : "→ GET normal (sin tokens)");
    if (hasTokens) {
        // Los tokens no deben enviarse por GET (se exponen en la URL, historial y logs).
        // Rechazar y redirigir al inicio de forma segura.
        return htmlError("Insecure callback: tokens must not be sent via GET. Use POST instead.", 405);
    }
    // GET sin tokens: redirigir al appUrl
    const appUrl = getAppUrl();
    if (appUrl) {
        return NextResponse.redirect(appUrl, { status: 302 });
    }
    return NextResponse.json({ ok: true, message: "SSO callback ready" });
}
export const handlers = { GET, POST, DELETE };
//# sourceMappingURL=handlers.js.map