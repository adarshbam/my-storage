import * as authService from '../services/auth.service.js';
import * as userService from '../services/user.service.js';

export async function getUser(req, res, next) {
  try {
    const result = await userService.getUserProfile({ userId: req.user.id || req.user._id, user: req.user });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function registerUser(req, res, next) {
  try {
    const result = await authService.registerUserLogic({ ...req.body, req, res });
    return res.status(201).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function loginUser(req, res, next) {
  try {
    const result = await authService.loginUserLogic({ ...req.body, req, res });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function authGoogle(req, res, next) {
  try {
    const result = await authService.authGoogleLogic({ credential: req.body.credential, req, res });
    return res.status(result.status || 200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function authGithub(req, res, next) {
  try {
    const { code, state } = req.query;
    await authService.authGithubLogic({ code, action: state, req, res });
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function logoutUser(req, res, next) {
  try {
    const { sessionId } = req.signedCookies;
    const result = await authService.logoutLogic({ sessionId, res });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function logoutAllDevices(req, res, next) {
  try {
    const userId = req.user._id || req.user.id;
    const result = await authService.logoutAllDevicesLogic({ userId, res });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function uploadProfilePic(req, res, next) {
  try {
    const userId = req.user._id || req.user.id;
    const result = await userService.uploadProfilePicLogic({ userId, req });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function getProfilePic(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id || null;
    const targetUserId = req.query.id || req.query.userId || req.query.targetUserId || userId;
    await userService.getProfilePicLogic({ userId, targetUserId, userRole: req.user?.role, res });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function getSearchedItems(req, res, next) {
  try {
    const result = await userService.getSearchedItems({ user: req.user });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function storeSearchedItem(req, res, next) {
  try {
    const userId = req.user._id || req.user.id;
    const result = await userService.storeSearchedItem({ userId, item: req.body.searchItem });
    return res.status(result.status).json({ msg: result.msg });
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function updateTheme(req, res, next) {
  try {
    const userId = req.user._id || req.user.id;
    const result = await userService.updateThemeLogic({ userId, theme: req.body.theme });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function updateName(req, res, next) {
  try {
    const userId = req.user._id || req.user.id;
    const result = await userService.updateNameLogic({ userId, name: req.body.name });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const userId = req.user._id || req.user.id;
    const result = await userService.updatePasswordLogic({ userId, currentPassword: req.body.currentPassword, newPassword: req.body.password });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
          // preserve anything specific we had here, actually wait, userController doesn't have redirect error except github which redirects instead of json.
          // Let's just use the generic mapping
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message });
    }
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPasswordLogic({ email: req.body.email });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPasswordLogic({ token: req.body.token, newPassword: req.body.newPassword });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
