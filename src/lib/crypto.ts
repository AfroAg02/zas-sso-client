import { CompactEncrypt, base64url, compactDecrypt } from "jose";
import { getConfig } from "../init-config";

const SALT_LENGTH = 16; // bytes
const ITERATIONS = 100_000;
const ENC = "A256GCM"; // 256-bit AES-GCM
const ALG = "dir"; // direct symmetric key

function getSecret(): string {
  const secret = getConfig().ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET is required (env var or initSSO)");
  return secret;
}

const te = new TextEncoder();
const td = new TextDecoder();

async function deriveKeyRaw(secret: string, salt: any): Promise<Uint8Array> {
  // Derivamos 256 bits usando PBKDF2 SHA-256
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  // Create an ArrayBuffer containing exactly the salt bytes to satisfy BufferSource typing

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    256
  );
  return new Uint8Array(bits);
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex length");
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

export const encrypt = async (text: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyBytes = await deriveKeyRaw(getSecret(), salt);

  // Usamos jose CompactEncrypt con key simétrica derivada.
  const jwe = await new CompactEncrypt(te.encode(text))
    .setProtectedHeader({ alg: ALG, enc: ENC })
    .encrypt(keyBytes);

  // Formato: saltHex:JWE  (rompe compatibilidad con formato previo, pero decrypt soporta fallback)
  return `${toHex(salt)}:${jwe}`;
};

export const decrypt = async (encryptedText: string): Promise<string> => {
  if (!encryptedText) throw new Error("Empty encrypted text");

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
    const { plaintext } = await compactDecrypt(jwe, keyBytes);
    return td.decode(plaintext);
  } catch (e) {
    console.error("Decryption failed (jwe path):", e);
    throw new Error("Decryption failed");
  }
};

// Soporte de lectura del formato antiguo (salt:iv:tag:cipher) - ya no se genera, pero se intenta descifrar si aparece.
async function legacyDecrypt(encryptedText: string): Promise<string> {
  const parts = encryptedText.split(":");
  if (parts.length !== 4) {
    console.error(
      "Invalid encrypted format (legacy). Received:",
      encryptedText
    );
    throw new Error("Invalid encrypted format");
  }
  throw new Error(
    "Legacy encryption format no longer supported in Edge version"
  );
}

export function generateStateBase64Url(bytes = 16): string {
  const rnd = new Uint8Array(bytes);
  crypto.getRandomValues(rnd);
  return base64url.encode(rnd); // p.ej: "qVt2o9bq3f0Lk1v0iUF7NQ"
}
