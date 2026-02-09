import { NextResponse } from "next/server";
import { getRedirectUri, getAppUrl } from "../init-config";
import { parseRedirectUrl } from "../lib/parse-redirect-url"; // Ajusta ruta real
import { authenticateWithTokens } from "./server-actions"; // Ajusta ruta real
import { clearSessionCookies, setSessionCookies } from "../lib/cookies";
// Orígenes permitidos (puedes ampliar)
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
        console.error("[handlers] Error setting cookies:", e);
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
        console.error("[handlers] Error clearing cookies:", e);
        return jsonError("Failed to clear session cookies", 500, null);
    }
}
export async function GET(request) {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);
    // Parámetros esperados
    const accessToken = url.searchParams.get("accessToken");
    const refreshToken = url.searchParams.get("refreshToken");
    // Unifica: usa "redirect" (o "redirectTo"). Aquí uso "redirect".
    if (!accessToken)
        return jsonError("Missing accessToken", 400, origin);
    if (!refreshToken)
        return jsonError("Missing refreshToken", 400, origin);
    const result = await authenticateWithTokens({ accessToken, refreshToken }, { onError: (e) => console.error("[callback] authenticate error", e) });
    if (result.error || !result.data) {
        return jsonError("Invalid credentials or user fetch failed", result.status || 401, origin);
    }
    const redirectUri = getRedirectUri();
    // Redirección segura (sanitize)
    const safeUrl = new URL(parseRedirectUrl(redirectUri, getAppUrl() || url.origin));
    safeUrl.searchParams.delete("accessToken");
    safeUrl.searchParams.delete("refreshToken");
    safeUrl.searchParams.delete("state");
    const safeRedirect = safeUrl.toString();
    console.log("[callback] redirecting to", safeRedirect);
    const res = NextResponse.redirect(safeRedirect, { status: 302 });
    return res;
}
export const handlers = { GET, POST, DELETE };
//# sourceMappingURL=handlers.js.map