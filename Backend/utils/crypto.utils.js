import crypto from "crypto";
import { SESSION_SECRET } from "../config/config.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from SESSION_SECRET + optional salt using scryptSync.
 */
function getKey(salt = "vault-storage-crypto-salt") {
  return crypto.scryptSync(SESSION_SECRET, salt, 32);
}

/**
 * Encrypts sensitive text (e.g. TOTP secret) with AES-256-GCM.
 * Output format: iv:tag:encryptedData (hex encoded)
 */
export function encryptSecret(plainText) {
  if (!plainText) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM cipher text.
 */
export function decryptSecret(cipherText) {
  if (!cipherText) return null;
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) return null;

    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Failed to decrypt secret:", err.message);
    return null;
  }
}

/**
 * Generates a deterministic SHA-256 hash of a normalized canonical phone number.
 * Used for trial entitlement indexing & deduplication without plaintext phone exposure.
 */
export function hashPhoneNumber(canonicalPhone) {
  if (!canonicalPhone) return null;
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(canonicalPhone.trim())
    .digest("hex");
}

/**
 * Generates a cryptographically secure numeric OTP string of given length.
 */
export function generateOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Hashes an OTP before storing in Redis/DB.
 */
export function hashOtp(otp) {
  if (!otp) return null;
  return crypto
    .createHash("sha256")
    .update(String(otp).trim())
    .digest("hex");
}

/**
 * Generates an array of secure random recovery codes (e.g. ['XXXX-XXXX-XXXX', ...]).
 */
export function generateRecoveryCodes(count = 10) {
  const codes = [];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars like O/0, I/1

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(12);
    let codeStr = "";
    for (let j = 0; j < 12; j++) {
      codeStr += chars[bytes[j] % chars.length];
    }
    // Format as XXXX-XXXX-XXXX
    const formatted = `${codeStr.slice(0, 4)}-${codeStr.slice(4, 8)}-${codeStr.slice(8, 12)}`;
    codes.push(formatted);
  }

  return codes;
}

/**
 * Hashes a normalized recovery code (uppercase, removing hyphens/spaces).
 */
export function hashRecoveryCode(code) {
  if (!code) return null;
  const normalized = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
}
