import User from "../models/userModel.js";

export const listRepositories = async (req, res) => {
  const user = await User.findById(req.user.id).select("integrations").lean();

  console.log(user);

  if (!user?.integrations?.github?.accessToken) {
    return res.status(403).json({ error: "Google Drive not connected" });
  }

  const githubAccessToken = user?.integrations?.github?.accessToken;

  const response = await fetch("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  const repos = await response.json();
  console.log(repos);

  if (!repos)
    return res.status(200).json({
      directories: [],
      files: [],
      parentDir: null,
    });

  return res.status(200).json({
    repositories: repos,
  });
};
