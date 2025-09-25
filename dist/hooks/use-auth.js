"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = void 0;
const auth_context_1 = require("../context/auth-context");
const useAuth = () => {
    return (0, auth_context_1.useAuthContext)();
};
exports.useAuth = useAuth;
//# sourceMappingURL=use-auth.js.map