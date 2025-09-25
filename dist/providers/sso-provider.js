"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { AuthProvider } from "../context/auth-context";
import Refresh from "../hooks/refresh";
export default function SSOProvider({ children }) {
    return _jsx(AuthProvider, { children: _jsx(Refresh, { children: children }) });
}
//# sourceMappingURL=sso-provider.js.map