import * as otpService from '../services/otp.service.js';

export async function sendOtp(req, res, next) {
  try {
    const result = await otpService.sendOtpLogic({ email: req.body.email });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message || error });
    }
    next(error);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const result = await otpService.verifyOtpLogic({ email: req.body.email, otp: req.body.otp });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message || error });
    }
    next(error);
  }
}
