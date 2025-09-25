import { Permission } from "./server";
/**
 * usePermissions
 * Usa la server function fetchMyPermissions (session interna) para traer los permisos del usuario.
 */
export declare function usePermissions(options?: {
    enabled?: boolean;
    staleTime?: number;
}): import("@tanstack/react-query").UseQueryResult<Permission[], Error>;
/**
 * usePermissionCheck
 * Verifica un código de permiso usando la server function checkPermission.
 */
export declare function usePermissionCheck(code: string | undefined, options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
}): import("@tanstack/react-query").UseQueryResult<boolean, Error>;
//# sourceMappingURL=hooks.d.ts.map