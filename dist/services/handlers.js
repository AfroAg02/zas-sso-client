"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlers = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const init_config_1 = require("../init-config");
const parse_redirect_url_1 = require("../lib/parse-redirect-url"); // Ajusta ruta real
const server_actions_1 = require("./server-actions"); // Ajusta ruta real
// Orígenes permitidos (puedes ampliar)
function jsonError(message, status, origin, extra) {
    const res = server_1.NextResponse.json({ ok: false, error: message, ...extra }, { status });
    return res;
}
async function GET(request) {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);
    console.log("[  ]SSO Callback URL:", url.toString());
    // Parámetros esperados
    const accessToken = url.searchParams.get("accessToken");
    const refreshToken = url.searchParams.get("refreshToken");
    // Unifica: usa "redirect" (o "redirectTo"). Aquí uso "redirect".
    if (!accessToken)
        return jsonError("Missing accessToken", 400, origin);
    if (!refreshToken)
        return jsonError("Missing refreshToken", 400, origin);
    const result = await (0, server_actions_1.authenticateWithTokens)({ accessToken, refreshToken }, { onError: (e) => console.error("[callback] authenticate error", e) });
    if (result.error || !result.data) {
        return jsonError("Invalid credentials or user fetch failed", result.status || 401, origin);
    }
    const redirectUri = (0, init_config_1.getRedirectUri)();
    console.log("Authentication successful:", redirectUri);
    // Redirección segura (sanitize)
    const safeUrl = new URL((0, parse_redirect_url_1.parseRedirectUrl)(redirectUri, url.origin));
    safeUrl.searchParams.delete("accessToken");
    safeUrl.searchParams.delete("refreshToken");
    safeUrl.searchParams.delete("state");
    const safeRedirect = safeUrl.toString();
    const res = server_1.NextResponse.redirect(safeRedirect, { status: 302 });
    return res;
}
exports.handlers = { GET };
//# sourceMappingURL=handlers.js.map