import * as recoveryEmailService from "../services/secondaryRecoveryEmail.service.js";

export async function sendSecondaryRecoveryEmailOtp(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { email } = req.body;
    const result = await recoveryEmailService.sendSecondaryRecoveryEmailOtpLogic({
      userId,
      email,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        retryAfter: err.retryAfter,
      });
    }
    next(err);
  }
}

export async function verifySecondaryRecoveryEmailOtp(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { email, otp } = req.body;
    const result = await recoveryEmailService.verifySecondaryRecoveryEmailOtpLogic({
      userId,
      email,
      otp,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function removeSecondaryRecoveryEmail(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const result = await recoveryEmailService.removeSecondaryRecoveryEmailLogic({
      userId,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}
