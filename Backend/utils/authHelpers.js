import mongoose from "mongoose";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import Session from "../models/sessionModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import PlanTier from "../models/planTierModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import {
  SESSION_COOKIE_OPTIONS,
  ROOT_DIR_COOKIE_OPTIONS,
} from "../config/config.js";
import { getSystemConfigHelper } from "../services/systemConfig.service.js";

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
  // Client generates a random UUID once and stores it in localStorage,
  // sending it as x-device-id on every login. Falls back to User-Agent.
  const deviceId =
    req.headers["x-device-id"] || req.headers["user-agent"] || "unknown";

  const systemConfig = await getSystemConfigHelper();
  const globalDevicesLimit = systemConfig.maxDevicesLimit;

  // Load plan-based device limit directly from DB
  let planDevicesLimit = null;
  try {
    const user = await User.findById(userId).select("billingPlan").lean();
    if (user?.billingPlan) {
      const billingPlan = await BillingPlan.findById(user.billingPlan).lean();
      if (billingPlan?.tier) {
        const config = await PlanTierConfiguration.findOne({
          tier: billingPlan.tier,
        }).lean();
        planDevicesLimit = config?.rules?.limits?.maxConnectedDevices ?? null;
      }
    }
  } catch (err) {
    console.error("Failed to load plan device limit:", err);
  }

  const devicesLimit = Math.min(
    globalDevicesLimit,
    planDevicesLimit ?? globalDevicesLimit,
  );

  // 1. Find existing session (may not exist for first-time login)
  const existingSession = await Session.findOne({ userId });

  if (existingSession) {
    const existingDevice = existingSession.devices.find(
      (d) => d.deviceId === deviceId,
    );

    // 2. If new device and at the limit, evict the oldest device
    if (!existingDevice && existingSession.devices.length >= devicesLimit) {
      await Session.updateOne(
        { _id: existingSession._id },
        { $pull: { devices: { _id: existingSession.devices[0]._id } } },
      );
    }
  }

  // 3. Upsert session and add device (creates session on first login)
  const session = await Session.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $addToSet: { devices: { deviceId } },
    },
    { new: true, upsert: true },
  );

  const sessionId = session._id;

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
  userId = new mongoose.Types.ObjectId(),
}) {
  const rootDirId = new mongoose.Types.ObjectId();

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
    name: "Vault",
    userId,
    type: "directory",
    parentDir: null,
    path: [rootDirId],
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
