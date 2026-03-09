import { rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import crypto from "crypto";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import mongoose from "mongoose";

export const getUser = (req, res) => {
  const user = req.user;
  return res.status(200).json({
    name: user.name,
    email: user.email,
    profilepic: user.profilepic,
    rootDirectoryId: user.rootDirId,
  });
};

export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("_id").lean();

  if (user) {
    return res.status(409).json({ message: "User already exists" });
  }

  const rootDirId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  const newUser = {
    _id: userId,
    name: "user",
    email,
    profilepic: null,
    rootDirId: rootDirId,
    password,
  };

  const rootDir = {
    _id: rootDirId,
    name: "root",
    userId: userId,
    type: "directory",
    parentDir: null,
  };

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    await User.create([newUser], { session });
    await Directory.create([rootDir], { session });
    await session.commitTransaction();
    return res.status(201).json({ message: "Registered" });
  } catch (err) {
    console.error(err);
    await session.abortTransaction();
    if (err.code === 121) {
      return res.status(400).json({ error: "Invalid Fields" });
    } else {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } finally {
    session.endSession();
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email })
      .select("password rootDirId name")
      .lean();

    if (!user) {
      return res.status(404).json({ emailerr: "Email not registered" });
    }

    if (user.password !== password) {
      return res.status(404).json({ passworderr: "Invalid password" });
    }

    const rootDir = await Directory.findOne({ _id: user.rootDirId })
      .select("_id")
      .lean();
    if (!rootDir) {
      return res.status(500).json({ message: "Internal Server Error" });
    }

    res.cookie("rootDirId", encodeURIComponent(rootDir._id.toString()), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("userId", encodeURIComponent(user._id.toString()), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: `Login successful ${user.name}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie("rootDirId", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.clearCookie("userId", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  return res.status(200).json({ message: "Logout successful" });
};

export const uploadProfilePic = async (req, res) => {
  const user = await User.findOne({ _id: req.user.id })
    .select("rootDirId profilepic")
    .lean();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const fileName = req.headers.filename;
  const ext = path.extname(fileName);

  const profilePicId = new mongoose.Types.ObjectId();

  const newProfilePic = {
    _id: profilePicId,
    extension: ext,
    type: "file",
    userId: req.user.id,
    name: fileName,
    parentDir: null,
  };

  await File.create(newProfilePic);

  const filePath = `./storage/${profilePicId.toString()}${ext}`;

  if (user.profilepic) {
    const oldProfilePic = await File.findOne({
      _id: user.profilepic,
    })
      .select("extension")
      .lean();
    if (oldProfilePic) {
      await File.deleteOne({ _id: oldProfilePic._id });
      await rm(
        `./storage/${oldProfilePic._id.toString()}${oldProfilePic.extension}`,
      ).catch(() => {});
    }
  }

  const writeStream = createWriteStream(filePath);

  try {
    await User.updateOne(
      { _id: user._id },
      { $set: { profilepic: profilePicId.toString() } },
    );

    writeStream.on("finish", () => {
      return res.status(200).json({ message: "Profile pic updated" });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
  req.pipe(writeStream);
};

export const getProfilePic = async (req, res) => {
  if (!req.user.profilepic) {
    return res.status(404).send("No profile pic set");
  }
  const profilePic = await File.findOne({ _id: req.user.profilepic })
    .select("extension")
    .lean();

  if (!profilePic) {
    return res.status(404).send("Profile pic not found");
  }

  const filePath = path.resolve(
    `./storage/${profilePic._id.toString()}${profilePic.extension}`,
  );
  return res.status(200).sendFile(filePath);
};

export const getSearchedItems = (req, res) => {
  return res.status(200).json(req.user.recentlySearchedItems || []);
};

export const storeSearchedItem = async (req, res) => {
  const { searchItem } = req.body;

  try {
    const user = await User.findOne({ _id: req.user.id })
      .select("recentlySearchedItems")
      .lean();

    if (!user) return res.status(404).send("User not found");

    let recentlySearchedItems = user.recentlySearchedItems || [];

    if (!searchItem || searchItem.trim() === "") {
      recentlySearchedItems = [];
      await User.updateOne(
        { _id: user._id },
        { $set: { recentlySearchedItems } },
      );
      return res.status(200).json({ msg: "Search history cleared" });
    }

    const existingIndex = recentlySearchedItems.indexOf(searchItem);
    if (existingIndex !== -1) {
      recentlySearchedItems.splice(existingIndex, 1);
    }

    recentlySearchedItems.push(searchItem);

    if (recentlySearchedItems.length > 5) {
      recentlySearchedItems = recentlySearchedItems.slice(-5);
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { recentlySearchedItems } },
    );
    res.status(201).json({ msg: "Succesfully Stored Searched Item" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
