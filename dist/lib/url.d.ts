/**
 * Construye la URL de login SSO incluyendo un "state" aleatorio y el redirect de callback.
 */
export declare const getLoginUrl: () => string;
export type RedirectToLoginOptions = {
    /** Si true, añade la ruta actual como parámetro "from" para uso posterior */
    preservePath?: boolean;
    /** Usa replace() en vez de push/navigation normal (solo cliente) */
    replace?: boolean;
    /** Nombre de la query donde guardar el path actual (por defecto from) */
    fromParamName?: string;
};
/**
 * Redirige al login tanto en entorno server (middleware / server component / route handler)
 * como en cliente (componentes con "use client").
 *
 * En server usa next/navigation.redirect (lanza excepción controlada para cortar render).
 * En cliente usa window.location.assign o replace según la opción.
 */
export declare function redirectToLogin(opts?: RedirectToLoginOptions): any;
//# sourceMappingURL=url.d.ts.map