import usersDB from "./usersDB.json" with { type: "json" };

function checkAuth(req, res, next) {
  const userId = decodeURIComponent(req.cookies.userId);
  const user = usersDB.find((user) => user.id === userId);
  if (!userId || !user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  req.user = user;
  next();
}

export default checkAuth;
