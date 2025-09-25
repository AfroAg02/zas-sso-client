// Edge-safe entrypoint: solo exports necesarios para middleware/SSR sin tocar React.
export { getRedirectUri, initSSO, SSO } from "./init-config";
export { getLoginUrl, redirectToLogin } from "./lib/url";
export { getJWTClaims } from "./lib/decode";
// Opcional: permisos server-side que no dependen de React
export {
  checkPermission,
  fetchMyPermissions,
} from "./permissions-control/server";
export {
  getCookiesSession,
  deleteCookiesSession as serverSignOut,
} from "./services/server-actions";
