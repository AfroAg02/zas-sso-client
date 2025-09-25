"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = void 0;
exports.generateStateBase64Url = generateStateBase64Url;
const jose_1 = require("jose");
const SALT_LENGTH = 16; // bytes
const ITERATIONS = 100000;
const ENC = "A256GCM"; // 256-bit AES-GCM
const ALG = "dir"; // direct symmetric key
function getSecret() {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret)
        throw new Error("ENCRYPTION_SECRET env var is required");
    return secret;
}
const te = new TextEncoder();
const td = new TextDecoder();
async function deriveKeyRaw(secret, salt) {
    // Derivamos 256 bits usando PBKDF2 SHA-256
    const baseKey = await crypto.subtle.importKey("raw", te.encode(secret), { name: "PBKDF2" }, false, ["deriveBits"]);
    // Create an ArrayBuffer containing exactly the salt bytes to satisfy BufferSource typing
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, baseKey, 256);
    return new Uint8Array(bits);
}
function toHex(buf) {
    return Array.from(buf)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
function fromHex(hex) {
    if (hex.length % 2 !== 0)
        throw new Error("Invalid hex length");
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return arr;
}
const encrypt = async (text) => {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const keyBytes = await deriveKeyRaw(getSecret(), salt);
    // Usamos jose CompactEncrypt con key simétrica derivada.
    const jwe = await new jose_1.CompactEncrypt(te.encode(text))
        .setProtectedHeader({ alg: ALG, enc: ENC })
        .encrypt(keyBytes);
    // Formato: saltHex:JWE  (rompe compatibilidad con formato previo, pero decrypt soporta fallback)
    return `${toHex(salt)}:${jwe}`;
};
exports.encrypt = encrypt;
const decrypt = async (encryptedText) => {
    if (!encryptedText)
        throw new Error("Empty encrypted text");
    // Intentar nuevo formato saltHex:JWE
    const firstColon = encryptedText.indexOf(":");
    if (firstColon === -1) {
        // Intentar legacy (4 partes)
        return legacyDecrypt(encryptedText);
    }
    const saltHex = encryptedText.slice(0, firstColon);
    const jwe = encryptedText.slice(firstColon + 1);
    // Heurística: JWE Compact tiene exactamente 4 puntos (5 partes). Para alg "dir" el segundo segmento (Encrypted Key) puede ser vacío,
    // produciendo dos puntos consecutivos (ej: header..iv.ciphertext.tag). El regex original exigía contenido en cada parte y fallaba.
    const dotCount = (jwe.match(/\./g) || []).length;
    if (dotCount !== 4) {
        // No parece JWE -> fallback legacy
        return legacyDecrypt(encryptedText);
    }
    try {
        const salt = fromHex(saltHex);
        const keyBytes = await deriveKeyRaw(getSecret(), salt);
        const { plaintext } = await (0, jose_1.compactDecrypt)(jwe, keyBytes);
        return td.decode(plaintext);
    }
    catch (e) {
        console.error("Decryption failed (jwe path):", e);
        throw new Error("Decryption failed");
    }
};
exports.decrypt = decrypt;
// Soporte de lectura del formato antiguo (salt:iv:tag:cipher) - ya no se genera, pero se intenta descifrar si aparece.
async function legacyDecrypt(encryptedText) {
    const parts = encryptedText.split(":");
    if (parts.length !== 4) {
        console.error("Invalid encrypted format (legacy). Received:", encryptedText);
        throw new Error("Invalid encrypted format");
    }
    throw new Error("Legacy encryption format no longer supported in Edge version");
}
function generateStateBase64Url(bytes = 16) {
    const rnd = new Uint8Array(bytes);
    crypto.getRandomValues(rnd);
    return jose_1.base64url.encode(rnd); // p.ej: "qVt2o9bq3f0Lk1v0iUF7NQ"
}
//# sourceMappingURL=crypto.js.map