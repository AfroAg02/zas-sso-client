"use server";
import { cookies } from "next/headers";
import { SessionData } from "../types";
import { encrypt } from "./crypto";
import { getConfig } from "@/init-config";

export async function setSessionCookies(data: SessionData) {
  const c = await cookies();
  const encryptedData = await encrypt(JSON.stringify(data));
  const name = getConfig().COOKIE_SESSION_NAME;
  const age = getConfig().MAX_COOKIES_AGE;
  c.set(name, encryptedData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: age,
    path: "/",
  });
}

export async function readCookies() {
  const c = await cookies();
  return c.get(getConfig().COOKIE_SESSION_NAME)?.value;
}

export async function clearSessionCookies() {
  const c = await cookies();
  c.delete(getConfig().COOKIE_SESSION_NAME);
}
