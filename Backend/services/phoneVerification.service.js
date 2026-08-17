import User from "../models/userModel.js";
import TrialClaim from "../models/trialClaimModel.js";
import { normalizePhoneNumber } from "../utils/phone.utils.js";
import { generateOtp, hashOtp, hashPhoneNumber } from "../utils/crypto.utils.js";
import { sendSms } from "../integrations/sms/sms.service.js";
import { cacheGet, cacheSet, cacheDel, invalidateUserSessions } from "../databases/redis.js";
import { securityPhoneVerified } from "./notification.service.js";

const OTP_TTL_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Sends a phone verification OTP via SMS.
 */
export async function sendPhoneOtpLogic({ userId, rawPhone, defaultCountry = "IN" }) {
  const normalized = normalizePhoneNumber(rawPhone, defaultCountry);
  if (!normalized.isValid) {
    const err = new Error(normalized.error || "Invalid phone number");
    err.status = 400;
    throw err;
  }

  const { canonicalPhone, formatted } = normalized;
  const phoneHash = hashPhoneNumber(canonicalPhone);
  const redisKey = `phone_otp:${phoneHash}`;

  // 1. Check for active OTP and enforce resend cooldown
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

  // 2. Generate secure 6-digit OTP and store hashed in Redis
  const otp = generateOtp(6);
  const otpHash = hashOtp(otp);

  const payload = {
    otpHash,
    canonicalPhone,
    attempts: 0,
    createdAt: Date.now(),
    resendAfter: Date.now() + RESEND_COOLDOWN_MS,
  };

  await cacheSet(redisKey, JSON.stringify(payload), OTP_TTL_SECONDS);

  // 3. Dispatch SMS
  try {
    await sendSms({
      to: canonicalPhone,
      message: `Your Vault verification code is ${otp}. Valid for 10 minutes. Do not share this code with anyone.`,
    });
  } catch (smsErr) {
    await cacheDel(redisKey);
    const err = new Error("Failed to deliver SMS. Please verify your phone number and try again.");
    err.status = 502;
    throw err;
  }

  return {
    success: true,
    message: `Verification code sent to ${formatted}`,
    canonicalPhone,
    resendCooldownSeconds: 60,
  };
}

/**
 * Validates the submitted OTP and updates user.phone and user.phoneVerified.
 */
export async function verifyPhoneOtpLogic({ userId, rawPhone, otp, defaultCountry = "IN" }) {
  if (!otp || String(otp).trim().length !== 6) {
    const err = new Error("Please enter a valid 6-digit verification code");
    err.status = 400;
    throw err;
  }

  const normalized = normalizePhoneNumber(rawPhone, defaultCountry);
  if (!normalized.isValid) {
    const err = new Error(normalized.error || "Invalid phone number");
    err.status = 400;
    throw err;
  }

  const { canonicalPhone } = normalized;
  const phoneHash = hashPhoneNumber(canonicalPhone);
  const redisKey = `phone_otp:${phoneHash}`;

  const rawData = await cacheGet(redisKey);
  if (!rawData) {
    const err = new Error("Verification code has expired or was not requested. Please request a new code.");
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

  // Check attempt limits
  if (sessionData.attempts >= MAX_VERIFY_ATTEMPTS) {
    await cacheDel(redisKey);
    const err = new Error("Too many incorrect attempts. Please request a new verification code.");
    err.status = 429;
    throw err;
  }

  // Check OTP match
  const inputHash = hashOtp(String(otp).trim());
  if (inputHash !== sessionData.otpHash) {
    sessionData.attempts = (sessionData.attempts || 0) + 1;
    const remaining = MAX_VERIFY_ATTEMPTS - sessionData.attempts;
    await cacheSet(redisKey, JSON.stringify(sessionData), OTP_TTL_SECONDS);

    const err = new Error(
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Please request a new verification code."
    );
    err.status = remaining > 0 ? 400 : 429;
    throw err;
  }

  // Successfully verified! Invalidate Redis OTP record
  await cacheDel(redisKey);

  // Link verified phone to User document
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  user.phone = canonicalPhone;
  user.phoneVerified = true;
  user.phoneVerifiedAt = new Date();
  await user.save();

  // Invalidate Redis session cache so updated user is reflected immediately
  await invalidateUserSessions(userId.toString());

  // Security notification state update
  await securityPhoneVerified({ userId, phone: canonicalPhone }).catch((nErr) => {
    console.warn("[PhoneVerification] Notification trigger error:", nErr.message);
  });

  return {
    success: true,
    message: "Phone number verified successfully!",
    phone: canonicalPhone,
    phoneVerified: true,
  };
}

/**
 * Authoritative check if canonical phone is eligible for free trial.
 */
export async function checkPhoneTrialEligibility({ rawPhone, defaultCountry = "IN" }) {
  const normalized = normalizePhoneNumber(rawPhone, defaultCountry);
  if (!normalized.isValid) {
    return { eligible: false, error: normalized.error };
  }

  const phoneHash = hashPhoneNumber(normalized.canonicalPhone);
  const existingClaim = await TrialClaim.findOne({ phoneHash }).lean();

  return {
    eligible: !existingClaim,
    canonicalPhone: normalized.canonicalPhone,
    claimedAt: existingClaim ? existingClaim.claimedAt : null,
  };
}
