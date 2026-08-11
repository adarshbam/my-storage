import * as systemUsersService from '../services/systemUsers.service.js';

export async function getAllSystemUsers(req, res, next) {
  try {
    const result = await systemUsersService.getAllSystemUsersLogic({ requestingUser: req.user });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      if (error.status === 403 && error.redirect) {
        return res.status(403).json({ error: error.message, redirect: error.redirect });
      }
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message || error });
    }
    next(error);
  }
}

export async function deleteSystemUser(req, res, next) {
  try {
    const result = await systemUsersService.deleteSystemUserLogic({ 
      targetId: req.params.id, 
      deleteType: req.body.deleteType, 
      requestingUser: req.user 
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message || error });
    }
    next(error);
  }
}

export async function forceLogoutUser(req, res, next) {
  try {
    const result = await systemUsersService.forceLogoutUserLogic({ 
      targetId: req.params.id, 
      requestingUser: req.user 
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message || error });
    }
    next(error);
  }
}

export async function updateSystemUserRole(req, res, next) {
  try {
    const result = await systemUsersService.updateSystemUserRoleLogic({ 
      targetId: req.body.userId, 
      newRole: req.body.role, 
      requestingUser: req.user 
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json(error.details ? { error: error.details } : { error: error.message || error });
    }
    next(error);
  }
}

export async function reactivateSystemUser(req, res, next) {
  try {
    const result = await systemUsersService.reactivateSystemUserLogic({ 
      targetId: req.params.id, 
      requestingUser: req.user 
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
