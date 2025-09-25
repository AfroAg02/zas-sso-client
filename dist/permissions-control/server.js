"use server";
import { getCookiesSession } from "../services/server-actions";
import { ENDPOINTS } from "./lib";
// Base fetch options builder
function authHeaders(token) {
    if (token)
        return { Authorization: `Bearer ${token}` };
    return {}; // explicit object typed as Record<string,string>
}
export async function fetchMyPermissions() {
    const session = await getCookiesSession();
    if (!session?.tokens?.accessToken)
        throw new Error("No session");
    const res = await fetch(ENDPOINTS.permissions, {
        method: "GET",
        headers: { ...authHeaders(session.tokens.accessToken) },
        cache: "no-store",
    });
    if (!res.ok) {
        if (res.status === 401)
            throw new Error("Unauthorized");
        throw new Error(`Failed to load permissions (${res.status})`);
    }
    return res.json();
}
export async function checkPermission(code) {
    const session = await getCookiesSession();
    if (!session?.tokens?.accessToken)
        throw new Error("No session");
    const res = await fetch(ENDPOINTS.check(code), {
        method: "GET",
        headers: { ...authHeaders(session.tokens.accessToken) },
        cache: "no-store",
    });
    if (res.status === 200)
        return true;
    if (res.status === 403)
        return false;
    if (res.status === 401)
        throw new Error("Unauthorized");
    if (res.status === 400) {
        const body = await res.json();
        throw new Error(body?.detail || "Invalid request");
    }
    throw new Error(`Unexpected status ${res.status}`);
}
//# sourceMappingURL=server.js.map