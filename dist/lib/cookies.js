"use server";
import { cookies } from "next/headers";
import { getCookieName, getMaxCookiesAge } from "../init-config";
import { encrypt } from "./crypto";
export async function setSessionCookies(data) {
    const c = await cookies();
    const encryptedData = await encrypt(JSON.stringify(data));
    const name = getCookieName();
    const age = getMaxCookiesAge();
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
    return c.get(getCookieName())?.value;
}
export async function clearSessionCookies() {
    const c = await cookies();
    c.delete(getCookieName());
}
//# sourceMappingURL=cookies.js.map