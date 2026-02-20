import { NextResponse } from "next/server";
import { getRedirectUri, getAppUrl, getErrorRedirectUrl } from "../init-config";
import { parseRedirectUrl } from "../lib/parse-redirect-url"; // Ajusta ruta real
import { authenticateWithTokens } from "./server-actions"; // Ajusta ruta real
import { SessionData } from "../types";
import { clearSessionCookies, setSessionCookies } from "../lib/cookies";
import htmlError from "../utils/html-page-error";

// Orígenes permitidos (puedes ampliar)

function jsonError(
  message: string,
  status: number,
  origin: string | null,
  extra?: any,
) {
  const res = NextResponse.json(
    { ok: false, error: message, ...extra },
    { status },
  );
  return res;
}

export async function POST(request: Request) {
  const data = (await request.json()) as SessionData;
  try {
    await setSessionCookies(data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError("Failed to set session cookies", 500, null);
  }
}

export async function DELETE(request: Request) {
  const data = (await request.json()) as SessionData;
  try {
    await clearSessionCookies();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError("Failed to clear session cookies", 500, null);
  }
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Parámetros esperados
  const accessToken = url.searchParams.get("accessToken");
  const refreshToken = url.searchParams.get("refreshToken");
  // Unifica: usa "redirect" (o "redirectTo"). Aquí uso "redirect".

  // Helper local para aplicar la lógica de redirección de error o JSON
  const handleError = (message: string, status: number, extra?: any) => {
    const errorRedirectUrl = getErrorRedirectUrl();

    if (errorRedirectUrl) {
      // Si hay URL de redirección de error, priorizarla
      const redirectUrl = new URL(errorRedirectUrl);
      // Pasar información mínima del error como query si se desea
      redirectUrl.searchParams.set("error", message);
      redirectUrl.searchParams.set("status", String(status));
      return NextResponse.redirect(redirectUrl, { status: 302 });
    }

    // Fallback: respuesta JSON como antes
    return htmlError(message, status);
  };

  if (!accessToken) return handleError("Missing accessToken", 400);
  if (!refreshToken) return handleError("Missing refreshToken", 400);
  const result = await authenticateWithTokens({ accessToken, refreshToken });

  if (result.error || !result.data) {
    return handleError(
      "Invalid credentials or user fetch failed",
      result.status || 401,
      { origin },
    );
  }
  const redirectUri = getRedirectUri();
  // Redirección segura (sanitize)
  const safeUrl = new URL(
    parseRedirectUrl(redirectUri, getAppUrl() || url.origin),
  );
  safeUrl.searchParams.delete("accessToken");
  safeUrl.searchParams.delete("refreshToken");
  safeUrl.searchParams.delete("state");
  const safeRedirect = safeUrl.toString();
  const res = NextResponse.redirect(safeRedirect, { status: 302 });
  return res;
}
export const handlers = { GET, POST, DELETE };
