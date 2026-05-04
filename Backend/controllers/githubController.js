import { dir } from "node:console";
import User from "../models/userModel.js";

export const listRepositories = async (req, res) => {
  const user = await User.findById(req.user.id).select("integrations").lean();

  console.log(user);

  if (!user?.integrations?.github?.accessToken) {
    return res.status(403).json({ error: "Github not connected" });
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
    id: repo.id,
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
    directories: githubRepositories,
    files: [],
    name: "Github",
  });
};

export const getRepositoryContents = async (req, res) => {
  // TODO: Implement fetching directory and files inside a GitHub repository
  const { githubPath } = req.params;

  console.log("Fetching contents for:", githubPath);

  console.log(githubPath);

  // githubPath will be something like "adarshbam/my-storage"
  // or "adarshbam/my-storage/Backend/models"
  const parts = githubPath.split("/");
  const owner = parts[0];
  const repo = parts[1];
  const path = parts.slice(2).join("/"); // rest is folder path

  const user = await User.findOne({ _id: req.user.id });

  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!user?.integrations?.github?.accessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path || ""}`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const data = await response.json();
  console.log(data);

  if (!Array.isArray(data))
    return res.status(200).json({ directories: [], files: [], name: repo });

  const directories = data
    .filter((cnt) => cnt.type === "dir")
    .map((dir) => ({
      _id: dir.sha,
      id: dir.sha,
      name: dir.name,
      type: "directory",
      provider: "github",
      githubPath: `${owner}/${repo}/${dir.path}`,
      size: 0,
    }));

  console.log(directories);
  const files = data
    .filter((cnt) => cnt.type === "file")
    .map((dir) => ({
      _id: dir.sha,
      id: dir.sha,
      name: dir.name,
      type: "file",
      provider: "github",
      githubPath: `${owner}/${repo}/${dir.path}`,
      size: dir.size,
      extension: "." + dir.name.split(".")[1],
    }));

  console.log(files);

  return res.status(200).json({
    directories,
    files,
    name: repo,
  });
};
