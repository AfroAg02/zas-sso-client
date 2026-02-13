import { getEndpoints } from "../init-config";

export const ENDPOINTS = {
  get permissions() {
    return getEndpoints().permissions!;
  },
  check: (code: string) =>
    `${getEndpoints().permissions}/${encodeURIComponent(code)}/check`,
};
