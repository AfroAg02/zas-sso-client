import { SessionData, Tokens, User } from "../types";
import { ApiResponse } from "../types/fetch/api";
/**
 * Almacena de forma segura la sesión del usuario en las cookies.
 * @param session Objeto con los tokens y datos del usuario.
 * @param callbacks Funciones opcionales de éxito o error.
 */
export declare const persistUserSessionInCookies: (session: SessionData, callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}) => Promise<void>;
/**
 * Elimina las cookies de sesión y limpia el estado de autenticación.
 */
export declare const deleteCookiesSession: (callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}) => Promise<void>;
/**
 * Autentica al usuario por primera vez tras un login exitoso.
 */
export declare const authenticateWithTokens: (credentials: Tokens, callbacks?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}) => Promise<ApiResponse<User | null>>;
/**
 * Función principal para obtener la sesión.
 * Soporta refresco en caliente durante el renderizado.
 */
export declare const getCookiesSession: () => Promise<SessionData>;
/**
 * Obtiene el usuario. Se suele usar después de getCookiesSession.
 */
export declare const fetchUser: (accessToken: string) => Promise<ApiResponse<User>>;
//# sourceMappingURL=server-actions.d.ts.map