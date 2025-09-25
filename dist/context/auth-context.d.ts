import React from "react";
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
export declare const AuthProvider: ({ children }: {
    children: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare function useAuthContext(): AuthContextState;
//# sourceMappingURL=auth-context.d.ts.map