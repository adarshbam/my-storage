import User from "../models/userModel.js";

export const listRepositories = async (req, res) => {
  const user = await User.findById(req.user.id).select("integrations").lean();

  if (!user?.integrations?.github?.accessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  const githubAccessToken = user.integrations.github.accessToken;

  try {
    const response = await fetch("https://api.github.com/user/repos?per_page=100", {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    const repos = await response.json();

    // GitHub returns an error object (not an array) when the token is
    // expired, revoked, or rate-limited. Guard before calling .map.
    if (!response.ok || !Array.isArray(repos)) {
      return res.status(response.status || 400).json({
        error: repos?.message || "Failed to fetch repositories",
      });
    }

    const githubRepositories = repos.map((repo) => ({
      _id: repo.id,
      id: repo.id,
      name: repo.name,
      type: "directory",
      provider: "github",
      githubPath: repo.full_name,
      updatedAt: repo.updated_at,
    }));

    return res.status(200).json({
      directories: githubRepositories,
      files: [],
      name: "Github",
    });
  } catch (err) {
    console.error("listRepositories error:", err);
    return res.status(500).json({ error: "Failed to fetch repositories" });
  }
};

export const getRepositoryContents = async (req, res) => {
  const { owner, repo } = req.params;
  const path = Array.isArray(req.params.path) ? req.params.path.join("/") : (req.params.path || "");
  const currentPath = path || "";

  const user = await User.findOne({ _id: req.user.id });

  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!user?.integrations?.github?.accessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  const { ref } = req.query;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path || ""}${
      ref ? `?ref=${ref}` : ""
    }`,
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
      sha: file.sha,
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
  const { owner, repo } = req.params;
  const path = Array.isArray(req.params.path) ? req.params.path.join("/") : (req.params.path || "");
  const currentPath = path || "";
  const { action } = req.query;

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
  const ext = file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "";
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

export const updateFiles = async (req, res) => {
  const { owner, repo } = req.params;
  const path = Array.isArray(req.params.path) ? req.params.path.join("/") : (req.params.path || "");
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  const { content, sha } = req.body;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: "update file",
        content,
        sha,
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    return res
      .status(response.status)
      .json({ error: data.message || "Failed to update file" });
  }

  return res.status(200).json({ msg: "Edited!", content: data.content });
};

export const deleteFile = async (req, res) => {
  const { owner, repo } = req.params;
  const path = Array.isArray(req.params.path) ? req.params.path.join("/") : (req.params.path || "");
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  const { sha } = req.body;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: `Delete ${path}`,
        sha,
      }),
    },
  );

  if (!response.ok) {
    const data = await response.json();
    return res
      .status(response.status)
      .json({ error: data.message || "Failed to delete file" });
  }

  return res.status(200).json({ msg: "Deleted!" });
};

export const createFile = async (req, res) => {
  const { owner, repo } = req.params;
  const path = Array.isArray(req.params.path) ? req.params.path.join("/") : (req.params.path || "");
  const githubPath = `${owner}/${repo}${path ? `/${path}` : ""}`;
  const fileName = req.headers.filename; // Present if uploading from TransferManager

  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  // Helper to handle the actual GitHub API call
  const pushToGithub = async (content, finalPath, msg) => {
    const [pushOwner, pushRepo, ...pathParts] = finalPath.split("/");
    const pushPath = pathParts.join("/");

    const response = await fetch(
      `https://api.github.com/repos/${pushOwner}/${pushRepo}/contents/${pushPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: msg,
          content,
        }),
      },
    );
    return response;
  };

  if (fileName) {
    // CASE 1: Binary upload from TransferManager
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const content = buffer.toString("base64");
        const fullPath = githubPath ? `${githubPath}/${fileName}` : fileName;

        const response = await pushToGithub(
          content,
          fullPath,
          `Upload ${fileName}`,
        );
        const data = await response.json();

        if (!response.ok) {
          return res
            .status(response.status)
            .json({ error: data.message || "Failed to upload file" });
        }
        return res
          .status(201)
          .json({ msg: "Uploaded!", content: data.content });
      } catch (err) {
        console.error("Upload error:", err);
        return res
          .status(500)
          .json({ error: "Internal server error during upload" });
      }
    });
  } else {
    // CASE 2: JSON request from "New File" button
    const { content } = req.body;
    try {
      const response = await pushToGithub(
        content || "",
        githubPath,
        `Create ${githubPath}`,
      );
      const data = await response.json();

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ error: data.message || "Failed to create file" });
      }
      return res.status(201).json({ msg: "Created!", content: data.content });
    } catch (err) {
      console.error("Create error:", err);
      return res
        .status(500)
        .json({ error: "Internal server error during creation" });
    }
  }
};

