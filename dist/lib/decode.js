export function getJWTClaims(jwtToken) {
    if (!jwtToken)
        return null;
    try {
        // Extrae el payload (la parte central del JWT)
        const payloadBase64 = jwtToken.split('.')[1];
        // Corrige el padding y reemplazos de base64url a base64 estándar
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        // Decodifica el payload
        const jsonPayload = decodeURIComponent(atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''));
        const claims = JSON.parse(jsonPayload);
        // Convierte iat y exp a fechas si existen
        const issuedAt = claims.iat ? new Date(claims.iat * 1000) : null;
        const expiresAt = claims.exp ? new Date(claims.exp * 1000) : null;
        return {
            iat: claims.iat,
            exp: claims.exp,
            issuedAt,
            expiresAt
        };
    }
    catch (e) {
        console.error('Token inválido', e);
        return null;
    }
}
//# sourceMappingURL=decode.js.map