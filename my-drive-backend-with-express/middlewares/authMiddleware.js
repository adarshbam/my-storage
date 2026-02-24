import { connectToDB } from "../utils/db.js";

async function checkAuth(req, res, next) {
  const userId = decodeURIComponent(req.cookies.userId);
  try {
    const db = await connectToDB();
    const usersDB = db.collection("users");
    const user = await usersDB.findOne({ id: userId });

    if (!userId || !user) {
      return res.status(401).json({ message: "Not logged in" });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export default checkAuth;
