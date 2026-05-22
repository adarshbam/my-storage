import { rm } from "node:fs/promises";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";
import { invalidateUserSessions } from "../utils/redis.js";

const hierarchy = ["User", "Manager", "Admin", "Owner"];

export const getAllSystemUsers = async (req, res) => {
  console.log("GET /users called");

  if (!req.user?.role || req.user.role === "User") {
    return res.status(403).json({ error: "Access denied", redirect: "/" });
  }
  const allUsers = await User.find().populate("profilepic");
  const allSessions = await Session.find().lean();
  const allSessionsUserId = allSessions.map(({ userId }) => userId.toString());
  const allSessionsUserIdSet = new Set(allSessionsUserId);

  console.log(allUsers);

  const hierarchy = ["User", "Manager", "Admin", "Owner"];
  const userHierarchy = hierarchy.indexOf(req.user.role ?? "User");

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
          : `https://localhost:4000/user/profilepic?id=${profilepic._id}`
        : null,
      status: status || "Active",
      yourAuthority,
      rootDirId: rootDirId?.toString() || null,
      isLoggedIn: allSessionsUserIdSet.has(_id.toString()),
    }),
  );

  console.log(transformedUsers);

  res.status(200).json(transformedUsers);
};

export const deleteSystemUser = async (req, res) => {
  const { deleteType } = req.body;
  const { id } = req.params;

  console.log(deleteType);

  if (req.user.id === id)
    return res
      .status(403)
      .json({ message: `You cannot logout yourself from here` });

  const userToDelete = await User.findOne({ _id: id });
  const newRoleHierarchy = hierarchy.indexOf(userToDelete.role);
  const userHierarchy = hierarchy.indexOf(req.user.role);
  console.log(userHierarchy, newRoleHierarchy);

  if (newRoleHierarchy < userHierarchy && userHierarchy >= 2) {
    await Session.deleteMany({ userId: id });
    await invalidateUserSessions(id);
    if (deleteType === "soft") {
      userToDelete.status = "Deleted";
      await userToDelete.save();
      console.log("Doing Soft Delete");
      return res.status(200).json({ message: "Delete request logged" });
    }

    const files = await File.find({ userId: id });

    for (const file of files) {
      const filePath = `./storage/${file._id.toString()}${file.extension}`;
      try {
        await rm(filePath, { recursive: true, force: true });

        // Also delete thumbnail
        await rm(`./storage/thumbnails/${file._id.toString()}.jpg`, {
          force: true,
        }).catch(() => {});
      } catch (err) {
        console.error(`Failed to delete file on disk ${filePath}:`, err);
      }
    }

    // Delete from DB
    await File.deleteMany({ userId: id });
    await User.deleteMany({ _id: id });
    await Session.deleteMany({ userId: id });
    await invalidateUserSessions(id);
    await Directory.deleteMany({ userId: id });

    console.log("Doing hard delete");
    return res.status(200).json({ message: "Delete request logged" });
  }
  return res.status(403).json({ message: "Not Authorised" });
};

export const forceLogoutUser = async (req, res) => {
  const { id } = req.params;

  if (req.user.id === id)
    return res
      .status(403)
      .json({ message: `You cannot logout yourself from here` });

  const userToLogout = await User.findOne({ _id: id });
  const newRoleHierarchy = hierarchy.indexOf(userToLogout.role);
  const userHierarchy = hierarchy.indexOf(req.user.role);

  if (newRoleHierarchy < userHierarchy && userHierarchy >= 1) {
    await Session.deleteMany({ userId: id });
    await invalidateUserSessions(id);
    return res.status(200).json({ message: "Role update request logged" });
  }

  return res.status(403).json({ message: "Not Authorised" });
};

export const updateSystemUserRole = async (req, res) => {
  const { role, userId } = req.body;

  if (req.user.id === userId)
    return res
      .status(403)
      .json({ message: `You cannot change your own roles` });

  const userUpdate = await User.findOne({ _id: userId });

  const newRoleHierarchy = hierarchy.indexOf(role);
  const userHierarchy = hierarchy.indexOf(req.user.role);
  const userToUpdateHierarchy = hierarchy.indexOf(userUpdate.role);

  if (
    newRoleHierarchy < userHierarchy &&
    userToUpdateHierarchy < userHierarchy
  ) {
    userUpdate.role = role;
    await userUpdate.save();
    await invalidateUserSessions(userId);
    return res.status(200).json({ message: "Role update request logged" });
  }
  return res.status(403).json({ message: `Not Authorised` });
};

export const reactivateSystemUser = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== "Owner")
    return res.status(403).json({ message: `Not Authorised` });
  const userToReactivate = await User.findOne({ _id: id });
  userToReactivate.status = "Active";
  await userToReactivate.save();
  await invalidateUserSessions(id);
  return res.status(200).json({ message: "Reactivate request logged" });
};
