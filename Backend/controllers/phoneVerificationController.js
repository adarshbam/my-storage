import * as phoneService from "../services/phoneVerification.service.js";

export async function sendPhoneOtp(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { phone, defaultCountry } = req.body;
    const result = await phoneService.sendPhoneOtpLogic({
      userId,
      rawPhone: phone,
      defaultCountry,
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

export async function verifyPhoneOtp(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { phone, otp, defaultCountry } = req.body;
    const result = await phoneService.verifyPhoneOtpLogic({
      userId,
      rawPhone: phone,
      otp,
      defaultCountry,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function checkTrialEligibility(req, res, next) {
  try {
    const { phone, defaultCountry } = req.query;
    const result = await phoneService.checkPhoneTrialEligibility({
      rawPhone: phone,
      defaultCountry,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}
