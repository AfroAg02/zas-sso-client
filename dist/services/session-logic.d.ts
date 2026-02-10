import { SessionData, Tokens } from "../types";
export declare const Reset = "\u001B[0m";
export declare const FgRed = "\u001B[31m";
export declare const FgGreen = "\u001B[32m";
export declare const FgYellow = "\u001B[33m";
export declare const FgCyan = "\u001B[36m";
export declare const FgMagenta = "\u001B[35m";
/**
 * Realiza el refresh contra tu API backend.
 * Devuelve los nuevos tokens o falla.
 */
export declare const refreshTokens: (refreshToken: string) => Promise<{
    success: boolean;
    tokens?: undefined;
} | {
    success: boolean;
    tokens: Tokens;
}>;
/**
 * Procesa la sesión cifrada:
 * 1. Desencripta.
 * 2. Verifica expiración de Access Token.
 * 3. Refresca si es necesario.
 *
 * Retorna el objeto de sesión (actualizado o no),
 * y un flag 'refreshed' para indicar si hubo cambios.
 */
export declare function processSession(encryptedSession: string | undefined): Promise<{
    session: SessionData;
    refreshed: boolean;
    error?: any;
}>;
//# sourceMappingURL=session-logic.d.ts.map