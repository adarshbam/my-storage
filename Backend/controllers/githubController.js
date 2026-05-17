import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import archiver from "archiver";

export const disconnectGithub = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user.id },
      {
        $unset: {
          "integrations.github": "",
        },
      },
    );

    await Directory.deleteOne({
      userId: req.user.id,
      provider: "github",
    });

    return res
      .status(200)
      .json({ success: true, message: "Github disconnected" });
  } catch (error) {
    console.error("Github disconnect error:", error);
    return res.status(500).json({ error: "Failed to disconnect Github" });
  }
};

export const createRepository = async (req, res) => {
  const { name, description, private: isPrivate } = req.body;
  const user = await User.findById(req.user.id).select("integrations").lean();

  if (!user?.integrations?.github?.accessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  const githubAccessToken = user.integrations.github.accessToken;

  try {
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        private: isPrivate || false,
        auto_init: true, // Create with README.md by default for convenience
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "Failed to create repository",
      });
    }

    return res.status(201).json({
      message: "Repository created successfully",
      repository: data,
    });
  } catch (err) {
    console.error("createRepository error:", err);
    return res.status(500).json({ error: "Failed to create repository" });
  }
};

export const listRepositories = async (req, res) => {
  const user = await User.findById(req.user.id).select("integrations").lean();

  if (!user?.integrations?.github?.accessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  const githubAccessToken = user.integrations.github.accessToken;

  try {
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100",
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

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
  const pathSegment = req.params[0] || req.params.path;
  const path = Array.isArray(pathSegment)
    ? pathSegment.join("/")
    : pathSegment || "";
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
  const pathSegment = req.params[0] || req.params.path;
  const path = Array.isArray(pathSegment)
    ? pathSegment.join("/")
    : pathSegment || "";
  const { action, ref } = req.query;

  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  // 1. Get file metadata first (to get size and verify it's a file)
  const metaResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!metaResponse.ok) {
    const error = await metaResponse.json().catch(() => ({}));
    return res
      .status(metaResponse.status)
      .json({ error: error.message || "File not found" });
  }

  const fileMeta = await metaResponse.json();
  if (Array.isArray(fileMeta)) {
    return res.status(400).json({ error: "Path is a directory, not a file" });
  }

  const fileSize = fileMeta.size;
  const range = req.headers.range;

  // 2. Prepare headers for the final response
  const ext = fileMeta.name.split(".").pop().toLowerCase();
  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    mp4: "video/mp4",
    zip: "application/zip",
  };
  const contentType = mimeTypes[ext] || "text/plain";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("X-Total-Size", fileSize);

  if (action === "download") {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileMeta.name}"`,
    );
  }

  // 3. Fetch the raw content (streaming)
  const fetchOptions = {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github.v3.raw",
    },
  };

  if (range) {
    fetchOptions.headers.Range = range;
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  }

  const rawResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ""}`,
    fetchOptions,
  );

  if (!rawResponse.ok) {
    return res.status(rawResponse.status).send("Failed to stream file content");
  }

  // 4. Pipe the stream directly to the response
  if (rawResponse.body) {
    // In Node fetch (undici/node-fetch), body is a ReadableStream
    // If it's a web stream, we can use the following:
    const reader = rawResponse.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });
    // Note: Node.js express res.send() or res.end() works differently with web streams.
    // Better to use a proper bridge or just pipe if it's a Node stream.
    // Actually, in modern Node (18+), fetch returns a Response with a web body.
    // We can convert it to a Node stream:
    const { Readable } = await import("stream");
    Readable.fromWeb(rawResponse.body).pipe(res);
  } else {
    res.status(500).send("No content body available");
  }
};

export const updateFiles = async (req, res) => {
  const { owner, repo } = req.params;
  const pathSegment = req.params[0] || req.params.path;
  const path = Array.isArray(pathSegment)
    ? pathSegment.join("/")
    : pathSegment || "";
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
  const pathSegment = req.params[0] || req.params.path;
  const path = Array.isArray(pathSegment)
    ? pathSegment.join("/")
    : pathSegment || "";
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
  const pathSegment = req.params[0] || req.params.path;
  const path = Array.isArray(pathSegment)
    ? pathSegment.join("/")
    : pathSegment || "";
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

    // Check if the file already exists to get its sha
    let sha;
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${pushOwner}/${pushRepo}/contents/${pushPath}`,
        {
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            Accept: "application/vnd.github+json",
          },
        },
      );
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }
    } catch (err) {
      // ignore error, file probably doesn't exist
    }

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
          ...(sha && { sha }),
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
  const pathSegment = req.params[0] || req.params.path;
  const path = Array.isArray(pathSegment)
    ? pathSegment.join("/")
    : pathSegment || "";
  const pathPrefix = path || "";
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken)
    return res.status(403).json({ error: "Github not connected" });

  try {
    const branch = req.query.ref;
    let targetBranch = branch;
    if (!targetBranch) {
      const repoInfoRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: { Authorization: `Bearer ${githubAccessToken}` },
        },
      );
      if (repoInfoRes.ok) {
        const repoInfo = await repoInfoRes.json();
        targetBranch = repoInfo.default_branch || "main";
      } else {
        targetBranch = "main";
      }
    }

    // 1. Get all files in the repo recursively
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
      {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      },
    );

    if (!treeResponse.ok) throw new Error("Failed to fetch repository tree");
    const treeData = await treeResponse.json();

    // 2. Filter for files that are inside the target folder
    const filesToDelete = treeData.tree.filter(
      (item) => item.type === "blob" && item.path.startsWith(pathPrefix + "/"),
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
        },
      );
    }

    return res.status(200).json({ msg: "Folder deleted recursively" });
  } catch (err) {
    console.error("Recursive delete error:", err);
    return res
      .status(500)
      .json({ error: "Failed to delete folder recursively" });
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
  // Express 5 might return wildcard parameters as arrays
  const rawPath = req.params.path || req.params[0] || "";
  const pathPrefix = Array.isArray(rawPath)
    ? rawPath.join("/")
    : String(rawPath);
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  const { ref: queryRef } = req.query;

  if (!githubAccessToken)
    return res.status(403).json({ error: "Github not connected" });

  try {
    let targetRef = queryRef;

    // 1. If no ref provided, get repo info to find default branch
    if (!targetRef) {
      console.log(
        `No ref provided for ${owner}/${repo}, fetching default branch`,
      );
      const repoInfoRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: { Authorization: `Bearer ${githubAccessToken}` },
        },
      );
      if (!repoInfoRes.ok)
        throw new Error(`Failed to fetch repo info: ${repoInfoRes.status}`);
      const repoInfo = await repoInfoRes.json();
      targetRef = repoInfo.default_branch || "main";
    }

    // 2. Get repo tree recursively
    console.log(`Fetching recursive tree for ${owner}/${repo} at ${targetRef}`);
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetRef}?recursive=1`,
      { headers: { Authorization: `Bearer ${githubAccessToken}` } },
    );

    if (!treeResponse.ok) {
      const errorData = await treeResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch tree: ${errorData.message || treeResponse.statusText}`,
      );
    }

    const treeData = await treeResponse.json();
    if (!treeData.tree || !Array.isArray(treeData.tree)) {
      throw new Error("Invalid tree data received from GitHub");
    }

    // 3. Filter for files in target path
    // We check if item.path is exactly pathPrefix or starts with pathPrefix/
    const files = treeData.tree.filter(
      (item) =>
        item.type === "blob" &&
        (item.path === pathPrefix || item.path.startsWith(pathPrefix + "/")),
    );

    console.log(`Found ${files.length} files in ${pathPrefix}`);

    if (files.length === 0) {
      return res.status(404).json({ error: "No files found in this folder" });
    }

    const archive = archiver("zip", { zlib: { level: 5 } });

    archive.on("error", (err) => {
      console.error("Archiver error:", err);
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${pathPrefix.split("/").pop() || repo}.zip"`,
    );
    res.setHeader("Content-Type", "application/zip");
    archive.pipe(res);

    // 4. Append files to archive in parallel (up to 10 at a time to be safe with rate limits)
    const CHUNK_SIZE = 10;
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const chunk = files.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (file) => {
          try {
            const fileRes = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${targetRef}`,
              { headers: { Authorization: `Bearer ${githubAccessToken}` } },
            );
            if (fileRes.ok) {
              const fileData = await fileRes.json();
              if (fileData.content) {
                const buffer = Buffer.from(fileData.content, "base64");
                // Folder structure inside zip should be relative to the requested folder
                const relativePath =
                  file.path === pathPrefix
                    ? pathPrefix.split("/").pop()
                    : file.path.replace(pathPrefix + "/", "");
                archive.append(buffer, { name: relativePath });
              }
            }
          } catch (e) {
            console.error(`Error fetching file ${file.path}:`, e);
          }
        }),
      );
    }

    await archive.finalize();
  } catch (err) {
    console.error("Folder download error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Folder download failed" });
    }
  }
};

export const listBranches = async (req, res) => {
  const { owner, repo } = req.params;
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken)
    return res.status(403).json({ error: "Github not connected" });

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      },
    );
    if (!response.ok) throw new Error("Failed to fetch branches");
    const data = await response.json();
    return res.status(200).json(data.map((b) => b.name));
  } catch (err) {
    console.error("Fetch branches error:", err);
    return res.status(500).json({ error: "Failed to fetch branches" });
  }
};

export const searchRepository = async (req, res) => {
  const { owner, repo } = req.params;
  const { q, ref, path } = req.query;
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

    let filteredTree = data.tree;

    // If a path is provided, only search within that path and its children
    if (path) {
      const normalizedPath = path.endsWith("/") ? path : path + "/";
      filteredTree = filteredTree.filter(
        (item) => item.path === path || item.path.startsWith(normalizedPath),
      );
    }

    const results = filteredTree.filter((item) =>
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

export const getRepositoryDetails = async (req, res) => {
  const { owner, repo } = req.params;
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      },
    );
    if (!response.ok) throw new Error("Failed to fetch repo details");
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch repo details" });
  }
};

export const moveGithubItems = async (req, res) => {
  const { items, targetPath } = req.body;
  const user = await User.findOne({ _id: req.user.id });
  const githubAccessToken = user?.integrations?.github?.accessToken;

  if (!githubAccessToken) {
    return res.status(403).json({ error: "Github not connected" });
  }

  try {
    for (const item of items) {
      if (item.type !== "file") {
        // Moving folders in GitHub requires recursively moving all files. Skip for now.
        continue;
      }

      const oldPathParts = item.githubPath.split("/");
      const owner = oldPathParts[0];
      const repo = oldPathParts[1];
      const oldPath = oldPathParts.slice(2).join("/");

      const targetParts = targetPath.split("/");
      const targetOwner = targetParts[0];
      const targetRepo = targetParts[1];
      const targetDir = targetParts.slice(2).join("/");
      const newPath = targetDir ? `${targetDir}/${item.name}` : item.name;

      if (owner !== targetOwner || repo !== targetRepo) {
        continue; // Only support moving within same repo
      }

      // Fetch content of old file
      const getRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${oldPath}`,
        {
          headers: { Authorization: `Bearer ${githubAccessToken}` },
        },
      );
      if (!getRes.ok) continue;
      const fileData = await getRes.json();

      // Create new file at new path
      const putRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${newPath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            message: `Move ${oldPath} to ${newPath}`,
            content: fileData.content.replace(/\n/g, ""),
          }),
        },
      );
      if (!putRes.ok) continue;

      // Delete old file
      const delRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${oldPath}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({
            message: `Delete old ${oldPath}`,
            sha: fileData.sha,
          }),
        },
      );
      if (!delRes.ok) {
        console.error(
          `Failed to delete old file: ${oldPath}`,
          await delRes.text(),
        );
      }
    }

    return res.status(200).json({ msg: "Moved successfully!" });
  } catch (error) {
    console.error("Move error:", error);
    return res.status(500).json({ error: "Failed to move files" });
  }
};
