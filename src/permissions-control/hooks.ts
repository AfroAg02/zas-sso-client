"use client";

import { useQuery } from "@tanstack/react-query";
import {
  checkPermission,
  fetchMyPermissions,
  Permission,
  ApiResult,
} from "./server";

/**
 * usePermissions
 * Usa la server function fetchMyPermissions (session interna) para traer los permisos del usuario.
 */
export function usePermissions(options?: {
  enabled?: boolean;
  staleTime?: number; // default 60s
}) {
  const { enabled = true, staleTime = 60_000 } = options || {};
  return useQuery<ApiResult<Permission[]>, Error>({
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
export function usePermissionCheck(
  code: string | undefined,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number; // default 30s
  },
) {
  const { enabled = true, refetchInterval, staleTime = 30_000 } = options || {};
  return useQuery<ApiResult<{ allowed: boolean }>, Error>({
    queryKey: ["permission", "check", code],
    enabled: enabled && !!code,
    refetchInterval,
    staleTime,
    queryFn: () => {
      if (!code) throw new Error("Permission code requerido");
      return checkPermission(code);
    },
  });
}
