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

  const githubRepositories = repos.map((repo) => ({
    _id: repo.id,
    name: repo.name,
    type: "directory",
    provider: "github",
    githubPath: repo.full_name,
    updatedAt: repo.updated_at,
  }));

  console.log(githubRepositories);

  if (!githubRepositories)
    return res.status(200).json({
      directories: [],
      files: [],
      parentDir: null,
    });

  return res.status(200).json({
    repositories: githubRepositories,
  });
};
