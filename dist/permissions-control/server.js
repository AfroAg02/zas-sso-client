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
    if (!session?.tokens?.accessToken) {
        return { status: 401, error: "No session" };
    }
    const all = [];
    let page = 1;
    const pageSize = 10000;
    console.log("Fetching permissions from server...", ENDPOINTS.permissions);
    while (true) {
        const url = `${ENDPOINTS.permissions}?page=${page}&pageSize=${pageSize}`;
        const res = await fetch(url, {
            method: "GET",
            headers: { ...authHeaders(session.tokens.accessToken) },
            cache: "no-store",
        });
        if (!res.ok) {
            if (res.status === 401) {
                return { status: 401, error: "Unauthorized" };
            }
            // Try to extract error detail if available
            let detail;
            try {
                const body = await res.json();
                detail = body?.detail;
            }
            catch { }
            return {
                status: res.status,
                error: detail || `Failed to load permissions (${res.status})`,
            };
        }
        const body = (await res.json());
        if (Array.isArray(body.data))
            all.push(...body.data);
        if (!body.hasNext)
            break;
        page += 1;
    }
    return { status: 200, data: all };
}
export async function checkPermission(code) {
    const session = await getCookiesSession();
    if (!session?.tokens?.accessToken) {
        return { status: 401, error: "No session" };
    }
    const res = await fetch(ENDPOINTS.check(code), {
        method: "GET",
        headers: { ...authHeaders(session.tokens.accessToken) },
        cache: "no-store",
    });
    if (res.status === 200)
        return { status: 200, data: { allowed: true } };
    if (res.status === 403)
        return { status: 403, data: { allowed: false } };
    if (res.status === 401)
        return { status: 401, error: "Unauthorized" };
    if (res.status === 400) {
        try {
            const body = await res.json();
            return {
                status: 400,
                error: body?.detail || "Invalid request",
            };
        }
        catch {
            return { status: 400, error: "Invalid request" };
        }
    }
    return { status: res.status, error: `Unexpected status ${res.status}` };
}
//# sourceMappingURL=server.js.map