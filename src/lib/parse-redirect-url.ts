export function parseRedirectUrl(
  redirectTo: string,
  baseOrigin: string
): string {
  let target: string;
  try {
    if (/^https?:\/\//i.test(redirectTo)) {
      const rUrl = new URL(redirectTo);
      target = rUrl.origin === baseOrigin ? rUrl.toString() : baseOrigin + "/"; // solo mismo origin
    } else {
      target = new URL(
        redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`,
        baseOrigin
      ).toString();
    }
  } catch {
    target = baseOrigin + "/";
  }

  return target;
}
