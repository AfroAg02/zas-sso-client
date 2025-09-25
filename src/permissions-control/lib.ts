export const ENDPOINTS = {
  permissions: `https://api.zasdistributor.com/api/me/permissions`,
  check: (code: string) => `https://api.zasdistributor.com/api/me/permissions/${encodeURIComponent(code)}/check`,
};
