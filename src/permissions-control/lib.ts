const permissionsBaseEnv = process.env.NEXT_PUBLIC_PERMISSIONS_ENDPOINT?.trim();
const defaultPermissionsBase =
  "https://api.zasdistributor.com/api/me/permissions";
const permissionsBase = (
  permissionsBaseEnv && permissionsBaseEnv.length > 0
    ? permissionsBaseEnv
    : defaultPermissionsBase
).replace(/\/+$/, "");

export const ENDPOINTS = {
  permissions: permissionsBase,
  check: (code: string) =>
    `${permissionsBase}/${encodeURIComponent(code)}/check`,
};
