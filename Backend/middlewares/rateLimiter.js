import { rateLimit } from "express-rate-limit";

// Centralized helper to create consistent and professional rate limiters
const createLimiter = (windowMs, limit, message) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56,
    message: {
      status: 429,
      error: "Too Many Requests",
      message,
    },
  });
};

// 1. Registration Limiter: max 3 account creations per hour per IP (strict)
export const registerLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  3,
  "Too many account creation attempts. Please try again after an hour."
);

// 2. Login Limiter: max 10 requests per 15 minutes per IP
export const loginLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  "Too many login attempts. Please try again after 15 minutes."
);

// 3. OTP Limiter (Send & Verify): max 5 attempts per 15 minutes per IP
export const otpLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many OTP requests or verification attempts. Please try again after 15 minutes."
);

// 4. Password Reset Limiter: max 5 requests per 15 minutes per IP
export const passwordResetLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many password reset requests. Please try again after 15 minutes."
);

// 5. Password Update Limiter: max 10 requests per 15 minutes per IP
export const passwordUpdateLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  "Too many password update attempts. Please try again after 15 minutes."
);

// 6. Heavy Operation Limiter (Zips, Cross-provider transfers, Batch Deletes): max 5 operations per 15 minutes per IP
export const heavyOpLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many heavy operations performed. Please try again after 15 minutes."
);

// 7. File Upload Limiter: max 30 uploads per 15 minutes per IP
export const uploadLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  30,
  "Too many file upload requests. Please try again after 15 minutes."
);

// 8. Search Limiter: max 30 searches per 15 minutes per IP
export const searchLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  30,
  "Too many search queries. Please try again after 15 minutes."
);

// 9. Thumbnail Limiter: max 60 requests per 15 minutes per IP
export const thumbnailLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  60,
  "Too many thumbnail requests. Please try again after 15 minutes."
);
