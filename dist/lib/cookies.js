"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSessionCookies = setSessionCookies;
exports.readCookies = readCookies;
exports.clearSessionCookies = clearSessionCookies;
const headers_1 = require("next/headers");
const init_config_1 = require("../init-config");
const crypto_1 = require("./crypto");
async function setSessionCookies(data) {
    const c = await (0, headers_1.cookies)();
    const encryptedData = await (0, crypto_1.encrypt)(JSON.stringify(data));
    const name = (0, init_config_1.getCookieName)();
    const age = (0, init_config_1.getMaxCookiesAge)();
    c.set(name, encryptedData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: age,
        path: "/",
    });
}
async function readCookies() {
    const c = await (0, headers_1.cookies)();
    return c.get((0, init_config_1.getCookieName)())?.value;
}
async function clearSessionCookies() {
    const c = await (0, headers_1.cookies)();
    c.delete((0, init_config_1.getCookieName)());
}
//# sourceMappingURL=cookies.js.map