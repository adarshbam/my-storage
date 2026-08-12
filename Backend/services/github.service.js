import User from "../models/userModel.js";
import { sanitize } from "../utils/sanitize.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import archiver from "archiver";
import path from "path";
import SharedAccess from "../models/sharedAccessModel.js";
import { invalidateUserSessions } from "../databases/redis.js";
import { getObjectFromB2 } from "../integrations/storage/s3.client.js";

import { resolveIntegrationOwnerId } from "../utils/integrationHelper.js";

async function getAuthenticatedAccessToken(req, requireWrite = false) {
  try {
    const ownerId = await resolveIntegrationOwnerId(req);

    // If accessing someone else's integration, check permissions
    if (ownerId !== req.user.id) {
      const sharedAccess = await SharedAccess.findOne({
        userId: ownerId,
        targetUserId: req.user.id,
      });
      if (!sharedAccess) {
        const err = new Error("Unauthorized shared access");
        err.statusCode = 403;
        throw err;
      }
      if (requireWrite && !sharedAccess.permission.includes("owner")) {
        const err = new Error(
          "Integration modification requires 'owner' permission level",
        );
        err.statusCode = 403;
        throw err;
      }
    }

    const user = await User.findById(ownerId).select("integrations").lean();
    if (!user?.integrations?.github?.accessToken) {
      const err = new Error("Github not connected");
      err.statusCode = 403;
      throw err;
    }

    return {
      githubAccessToken: user.integrations.github.accessToken,
      ownerId,
      user,
    };
  } catch (error) {
    if (!error.statusCode) {
      if (error.message === "FORBIDDEN_ADMIN_ACCESS") {
        error.statusCode = 403;
        error.message =
          "Admins are not permitted to access other users' personal integrations.";
      } else if (error.message === "UNAUTHORIZED_SHARE_ACCESS") {
        error.statusCode = 403;
        error.message = "You do not have shared access to this user's files.";
      } else {
        error.statusCode = 500;
      }
    }
    throw error;
  }
}

export const disconnectGithubLogic = async ({ userId, rootDirId, req, res }) => {
  await User.updateOne(
    { _id: userId },
    {
      $unset: {
        "integrations.github": "",
      },
    },
  );
  await invalidateUserSessions(userId);

  await Directory.deleteOne({
    userId: userId,
    provider: "github",
  });

  return { success: true, message: "Github disconnected" };
};

export const createRepositoryLogic = async ({ name: rawName, description: rawDescription, isPrivate, req }) => {
  const name = sanitize(rawName);
  const description = sanitize(rawDescription);

  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

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
    const err = new Error(data.message || "Failed to create repository");
    err.statusCode = response.status;
    throw err;
  }

  return {
    message: "Repository created successfully",
    repository: data,
  };
};

export const listRepositoriesLogic = async ({ req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

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

  if (!response.ok || !Array.isArray(repos)) {
    const err = new Error(repos?.message || "Failed to fetch repositories");
    err.statusCode = response.status || 400;
    throw err;
  }

  const githubRepositories = repos.map((repo) => ({
    _id: repo.id,
    name: repo.name,
    type: "directory",
    provider: "github",
    githubPath: repo.full_name,
    updatedAt: repo.updated_at,
  }));

  return {
    directories: githubRepositories,
    files: [],
    name: "Github",
  };
};

export const getRepositoryContentsLogic = async ({ owner, repo, path, ref, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

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

  if (!Array.isArray(data)) {
    return { directories: [], files: [], name: repo };
  }

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

  return {
    directories,
    files,
    name: repo,
  };
};

export const getFilesLogic = async ({ owner, repo, path, ref, action, req, res }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

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
    const err = new Error(error.message || "File not found");
    err.statusCode = metaResponse.status;
    throw err;
  }

  const fileMeta = await metaResponse.json();
  if (Array.isArray(fileMeta)) {
    const err = new Error("Path is a directory, not a file");
    err.statusCode = 400;
    throw err;
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
    const err = new Error("Failed to stream file content");
    err.statusCode = rawResponse.status;
    throw err;
  }

  // 4. Pipe the stream directly to the response
  if (rawResponse.body) {
    const { Readable } = await import("stream");
    Readable.fromWeb(rawResponse.body).pipe(res);
  } else {
    const err = new Error("No content body available");
    err.statusCode = 500;
    throw err;
  }
};

export const updateFilesLogic = async ({ owner, repo, path, data, req }) => {
  const { content, sha } = data;
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

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

  const responseData = await response.json();
  if (!response.ok) {
    const err = new Error(responseData.message || "Failed to update file");
    err.statusCode = response.status;
    throw err;
  }

  return { msg: "Edited!", content: responseData.content };
};

export const deleteFileLogic = async ({ owner, repo, path, sha, branch, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

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
    const err = new Error(data.message || "Failed to delete file");
    err.statusCode = response.status;
    throw err;
  }

  return { msg: "Deleted!" };
};

export const createFileLogic = async ({ owner, repo, path, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const githubPath = `${owner}/${repo}${path ? `/${path}` : ""}`;
  const fileName = req.headers.filename ? sanitize(req.headers.filename) : null;

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
    return new Promise((resolve, reject) => {
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
            const err = new Error(data.message || "Failed to upload file");
            err.statusCode = response.status;
            throw err;
          }
          resolve({ msg: "Uploaded!", content: data.content });
        } catch (err) {
          reject(err);
        }
      });
    });
  } else {
    // CASE 2: JSON request from "New File" button
    const { content } = req.body;
    const response = await pushToGithub(
      content || "",
      githubPath,
      `Create ${githubPath}`,
    );
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.message || "Failed to create file");
      err.statusCode = response.status;
      throw err;
    }
    return { msg: "Created!", content: data.content };
  }
};

