import User from "../models/userModel.js";

async function checkAuth(req, res, next) {
  const userId = req.cookies.userId;
  if (!userId) {
    return res.status(401).json({ message: "Not logged in" });
  }
  const { id, expiry } = JSON.parse(Buffer.from(userId, "base64").toString());
  console.log(id, expiry);
  console.log(id.toString());
  const expiryInSeconds = parseInt(expiry);
  const currentTime = Math.round(Date.now() / 1000);
  console.log(expiryInSeconds, currentTime);
  if (expiryInSeconds < currentTime) {
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
