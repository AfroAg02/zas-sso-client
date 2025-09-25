"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRedirectUrl = parseRedirectUrl;
function parseRedirectUrl(redirectTo, baseOrigin) {
    let target;
    try {
        if (/^https?:\/\//i.test(redirectTo)) {
            const rUrl = new URL(redirectTo);
            target = rUrl.origin === baseOrigin ? rUrl.toString() : baseOrigin + "/"; // solo mismo origin
        }
        else {
            target = new URL(redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`, baseOrigin).toString();
        }
    }
    catch {
        target = baseOrigin + "/";
    }
    return target;
}
//# sourceMappingURL=parse-redirect-url.js.map