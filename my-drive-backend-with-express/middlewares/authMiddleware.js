import { readJSON } from "../utils/jsonDB.js";

async function checkAuth(req, res, next) {
  const userId = decodeURIComponent(req.cookies.userId);
  try {
    const usersDB = await readJSON("./usersDB.json");
    const user = usersDB.find((user) => user.id === userId);
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
