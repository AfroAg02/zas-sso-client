"use client";
import { useQuery } from "@tanstack/react-query";
import { checkPermission, fetchMyPermissions, } from "./server";
/**
 * usePermissions
 * Usa la server function fetchMyPermissions (session interna) para traer los permisos del usuario.
 */
export function usePermissions(options) {
    const { enabled = true, staleTime = 60000 } = options || {};
    return useQuery({
        queryKey: ["permissions", "me"],
        enabled,
        staleTime,
        queryFn: () => fetchMyPermissions(),
    });
}
/**
 * usePermissionCheck
 * Verifica un código de permiso usando la server function checkPermission.
 */
export function usePermissionCheck(code, options) {
    const { enabled = true, refetchInterval, staleTime = 30000 } = options || {};
    return useQuery({
        queryKey: ["permission", "check", code],
        enabled: enabled && !!code,
        refetchInterval,
        staleTime,
        queryFn: () => {
            if (!code)
                throw new Error("Permission code requerido");
            return checkPermission(code);
        },
    });
}
//# sourceMappingURL=hooks.js.map