export const deleteFolder = async (req, res) => {
  const { owner, repo } = req.params;
  const path = Array.isArray(req.params.path) ? req.params.path.join("/") : (req.params.path || "");
  const pathPrefix = path || "";
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) return res.status(403).json({ error: "Github not connected" });

  try {
    // 1. Get all files in the repo recursively
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
      {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }
    );
    
    if (!treeResponse.ok) throw new Error("Failed to fetch repository tree");
    const treeData = await treeResponse.json();

    // 2. Filter for files that are inside the target folder
    const filesToDelete = treeData.tree.filter(item => 
      item.type === "blob" && item.path.startsWith(pathPrefix + "/")
    );

    // 3. Delete each file
    for (const file of filesToDelete) {
      await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            message: `Delete ${file.path} (Recursive Folder Delete)`,
            sha: file.sha,
          }),
        }
      );
    }

    return res.status(200).json({ msg: "Folder deleted recursively" });
  } catch (err) {
    console.error("Recursive delete error:", err);
    return res.status(500).json({ error: "Failed to delete folder recursively" });
  }
};

export const downloadRepository = async (req, res) => {
  const { owner, repo } = req.params;
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  const { ref } = req.query;
  const zipballUrl = `https://api.github.com/repos/${owner}/${repo}/zipball${ref ? `/${ref}` : ""}`;

  try {
    const response = await fetch(zipballUrl, {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${repo}.zip"`,
      );
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("X-Total-Size", buffer.length);
      return res.send(buffer);
    } else {
      const data = await response.json().catch(() => ({}));
      return res
        .status(response.status)
        .json({ error: data.message || "Failed to download repository" });
    }
  } catch (error) {
    console.error("Download Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const downloadFolder = async (req, res) => {
  const { owner, repo } = req.params;
  const path = Array.isArray(req.params.path) ? req.params.path.join("/") : (req.params.path || "");
  const pathPrefix = path || "";
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) return res.status(403).json({ error: "Github not connected" });

  try {
    // 1. Get repo info to find default branch
    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${githubAccessToken}` }
    });
    if (!repoInfoRes.ok) throw new Error("Failed to fetch repository info");
    const repoInfo = await repoInfoRes.json();
    const defaultBranch = repoInfo.default_branch || "main";

    // 2. Get repo tree recursively
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers: { Authorization: `Bearer ${githubAccessToken}` } }
    );
    if (!treeResponse.ok) throw new Error(`Failed to fetch tree for branch ${defaultBranch}`);
    const treeData = await treeResponse.json();

    // 3. Filter for files in target path
    const files = treeData.tree.filter(item => 
      item.type === "blob" && item.path.startsWith(pathPrefix + "/")
    );

    if (files.length === 0) {
      return res.status(404).json({ error: "No files found in this folder" });
    }

    const archive = archiver("zip", { zlib: { level: 5 } });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${pathPrefix.split("/").pop() || repo}.zip"`,
    );
    res.setHeader("Content-Type", "application/zip");
    archive.pipe(res);

    // 4. Append files to archive
    for (const file of files) {
      const fileRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${defaultBranch}`,
        { headers: { Authorization: `Bearer ${githubAccessToken}` } }
      );
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        const buffer = Buffer.from(fileData.content, "base64");
        archive.append(buffer, { name: file.path.replace(pathPrefix + "/", "") });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error("Folder download error:", err);
    if (!res.headersSent)
      res.status(500).json({ error: err.message || "Folder download failed" });
  }
};

export const listBranches = async (req, res) => {
  const { owner, repo } = req.params;
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) return res.status(403).json({ error: "Github not connected" });

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: { Authorization: `Bearer ${githubAccessToken}` }
    });
    if (!response.ok) throw new Error("Failed to fetch branches");
    const data = await response.json();
    return res.status(200).json(data.map(b => b.name));
  } catch (err) {
    console.error("Fetch branches error:", err);
    return res.status(500).json({ error: "Failed to fetch branches" });
  }
};

export const searchRepository = async (req, res) => {
  const { owner, repo } = req.params;
  const { q, ref } = req.query;
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken)
    return res.status(403).json({ error: "Github not connected" });

  try {
    let branch = ref;
    if (!branch) {
      const repoRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: { Authorization: `Bearer ${githubAccessToken}` },
        },
      );
      const repoData = await repoRes.json();
      branch = repoData.default_branch || "main";
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch repository tree");
    }

    const data = await response.json();
    const query = q.toLowerCase();

    const results = data.tree.filter((item) =>
      item.path.toLowerCase().includes(query),
    );

    const directories = results
      .filter((item) => item.type === "tree")
      .map((item) => ({
        id: item.sha,
        name: item.path.split("/").pop(),
        type: "directory",
        provider: "github",
        githubPath: `${owner}/${repo}/${item.path}`,
        fullPath: item.path,
      }));

    const files = results
      .filter((item) => item.type === "blob")
      .map((item) => ({
        id: item.sha,
        name: item.path.split("/").pop(),
        type: "file",
        provider: "github",
        githubPath: `${owner}/${repo}/${item.path}`,
        fullPath: item.path,
        size: item.size,
        extension: item.path.includes(".")
          ? "." + item.path.split(".").pop()
          : "",
      }));

    return res.status(200).json({
      directories,
      files,
      name: `Search: ${q}`,
    });
  } catch (error) {
    console.error("Search Repository Error:", error);
    return res.status(500).json({ error: "Search failed" });
  }
};
