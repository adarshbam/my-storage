import { rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import crypto from "crypto";
import { client, connectToDB } from "../utils/db.js";

const db = await connectToDB();
const usersCollection = db.collection("users");
const directoriesCollection = db.collection("directories");
const filesCollection = db.collection("files");

const BASE = "storage";

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
  const { name, email, password } = req.body;

  const user = await usersCollection.findOne({ email });

  if (user) {
    return res.status(409).json({ message: "User already exists" });
  }

  const rootDirId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  const newUser = {
    id: userId,
    name,
    email,
    profilepic: "",
    rootDirId,
    password,
  };

  const rootDir = {
    id: rootDirId,
    name: "root",
    userId,
    type: "directory",
    parentDir: null,
  };

  const session = client.startSession();

  try {
    session.startTransaction();
    await usersCollection.insertOne(newUser, { session });
    await directoriesCollection.insertOne(rootDir, { session });
    await session.commitTransaction();
    return res.status(200).json({ message: "Registered" });
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
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({ emailerr: "Email not registered" });
    }

    if (user.password !== password) {
      return res.status(404).json({ passworderr: "Invalid password" });
    }

    const rootDir = await directoriesCollection.findOne({ id: user.rootDirId });
    if (!rootDir) {
      return res.status(500).json({ message: "Internal Server Error" });
    }

    res.cookie("rootDirId", encodeURIComponent(rootDir.id), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("userId", encodeURIComponent(user.id), {
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
  const user = await usersCollection.findOne({ id: req.user.id });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const fileName = req.headers.filename;
  const ext = path.extname(fileName);

  const profilePicId = crypto.randomUUID();

  const newProfilePic = {
    id: profilePicId,
    extension: ext,
    type: "file",
    userId: req.cookies.userId,
    name: fileName,
    parentDir: user.rootDirId,
  };

  await filesCollection.insertOne(newProfilePic);

  const filePath = `./storage/${profilePicId}${ext}`;

  if (user.profilepic) {
    const oldProfilePic = await filesCollection.findOne({
      id: user.profilepic,
    });
    if (oldProfilePic) {
      await filesCollection.deleteOne({ id: oldProfilePic.id });
      await rm(`./storage/${oldProfilePic.id}${oldProfilePic.extension}`).catch(
        () => {},
      );
    }
  }

  const writeStream = createWriteStream(filePath);

  try {
    await usersCollection.updateOne(
      { id: user.id },
      { $set: { profilepic: profilePicId } },
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
  const profilePic = await filesCollection.findOne({ id: req.user.profilepic });

  if (!profilePic) {
    return res.status(404).send("Profile pic not found");
  }

  const filePath = path.resolve(
    `./storage/${profilePic.id}${profilePic.extension}`,
  );
  return res.status(200).sendFile(filePath);
};

export const getSearchedItems = (req, res) => {
  return res.status(200).json(req.user.recentlySearchedItems || []);
};

export const storeSearchedItem = async (req, res) => {
  const { searchItem } = req.body;

  try {
    const user = await usersCollection.findOne({ id: req.user.id });

    if (!user) return res.status(404).send("User not found");

    let recentlySearchedItems = user.recentlySearchedItems || [];

    if (!searchItem || searchItem.trim() === "") {
      recentlySearchedItems = [];
      await usersCollection.updateOne(
        { id: user.id },
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

    await usersCollection.updateOne(
      { id: user.id },
      { $set: { recentlySearchedItems } },
    );
    res.status(201).json({ msg: "Succesfully Stored Searched Item" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
