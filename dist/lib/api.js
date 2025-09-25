export class ApiError extends Error {
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
export const isApiError = (error) => {
    if (error instanceof ApiError)
        return true;
    return false;
};
export const handleApiServerError = async (response) => {
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
                message: getErrorMessage(error),
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
export const buildApiResponseAsync = async (response) => {
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
        if (isApiError(e)) {
            return { ...e, title: e.title, error: true };
        }
        return { status: 500, error: true };
    }
};
export const getErrorMessage = (error) => {
    if (typeof error === "string")
        return error;
    if (error instanceof Error)
        return error.message;
    if (error instanceof ApiError)
        return error.detail;
    if (isApiError(error))
        return error.detail;
    if (Array.isArray(error)) {
        return error.map(e => e.detail).join(", ");
    }
    return "Ocurrió un error inesperado...";
};
//# sourceMappingURL=api.js.map