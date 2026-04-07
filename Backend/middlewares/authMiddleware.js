import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";

async function checkAuth(req, res, next) {
  const { sessionId } = req.signedCookies;

  if (sessionId === false) {
    return res.status(401).json({ message: "Invalid cookie signature" });
  } else if (!sessionId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const session = await Session.findOne({ _id: sessionId });

    if (!session) {
      res.clearCookie("sessionId", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        signed: true,
      });

      return res.status(404).json({ message: "Sesssion not Found" });
    }
    const user = await User.findOne({ _id: session.userId }).lean();

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
