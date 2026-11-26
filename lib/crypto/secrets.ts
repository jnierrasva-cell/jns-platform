import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * App-level encryption for API keys and OAuth tokens at rest.
 * Format: enc:v1:<iv_hex>:<ciphertext_hex>
 *
 * New secrets MUST be encrypted. If ENCRYPTION_KEY is missing or too short,
 * encryptSecret throws so credentials are never stored in plaintext.
 * Legacy plaintext rows can still be read via decryptSecret until re-saved.
 */

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const secret = process.env.ENCRYPTION_KEY?.trim();
  if (!secret || secret.length < 16) return null;
  // Derive a stable 32-byte key from the env secret
  return scryptSync(secret, "jns-secrets-v1", 32);
}

export function isEncryptionConfigured(): boolean {
  return getKey() != null;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  if (isEncrypted(plain)) return plain;

  const key = getKey();
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY is not configured (min 16 chars). Refusing to store secrets in plaintext.",
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([enc, tag]).toString("hex");
  return `${PREFIX}${iv.toString("hex")}:${payload}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return stored ?? null;
  if (!isEncrypted(stored)) return stored; // legacy plaintext

  const key = getKey();
  if (!key) {
    throw new Error(
      "Encrypted secret found but ENCRYPTION_KEY is not configured",
    );
  }

  const body = stored.slice(PREFIX.length);
  const [ivHex, payloadHex] = body.split(":");
  if (!ivHex || !payloadHex) {
    throw new Error("Invalid encrypted secret format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const payload = Buffer.from(payloadHex, "hex");
  if (payload.length < 17) {
    throw new Error("Invalid encrypted secret payload");
  }

  const tag = payload.subarray(payload.length - 16);
  const data = payload.subarray(0, payload.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Prefer encryptSecret for new writes. This alias remains for call sites
 * that historically meant "encrypt if possible"; it now fails closed too.
 */
export function maybeEncryptSecret(
  plain: string | null | undefined,
): string | null {
  return encryptSecret(plain);
}
