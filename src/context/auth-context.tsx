"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getCookiesSession,
  deleteCookiesSession as serverCleanSession,
} from "../services/server-actions";
import { SessionData } from "../types";

export interface AuthContextState extends SessionData {
  isLoading: boolean;
  error: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  setSession: (session: SessionData) => void;
  signOut: (callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
  }) => Promise<void> | void;
  reloadSession: () => Promise<void>;
}

const initialSession: SessionData = { user: null, tokens: null };

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SessionData["user"]>(initialSession.user);
  const [tokens, setTokens] = useState<SessionData["tokens"]>(
    initialSession.tokens
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setSession = useCallback((session: SessionData) => {
    setUser(session.user);
    setTokens(session.tokens);
    setError(null);
  }, []);

  const internalClear = useCallback(() => {
    setUser(null);
    setTokens(null);
    setError(null);
  }, []);

  const clearSession = useCallback(
    async (callbacks?: {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
    }) => {
      setIsLoading(true);
      try {
        await serverCleanSession(); // no pasamos callbacks al server action
        internalClear();
        callbacks?.onSuccess?.();
      } catch (e) {
        console.error(e);
        setError("Failed to clear session");
        callbacks?.onError?.(e);
      } finally {
        setIsLoading(false);
      }
    },
    [internalClear]
  );

  const reloadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await getCookiesSession();
      if (session.shouldClear) {
        await serverCleanSession();
      }
      if (session?.tokens) {
        setSession(session);
      } else {
        internalClear();
        setError("Failed to load session");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, [internalClear, setSession]);

  useEffect(() => {
    reloadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status: AuthContextState["status"] = useMemo(
    () =>
      isLoading
        ? "loading"
        : tokens?.accessToken
        ? "authenticated"
        : "unauthenticated",
    [isLoading, tokens?.accessToken]
  );

  const value: AuthContextState = {
    user,
    tokens,
    isLoading,
    error,
    status,
    setSession,
    signOut: clearSession,
    reloadSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within <AuthProvider>");
  }
  return ctx;
}
