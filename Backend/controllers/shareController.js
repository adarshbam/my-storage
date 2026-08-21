import * as shareService from '../services/share.service.js';

export const generateShareLink = async (req, res, next) => {
  try {
    const result = await shareService.generateShareLinkLogic({
      items: req.body.items,
      permissions: req.body.permission,
      expiresAt: req.body.expiresAt,
      userId: req.user.id,
      password: req.body.password,
      hasPassword: req.body.hasPassword,
      accessType: req.body.accessType,
      title: req.body.title,
      maxDownloads: req.body.maxDownloads,
      planContext: req.planContext,
    });
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getShareLinks = async (req, res, next) => {
  try {
    const result = await shareService.getShareLinksLogic({ userId: req.user.id });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const toggleShareLinkActive = async (req, res, next) => {
  try {
    const result = await shareService.toggleShareLinkActiveLogic({
      linkId: req.params.linkId,
      userId: req.user.id,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Internal server error" });
    }
  }
};

export const updateShareLink = async (req, res, next) => {
  try {
    const result = await shareService.updateShareLinkLogic({
      linkId: req.params.linkId,
      userId: req.user.id,
      updateData: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Internal server error" });
    }
  }
};

export const revokeShareLink = async (req, res, next) => {
  try {
    const result = await shareService.revokeShareLinkLogic({
      linkId: req.params.linkId,
      userId: req.user.id,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Internal server error" });
    }
  }
};

export const getShareLinkByToken = async (req, res, next) => {
  try {
    const result = await shareService.getShareLinkByTokenLogic({
      token: req.params.token,
      password: req.query?.password || req.headers["x-share-password"],
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Internal server error" });
    }
  }
};

export const verifyShareLinkPassword = async (req, res, next) => {
  try {
    const result = await shareService.verifyShareLinkPasswordLogic({
      token: req.params.token,
      password: req.body.password,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Internal server error" });
    }
  }
};

export const downloadSharedFile = async (req, res, next) => {
  try {
    await shareService.downloadSharedFileLogic({
      token: req.params.token,
      itemId: req.params.itemId,
      password: req.query?.password || req.headers["x-share-password"],
      res,
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Internal server error" });
    }
  }
};

export const claimShareAccess = async (req, res, next) => {
  try {
    const result = await shareService.claimShareAccessLogic({
      token: req.params.token,
      userId: req.user.id,
      userRole: req.user.role,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Internal server error" });
    }
  }
};

export const getSharedDrives = async (req, res, next) => {
  try {
    const result = await shareService.getSharedDrivesLogic({ userId: req.user.id });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
