import User from "../models/userModel.js";
import crypto from "crypto";
import { secretKey } from "../controllers/userController.js";

async function checkAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const signedUserId = Buffer.from(token, "base64url").toString();
  const cookiePayload = JSON.parse(signedUserId.split(".")[0]);
  const { id, expiry } = cookiePayload;

  const tokenHash = signedUserId.split(".")[1];

  const tokenHashCalculated = crypto
    .createHash("sha256")
    .update(secretKey)
    .update(JSON.stringify(cookiePayload))
    .update(secretKey)
    .digest("base64url");

  const expiryInSeconds = parseInt(expiry);
  const currentTime = Math.round(Date.now() / 1000);

  if (expiryInSeconds < currentTime || tokenHash !== tokenHashCalculated) {
    res.clearCookie("rootDirId", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    return res.status(401).json({ message: "Session expired" });
  }

  try {
    const user = await User.findOne({ _id: id }).lean();

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    user.id = user._id.toString(); // Map for backwards compat in controllers
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export default checkAuth;
