import { rm } from "node:fs/promises";
import path from "node:path";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";
import { invalidateUserSessions } from "../databases/redis.js";
import { BACKEND_URL } from "../config/config.js";
import { deleteFromB2 } from "../integrations/storage/s3.client.js";

const hierarchy = ["User", "Manager", "Admin", "Owner"];

export const getAllSystemUsersLogic = async ({ requestingUser }) => {
  console.log("GET /users called");

  if (!requestingUser?.role || requestingUser.role === "User") {
    const e = new Error("Access denied");
    e.status = 403;
    e.redirect = "/";
    throw e;
  }

  const allUsers = await User.find().populate("profilepic");
  const allSessions = await Session.find().lean();
  const allSessionsUserId = allSessions.map(({ userId }) => userId.toString());
  const allSessionsUserIdSet = new Set(allSessionsUserId);

  console.log(allUsers);

  const userHierarchy = hierarchy.indexOf(requestingUser.role ?? "User");
  const yourAuthority = hierarchy.slice(0, userHierarchy);

  const transformedUsers = allUsers.map(
    ({ _id, name, role, email, status, profilepic, rootDirId }) => ({
      _id,
      name,
      role,
      email,
      avatar: name.slice(0, 1),
      profilepic: profilepic
        ? profilepic.externalUrl
          ? profilepic.externalUrl
          : `${BACKEND_URL}/user/profilepic?id=${profilepic._id}`
        : null,
      status: status || "Active",
      yourAuthority,
      rootDirId: rootDirId?.toString() || null,
      isLoggedIn: allSessionsUserIdSet.has(_id.toString()),
    })
  );

  console.log(transformedUsers);
  return transformedUsers;
};

export const deleteSystemUserLogic = async ({ targetId, deleteType, requestingUser }) => {
  console.log(deleteType);

  if (requestingUser.id === targetId) {
    const e = new Error("You cannot logout yourself from here");
    e.status = 403;
    throw e;
  }

  const userToDelete = await User.findOne({ _id: targetId });
  const newRoleHierarchy = hierarchy.indexOf(userToDelete.role);
  const userHierarchy = hierarchy.indexOf(requestingUser.role);
  console.log(userHierarchy, newRoleHierarchy);

  if (newRoleHierarchy < userHierarchy && userHierarchy >= 2) {
    await Session.deleteMany({ userId: targetId });
    await invalidateUserSessions(targetId);
    if (deleteType === "soft") {
      userToDelete.status = "Deleted";
      await userToDelete.save();
      console.log("Doing Soft Delete");
      return { message: "Delete request logged" };
    }

    const files = await File.find({ userId: targetId });

    for (const file of files) {
      await deleteFromB2({ key: `${file._id.toString()}${file.extension}` });
      await deleteFromB2({ key: `thumbnails/${file._id.toString()}.jpg` });
    }

    await File.deleteMany({ userId: targetId });
    await User.deleteMany({ _id: targetId });
    await Session.deleteMany({ userId: targetId });
    await invalidateUserSessions(targetId);
    await Directory.deleteMany({ userId: targetId });

    console.log("Doing hard delete");
    return { message: "Delete request logged" };
  }
  const e = new Error("Not Authorised");
  e.status = 403;
  throw e;
};

export const forceLogoutUserLogic = async ({ targetId, requestingUser }) => {
  if (requestingUser.id === targetId) {
    const e = new Error("You cannot logout yourself from here");
    e.status = 403;
    throw e;
  }

  const userToLogout = await User.findOne({ _id: targetId });
  const newRoleHierarchy = hierarchy.indexOf(userToLogout.role);
  const userHierarchy = hierarchy.indexOf(requestingUser.role);

  if (newRoleHierarchy < userHierarchy && userHierarchy >= 1) {
    await Session.deleteMany({ userId: targetId });
    await invalidateUserSessions(targetId);
    return { message: "Role update request logged" }; // Controller returns this exactly
  }

  const e = new Error("Not Authorised");
  e.status = 403;
  throw e;
};

export const updateSystemUserRoleLogic = async ({ targetId, newRole, requestingUser }) => {
  if (requestingUser.id === targetId) {
    const e = new Error("You cannot change your own roles");
    e.status = 403;
    throw e;
  }

  const userUpdate = await User.findOne({ _id: targetId });

  const newRoleHierarchy = hierarchy.indexOf(newRole);
  const userHierarchy = hierarchy.indexOf(requestingUser.role);
  const userToUpdateHierarchy = hierarchy.indexOf(userUpdate.role);

  if (newRoleHierarchy < userHierarchy && userToUpdateHierarchy < userHierarchy) {
    userUpdate.role = newRole;
    await userUpdate.save();
    await invalidateUserSessions(targetId);
    return { message: "Role update request logged" };
  }
  const e = new Error("Not Authorised");
  e.status = 403;
  throw e;
};

export const reactivateSystemUserLogic = async ({ targetId, requestingUser }) => {
  if (requestingUser.role !== "Owner") {
    const e = new Error("Not Authorised");
    e.status = 403;
    throw e;
  }
  const userToReactivate = await User.findOne({ _id: targetId });
  userToReactivate.status = "Active";
  await userToReactivate.save();
  await invalidateUserSessions(targetId);
  return { message: "Reactivate request logged" };
};
