import * as otplib from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import {
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "../utils/crypto.utils.js";
import {
  cacheGet,
  cacheSet,
  cacheDel,
  invalidateUserSessions,
} from "../databases/redis.js";
import { createSessionAndSetCookies } from "../utils/authHelpers.js";

const SETUP_TTL_SECONDS = 600; // 10 minutes
const LOGIN_2FA_TTL_SECONDS = 300; // 5 minutes

/**
 * Validates a TOTP token against a base32 secret.
 */
async function verifyTotpToken(token, secret) {
  if (!token || !secret) return false;
  try {
    const result = await otplib.verify({ token: String(token).trim(), secret });
    return !!result?.valid;
  } catch (err) {
    return false;
  }
}

/**
 * Initiates TOTP 2FA Setup: Generates secret, otpauth URL, and QR code Data URL.
 */
export async function setupTwoFactorLogic({ userId }) {
  const user = await User.findById(userId).select("email twoFactorEnabled").lean();
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const secret = otplib.generateSecret();
  const otpauthUrl = otplib.generateURI({
    secret,
    label: user.email,
    issuer: "Vault",
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  const encryptedSecret = encryptSecret(secret);
  const redisKey = `2fa_setup:${userId}`;
  await cacheSet(redisKey, encryptedSecret, SETUP_TTL_SECONDS);

  return {
    secret,
    otpauthUrl,
    qrCode: qrCodeDataUrl,
  };
}

/**
 * Confirms 2FA Setup with a valid code from the authenticator app,
 * persists the encrypted secret, generates 10 recovery codes, and enables 2FA.
 */
export async function verifyTwoFactorSetupLogic({ userId, code }) {
  if (!code || String(code).trim().length !== 6) {
    const err = new Error("Please enter a valid 6-digit authenticator code");
    err.status = 400;
    throw err;
  }

  const redisKey = `2fa_setup:${userId}`;
  const encryptedSecret = await cacheGet(redisKey);

  if (!encryptedSecret) {
    const err = new Error("2FA setup session expired. Please restart the setup process.");
    err.status = 400;
    throw err;
  }

  const plainSecret = decryptSecret(encryptedSecret);
  if (!plainSecret) {
    const err = new Error("Failed to process security secret. Please restart setup.");
    err.status = 500;
    throw err;
  }

  const isValid = await verifyTotpToken(code, plainSecret);

  if (!isValid) {
    const err = new Error("Invalid verification code. Ensure your device time is synchronized.");
    err.status = 400;
    throw err;
  }

  // Generate 10 cryptographically random recovery codes
  const plaintextRecoveryCodes = generateRecoveryCodes(10);
  const recoveryCodesArray = plaintextRecoveryCodes.map((codeStr) => ({
    codeHash: hashRecoveryCode(codeStr),
    used: false,
    usedAt: null,
  }));

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  user.twoFactorEnabled = true;
  user.twoFactorSecret = encryptedSecret;
  user.twoFactorRecoveryCodes = recoveryCodesArray;
  await user.save();

  await cacheDel(redisKey);
  await invalidateUserSessions(userId.toString());

  return {
    success: true,
    message: "Two-Factor Authentication enabled successfully!",
    recoveryCodes: plaintextRecoveryCodes,
  };
}

/**
 * Completes login for users with 2FA enabled using TOTP code or Recovery Code.
 */
export async function verifyTwoFactorLoginLogic({
  tempToken,
  code,
  isRecoveryCode = false,
  req,
  res,
}) {
  if (!tempToken) {
    const err = new Error("Missing 2FA authentication ticket");
    err.status = 400;
    throw err;
  }

  if (!code || typeof code !== "string" || code.trim() === "") {
    const err = new Error("Verification code is required");
    err.status = 400;
    throw err;
  }

  const redisKey = `2fa_login:${tempToken}`;
  const rawLoginSession = await cacheGet(redisKey);

  if (!rawLoginSession) {
    const err = new Error("Two-factor authentication session expired. Please log in again.");
    err.status = 401;
    throw err;
  }

  let sessionData;
  try {
    sessionData = JSON.parse(rawLoginSession);
  } catch {
    await cacheDel(redisKey);
    const err = new Error("Invalid session. Please log in again.");
    err.status = 401;
    throw err;
  }

  const { userId, rootDirId } = sessionData;
  const user = await User.findById(userId);

  if (!user || user.status === "Deleted") {
    const err = new Error("User account unavailable");
    err.status = 404;
    throw err;
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    // 2FA was disabled in the interim
    await cacheDel(redisKey);
    await createSessionAndSetCookies(user._id, rootDirId, req, res);
    return { message: `Login successful ${user.name}` };
  }

  const cleanCode = code.trim();

  if (isRecoveryCode) {
    const inputHash = hashRecoveryCode(cleanCode);
    const matchedCodeIndex = user.twoFactorRecoveryCodes.findIndex(
      (rc) => rc.codeHash === inputHash && !rc.used
    );

    if (matchedCodeIndex === -1) {
      const err = new Error("Invalid or previously used recovery code");
      err.status = 400;
      throw err;
    }

    // Atomically mark recovery code as used
    user.twoFactorRecoveryCodes[matchedCodeIndex].used = true;
    user.twoFactorRecoveryCodes[matchedCodeIndex].usedAt = new Date();
    await user.save();
  } else {
    // Standard TOTP verification
    const plainSecret = decryptSecret(user.twoFactorSecret);
    if (!plainSecret) {
      const err = new Error("Security verification error. Please use a recovery code.");
      err.status = 500;
      throw err;
    }

    const isValid = await verifyTotpToken(cleanCode, plainSecret);

    if (!isValid) {
      const err = new Error("Invalid authenticator code. Please check your authenticator app.");
      err.status = 400;
      throw err;
    }
  }

  // Clear 2FA pending login token
  await cacheDel(redisKey);

  // Authenticate session and issue cookies
  await createSessionAndSetCookies(user._id, rootDirId, req, res);

  return {
    message: `Login successful ${user.name}`,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Disables 2FA on the user's account after confirming password or current TOTP code.
 */
export async function disableTwoFactorLogic({ userId, password, totpCode }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (!user.twoFactorEnabled) {
    return { success: true, message: "Two-Factor Authentication is already disabled." };
  }

  let authorized = false;

  if (password && user.password) {
    authorized = await user.comparePassword(password);
  }

  if (!authorized && totpCode && user.twoFactorSecret) {
    const plainSecret = decryptSecret(user.twoFactorSecret);
    if (plainSecret) {
      authorized = await verifyTotpToken(totpCode, plainSecret);
    }
  }

  if (!authorized) {
    const err = new Error("Incorrect password or authenticator code");
    err.status = 400;
    throw err;
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  user.twoFactorRecoveryCodes = [];
  await user.save();

  await invalidateUserSessions(userId.toString());

  return {
    success: true,
    message: "Two-Factor Authentication has been disabled.",
  };
}

/**
 * Regenerates the 10 one-time recovery codes for a user with 2FA active.
 */
export async function regenerateRecoveryCodesLogic({ userId, password, totpCode }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    const err = new Error("Two-Factor Authentication is not enabled on this account.");
    err.status = 400;
    throw err;
  }

  let authorized = false;
  if (password && user.password) {
    authorized = await user.comparePassword(password);
  }

  if (!authorized && totpCode) {
    const plainSecret = decryptSecret(user.twoFactorSecret);
    if (plainSecret) {
      authorized = await verifyTotpToken(totpCode, plainSecret);
    }
  }

  if (!authorized) {
    const err = new Error("Incorrect password or authenticator code");
    err.status = 400;
    throw err;
  }

  const plaintextRecoveryCodes = generateRecoveryCodes(10);
  user.twoFactorRecoveryCodes = plaintextRecoveryCodes.map((codeStr) => ({
    codeHash: hashRecoveryCode(codeStr),
    used: false,
    usedAt: null,
  }));
  await user.save();

  return {
    success: true,
    message: "New recovery codes generated successfully.",
    recoveryCodes: plaintextRecoveryCodes,
  };
}
