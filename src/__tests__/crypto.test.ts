import { CompactEncrypt, compactDecrypt } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decrypt, encrypt } from "../lib/crypto";

const SECRET_A = "ssssssssssssssssssssssssssssssssssssssssssssssssssssssS1!";
const SECRET_B = "otro-secreto-de-alta-entropia-para-probar-rotacion-1234567";
const CACHE_SLOT = Symbol.for("zas-sso-client.keycache.v1");

const te = new TextEncoder();
const td = new TextDecoder();

// --- Implementación ANTIGUA (1.2.58), reproducida tal cual --------------------
// Sirve para demostrar las dos direcciones de compatibilidad:
//  - lo que emitía la versión vieja lo lee la nueva,
//  - lo que emite la nueva lo lee la vieja (rollback y zaslogin, que tiene su copia).

async function legacyDeriveBits(secret: string, salt: Uint8Array) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
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
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

async function legacyEncrypt(secret: string, text: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyBytes = await legacyDeriveBits(secret, salt);
  const jwe = await new CompactEncrypt(te.encode(text))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(keyBytes);
  return `${toHex(salt)}:${jwe}`;
}

async function legacyDecryptValue(
  secret: string,
  value: string
): Promise<string> {
  const firstColon = value.indexOf(":");
  const salt = fromHex(value.slice(0, firstColon));
  const jwe = value.slice(firstColon + 1);
  const keyBytes = await legacyDeriveBits(secret, salt);
  const { plaintext } = await compactDecrypt(jwe, keyBytes);
  return td.decode(plaintext);
}

// --- Contador de derivaciones -------------------------------------------------

let deriveKeyCalls = 0;
let restoreDeriveKey: (() => void) | null = null;

function countDerivations() {
  const subtle = crypto.subtle as any;
  const original = subtle.deriveKey.bind(subtle);
  deriveKeyCalls = 0;
  Object.defineProperty(subtle, "deriveKey", {
    configurable: true,
    writable: true,
    value: (...args: any[]) => {
      deriveKeyCalls += 1;
      return original(...args);
    },
  });
  restoreDeriveKey = () => {
    Object.defineProperty(subtle, "deriveKey", {
      configurable: true,
      writable: true,
      value: original,
    });
    restoreDeriveKey = null;
  };
}

function resetCache() {
  delete (globalThis as any)[CACHE_SLOT];
}

const SESSION = JSON.stringify({
  user: { id: "u-1", email: "operario@zasdistributor.com" },
  tokens: { accessToken: "a".repeat(600), refreshToken: "r".repeat(600) },
  shouldClear: false,
});

beforeEach(() => {
  process.env.ENCRYPTION_SECRET = SECRET_A;
  resetCache();
  countDerivations();
});

afterEach(() => {
  restoreDeriveKey?.();
  vi.restoreAllMocks();
  resetCache();
});

describe("formato en cable", () => {
  it("mantiene saltHex:JWE con 32 hex y 4 puntos", async () => {
    const value = await encrypt(SESSION);
    const [saltHex, ...rest] = value.split(":");
    const jwe = rest.join(":");

    expect(saltHex).toMatch(/^[0-9a-f]{32}$/);
    expect((jwe.match(/\./g) || []).length).toBe(4);
  });

  it("hace round-trip", async () => {
    expect(await decrypt(await encrypt(SESSION))).toBe(SESSION);
  });
});

describe("compatibilidad", () => {
  it("lee cookies emitidas por la versión anterior (salt aleatorio)", async () => {
    const legacyValue = await legacyEncrypt(SECRET_A, SESSION);
    expect(await decrypt(legacyValue)).toBe(SESSION);
  });

  it("emite cookies que la versión anterior sigue leyendo", async () => {
    const value = await encrypt(SESSION);
    expect(await legacyDecryptValue(SECRET_A, value)).toBe(SESSION);
  });
});

describe("caché de clave derivada", () => {
  it("deriva una sola vez para N lecturas secuenciales de la misma cookie", async () => {
    const value = await encrypt(SESSION);
    const before = deriveKeyCalls;

    for (let i = 0; i < 8; i++) {
      expect(await decrypt(value)).toBe(SESSION);
    }

    // El encrypt ya dejó la clave en caché: las 8 lecturas no derivan nada.
    expect(deriveKeyCalls - before).toBe(0);
  });

  it("deriva una sola vez para N lecturas concurrentes en frío (single-flight)", async () => {
    const value = await encrypt(SESSION);
    resetCache();
    const before = deriveKeyCalls;

    const results = await Promise.all(
      Array.from({ length: 8 }, () => decrypt(value))
    );

    expect(results.every((r) => r === SESSION)).toBe(true);
    expect(deriveKeyCalls - before).toBe(1);
  });

  it("reutiliza el mismo salt entre cifrados del mismo proceso", async () => {
    const before = deriveKeyCalls;
    const a = await encrypt(SESSION);
    const b = await encrypt(SESSION);

    expect(a.split(":")[0]).toBe(b.split(":")[0]);
    expect(deriveKeyCalls - before).toBe(1);
    expect(await decrypt(a)).toBe(SESSION);
    expect(await decrypt(b)).toBe(SESSION);
  });

  it("no reutiliza la clave si cambia el secreto", async () => {
    const value = await encrypt(SESSION);

    process.env.ENCRYPTION_SECRET = SECRET_B;
    await expect(decrypt(value)).rejects.toThrow("Decryption failed");

    process.env.ENCRYPTION_SECRET = SECRET_A;
    expect(await decrypt(value)).toBe(SESSION);
  });
});

describe("resistencia a entradas hostiles", () => {
  it("rechaza un salt malformado sin derivar", async () => {
    const value = await encrypt(SESSION);
    const jwe = value.slice(value.indexOf(":") + 1);
    const before = deriveKeyCalls;

    await expect(decrypt(`${"z".repeat(32)}:${jwe}`)).rejects.toThrow(
      "Decryption failed"
    );
    await expect(decrypt(`abc:${jwe}`)).rejects.toThrow("Decryption failed");

    expect(deriveKeyCalls - before).toBe(0);
  });

  it("no guarda en caché claves de cookies que no descifran", async () => {
    const saltHex = "a".repeat(32);
    const bogus = `${saltHex}:eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..AAAAAAAAAAAAAAAA.BBBB.CCCCCCCCCCCCCCCCCCCCCC`;

    const before = deriveKeyCalls;
    await expect(decrypt(bogus)).rejects.toThrow("Decryption failed");
    await expect(decrypt(bogus)).rejects.toThrow("Decryption failed");

    // Si se hubiera cacheado, el segundo intento no habría derivado.
    expect(deriveKeyCalls - before).toBe(2);
  });

  it("no vuelca el valor crudo de la cookie en los logs", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const hostile = "no-tiene-dos-puntos-[31mINYECTADO\nfake-log-line";

    await expect(decrypt(hostile)).rejects.toThrow("Invalid encrypted format");

    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).not.toContain("INYECTADO");
    expect(logged).not.toContain(hostile);
  });

  it("sigue rechazando la cookie vacía", async () => {
    await expect(decrypt("")).rejects.toThrow("Empty encrypted text");
  });
});
