"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENDPOINTS = void 0;
exports.ENDPOINTS = {
    permissions: `https://api.zasdistributor.com/api/me/permissions`,
    check: (code) => `https://api.zasdistributor.com/api/me/permissions/${encodeURIComponent(code)}/check`,
};
//# sourceMappingURL=lib.js.map