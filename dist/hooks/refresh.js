"use client";
import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { refreshTokens } from "../services/server-actions";
import { useAuth } from "./use-auth";
import { redirectToLogin } from "../lib/url";
import { getJWTClaims } from "../lib/decode";
export default function Refresh({ children }) {
    const session = useAuth();
    const [error, setError] = useState(null);
    useEffect(() => {
        setError(null); // reset error on session change
        if (!session?.tokens?.accessToken || !session?.tokens?.refreshToken) {
            console.warn("No tokens available, not redirecting due to config");
            return;
        }
        const { accessToken } = session.tokens;
        const tokenClaims = getJWTClaims(accessToken);
        if (!tokenClaims?.exp) {
            console.error("No exp in token claims");
            return;
        }
        const now = Math.floor(Date.now() / 1000);
        const refreshThreshold = 30; // segundos antes de que expire
        const expiresIn = tokenClaims.exp - now;
        const refreshInMs = Math.max((expiresIn - refreshThreshold) * 1000, 0);
        const timeoutId = setTimeout(async () => {
            const response = await refreshTokens();
            if (response?.message) {
                setError(response.message);
                console.error("Error refreshing tokens:", response);
            }
        }, refreshInMs);
        return () => clearTimeout(timeoutId); // limpiar cuando cambie el session
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.tokens]);
    if (error) {
        console.error("Error refreshing session, redirecting to login");
        redirectToLogin({ preservePath: true });
    }
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=refresh.js.map