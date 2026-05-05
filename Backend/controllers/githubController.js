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
    .map((file) => ({
      _id: file.sha,
      id: file.sha,
      name: file.name,
      type: "file",
      provider: "github",
      githubPath: `${owner}/${repo}/${file.path}`,
      size: file.size,
      extension: file.name.includes(".")
        ? "." + file.name.split(".").pop()
        : "",
    }));

  console.log(files);

  return res.status(200).json({
    directories,
    files,
    name: repo,
  });
};

export const getFiles = async (req, res) => {
  // TODO: Implement fetching directory and files inside a GitHub repository
  const { githubPath } = req.params;
  const { action } = req.query;

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

  const file = await response.json();

  // 1. Check if GitHub actually sent content (GitHub API limits to 1MB)
  if (!file.content) {
    return res.status(400).json({ error: "File is too large or empty." });
  }

  console.log(file);

  // 2. Create a raw buffer from the base64 content
  const buffer = Buffer.from(file.content, "base64");

  // 3. Figure out the mime type so the browser knows how to render it
  const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    mp4: "video/mp4",
  };

  // Default to octet-stream (binary) if we don't recognize it, but fallback to text for code
  const contentType = mimeTypes[ext] || "text/plain";

  // Set the standard content type
  res.setHeader("Content-Type", contentType);

  // If the frontend asked for a download, force the browser to save it as a file!
  if (action === "download") {
    // "attachment" tells the browser to download it.
    // You also pass the filename so the browser knows what to name it on the user's computer.
    res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
  }

  // Send the raw buffer. If it's a download, it saves to disk. If not, it previews on screen!
  return res.status(200).send(buffer);
};

export const downloadRepository = async (req, res) => {
  const { githubPath } = req.params;
  const parts = githubPath.split("/");
  const owner = parts[0];
  const repo = parts[1];

  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  // GitHub provides a zipball URL to download the repository archive
  const zipballUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;

  try {
    const response = await fetch(zipballUrl, {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
      },
      redirect: 'manual' // We want to catch the 302 redirect
    });

    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get("location");
      return res.redirect(location);
    } else if (response.ok) {
       // Just in case fetch follows redirect automatically
       const arrayBuffer = await response.arrayBuffer();
       const buffer = Buffer.from(arrayBuffer);
       res.setHeader("Content-Disposition", `attachment; filename="${repo}.zip"`);
       res.setHeader("Content-Type", "application/zip");
       return res.send(buffer);
    } else {
       return res.status(response.status).json({ error: "Failed to download repository" });
    }
  } catch (error) {
    console.error("Error downloading repo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
