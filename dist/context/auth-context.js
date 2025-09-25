"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { getCookiesSession, deleteCookiesSession as serverCleanSession, } from "../services/server-actions";
const initialSession = { user: null, tokens: null };
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(initialSession.user);
    const [tokens, setTokens] = useState(initialSession.tokens);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const setSession = useCallback((session) => {
        setUser(session.user);
        setTokens(session.tokens);
        setError(null);
    }, []);
    const internalClear = useCallback(() => {
        setUser(null);
        setTokens(null);
        setError(null);
    }, []);
    const clearSession = useCallback(async (callbacks) => {
        setIsLoading(true);
        try {
            await serverCleanSession(); // no pasamos callbacks al server action
            internalClear();
            callbacks?.onSuccess?.();
        }
        catch (e) {
            console.error(e);
            setError("Failed to clear session");
            callbacks?.onError?.(e);
        }
        finally {
            setIsLoading(false);
        }
    }, [internalClear]);
    const reloadSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const session = await getCookiesSession();
            if (session.shouldClear) {
                await serverCleanSession();
            }
            if (session?.tokens) {
                setSession(session);
            }
            else {
                internalClear();
                setError("Failed to load session");
            }
        }
        catch (e) {
            console.error(e);
            setError("Failed to load session");
        }
        finally {
            setIsLoading(false);
        }
    }, [internalClear, setSession]);
    useEffect(() => {
        reloadSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const status = useMemo(() => isLoading
        ? "loading"
        : tokens?.accessToken
            ? "authenticated"
            : "unauthenticated", [isLoading, tokens?.accessToken]);
    const value = {
        user,
        tokens,
        isLoading,
        error,
        status,
        setSession,
        signOut: clearSession,
        reloadSession,
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export function useAuthContext() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuthContext must be used within <AuthProvider>");
    }
    return ctx;
}
//# sourceMappingURL=auth-context.js.map