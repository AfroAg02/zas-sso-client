import { CompactEncrypt, base64url, compactDecrypt } from "jose";
const SALT_LENGTH = 16; // bytes
const ITERATIONS = 100000;
const ENC = "A256GCM"; // 256-bit AES-GCM
const ALG = "dir"; // direct symmetric key
// --- Caché de claves derivadas -------------------------------------------------
//
// PBKDF2 a 100k iteraciones cuesta ~29 ms y corre en el threadpool de libuv (4 hilos
// por defecto), compartido con fs y con dns.lookup de cada fetch saliente. Como el
// salt viaja dentro del valor cifrado, la cookie de un usuario mantiene el MISMO salt
// hasta que se vuelve a emitir (login o refresh de token), así que la clave derivada
// se puede reutilizar sin tocar el formato en cable.
//
// Reglas del caché:
//  - Se indexa por `${huellaDelSecreto}:${saltHex}` para que una rotación de secreto
//    no devuelva jamás una clave obsoleta.
//  - Una clave sólo entra al caché DESPUÉS de descifrar correctamente un JWE, de modo
//    que nadie pueda llenarlo enviando cookies con salts aleatorios.
//  - Vive en globalThis para sobrevivir a reinstanciaciones del módulo dentro del
//    mismo isolate (Node y Edge tienen bundles distintos: cada uno tiene su caché).
const MAX_KEYS = 512; // ~unos cientos de bytes por handle
const KEY_TTL_MS = 30 * 60 * 1000; // deslizante: se renueva en cada acierto
const MAX_CONCURRENT_DERIVATIONS = 2; // deja hilos libres del threadpool para fs/dns
const MAX_DERIVATION_QUEUE = 32;
const MAX_FINGERPRINTS = 4;
const SALT_HEX_RE = /^[0-9a-f]{32}$/i;
const CACHE_SLOT = Symbol.for("zas-sso-client.keycache.v1");
function freshSlot() {
    return {
        v: 1,
        keys: new Map(),
        inflight: new Map(),
        base: new Map(),
        fingerprints: new Map(),
        salt: null,
        active: 0,
        queue: [],
    };
}
function getSlot() {
    const g = globalThis;
    const current = g[CACHE_SLOT];
    // Pueden convivir dos versiones del paquete en un mismo isolate: si la forma no es
    // la esperada, se descarta en lugar de romper.
    if (!current || current.v !== 1 || !(current.keys instanceof Map)) {
        const slot = freshSlot();
        g[CACHE_SLOT] = slot;
        return slot;
    }
    return current;
}
let secretWarned = false;
function getSecret() {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret)
        throw new Error("ENCRYPTION_SECRET env var is required");
    if (!secretWarned && secret.length < 32) {
        secretWarned = true;
        console.warn(`[zas-sso-client] ENCRYPTION_SECRET tiene ${secret.length} caracteres; se recomiendan 32 o más.`);
    }
    return secret;
}
const te = new TextEncoder();
const td = new TextDecoder();
// Copia a ArrayBuffer: satisface BufferSource sin pelear con los genéricos de
// Uint8Array<ArrayBufferLike> de TS 5.9.
function toArrayBuffer(bytes) {
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return copy;
}
// Semáforo: limita las derivaciones concurrentes para que una ráfaga de cookies
// inválidas no monopolice el threadpool (y con él dns.lookup de cada fetch).
async function acquireDerivationSlot(slot) {
    if (slot.active < MAX_CONCURRENT_DERIVATIONS) {
        slot.active += 1;
        return;
    }
    if (slot.queue.length >= MAX_DERIVATION_QUEUE) {
        throw new Error("Key derivation queue is full");
    }
    // Quien espera hereda el turno de quien lo libera (no vuelve a incrementar).
    await new Promise((resolve) => slot.queue.push(resolve));
}
function releaseDerivationSlot(slot) {
    const next = slot.queue.shift();
    if (next)
        next();
    else
        slot.active -= 1;
}
// Huella del secreto: SHA-256 real, nunca un hash barato — una colisión devolvería
// la clave equivocada y eso se traduce en cierre de sesión masivo.
function getSecretFingerprint(secret) {
    const slot = getSlot();
    const cached = slot.fingerprints.get(secret);
    if (cached)
        return cached;
    const pending = crypto.subtle
        .digest("SHA-256", toArrayBuffer(te.encode(secret)))
        .then((digest) => toHex(new Uint8Array(digest)).slice(0, 16));
    pending.catch(() => slot.fingerprints.delete(secret));
    if (slot.fingerprints.size >= MAX_FINGERPRINTS) {
        const oldest = slot.fingerprints.keys().next().value;
        if (oldest !== undefined)
            slot.fingerprints.delete(oldest);
    }
    slot.fingerprints.set(secret, pending);
    return pending;
}
function getBaseKey(secret, fingerprint) {
    const slot = getSlot();
    const cached = slot.base.get(fingerprint);
    if (cached)
        return cached;
    const pending = crypto.subtle.importKey("raw", toArrayBuffer(te.encode(secret)), { name: "PBKDF2" }, false, ["deriveKey"]);
    pending.catch(() => slot.base.delete(fingerprint));
    slot.base.set(fingerprint, pending);
    return pending;
}
function lookupKey(cacheKey) {
    const slot = getSlot();
    const entry = slot.keys.get(cacheKey);
    if (!entry)
        return null;
    if (entry.exp <= Date.now()) {
        slot.keys.delete(cacheKey);
        return null;
    }
    // TTL deslizante: una clave en uso no se re-deriva cada 30 minutos.
    entry.exp = Date.now() + KEY_TTL_MS;
    // Reinserta para que el orden del Map siga siendo el de uso (LRU).
    slot.keys.delete(cacheKey);
    slot.keys.set(cacheKey, entry);
    return entry.key;
}
function commitKey(cacheKey, key) {
    const slot = getSlot();
    slot.keys.set(cacheKey, { key, exp: Date.now() + KEY_TTL_MS });
    while (slot.keys.size > MAX_KEYS) {
        const oldest = slot.keys.keys().next().value;
        if (oldest === undefined)
            break;
        slot.keys.delete(oldest);
    }
}
/**
 * Deriva la clave AES-GCM (no extraíble) para un salt dado.
 * No la guarda en caché: eso lo decide quien llama, y sólo tras verificar el JWE.
 */
