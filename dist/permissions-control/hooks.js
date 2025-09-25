"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePermissions = usePermissions;
exports.usePermissionCheck = usePermissionCheck;
const react_query_1 = require("@tanstack/react-query");
const server_1 = require("./server");
/**
 * usePermissions
 * Usa la server function fetchMyPermissions (session interna) para traer los permisos del usuario.
 */
function usePermissions(options) {
    const { enabled = true, staleTime = 60000 } = options || {};
    return (0, react_query_1.useQuery)({
        queryKey: ["permissions", "me"],
        enabled,
        staleTime,
        queryFn: () => (0, server_1.fetchMyPermissions)(),
    });
}
/**
 * usePermissionCheck
 * Verifica un código de permiso usando la server function checkPermission.
 */
function usePermissionCheck(code, options) {
    const { enabled = true, refetchInterval, staleTime = 30000 } = options || {};
    return (0, react_query_1.useQuery)({
        queryKey: ["permission", "check", code],
        enabled: enabled && !!code,
        refetchInterval,
        staleTime,
        queryFn: () => {
            if (!code)
                throw new Error("Permission code requerido");
            return (0, server_1.checkPermission)(code);
        },
    });
}
//# sourceMappingURL=hooks.js.map