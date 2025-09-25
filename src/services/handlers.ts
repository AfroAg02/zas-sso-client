import { NextResponse } from "next/server";
import { getRedirectUri, NEXT_PUBLIC_APP_URL } from "../init-config";
import { parseRedirectUrl } from "../lib/parse-redirect-url"; // Ajusta ruta real
import { authenticateWithTokens } from "./server-actions"; // Ajusta ruta real

// Orígenes permitidos (puedes ampliar)

function jsonError(
  message: string,
  status: number,
  origin: string | null,
  extra?: any
) {
  const res = NextResponse.json(
    { ok: false, error: message, ...extra },
    { status }
  );
  return res;
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  console.log("[  ]SSO Callback URL:", url.toString());
  // Parámetros esperados
  const accessToken = url.searchParams.get("accessToken");
  const refreshToken = url.searchParams.get("refreshToken");
  // Unifica: usa "redirect" (o "redirectTo"). Aquí uso "redirect".

  if (!accessToken) return jsonError("Missing accessToken", 400, origin);
  if (!refreshToken) return jsonError("Missing refreshToken", 400, origin);

  const result = await authenticateWithTokens(
    { accessToken, refreshToken },
    { onError: (e: any) => console.error("[callback] authenticate error", e) }
  );

  if (result.error || !result.data) {
    return jsonError(
      "Invalid credentials or user fetch failed",
      result.status || 401,
      origin
    );
  }
  const redirectUri = getRedirectUri();
  console.log("Authentication successful:", redirectUri);
  // Redirección segura (sanitize)
  const safeUrl = new URL(
    parseRedirectUrl(redirectUri, NEXT_PUBLIC_APP_URL || url.origin)
  );
  safeUrl.searchParams.delete("accessToken");
  safeUrl.searchParams.delete("refreshToken");
  safeUrl.searchParams.delete("state");
  const safeRedirect = safeUrl.toString();
  const res = NextResponse.redirect(safeRedirect, { status: 302 });
  return res;
}
export const handlers = { GET };
