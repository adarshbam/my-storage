import User from "../models/userModel.js";
import { generateOtp, hashOtp } from "../utils/crypto.utils.js";
import sendEmail from "../integrations/email/email.service.js";
import { buildSecondaryRecoveryOtpEmail } from "../integrations/email/emailTemplates.js";
import { cacheGet, cacheSet, cacheDel, invalidateUserSessions } from "../databases/redis.js";
import {
  securityRecoveryEmailAdded,
  securityRecoveryEmailMissing,
} from "./notification.service.js";

const OTP_TTL_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds resend cooldown
const MAX_VERIFY_ATTEMPTS = 5; // Max 5 incorrect attempts before OTP invalidation

/**
 * Sends a 6-digit OTP to the requested secondary recovery email.
 */
export async function sendSecondaryRecoveryEmailOtpLogic({ userId, email }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error("Please enter a valid email address");
    err.status = 400;
    throw err;
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = await User.findById(userId).select("email secondaryRecoveryEmail").lean();
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (user.email.toLowerCase() === cleanEmail) {
    const err = new Error("Secondary recovery email cannot be identical to your primary account email");
    err.status = 400;
    throw err;
  }

  const redisKey = `sec_recovery_otp:${userId}`;

  // Check resend cooldown
  const existingRaw = await cacheGet(redisKey);
  if (existingRaw) {
    try {
      const existing = JSON.parse(existingRaw);
      if (existing.resendAfter && Date.now() < existing.resendAfter) {
        const remainingSeconds = Math.ceil((existing.resendAfter - Date.now()) / 1000);
        const err = new Error(`Please wait ${remainingSeconds}s before requesting a new code.`);
        err.status = 429;
        err.retryAfter = remainingSeconds;
        throw err;
      }
    } catch (parseErr) {
      if (parseErr.status) throw parseErr;
    }
  }

  const otp = generateOtp(6);
  const otpHash = hashOtp(otp);

  const payload = {
    email: cleanEmail,
    otpHash,
    attempts: 0,
    createdAt: Date.now(),
    resendAfter: Date.now() + RESEND_COOLDOWN_MS,
  };

  await cacheSet(redisKey, JSON.stringify(payload), OTP_TTL_SECONDS);

  try {
    const emailContent = buildSecondaryRecoveryOtpEmail({
      otp,
      expiryMinutes: 10,
    });

    await sendEmail({
      from: `"Vault Security" <no-reply@vault.com>`,
      to: cleanEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  } catch (emailErr) {
    await cacheDel(redisKey);
    console.error("Failed to send secondary recovery email:", emailErr);
    const err = new Error("Failed to send verification email. Please check the address and try again.");
    err.status = 500;
    throw err;
  }

  return {
    success: true,
    message: `Verification code sent to ${cleanEmail}`,
    email: cleanEmail,
    resendCooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
  };
}

/**
 * Verifies the 6-digit OTP and binds the secondary recovery email to the User.
 */
export async function verifySecondaryRecoveryEmailOtpLogic({ userId, email, otp }) {
  if (!otp || String(otp).trim().length !== 6) {
    const err = new Error("Please enter a valid 6-digit verification code");
    err.status = 400;
    throw err;
  }

  const cleanEmail = email.toLowerCase().trim();
  const redisKey = `sec_recovery_otp:${userId}`;

  const rawData = await cacheGet(redisKey);
  if (!rawData) {
    const err = new Error("Verification session expired or not found. Please request a new code.");
    err.status = 400;
    throw err;
  }

  let sessionData;
  try {
    sessionData = JSON.parse(rawData);
  } catch {
    await cacheDel(redisKey);
    const err = new Error("Invalid verification session. Please request a new code.");
    err.status = 400;
    throw err;
  }

  if (sessionData.email !== cleanEmail) {
    const err = new Error("Email does not match the pending verification session. Please request a new code.");
    err.status = 400;
    throw err;
  }

  if (sessionData.attempts >= MAX_VERIFY_ATTEMPTS) {
    await cacheDel(redisKey);
    const err = new Error("Too many incorrect attempts. Please request a new verification code.");
    err.status = 429;
    throw err;
  }

  const inputHash = hashOtp(String(otp).trim());
  if (inputHash !== sessionData.otpHash) {
    sessionData.attempts = (sessionData.attempts || 0) + 1;
    const remaining = MAX_VERIFY_ATTEMPTS - sessionData.attempts;
    await cacheSet(redisKey, JSON.stringify(sessionData), OTP_TTL_SECONDS);

    const err = new Error(
      remaining > 0
        ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Please request a new verification code."
    );
    err.status = remaining > 0 ? 400 : 429;
    throw err;
  }

  // Success! Invalidate OTP session
  await cacheDel(redisKey);

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  user.secondaryRecoveryEmail = cleanEmail;
  user.secondaryRecoveryEmailVerified = true;
  user.secondaryRecoveryEmailVerifiedAt = new Date();
  await user.save();

  await invalidateUserSessions(userId.toString());

  // Security notification state update
  await securityRecoveryEmailAdded({ userId, email: cleanEmail }).catch((nErr) => {
    console.warn("[SecondaryEmail] Notification trigger error:", nErr.message);
  });

  return {
    success: true,
    message: "Secondary recovery email verified and activated successfully!",
    secondaryRecoveryEmail: cleanEmail,
    secondaryRecoveryEmailVerified: true,
  };
}

/**
 * Removes the secondary recovery email from the user's account.
 */
export async function removeSecondaryRecoveryEmailLogic({ userId }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  user.secondaryRecoveryEmail = null;
  user.secondaryRecoveryEmailVerified = false;
  user.secondaryRecoveryEmailVerifiedAt = null;
  await user.save();

  await invalidateUserSessions(userId.toString());

  // Security notification state update
  await securityRecoveryEmailMissing({ userId }).catch((nErr) => {
    console.warn("[SecondaryEmail] Notification trigger error:", nErr.message);
  });

  return {
    success: true,
    message: "Secondary recovery email removed successfully.",
  };
}
