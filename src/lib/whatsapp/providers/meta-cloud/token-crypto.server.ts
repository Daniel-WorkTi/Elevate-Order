import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class TokenCryptoError extends Error {
  readonly code: "invalid_key" | "invalid_ciphertext" | "decrypt_failed";

  constructor(code: TokenCryptoError["code"], message: string) {
    super(message);
    this.name = "TokenCryptoError";
    this.code = code;
  }
}

export function assertEncryptionKeyBase64(keyBase64: string): Buffer {
  let key: Buffer;
  try {
    key = Buffer.from(keyBase64, "base64");
  } catch {
    throw new TokenCryptoError("invalid_key", "Invalid WhatsApp token encryption key.");
  }
  if (key.length !== KEY_BYTES) {
    throw new TokenCryptoError("invalid_key", "Invalid WhatsApp token encryption key.");
  }
  return key;
}

/** Encrypt access token for storage in whatsapp_connection_secrets.token_ciphertext. */
export function encryptWhatsAppToken(plaintext: string, keyBase64: string): string {
  const key = assertEncryptionKeyBase64(keyBase64);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

/** Decrypt token ciphertext — server-side only (legacy meta_cloud send/webhook). */
export function decryptWhatsAppToken(encoded: string, keyBase64: string): string {
  const key = assertEncryptionKeyBase64(keyBase64);
  let payload: Buffer;
  try {
    payload = Buffer.from(encoded, "base64");
  } catch {
    throw new TokenCryptoError("invalid_ciphertext", "Invalid WhatsApp token ciphertext.");
  }
  if (payload.length <= IV_BYTES + 16) {
    throw new TokenCryptoError("invalid_ciphertext", "Invalid WhatsApp token ciphertext.");
  }

  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(payload.length - 16);
  const ciphertext = payload.subarray(IV_BYTES, payload.length - 16);

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    throw new TokenCryptoError("decrypt_failed", "Unable to decrypt WhatsApp token.");
  }
}
