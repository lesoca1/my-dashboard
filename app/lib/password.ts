// Use the Web Crypto API — works in Node.js, Edge, Cloudflare Workers, etc.

const SALT_LENGTH = 16;
const ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: BufferSource
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derived = await deriveKey(password, salt);
  return `${toHex(salt)}:${toHex(derived)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = fromHex(saltHex);
  const derived = await deriveKey(password, salt);
  const derivedHex = toHex(derived);
  // Constant-time comparison
  if (derivedHex.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < derivedHex.length; i++) {
    diff |= derivedHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}
