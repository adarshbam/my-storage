import mongoose from "mongoose";
import argon2 from "argon2";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import Session from "../models/sessionModel.js";
import {
  MAX_DEVICES_LIMIT,
  SESSION_COOKIE_OPTIONS,
  ROOT_DIR_COOKIE_OPTIONS,
} from "../config.js";

/**
 * Creates (or upserts) a session for the user, enforces the device limit,
 * and sets the `sessionId` + `rootDirId` cookies on the response.
 *
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} rootDirId
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export async function createSessionAndSetCookies(userId, rootDirId, req, res) {
  const deviceFingerprint = req.headers["user-agent"];
  const deviceId = await argon2.hash(deviceFingerprint);

  const session = await Session.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $addToSet: { devices: { deviceId } },
    },
    {
      returnDocument: "after",
      new: true,
      upsert: true,
    },
  );

  const sessionId = session._id;

  const existingDevice = session.devices.find((d) => d.deviceId === deviceId);
  if (!existingDevice && session.devices.length >= MAX_DEVICES_LIMIT) {
    await Session.findByIdAndDelete(sessionId);
  }

  res.cookie("sessionId", sessionId, SESSION_COOKIE_OPTIONS);
  res.cookie(
    "rootDirId",
    encodeURIComponent(rootDirId.toString()),
    ROOT_DIR_COOKIE_OPTIONS,
  );
}

/**
 * Creates a User and their root Directory inside a transaction.
 *
 * @param {Object} opts
 * @param {string} opts.name
 * @param {string} opts.email
 * @param {string} opts.password        — will be hashed by the User pre-save hook
 * @param {ObjectId|null} opts.profilepicId — File document ObjectId (or null)
 * @param {boolean} opts.isVerified
 * @returns {{ userId: ObjectId, rootDirId: ObjectId }}
 */
export async function createUserWithRootDir({
  name,
  email,
  password,
  profilepicId = null,
  isVerified = false,
}) {
  const rootDirId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  const newUser = {
    _id: userId,
    name,
    email,
    profilepic: profilepicId,
    rootDirId,
    password,
    isVerified,
  };

  const rootDir = {
    _id: rootDirId,
    name: "root",
    userId,
    type: "directory",
    parentDir: null,
  };

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    await User.create([newUser], { session });
    await Directory.create([rootDir], { session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err; // Let the caller handle specific error codes
  } finally {
    session.endSession();
  }

  return { userId, rootDirId };
}
