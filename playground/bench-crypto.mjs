// Benchmark del coste de sesión: implementación anterior vs. actual.
//
//   node playground/bench-crypto.mjs
//
// Simula lo que hace una carga de /dashboard en zasexpress según
// docs/cpu-consumption-analysis.md: ~8 lecturas de sesión por request.

import { CompactEncrypt, compactDecrypt } from "jose";

process.env.ENCRYPTION_SECRET ??=
  "ssssssssssssssssssssssssssssssssssssssssssssssssssssssS1!";

const { encrypt, decrypt } = await import("../dist/lib/crypto.js");

const te = new TextEncoder();
const td = new TextDecoder();
const READS_PER_REQUEST = 8;

const SESSION = JSON.stringify({
  user: {
    id: "8f3d1c22-0000-4a11-9c1e-1f2b3c4d5e6f",
    email: "operario@zasdistributor.com",
    name: "Operario de prueba",
  },
  tokens: { accessToken: "a".repeat(760), refreshToken: "r".repeat(760) },
  shouldClear: false,
});

// --- Implementación anterior (1.2.58) ---------------------------------------
const toHex = (b) =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const fromHex = (h) => {
  const a = new Uint8Array(h.length / 2);
  for (let i = 0; i < h.length; i += 2) a[i / 2] = parseInt(h.slice(i, i + 2), 16);
  return a;
};

async function oldDerive(secret, salt) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      256
    )
  );
}

async function oldEncrypt(text) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await oldDerive(process.env.ENCRYPTION_SECRET, salt);
  const jwe = await new CompactEncrypt(te.encode(text))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(key);
  return `${toHex(salt)}:${jwe}`;
}

async function oldDecrypt(value) {
  const i = value.indexOf(":");
  const key = await oldDerive(process.env.ENCRYPTION_SECRET, fromHex(value.slice(0, i)));
  const { plaintext } = await compactDecrypt(value.slice(i + 1), key);
  return td.decode(plaintext);
}

// --- Medición ---------------------------------------------------------------
const ms = (start) => Number(process.hrtime.bigint() - start) / 1e6;

async function timeRequest(read, cookie) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < READS_PER_REQUEST; i++) {
    const out = await read(cookie);
    if (out !== SESSION) throw new Error("payload corrupto");
  }
  return ms(start);
}

const oldCookie = await oldEncrypt(SESSION);
const newCookie = await encrypt(SESSION);

// Compatibilidad cruzada antes de medir nada.
if ((await decrypt(oldCookie)) !== SESSION) throw new Error("nueva no lee la vieja");
if ((await oldDecrypt(newCookie)) !== SESSION) throw new Error("vieja no lee la nueva");

const oldFirst = await timeRequest(oldDecrypt, oldCookie);
const oldSteady = await timeRequest(oldDecrypt, oldCookie);

// Arranque en frío real: se descarta el caché de claves del proceso.
delete globalThis[Symbol.for("zas-sso-client.keycache.v1")];
const newCold = await timeRequest(decrypt, newCookie);
const newSteady = await timeRequest(decrypt, newCookie);

let legacyCold = 0;
{
  delete globalThis[Symbol.for("zas-sso-client.keycache.v1")];
  legacyCold = await timeRequest(decrypt, oldCookie);
}

const row = (label, value) =>
  `${label.padEnd(46)} ${value.toFixed(2).padStart(9)} ms`;

console.log(`\nCoste de ${READS_PER_REQUEST} lecturas de sesión (1 request de página)\n`);
console.log(row("anterior — primer request", oldFirst));
console.log(row("anterior — en régimen", oldSteady));
console.log(row("actual   — request en frío (isolate nuevo)", newCold));
console.log(row("actual   — en régimen", newSteady));
console.log(row("actual   — frío con cookie del formato viejo", legacyCold));
console.log(
  `\nMejora en régimen: ${(oldSteady / newSteady).toFixed(0)}×  ` +
    `(${(oldSteady - newSteady).toFixed(0)} ms de CPU menos por request)\n`
);
