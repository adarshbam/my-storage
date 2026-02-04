import express from "express";
import usersDB from "../usersDB.json" with { type: "json" };
import directoryDB from "../directoryDB.json" with { type: "json" };
import { rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { writeJSON } from "../utils/jsonDB.js";
import checkAuth from "../middlewares/authMiddleware.js";
import filesData from "../filesDB.json" with { type: "json" };

const router = express.Router();
const BASE = "storage";

router.get("/", checkAuth, (req, res) => {
  const user = req.user;
  console.log(user);
  return res.status(200).json({
    name: user.name,
    email: user.email,
    profilepic: user.profilepic,
    rootDirectoryId: user.rootDirId,
  });
});

router.post("/register", async (req, res) => {
  console.log(req.body);
  const { name, email, password } = req.body;

  const user = usersDB.find((user) => user.email === email);

  if (user) {
    return res.status(409).json({ message: "User already exists" });
  }

  const rootDirId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  usersDB.push({
    id: userId,
    name,
    email,
    profilepic: "",
    rootDirId,
    password,
  });

  directoryDB.push({
    id: rootDirId,
    name,
    userId,
    type: "directory",
    parentDir: null,
    files: [],
    directories: [],
  });

  try {
    await writeJSON("usersDB.json", usersDB);
    await writeJSON("directoryDB.json", directoryDB);
    return res.status(200).json({ message: "Registered" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/login", (req, res) => {
  console.log(req.body);
  const { email, password } = req.body;

  try {
    const user = usersDB.find((user) => user.email === email);

    if (!user) {
      return res.status(404).json({ emailerr: "Email not registered" });
    }

    if (user.password !== password) {
      return res.status(404).json({ passworderr: "Invalid password" });
    }

    const rootDir = directoryDB.find((dir) => dir.id === user.rootDirId);
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
});

router.post("/logout", (req, res) => {
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
});

router.post("/profilepic", checkAuth, async (req, res) => {
  const user = usersDB.find((user) => user.id === req.user.id);

  const fileName = req.headers.filename;
  const ext = path.extname(fileName);

  if (user.id !== req.user.id) {
    return res
      .status(403)
      .json({ message: "You are not authorized to update profile pic" });
  }

  const profilePicId = crypto.randomUUID();

  filesData.push({
    id: profilePicId,
    extension: ext,
    type: "file",
    userId: req.cookies.userId,
    name: fileName,
    parentDir: user.rootDirId,
  });

  const filePath = `./storage/${profilePicId}${ext}`;

  const oldProfilePic = filesData.find((file) => file.id === user.profilepic);
  if (oldProfilePic) {
    filesData.splice(filesData.indexOf(oldProfilePic), 1);
    await rm(`./storage/${oldProfilePic.id}${oldProfilePic.extension}`);
  }

  const writeStream = createWriteStream(filePath);

  user.profilepic = profilePicId;
  try {
    await writeJSON("usersDB.json", usersDB);
    await writeJSON("filesDB.json", filesData); // Save filesDB too

    writeStream.on("finish", () => {
      return res.status(200).json({ message: "Profile pic updated" });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
  req.pipe(writeStream);
});

router.get("/profilepic", checkAuth, (req, res) => {
  if (!req.user.profilepic) {
    return res.status(404).send("No profile pic set");
  }
  const profilePic = filesData.find((file) => file.id === req.user.profilepic);

  if (!profilePic) {
    return res.status(404).send("Profile pic not found");
  }

  const filePath = path.resolve(
    `./storage/${profilePic.id}${profilePic.extension}`,
  );
  return res.sendFile(filePath);
});

export default router;
