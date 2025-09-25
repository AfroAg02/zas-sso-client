"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = void 0;
exports.useAuthContext = useAuthContext;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const server_actions_1 = require("../services/server-actions");
const initialSession = { user: null, tokens: null };
const AuthContext = (0, react_1.createContext)(undefined);
const AuthProvider = ({ children }) => {
    const [user, setUser] = (0, react_1.useState)(initialSession.user);
    const [tokens, setTokens] = (0, react_1.useState)(initialSession.tokens);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const setSession = (0, react_1.useCallback)((session) => {
        setUser(session.user);
        setTokens(session.tokens);
        setError(null);
    }, []);
    const internalClear = (0, react_1.useCallback)(() => {
        setUser(null);
        setTokens(null);
        setError(null);
    }, []);
    const clearSession = (0, react_1.useCallback)(async (callbacks) => {
        setIsLoading(true);
        try {
            await (0, server_actions_1.deleteCookiesSession)(); // no pasamos callbacks al server action
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
    const reloadSession = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        try {
            const session = await (0, server_actions_1.getCookiesSession)();
            if (session.shouldClear) {
                await (0, server_actions_1.deleteCookiesSession)();
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
    (0, react_1.useEffect)(() => {
        reloadSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const status = (0, react_1.useMemo)(() => isLoading
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
    return (0, jsx_runtime_1.jsx)(AuthContext.Provider, { value: value, children: children });
};
exports.AuthProvider = AuthProvider;
function useAuthContext() {
    const ctx = (0, react_1.useContext)(AuthContext);
    if (!ctx) {
        throw new Error("useAuthContext must be used within <AuthProvider>");
    }
    return ctx;
}
//# sourceMappingURL=auth-context.js.map