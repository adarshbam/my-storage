import User from "../models/userModel.js";

async function checkAuth(req, res, next) {
  const userId = decodeURIComponent(req.cookies.userId);
  userId == "undefined" && res.status(200).json({ message: "Not logged in" });
  try {
    const user = await User.findOne({ _id: userId }).lean();

    if (!userId || !user) {
      return res.status(401).json({ message: "Not logged in" });
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