async function deriveKeyForSalt(secret, salt) {
    const fingerprint = await getSecretFingerprint(secret);
    const baseKey = await getBaseKey(secret, fingerprint);
    const slot = getSlot();
    await acquireDerivationSlot(slot);
    try {
        // Las dos usages son obligatorias: la misma entrada de caché se reutiliza para
        // cifrar, y jose v6 rechaza una clave sin "encrypt".
        return await crypto.subtle.deriveKey({
            name: "PBKDF2",
            salt: toArrayBuffer(salt),
            iterations: ITERATIONS,
            hash: "SHA-256",
        }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    }
    finally {
        releaseDerivationSlot(slot);
    }
}
/** Una sola derivación aunque lleguen N lecturas concurrentes del mismo salt. */
function deriveOnce(cacheKey, secret, salt) {
    const slot = getSlot();
    const inflight = slot.inflight.get(cacheKey);
    if (inflight)
        return inflight;
    const pending = deriveKeyForSalt(secret, salt).finally(() => {
        slot.inflight.delete(cacheKey);
    });
    // La copia almacenada no debe provocar unhandledRejection si nadie más la espera.
    pending.catch(() => undefined);
    slot.inflight.set(cacheKey, pending);
    return pending;
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
/**
 * Salt de escritura: uno aleatorio por isolate, no uno por cookie.
 *
 * Sigue siendo aleatorio (no se deriva del secreto, que convertiría la cookie en un
 * verificador offline barato del ENCRYPTION_SECRET), pero al compartirse entre las
 * cookies que emite un mismo proceso, el número de salts vivos pasa a ser del orden
 * de generaciones de proceso en lugar de usuarios. El formato no cambia: el salt
 * sigue viajando dentro del valor, así que versiones anteriores lo siguen leyendo.
 */
function getEncryptionSalt() {
    const slot = getSlot();
    if (!slot.salt) {
        slot.salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    }
    return slot.salt;
}
export const encrypt = async (text) => {
    const secret = getSecret();
    const salt = getEncryptionSalt();
    const saltHex = toHex(salt);
    const cacheKey = `${await getSecretFingerprint(secret)}:${saltHex}`;
    let key = lookupKey(cacheKey);
    if (!key) {
        // Salt propio: es de confianza, se guarda sin esperar a verificar nada.
        key = await deriveOnce(cacheKey, secret, salt);
        commitKey(cacheKey, key);
    }
    // Usamos jose CompactEncrypt con key simétrica derivada.
    const jwe = await new CompactEncrypt(te.encode(text))
        .setProtectedHeader({ alg: ALG, enc: ENC })
        .encrypt(key);
    // Formato: saltHex:JWE  (rompe compatibilidad con formato previo, pero decrypt soporta fallback)
    return `${saltHex}:${jwe}`;
};
export const decrypt = async (encryptedText) => {
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
    // Comprobación de forma antes de derivar: fromHex acepta basura silenciosamente
    // (parseInt -> NaN -> 0), y derivar cuesta ~29 ms de threadpool.
    if (!SALT_HEX_RE.test(saltHex)) {
        console.error("Decryption failed (jwe path): invalid salt format");
        throw new Error("Decryption failed");
    }
    try {
        const secret = getSecret();
        const cacheKey = `${await getSecretFingerprint(secret)}:${saltHex.toLowerCase()}`;
        const cached = lookupKey(cacheKey);
        const key = cached ?? (await deriveOnce(cacheKey, secret, fromHex(saltHex)));
        const { plaintext } = await compactDecrypt(jwe, key);
        // Sólo se guarda tras un descifrado válido: un atacante que envíe salts al azar
        // no puede llenar el caché ni desalojar entradas legítimas.
        if (!cached)
            commitKey(cacheKey, key);
        return td.decode(plaintext);
    }
    catch (e) {
        console.error("Decryption failed (jwe path):", e);
        throw new Error("Decryption failed");
    }
};
// Soporte de lectura del formato antiguo (salt:iv:tag:cipher) - ya no se genera, pero se intenta descifrar si aparece.
async function legacyDecrypt(encryptedText) {
    const parts = encryptedText.split(":");
    if (parts.length !== 4) {
        // Se registra la forma, no el valor: es una cadena controlada por quien envía la
        // petición y acaba en el agregador de logs (inyección de saltos de línea/ANSI).
        console.error("Invalid encrypted format (legacy). Received length:", encryptedText.length, "segments:", parts.length);
        throw new Error("Invalid encrypted format");
    }
    throw new Error("Legacy encryption format no longer supported in Edge version");
}
export function generateStateBase64Url(bytes = 16) {
    const rnd = new Uint8Array(bytes);
    crypto.getRandomValues(rnd);
    return base64url.encode(rnd); // p.ej: "qVt2o9bq3f0Lk1v0iUF7NQ"
}
//# sourceMappingURL=crypto.js.map