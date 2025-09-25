"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SSOProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
const auth_context_1 = require("../context/auth-context");
const refresh_1 = __importDefault(require("../hooks/refresh"));
function SSOProvider({ children }) {
    return (0, jsx_runtime_1.jsx)(auth_context_1.AuthProvider, { children: (0, jsx_runtime_1.jsx)(refresh_1.default, { children: children }) });
}
//# sourceMappingURL=sso-provider.js.map