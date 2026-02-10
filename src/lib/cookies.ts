"use server";
import { cookies } from "next/headers";
import { SessionData } from "../types";
import { encrypt } from "./crypto";
import { getConfig } from "../init-config";
import { FgMagenta, Reset } from "../services/session-logic";

export async function setSessionCookies(data: SessionData) {
  console.log(
    FgMagenta +
      "[setSessionCookies]" +
      Reset,
  );
  const c = await cookies();
  const encryptedData = await encrypt(JSON.stringify(data));
  const options = await getSessionCookieOptions();
  c.set(options.name, encryptedData, options);
}

export async function getSessionCookieOptions() {
  const config = getConfig();
  return {
    name: config.COOKIE_SESSION_NAME,
    maxAge: config.MAX_COOKIES_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function readCookies() {
  const c = await cookies();
  return c.get(getConfig().COOKIE_SESSION_NAME)?.value;
}

export async function clearSessionCookies() {
  const c = await cookies();
  c.delete(getConfig().COOKIE_SESSION_NAME);
}