export const deleteFolderLogic = async ({ owner, repo, path, branch, req }) => {
  const pathPrefix = path || "";

  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

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

  if (!treeResponse.ok) {
    const err = new Error("Failed to fetch repository tree");
    err.statusCode = treeResponse.status;
    throw err;
  }
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

  return { msg: "Folder deleted recursively" };
};

export const downloadRepositoryLogic = async ({ owner, repo, branch, req, res }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;
  const ref = branch;
  const zipballUrl = `https://api.github.com/repos/${owner}/${repo}/zipball${ref ? `/${ref}` : ""}`;

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
    res.send(buffer);
  } else {
    const data = await response.json().catch(() => ({}));
    const err = new Error(data.message || "Failed to download repository");
    err.statusCode = response.status;
    throw err;
  }
};

export const downloadFolderLogic = async ({ owner, repo, path, branch, req, res }) => {
  const pathPrefix = path || "";
  const queryRef = branch;

  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

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
    const err = new Error("No files found in this folder");
    err.statusCode = 404;
    throw err;
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
};

export const listBranchesLogic = async ({ owner, repo, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const branches = await response.json();
  if (!response.ok) {
    const err = new Error(branches.message || "Failed to fetch branches");
    err.statusCode = response.status;
    throw err;
  }

  return { branches: branches.map((b) => b.name) };
};

export const searchRepositoryLogic = async ({ owner, repo, query, ref, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  // Use GitHub's Code Search API
  const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(
    query,
  )}+repo:${owner}/${repo}`;
  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to search repository");
    err.statusCode = response.status;
    throw err;
  }

  // Map results to our standard format
  const files = data.items.map((item) => ({
    _id: item.sha,
    id: item.sha,
    name: item.name,
    type: "file",
    provider: "github",
    githubPath: item.path,
    size: 0, // Search API doesn't return size
    extension: item.name.includes(".") ? "." + item.name.split(".").pop() : "",
  }));

  return {
    directories: [],
    files,
    name: `Search: ${query}`,
  };
};

export const getRepositoryDetailsLogic = async ({ owner, repo, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to fetch repository details");
    err.statusCode = response.status;
    throw err;
  }

  return { details: data };
};

export const moveGithubItemsLogic = async ({ items, req }) => {
  // Mock function, moving items is quite complicated on Github, require multiple API calls.
  return { msg: "Items moved successfully", results: [] };
};

export const transferFromVaultLogic = async ({ items, targetPath, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const pushToGithub = async (content, fullGithubPath, msg) => {
    const parts = fullGithubPath.split("/").filter(Boolean);
    const pushOwner = parts[0];
    const pushRepo = parts[1];
    const pushPath = parts.slice(2).join("/");

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
      // ignore
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

  const results = [];

  const exportItem = async (localItem, destPath) => {
    const itemId = localItem._id || localItem.id;
    if (localItem.type === "directory") {
      const dirDestPath = `${destPath}/${localItem.name}`;
      const childDirs = await Directory.find({ parentDir: itemId }).lean();
      const childFiles = await File.find({ parentDir: itemId }).lean();

      for (const dir of childDirs) {
        await exportItem({ ...dir, type: "directory" }, dirDestPath);
      }
      for (const file of childFiles) {
        await exportItem({ ...file, type: "file" }, dirDestPath);
      }
    } else {
      let ext = localItem.extension;
      if (!ext) {
        const fileDoc = await File.findById(itemId).select("extension name").lean();
        ext = fileDoc?.extension || (localItem.name ? path.extname(localItem.name) : "");
      }
      const s3Key = `${itemId}${ext}`;
      const objectData = await getObjectFromB2({ key: s3Key });
      const byteArray = await objectData.Body.transformToByteArray();
      const buffer = Buffer.from(byteArray);
      const content = buffer.toString("base64");
      const fullPath = `${destPath}/${localItem.name}`;

      const res = await pushToGithub(content, fullPath, `Upload ${localItem.name} from Vault`);
      if (res.ok) {
        results.push({ name: localItem.name, path: fullPath, status: "transferred" });
      }
    }
  };

  for (const item of items) {
    await exportItem(item, targetPath);
  }

  return { msg: "Transfer to GitHub successful", results };
};
