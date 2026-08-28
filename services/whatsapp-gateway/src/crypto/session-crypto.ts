import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class SessionCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionCryptoError";
  }
}

function loadKey(keyBase64: string): Buffer {
  let key: Buffer;
  try {
    key = Buffer.from(keyBase64, "base64");
  } catch {
    throw new SessionCryptoError("Invalid session encryption key.");
  }
  if (key.length !== KEY_BYTES) {
    throw new SessionCryptoError("Invalid session encryption key length.");
  }
  return key;
}

/** AES-256-GCM encrypt JSON payload for whatsapp_sessions / whatsapp_session_keys. */
export function encryptSessionPayload(plaintext: string, keyBase64: string): string {
  const key = loadKey(keyBase64);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

export function decryptSessionPayload(encoded: string, keyBase64: string): string {
  const key = loadKey(keyBase64);
  let payload: Buffer;
  try {
    payload = Buffer.from(encoded, "base64");
  } catch {
    throw new SessionCryptoError("Invalid session ciphertext.");
  }
  if (payload.length <= IV_BYTES + 16) {
    throw new SessionCryptoError("Invalid session ciphertext.");
  }
  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(payload.length - 16);
  const ciphertext = payload.subarray(IV_BYTES, payload.length - 16);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new SessionCryptoError("Unable to decrypt session payload.");
  }
}

/** Redact sensitive fields from log objects. */
export function sanitizeForLog(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (/^eyJ/.test(value) && value.length > 40) return "[jwt-redacted]";
    if (value.length > 64 && /^[A-Za-z0-9+/=]+$/.test(value)) return "[blob-redacted]";
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (
        /cred|key|secret|token|encrypt|password|authorization|session|service_role|gateway_secret/i.test(
          k,
        )
      ) {
        out[k] = "[redacted]";
      } else {
        out[k] = sanitizeForLog(v);
      }
    }
    return out;
  }
  return value;
}
