"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = exports.buildApiResponseAsync = exports.handleApiServerError = exports.isApiError = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(error) {
        super();
        this.title = error.title ?? "";
        this.status = error.status;
        this.detail = error.detail ?? "";
    }
    toString() {
        return `${this.title} - ${this.status} - ${this.detail.toString()}`;
    }
}
exports.ApiError = ApiError;
const isApiError = (error) => {
    if (error instanceof ApiError)
        return true;
    return false;
};
exports.isApiError = isApiError;
const handleApiServerError = async (response) => {
    try {
        const contentType = response.headers.get("content-type");
        if (response.status === 401) {
            // await refreshServerSession();
            return {
                error: true,
                status: response.status,
                message: "No autorizado. Por favor, inicia sesión nuevamente.",
            };
        }
        if (contentType?.includes("application/json")) {
            const error = await response.json();
            console.error("API Error:", { error, url: response.url });
            return {
                error: true,
                status: response.status,
                message: (0, exports.getErrorMessage)(error),
            };
        }
        else {
            // No es JSON, intentamos obtener texto plano
            const errorText = await response.text();
            console.error("API Error on text:", { error: errorText, url: response });
            return {
                error: true,
                status: response.status,
                message: errorText || "Ocurrió un error inesperado",
            };
        }
    }
    catch (err) {
        console.error("Error parsing response:", err, response.url);
        return {
            error: true,
            status: response.status,
            message: "Unexpected server error",
        };
    }
};
exports.handleApiServerError = handleApiServerError;
const buildApiResponseAsync = async (response) => {
    try {
        if (response.status === 204 ||
            response.headers.get("content-length") === "0") {
            return await Promise.resolve({
                data: null,
                error: false,
                status: response.status,
            });
        }
        const data = await response.json();
        return await Promise.resolve({
            data,
            error: false,
            status: response.status,
        });
    }
    catch (e) {
        if ((0, exports.isApiError)(e)) {
            return { ...e, title: e.title, error: true };
        }
        return { status: 500, error: true };
    }
};
exports.buildApiResponseAsync = buildApiResponseAsync;
const getErrorMessage = (error) => {
    if (typeof error === "string")
        return error;
    if (error instanceof Error)
        return error.message;
    if (error instanceof ApiError)
        return error.detail;
    if ((0, exports.isApiError)(error))
        return error.detail;
    if (Array.isArray(error)) {
        return error.map(e => e.detail).join(", ");
    }
    return "Ocurrió un error inesperado...";
};
exports.getErrorMessage = getErrorMessage;
//# sourceMappingURL=api.js.map