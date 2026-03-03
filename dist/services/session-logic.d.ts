import { SessionData } from "../types";
/**
 * Procesa la sesión cifrada:
 * 1. Desencripta.
 * 2. Valida que existan tokens mínimos.
 *
 * Retorna el objeto de sesión (sin refrescar tokens),
 * y un flag 'refreshed' siempre en false.
 */
export declare function processSession(encryptedSession: string | undefined): Promise<{
    session: SessionData;
    refreshed: boolean;
    error?: any;
}>;
//# sourceMappingURL=session-logic.d.ts.map