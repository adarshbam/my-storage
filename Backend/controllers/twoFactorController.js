import * as twoFactorService from "../services/twoFactor.service.js";

export async function setupTwoFactor(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const result = await twoFactorService.setupTwoFactorLogic({ userId });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function verifyTwoFactorSetup(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { code } = req.body;
    const result = await twoFactorService.verifyTwoFactorSetupLogic({
      userId,
      code,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function verifyTwoFactorLogin(req, res, next) {
  try {
    const { tempToken, code, isRecoveryCode } = req.body;
    const result = await twoFactorService.verifyTwoFactorLoginLogic({
      tempToken,
      code,
      isRecoveryCode: !!isRecoveryCode,
      req,
      res,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function disableTwoFactor(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { password, totpCode } = req.body;
    const result = await twoFactorService.disableTwoFactorLogic({
      userId,
      password,
      totpCode,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function regenerateRecoveryCodes(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { password, totpCode } = req.body;
    const result = await twoFactorService.regenerateRecoveryCodesLogic({
      userId,
      password,
      totpCode,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}
