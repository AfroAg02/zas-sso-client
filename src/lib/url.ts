import { redirect as nextRedirect } from "next/navigation";
import { getAppUrl, getregisterCallbackUri, getSsoUrl } from "../init-config";
import { generateStateBase64Url } from "./crypto";

/**
 * Construye la URL de login SSO incluyendo un "state" aleatorio y el redirect de callback.
 */
export const getLoginUrl = () => {
  const state = generateStateBase64Url();
  const url = new URL(`${getSsoUrl()}`);
  url.searchParams.set("state", state);
  const redirectUri = `${getAppUrl()}/api/sso/callback`;
  const registerCallbackUri = getregisterCallbackUri();
  console.log("Register Callback URI:", registerCallbackUri);
  if (registerCallbackUri && registerCallbackUri !== "/") {
    url.searchParams.set(
      "register_callback_uri",
      `${getAppUrl()}${registerCallbackUri}`
    );
  }
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
};

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
export function redirectToLogin(opts: RedirectToLoginOptions = {}) {
  const {
    preservePath = false,
    replace = false,
    fromParamName = "from",
  } = opts;
  let loginUrl = getLoginUrl();

  if (preservePath) {
    // Solo añadimos el path actual si estamos en cliente y tenemos window
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : undefined;
    if (currentPath) {
      const urlObj = new URL(loginUrl);
      // Evita sobrescribir si ya existe
      if (!urlObj.searchParams.get(fromParamName)) {
        urlObj.searchParams.set(fromParamName, currentPath);
      }
      loginUrl = urlObj.toString();
    }
  }

  if (typeof window === "undefined") {
    // Entorno server
    return nextRedirect(loginUrl);
  }

  if (replace) {
    window.location.replace(loginUrl);
  } else {
    window.location.assign(loginUrl);
  }
}
