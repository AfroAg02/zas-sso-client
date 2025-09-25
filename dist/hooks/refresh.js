"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Refresh;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const server_actions_1 = require("../services/server-actions");
const use_auth_1 = require("./use-auth");
const url_1 = require("../lib/url");
const decode_1 = require("../lib/decode");
function Refresh({ children }) {
    const session = (0, use_auth_1.useAuth)();
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        setError(null); // reset error on session change
        if (!session?.tokens?.accessToken || !session?.tokens?.refreshToken) {
            console.log("No accessToken or refreshToken present");
            return;
        }
        const { accessToken } = session.tokens;
        const tokenClaims = (0, decode_1.getJWTClaims)(accessToken);
        if (!tokenClaims?.exp) {
            console.log("No exp in token claims");
            return;
        }
        const now = Math.floor(Date.now() / 1000);
        const refreshThreshold = 30; // segundos antes de que expire
        const expiresIn = tokenClaims.exp - now;
        const refreshInMs = Math.max((expiresIn - refreshThreshold) * 1000, 0);
        console.log(`Scheduling token refresh in ${refreshInMs / 1000}s`);
        const timeoutId = setTimeout(async () => {
            console.log("AccessToken expired (or near expiration), attempting refresh");
            const response = await (0, server_actions_1.refreshTokens)();
            if (response?.message) {
                setError(response.message);
                console.error("Error refreshing tokens:", response);
            }
            else {
                console.log("Tokens refreshed successfully:", response);
            }
        }, refreshInMs);
        return () => clearTimeout(timeoutId); // limpiar cuando cambie el session
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.tokens]);
    if (error) {
        console.error("Error refreshing session, redirecting to login");
        (0, url_1.redirectToLogin)({ preservePath: true });
    }
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
}
//# sourceMappingURL=refresh.js.map