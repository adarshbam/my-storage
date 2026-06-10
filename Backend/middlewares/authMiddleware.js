import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";
import { cacheGet, cacheSet, cacheSadd } from "../utils/redis.js";

async function checkAuth(req, res, next) {
  const { sessionId } = req.signedCookies;

  if (sessionId === false) {
    return res.status(401).json({ message: "Invalid cookie signature" });
  } else if (!sessionId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  req.sessionId = sessionId; // Attach sessionId to req for easy invalidation in controllers

  try {
    // 1. Try to read from Redis session cache
    const cachedUser = await cacheGet("session:" + sessionId);
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);
        if (user.status === "Deleted") {
          return res.status(404).json({
            message:
              "User is Deleted contact adarshsinghbam@gmail.com to recover your account",
          });
        }
        req.user = user;
        return next();
      } catch (parseErr) {
        console.error("Failed to parse cached session:", parseErr);
      }
    }

    // 2. Cache MISS: Fallback to MongoDB
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
    const user = await User.findOne({ _id: session.userId });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status === "Deleted") {
      return res.status(404).json({
        message:
          "User is Deleted contact adarshsinghbam@gmail.com to recover your account",
      });
    }

    user.id = user._id.toString(); // Map for backwards compat in controllers

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      maxStorage: user.maxStorage,
      
      role: user.role,
      rootDirId: user.rootDirId ? user.rootDirId.toString() : "",
      status: user.status,
      profilepic: user.profilepic,
      theme: user.theme,
      integrations: user.integrations,
    };

    await cacheSet("session:" + sessionId, JSON.stringify(sessionUser), 900); // 15-minute TTL
    try {
      await cacheSadd("user_sessions:" + user.id, sessionId, 900);
    } catch (setErr) {
      console.error("Failed to track session in user_sessions set:", setErr);
    }

    req.user = sessionUser;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export default checkAuth;
