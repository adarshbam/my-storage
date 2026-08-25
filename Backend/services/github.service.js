import User from "../models/userModel.js";
import { sanitize } from "../utils/sanitize.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import StarredItem from "../models/starredItemModel.js";
import archiver from "archiver";
import path from "path";
import SharedAccess from "../models/sharedAccessModel.js";
import { invalidateUserSessions } from "../databases/redis.js";
import { getObjectFromB2 } from "../integrations/storage/s3.client.js";
import { resolveIntegrationOwnerId } from "../utils/integrationHelper.js";
import { withTransaction } from "../utils/transaction.js";

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
  await withTransaction(async (session) => {
    await User.updateOne(
      { _id: userId },
      {
        $unset: {
          "integrations.github": "",
        },
      },
      { session },
    );

    await Directory.deleteOne({
      userId: userId,
      provider: "github",
    }).session(session);
  });

  await invalidateUserSessions(userId);

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

export const deleteRepositoryLogic = async ({ owner, repo, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err = new Error(data.message || "Failed to delete repository");
    err.statusCode = response.status;
    throw err;
  }

  return { success: true, message: `Repository ${owner}/${repo} deleted successfully` };
};

export const listRepositoriesLogic = async ({ req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated",
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

  const userId = req.user?.id || req.user?._id;
  const starredRecords = userId
    ? await StarredItem.find({ userId, provider: "github", starred: true }).lean()
    : [];
  const starredSet = new Set(starredRecords.map((s) => s.itemId));

  const githubRepositories = repos.map((repo) => {
    const isStarred = starredSet.has(repo.full_name) || starredSet.has(repo.name) || starredSet.has(String(repo.id));
    return {
      _id: repo.id,
      name: repo.name,
      type: "directory",
      provider: "github",
      githubPath: repo.full_name,
      updatedAt: repo.updated_at,
      private: repo.private,
      default_branch: repo.default_branch,
      description: repo.description,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      open_issues_count: repo.open_issues_count,
      html_url: repo.html_url,
      metaUrl: repo.html_url,
      isStarred,
      starred: isStarred,
    };
  });

  return {
    directories: githubRepositories,
    files: [],
    name: "Github",
  };
};

export const getRepositoryContentsLogic = async ({ owner, repo, path: reqPath, ref, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${reqPath || ""}${
      ref ? `?ref=${encodeURIComponent(ref)}` : ""
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
    if (data && data.message && !response.ok) {
      const err = new Error(data.message || "Failed to fetch repository contents");
      err.statusCode = response.status;
      throw err;
    }
    return { directories: [], files: [], name: repo };
  }

  const userId = req.user?.id || req.user?._id;
  const starredRecords = userId
    ? await StarredItem.find({ userId, provider: "github", starred: true }).lean()
    : [];
  const starredSet = new Set(starredRecords.map((s) => s.itemId));

  const directories = data
    .filter((cnt) => cnt.type === "dir")
    .map((dir) => {
      const githubPath = `${owner}/${repo}/${dir.path}`;
      const isStarred = starredSet.has(githubPath) || starredSet.has(dir.sha);
      return {
        _id: dir.sha,
        id: dir.sha,
        name: dir.name,
        type: "directory",
        provider: "github",
        githubPath,
        size: 0,
        sha: dir.sha,
        html_url: dir.html_url,
        metaUrl: dir.html_url,
        isStarred,
        starred: isStarred,
      };
    });

  const files = data
    .filter((cnt) => cnt.type === "file" || cnt.type === "symlink")
    .map((file) => {
      const githubPath = `${owner}/${repo}/${file.path}`;
      const isStarred = starredSet.has(githubPath) || starredSet.has(file.sha);
      return {
        _id: file.sha,
        id: file.sha,
        name: file.name,
        type: "file",
        provider: "github",
        githubPath,
        size: file.size,
        sha: file.sha,
        html_url: file.html_url,
        metaUrl: file.html_url || file.download_url,
        extension: file.name.includes(".")
          ? "." + file.name.split(".").pop()
          : "",
        isStarred,
        starred: isStarred,
      };
    });

  return {
    directories,
    files,
    name: repo,
  };
};

export const getFilesLogic = async ({ owner, repo, path: reqPath, ref, action, req, res }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const metaResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${reqPath}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`,
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

  const ext = fileMeta.name.split(".").pop().toLowerCase();
  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    zip: "application/zip",
    json: "application/json",
    js: "application/javascript",
    ts: "text/typescript",
    txt: "text/plain",
    md: "text/markdown",
    html: "text/html",
    css: "text/css",
  };
  const contentType = mimeTypes[ext] || "text/plain";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("X-Total-Size", fileSize);
  if (fileMeta.sha) {
    res.setHeader("X-File-Sha", fileMeta.sha);
  }

  if (action === "download") {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileMeta.name}"`,
    );
  }

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
    `https://api.github.com/repos/${owner}/${repo}/contents/${reqPath}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`,
    fetchOptions,
  );

  if (!rawResponse.ok) {
    const err = new Error("Failed to stream file content");
    err.statusCode = rawResponse.status;
    throw err;
  }

  if (rawResponse.body) {
    const { Readable } = await import("stream");
    Readable.fromWeb(rawResponse.body).pipe(res);
  } else {
    const err = new Error("No content body available");
    err.statusCode = 500;
    throw err;
  }
};

export const updateFilesLogic = async ({ owner, repo, path: reqPath, data, req }) => {
  const { content, sha, message } = data;
  const branch = req.query.ref || data.branch;
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${reqPath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message || `Update ${reqPath}`,
        content,
        sha,
        ...(branch && { branch }),
      }),
    },
  );

  const responseData = await response.json();
  if (!response.ok) {
    const err = new Error(responseData.message || "Failed to update file");
    err.statusCode = response.status;
    throw err;
  }

  return { msg: "File updated successfully", content: responseData.content, commit: responseData.commit };
};

export const deleteFileLogic = async ({ owner, repo, path: reqPath, sha, branch, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${reqPath}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete ${reqPath}`,
        sha,
        ...(branch && { branch }),
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

export const createFileLogic = async ({ owner, repo, path: reqPath, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const githubPath = `${owner}/${repo}${reqPath ? `/${reqPath}` : ""}`;
  const fileName = req.headers.filename ? sanitize(req.headers.filename) : null;
  const branch = req.query.ref || req.body?.branch;

  const pushToGithub = async (content, finalPath, msg) => {
    const [pushOwner, pushRepo, ...pathParts] = finalPath.split("/");
    const pushPath = pathParts.join("/");

    let sha;
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${pushOwner}/${pushRepo}/contents/${pushPath}${branch ? `?ref=${encodeURIComponent(branch)}` : ""}`,
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: msg,
          content,
          ...(sha && { sha }),
          ...(branch && { branch }),
        }),
      },
    );
    return response;
  };

  if (fileName) {
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
          resolve({ msg: "Uploaded!", content: data.content, commit: data.commit });
        } catch (err) {
          reject(err);
        }
      });
    });
  } else {
    const { content, message } = req.body || {};
    const response = await pushToGithub(
      content || "",
      githubPath,
      message || `Create ${githubPath}`,
    );
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.message || "Failed to create file");
      err.statusCode = response.status;
      throw err;
    }
    return { msg: "Created!", content: data.content, commit: data.commit };
  }
};

export const deleteFolderLogic = async ({ owner, repo, path: reqPath, branch, req }) => {
  const pathPrefix = reqPath || "";

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

  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`,
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

  const filesToDelete = (treeData.tree || []).filter(
    (item) => item.type === "blob" && item.path.startsWith(pathPrefix + "/"),
  );

  for (const file of filesToDelete) {
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Delete ${file.path} (Recursive Folder Delete)`,
          sha: file.sha,
          branch: targetBranch,
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
  const zipballUrl = `https://api.github.com/repos/${owner}/${repo}/zipball${ref ? `/${encodeURIComponent(ref)}` : ""}`;

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

export const downloadFolderLogic = async ({ owner, repo, path: reqPath, branch, req, res }) => {
  const pathPrefix = reqPath || "";
  const queryRef = branch;

  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  let targetRef = queryRef;

  if (!targetRef) {
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

  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(targetRef)}?recursive=1`,
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

  const files = treeData.tree.filter(
    (item) =>
      item.type === "blob" &&
      (item.path === pathPrefix || item.path.startsWith(pathPrefix + "/")),
  );

  if (files.length === 0) {
    const err = new Error("No files found in this folder");
    err.statusCode = 404;
    throw err;
  }

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  const archive = archiver("zip", { zlib: { level: 5 } });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${pathPrefix.split("/").pop() || repo}.zip"`,
  );
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("X-Total-Size", totalSize);
  res.setHeader("X-Total-Files", files.length);
  archive.pipe(res);

  const CHUNK_SIZE = 10;
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (file) => {
        try {
          const fileRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${encodeURIComponent(targetRef)}`,
            { headers: { Authorization: `Bearer ${githubAccessToken}` } },
          );
          if (fileRes.ok) {
            const fileData = await fileRes.json();
            if (fileData.content) {
              const buffer = Buffer.from(fileData.content, "base64");
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

/* ============================================================================
   BRANCH MANAGEMENT
   ============================================================================ */

export const listBranchesLogic = async ({ owner, repo, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const [branchesRes, repoRes] = await Promise.all([
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    ),
    fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    }),
  ]);

  const branches = await branchesRes.json();
  if (!branchesRes.ok) {
    const err = new Error(branches.message || "Failed to fetch branches");
    err.statusCode = branchesRes.status;
    throw err;
  }

  let defaultBranch = "main";
  if (repoRes.ok) {
    const repoData = await repoRes.json();
    defaultBranch = repoData.default_branch || "main";
  }

  const detailedBranches = Array.isArray(branches)
    ? branches.map((b) => ({
        name: b.name,
        sha: b.commit?.sha,
        protected: b.protected || false,
        isDefault: b.name === defaultBranch,
      }))
    : [];

  return {
    branches: detailedBranches.map((b) => b.name),
    detailedBranches,
    defaultBranch,
  };
};

export const createBranchLogic = async ({ owner, repo, branchName, fromRef, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  let sourceSha = fromRef;
  const isSha = /^[0-9a-f]{40}$/i.test(fromRef || "");

  if (!isSha) {
    let sourceBranch = fromRef;
    if (!sourceBranch) {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        sourceBranch = repoData.default_branch || "main";
      } else {
        sourceBranch = "main";
      }
    }

    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(sourceBranch)}`,
      {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      },
    );

    if (!refRes.ok) {
      const data = await refRes.json().catch(() => ({}));
      const err = new Error(data.message || `Failed to resolve source branch '${sourceBranch}'`);
      err.statusCode = refRes.status;
      throw err;
    }

    const refData = await refRes.json();
    sourceSha = refData.object?.sha;
  }

  const createRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName.trim()}`,
        sha: sourceSha,
      }),
    },
  );

  const createData = await createRes.json();
  if (!createRes.ok) {
    const err = new Error(createData.message || `Failed to create branch '${branchName}'`);
    err.statusCode = createRes.status;
    throw err;
  }

  return {
    message: `Branch '${branchName}' created successfully`,
    branch: {
      name: branchName,
      sha: sourceSha,
    },
  };
};

export const deleteBranchLogic = async ({ owner, repo, branch, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Authorization: `Bearer ${githubAccessToken}` },
  });
  if (repoRes.ok) {
    const repoData = await repoRes.json();
    if (repoData.default_branch === branch) {
      const err = new Error("Cannot delete the default branch of a repository.");
      err.statusCode = 400;
      throw err;
    }
  }

  const deleteRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!deleteRes.ok) {
    const data = await deleteRes.json().catch(() => ({}));
    const err = new Error(data.message || `Failed to delete branch '${branch}'`);
    err.statusCode = deleteRes.status;
    throw err;
  }

  return { message: `Branch '${branch}' deleted successfully` };
};

export const compareBranchesLogic = async ({ owner, repo, base, head, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const compareRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const data = await compareRes.json();
  if (!compareRes.ok) {
    const err = new Error(data.message || "Failed to compare branches");
    err.statusCode = compareRes.status;
    throw err;
  }

  return {
    status: data.status,
    ahead_by: data.ahead_by,
    behind_by: data.behind_by,
    total_commits: data.total_commits,
    commits: (data.commits || []).map((c) => ({
      sha: c.sha,
      message: c.commit?.message,
      author: {
        name: c.commit?.author?.name,
        email: c.commit?.author?.email,
        date: c.commit?.author?.date,
        avatar_url: c.author?.avatar_url,
      },
    })),
    files: (data.files || []).map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch || "",
    })),
    merge_base_commit: data.merge_base_commit,
  };
};

/* ============================================================================
   COMMITS & HISTORY
   ============================================================================ */

export const listCommitsLogic = async ({ owner, repo, ref, path: reqPath, per_page = 30, page = 1, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${per_page}&page=${page}`;
  if (ref) url += `&sha=${encodeURIComponent(ref)}`;
  if (reqPath) url += `&path=${encodeURIComponent(reqPath)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  const commits = await response.json();
  if (!response.ok || !Array.isArray(commits)) {
    const err = new Error(commits?.message || "Failed to fetch commits");
    err.statusCode = response.status;
    throw err;
  }

  const mapped = commits.map((c) => ({
    sha: c.sha,
    shortSha: c.sha.substring(0, 7),
    message: c.commit?.message,
    author: {
      name: c.commit?.author?.name || c.author?.login || "Unknown",
      email: c.commit?.author?.email,
      date: c.commit?.author?.date,
      avatar_url: c.author?.avatar_url,
    },
    committer: {
      name: c.commit?.committer?.name || c.committer?.login,
      date: c.commit?.committer?.date,
    },
    parents: (c.parents || []).map((p) => p.sha),
    html_url: c.html_url,
    verified: c.commit?.verification?.verified || false,
  }));

  return { commits: mapped, page, per_page };
};

export const getCommitDetailsLogic = async ({ owner, repo, sha, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(sha)}`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to fetch commit details");
    err.statusCode = response.status;
    throw err;
  }

  return {
    sha: data.sha,
    shortSha: data.sha.substring(0, 7),
    message: data.commit?.message,
    author: {
      name: data.commit?.author?.name || data.author?.login,
      email: data.commit?.author?.email,
      date: data.commit?.author?.date,
      avatar_url: data.author?.avatar_url,
    },
    stats: data.stats || { total: 0, additions: 0, deletions: 0 },
    parents: (data.parents || []).map((p) => p.sha),
    files: (data.files || []).map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch || "",
      raw_url: f.raw_url,
      sha: f.sha,
    })),
  };
};

export const getFileHistoryLogic = async ({ owner, repo, path: reqPath, ref, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  let url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(reqPath)}&per_page=50`;
  if (ref) url += `&sha=${encodeURIComponent(ref)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  const data = await response.json();
  if (!response.ok || !Array.isArray(data)) {
    const err = new Error(data?.message || "Failed to fetch file history");
    err.statusCode = response.status;
    throw err;
  }

  const commits = data.map((c) => ({
    sha: c.sha,
    shortSha: c.sha.substring(0, 7),
    message: c.commit?.message,
    author: {
      name: c.commit?.author?.name || c.author?.login,
      date: c.commit?.author?.date,
      avatar_url: c.author?.avatar_url,
    },
  }));

  return { commits, path: reqPath };
};

export const getBlobLogic = async ({ owner, repo, sha, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${encodeURIComponent(sha)}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to fetch file blob");
    err.statusCode = response.status;
    throw err;
  }

  let textContent = "";
  if (data.encoding === "base64" && data.content) {
    textContent = Buffer.from(data.content, "base64").toString("utf-8");
  }

  return {
    sha: data.sha,
    size: data.size,
    content: textContent,
  };
};

/* ============================================================================
   GIT OPERATIONS: RESTORE, REVERT, RESET, CHERRY-PICK, MERGE
   ============================================================================ */

export const restoreFileLogic = async ({ owner, repo, path: reqPath, commitSha, branch, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  // 1. Fetch file content at the historical commit SHA
  const historicalRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${reqPath}?ref=${encodeURIComponent(commitSha)}`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!historicalRes.ok) {
    const data = await historicalRes.json().catch(() => ({}));
    const err = new Error(data.message || `File '${reqPath}' was not found in commit ${commitSha.substring(0, 7)}`);
    err.statusCode = historicalRes.status;
    throw err;
  }

  const historicalData = await historicalRes.json();
  const historicalContent = historicalData.content; // base64

  // 2. Get current file sha on target branch if it exists
  let currentSha;
  try {
    const curRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${reqPath}${branch ? `?ref=${encodeURIComponent(branch)}` : ""}`,
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (curRes.ok) {
      const curData = await curRes.json();
      currentSha = curData.sha;
    }
  } catch (e) {
    // ignore
  }

  // 3. Commit the restored content to the active branch
  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${reqPath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Restore ${reqPath} to version from ${commitSha.substring(0, 7)}`,
        content: historicalContent,
        ...(currentSha && { sha: currentSha }),
        ...(branch && { branch }),
      }),
    },
  );

  const putData = await putRes.json();
  if (!putRes.ok) {
    const err = new Error(putData.message || "Failed to restore file");
    err.statusCode = putRes.status;
    throw err;
  }

  return {
    message: `File '${reqPath}' successfully restored to version from ${commitSha.substring(0, 7)}`,
    commit: putData.commit,
    content: putData.content,
  };
};

export const revertCommitLogic = async ({ owner, repo, commitSha, branch, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  // 1. Get commit details to inspect files changed
  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(commitSha)}`,
    {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    },
  );
  if (!commitRes.ok) {
    const err = new Error("Failed to fetch commit to revert");
    err.statusCode = commitRes.status;
    throw err;
  }
  const commitData = await commitRes.json();
  const parentSha = commitData.parents?.[0]?.sha;

  if (!parentSha) {
    const err = new Error("Cannot revert the initial commit of a repository.");
    err.statusCode = 400;
    throw err;
  }

  // 2. For each modified file in the commit, revert its content to the parent commit version
  const files = commitData.files || [];
  const revertedFiles = [];

  for (const file of files) {
    try {
      if (file.status === "added") {
        let curSha;
        const curRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}${branch ? `?ref=${encodeURIComponent(branch)}` : ""}`,
          { headers: { Authorization: `Bearer ${githubAccessToken}` } },
        );
        if (curRes.ok) {
          const curData = await curRes.json();
          curSha = curData.sha;
        }
        if (curSha) {
          await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${githubAccessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: `Revert: Remove ${file.filename}`,
                sha: curSha,
                ...(branch && { branch }),
              }),
            },
          );
          revertedFiles.push(file.filename);
        }
      } else {
        const parentFileRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}?ref=${encodeURIComponent(parentSha)}`,
          { headers: { Authorization: `Bearer ${githubAccessToken}` } },
        );
        if (parentFileRes.ok) {
          const parentFileData = await parentFileRes.json();
          let curSha;
          const curRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}${branch ? `?ref=${encodeURIComponent(branch)}` : ""}`,
            { headers: { Authorization: `Bearer ${githubAccessToken}` } },
          );
          if (curRes.ok) {
            const curData = await curRes.json();
            curSha = curData.sha;
          }
          await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${githubAccessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: `Revert "${commitData.commit?.message?.split("\n")[0]}": Restore ${file.filename}`,
                content: parentFileData.content,
                ...(curSha && { sha: curSha }),
                ...(branch && { branch }),
              }),
            },
          );
          revertedFiles.push(file.filename);
        }
      }
    } catch (e) {
      console.error(`Error reverting file ${file.filename}:`, e);
    }
  }

  return {
    message: `Reverted commit ${commitSha.substring(0, 7)} successfully (${revertedFiles.length} files updated)`,
    revertedFiles,
  };
};

export const resetBranchLogic = async ({ owner, repo, branch, targetSha, mode = "mixed", req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const updateRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sha: targetSha,
        force: true,
      }),
    },
  );

  const data = await updateRes.json();
  if (!updateRes.ok) {
    const err = new Error(data.message || `Failed to reset branch '${branch}' to ${targetSha.substring(0, 7)}`);
    err.statusCode = updateRes.status;
    throw err;
  }

  return {
    message: `Branch '${branch}' successfully reset to ${targetSha.substring(0, 7)} (${mode.toUpperCase()} mode)`,
    branch,
    newSha: targetSha,
    mode,
  };
};

export const cherryPickLogic = async ({ owner, repo, commitSha, branch, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(commitSha)}`,
    {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    },
  );
  if (!commitRes.ok) {
    const err = new Error("Failed to fetch commit to cherry-pick");
    err.statusCode = commitRes.status;
    throw err;
  }
  const commitData = await commitRes.json();
  const files = commitData.files || [];
  const appliedFiles = [];

  for (const file of files) {
    try {
      const fileRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}?ref=${encodeURIComponent(commitSha)}`,
        { headers: { Authorization: `Bearer ${githubAccessToken}` } },
      );
      if (fileRes.ok) {
        const fileContentData = await fileRes.json();
        let curSha;
        const curRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}${branch ? `?ref=${encodeURIComponent(branch)}` : ""}`,
          { headers: { Authorization: `Bearer ${githubAccessToken}` } },
        );
        if (curRes.ok) {
          const curData = await curRes.json();
          curSha = curData.sha;
        }

        await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${githubAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `Cherry-pick ${commitSha.substring(0, 7)}: ${commitData.commit?.message?.split("\n")[0] || ""}`,
              content: fileContentData.content,
              ...(curSha && { sha: curSha }),
              ...(branch && { branch }),
            }),
          },
        );
        appliedFiles.push(file.filename);
      }
    } catch (e) {
      console.error(`Cherry-pick failed on file ${file.filename}:`, e);
    }
  }

  return {
    message: `Cherry-picked commit ${commitSha.substring(0, 7)} onto '${branch}' (${appliedFiles.length} files updated)`,
    appliedFiles,
  };
};

export const mergeBranchLogic = async ({ owner, repo, base, head, commitMessage, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const mergeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/merges`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base,
        head,
        commit_message: commitMessage || `Merge branch '${head}' into '${base}'`,
      }),
    },
  );

  if (mergeRes.status === 204) {
    return { status: "already_merged", message: `Branch '${head}' is already merged into '${base}'. Nothing to merge.` };
  }

  const data = await mergeRes.json();
  if (mergeRes.status === 409) {
    const err = new Error(data.message || `Merge conflict: Automatic merge failed. Conflicts must be resolved manually.`);
    err.statusCode = 409;
    err.conflict = true;
    throw err;
  }

  if (!mergeRes.ok) {
    const err = new Error(data.message || "Merge operation failed");
    err.statusCode = mergeRes.status;
    throw err;
  }

  return {
    status: "merged",
    message: `Successfully merged '${head}' into '${base}'`,
    commit: data,
  };
};

/* ============================================================================
   PULL REQUESTS
   ============================================================================ */

export const listPullRequestsLogic = async ({ owner, repo, state = "open", per_page = 30, page = 1, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=${encodeURIComponent(state)}&per_page=${per_page}&page=${page}&sort=updated&direction=desc`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const pulls = await response.json();
  if (!response.ok || !Array.isArray(pulls)) {
    const err = new Error(pulls?.message || "Failed to fetch pull requests");
    err.statusCode = response.status;
    throw err;
  }

  const mapped = pulls.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    merged_at: pr.merged_at,
    isMerged: !!pr.merged_at,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    draft: pr.draft || false,
    head: {
      ref: pr.head?.ref,
      sha: pr.head?.sha,
      label: pr.head?.label,
    },
    base: {
      ref: pr.base?.ref,
      sha: pr.base?.sha,
      label: pr.base?.label,
    },
    user: {
      login: pr.user?.login,
      avatar_url: pr.user?.avatar_url,
    },
    html_url: pr.html_url,
    comments_count: pr.comments,
    review_comments_count: pr.review_comments,
  }));

  return { pullRequests: mapped, page, per_page };
};

export const createPullRequestLogic = async ({ owner, repo, title, body, head, base, draft = false, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title.trim(),
        body: body || "",
        head: head.trim(),
        base: base.trim(),
        draft,
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || (data.errors ? data.errors.map(e => e.message).join(", ") : "Failed to create pull request"));
    err.statusCode = response.status;
    throw err;
  }

  return {
    message: `Pull Request #${data.number} created successfully`,
    pullRequest: {
      id: data.id,
      number: data.number,
      title: data.title,
      state: data.state,
      head: data.head?.ref,
      base: data.base?.ref,
      html_url: data.html_url,
    },
  };
};

export const getPullRequestDetailsLogic = async ({ owner, repo, pullNumber, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const [prRes, filesRes, commitsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, {
      headers: { Authorization: `Bearer ${githubAccessToken}`, Accept: "application/vnd.github+json" },
    }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100`, {
      headers: { Authorization: `Bearer ${githubAccessToken}`, Accept: "application/vnd.github+json" },
    }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/commits?per_page=100`, {
      headers: { Authorization: `Bearer ${githubAccessToken}`, Accept: "application/vnd.github+json" },
    }),
  ]);

  const prData = await prRes.json();
  if (!prRes.ok) {
    const err = new Error(prData.message || "Failed to fetch pull request details");
    err.statusCode = prRes.status;
    throw err;
  }

  const filesData = filesRes.ok ? await filesRes.json() : [];
  const commitsData = commitsRes.ok ? await commitsRes.json() : [];

  return {
    id: prData.id,
    number: prData.number,
    title: prData.title,
    body: prData.body,
    state: prData.state,
    merged: prData.merged || false,
    mergeable: prData.mergeable,
    mergeable_state: prData.mergeable_state,
    additions: prData.additions,
    deletions: prData.deletions,
    changed_files: prData.changed_files,
    created_at: prData.created_at,
    updated_at: prData.updated_at,
    merged_at: prData.merged_at,
    user: {
      login: prData.user?.login,
      avatar_url: prData.user?.avatar_url,
    },
    head: {
      ref: prData.head?.ref,
      sha: prData.head?.sha,
    },
    base: {
      ref: prData.base?.ref,
      sha: prData.base?.sha,
    },
    html_url: prData.html_url,
    files: Array.isArray(filesData)
      ? filesData.map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch || "",
        }))
      : [],
    commits: Array.isArray(commitsData)
      ? commitsData.map((c) => ({
          sha: c.sha,
          shortSha: c.sha.substring(0, 7),
          message: c.commit?.message,
          author: {
            name: c.commit?.author?.name || c.author?.login,
            date: c.commit?.author?.date,
            avatar_url: c.author?.avatar_url,
          },
        }))
      : [],
  };
};

export const mergePullRequestLogic = async ({ owner, repo, pullNumber, mergeMethod = "merge", commitTitle, commitMessage, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merge_method: mergeMethod,
        ...(commitTitle && { commit_title: commitTitle }),
        ...(commitMessage && { commit_message: commitMessage }),
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to merge pull request");
    err.statusCode = response.status;
    throw err;
  }

  return {
    message: data.message || `Pull Request #${pullNumber} merged successfully`,
    merged: data.merged || true,
    sha: data.sha,
  };
};

export const updatePullRequestLogic = async ({ owner, repo, pullNumber, state, title, body, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(state && { state }),
        ...(title && { title }),
        ...(body !== undefined && { body }),
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to update pull request");
    err.statusCode = response.status;
    throw err;
  }

  return {
    message: `Pull Request #${pullNumber} updated successfully`,
    pullRequest: data,
  };
};

export const listPRReviewsLogic = async ({ owner, repo, pullNumber, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const data = await response.json();
  if (!response.ok || !Array.isArray(data)) {
    const err = new Error(data?.message || "Failed to fetch reviews");
    err.statusCode = response.status;
    throw err;
  }

  const mapped = data.map((r) => ({
    id: r.id,
    user: {
      login: r.user?.login,
      avatar_url: r.user?.avatar_url,
    },
    body: r.body,
    state: r.state,
    submitted_at: r.submitted_at,
  }));

  return { reviews: mapped };
};

export const submitPRReviewLogic = async ({ owner, repo, pullNumber, event = "COMMENT", body = "", req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        body,
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to submit review");
    err.statusCode = response.status;
    throw err;
  }

  return {
    message: `Review submitted: ${event}`,
    review: data,
  };
};

export const listPRCommentsLogic = async ({ owner, repo, pullNumber, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const data = await response.json();
  if (!response.ok || !Array.isArray(data)) {
    const err = new Error(data?.message || "Failed to fetch comments");
    err.statusCode = response.status;
    throw err;
  }

  const mapped = data.map((c) => ({
    id: c.id,
    user: {
      login: c.user?.login,
      avatar_url: c.user?.avatar_url,
    },
    body: c.body,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  return { comments: mapped };
};

export const createPRCommentLogic = async ({ owner, repo, pullNumber, body, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to create comment");
    err.statusCode = response.status;
    throw err;
  }

  return {
    message: "Comment added",
    comment: data,
  };
};

/* ============================================================================
   DEEP RECURSIVE SEARCH
   ============================================================================ */

export const searchRepositoryLogic = async ({ owner, repo, query, ref, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  let targetBranch = ref;
  if (!targetBranch) {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    });
    if (repoRes.ok) {
      const repoData = await repoRes.json();
      targetBranch = repoData.default_branch || "main";
    } else {
      targetBranch = "main";
    }
  }

  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const treeData = await treeResponse.json();
  if (!treeResponse.ok || !Array.isArray(treeData.tree)) {
    const err = new Error(treeData.message || "Failed to fetch repository tree for search");
    err.statusCode = treeResponse.status;
    throw err;
  }

  const q = (query || "").toLowerCase().trim();

  const matchingItems = treeData.tree.filter((item) => {
    if (!q) return true;
    const itemName = item.path.split("/").pop() || "";
    return (
      itemName.toLowerCase().includes(q) ||
      item.path.toLowerCase().includes(q)
    );
  });

  const directories = matchingItems
    .filter((item) => item.type === "tree")
    .map((dir) => ({
      _id: dir.sha,
      id: dir.sha,
      name: dir.path.split("/").pop(),
      path: dir.path,
      type: "directory",
      provider: "github",
      githubPath: `${owner}/${repo}/${dir.path}`,
      size: 0,
    }));

  const files = matchingItems
    .filter((item) => item.type === "blob")
    .map((file) => {
      const filename = file.path.split("/").pop() || "";
      return {
        _id: file.sha,
        id: file.sha,
        name: filename,
        path: file.path,
        type: "file",
        provider: "github",
        githubPath: `${owner}/${repo}/${file.path}`,
        size: file.size || 0,
        sha: file.sha,
        extension: filename.includes(".")
          ? "." + filename.split(".").pop()
          : "",
      };
    });

  return {
    directories,
    files,
    branch: targetBranch,
    totalMatches: directories.length + files.length,
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

  return {
    details: {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      private: data.private,
      html_url: data.html_url,
      clone_url: data.clone_url,
      ssh_url: data.ssh_url,
      description: data.description,
      default_branch: data.default_branch,
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
      open_issues_count: data.open_issues_count,
      created_at: data.created_at,
      updated_at: data.updated_at,
      pushed_at: data.pushed_at,
      size: data.size,
      language: data.language,
      visibility: data.visibility,
    },
    default_branch: data.default_branch,
  };
};

export const renameGithubItemLogic = async ({ owner, repo, oldPath, newPath, branch, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  let targetBranch = branch;
  if (!targetBranch) {
    const repoInfoRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: { Authorization: `Bearer ${githubAccessToken}` } },
    );
    if (repoInfoRes.ok) {
      const repoInfo = await repoInfoRes.json();
      targetBranch = repoInfo.default_branch || "main";
    } else {
      targetBranch = "main";
    }
  }

  // Check if oldPath is a file or folder by fetching its contents
  const checkRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${oldPath}?ref=${encodeURIComponent(targetBranch)}`,
    { headers: { Authorization: `Bearer ${githubAccessToken}`, Accept: "application/vnd.github+json" } },
  );

  if (checkRes.ok) {
    const itemData = await checkRes.json();
    if (!Array.isArray(itemData) && itemData.type === "file") {
      // Single file rename
      const content = itemData.content;
      // 1. Create file at newPath
      const putRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${newPath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Rename ${oldPath} to ${newPath}`,
            content,
            branch: targetBranch,
          }),
        },
      );
      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create file at new location");
      }

      // 2. Delete file at oldPath
      await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${oldPath}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Delete ${oldPath} after rename`,
            sha: itemData.sha,
            branch: targetBranch,
          }),
        },
      );

      return { msg: "File renamed successfully" };
    }
  }

  // Folder rename: Use Git Tree to find all sub-files
  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`,
    { headers: { Authorization: `Bearer ${githubAccessToken}` } },
  );

  if (!treeResponse.ok) {
    throw new Error("Failed to fetch repository tree for folder rename");
  }

  const treeData = await treeResponse.json();
  const filesToMove = (treeData.tree || []).filter(
    (item) => item.type === "blob" && (item.path === oldPath || item.path.startsWith(oldPath + "/")),
  );

  if (filesToMove.length === 0) {
    throw new Error("No files found to rename");
  }

  for (const file of filesToMove) {
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${encodeURIComponent(targetBranch)}`,
      { headers: { Authorization: `Bearer ${githubAccessToken}` } },
    );
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      const relative = file.path === oldPath ? "" : file.path.slice(oldPath.length + 1);
      const destPath = relative ? `${newPath}/${relative}` : newPath;

      await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${destPath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Rename ${file.path} to ${destPath}`,
            content: fileData.content,
            branch: targetBranch,
          }),
        },
      );

      await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Delete ${file.path} after rename`,
            sha: fileData.sha,
            branch: targetBranch,
          }),
        },
      );
    }
  }

  return { msg: "Folder renamed successfully" };
};

export const moveGithubItemsLogic = async ({ items, targetPath, req }) => {
  const targetParts = (targetPath || "").split("/").filter(Boolean);
  const owner = targetParts[0];
  const repo = targetParts[1];
  const targetDir = targetParts.slice(2).join("/");

  const results = [];
  for (const item of items) {
    const itemGithubPath = item.githubPath || item.path;
    if (!itemGithubPath) continue;
    const itemParts = itemGithubPath.split("/").filter(Boolean);
    const itemOwner = itemParts[0];
    const itemRepo = itemParts[1];
    const itemRelPath = itemParts.slice(2).join("/");
    const itemName = item.name || itemParts[itemParts.length - 1];

    const newRelPath = targetDir ? `${targetDir}/${itemName}` : itemName;
    if (itemRelPath === newRelPath) continue;

    await renameGithubItemLogic({
      owner: itemOwner || owner,
      repo: itemRepo || repo,
      oldPath: itemRelPath,
      newPath: newRelPath,
      req,
    });
    results.push({ name: itemName, oldPath: itemRelPath, newPath: newRelPath });
  }

  return { msg: "Items moved successfully", results };
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
          "Content-Type": "application/json",
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

/* ============================================================================
   RELEASES & ASSETS (FEATURE 9)
   ============================================================================ */

export const listReleasesLogic = async ({ owner, repo, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases?per_page=30`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  const releases = await response.json();
  if (!response.ok || !Array.isArray(releases)) {
    const err = new Error(releases?.message || "Failed to fetch releases");
    err.statusCode = response.status;
    throw err;
  }

  return {
    releases: releases.map((r) => ({
      id: r.id,
      tag_name: r.tag_name,
      name: r.name || r.tag_name,
      body: r.body,
      draft: r.draft,
      prerelease: r.prerelease,
      created_at: r.created_at,
      published_at: r.published_at,
      html_url: r.html_url,
      author: {
        login: r.author?.login,
        avatar_url: r.author?.avatar_url,
      },
      assets: (r.assets || []).map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        download_count: a.download_count,
        browser_download_url: a.browser_download_url,
        content_type: a.content_type,
        created_at: a.created_at,
      })),
    })),
  };
};

export const createReleaseLogic = async ({ owner, repo, tagName, name, body, draft = false, prerelease = false, targetCommitish, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tag_name: tagName.trim(),
        name: name ? name.trim() : tagName.trim(),
        body: body || "",
        draft: Boolean(draft),
        prerelease: Boolean(prerelease),
        ...(targetCommitish && { target_commitish: targetCommitish }),
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to create release");
    err.statusCode = response.status;
    throw err;
  }

  return {
    message: `Release '${data.name || data.tag_name}' created successfully!`,
    release: data,
  };
};

export const deleteReleaseLogic = async ({ owner, repo, releaseId, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err = new Error(data.message || "Failed to delete release");
    err.statusCode = response.status;
    throw err;
  }

  return { message: "Release deleted successfully" };
};

export const uploadReleaseAssetFromVaultLogic = async ({ owner, repo, releaseId, fileId, customName, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const fileDoc = await File.findById(fileId).lean();
  if (!fileDoc) throw new Error("Vault file not found");

  const s3Key = `${fileDoc._id}${fileDoc.extension || ""}`;
  const objectData = await getObjectFromB2({ key: s3Key });
  const byteArray = await objectData.Body.transformToByteArray();
  const buffer = Buffer.from(byteArray);

  const assetName = customName || fileDoc.name;

  const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(assetName)}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      "Content-Type": "application/octet-stream",
      "Content-Length": buffer.length.toString(),
    },
    body: buffer,
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to upload asset to release");
    err.statusCode = response.status;
    throw err;
  }

  return {
    message: `Vault asset '${assetName}' uploaded to release successfully!`,
    asset: data,
  };
};

export const downloadReleaseAssetToVaultLogic = async ({ owner, repo, assetId, assetName, destinationFolderId, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken, ownerId } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetId}`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/octet-stream",
      },
    }
  );

  if (!response.ok) {
    const err = new Error("Failed to download release asset from GitHub");
    err.statusCode = response.status;
    throw err;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = assetName || `asset_${assetId}.bin`;
  const ext = path.extname(fileName) || "";

  const parentId = destinationFolderId && destinationFolderId !== "root" ? destinationFolderId : null;
  const currentPath = parentId ? await getDirectoryPath(parentId) : [];

  const fileDoc = new File({
    name: fileName,
    userId: ownerId,
    parentDir: parentId,
    type: "file",
    extension: ext,
    size: buffer.length,
    path: currentPath,
    uploadStatus: "completed",
  });
  await fileDoc.save();

  await uploadToB2({
    key: `${fileDoc._id}${ext}`,
    body: buffer,
    contentType: "application/octet-stream",
  });

  return {
    message: `Release asset '${fileName}' downloaded to Vault successfully!`,
    file: fileDoc,
  };
};

/* ============================================================================
   GITHUB ACTIONS & CI/CD WORKFLOWS (FEATURE 10)
   ============================================================================ */

export const listWorkflowsLogic = async ({ owner, repo, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to fetch GitHub Actions workflows");
    err.statusCode = response.status;
    throw err;
  }

  return {
    workflows: (data.workflows || []).map((w) => ({
      id: w.id,
      name: w.name,
      path: w.path,
      state: w.state,
      html_url: w.html_url,
      badge_url: w.badge_url,
    })),
  };
};

export const listWorkflowRunsLogic = async ({ owner, repo, workflowId, per_page = 20, page = 1, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  let url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=${per_page}&page=${page}`;
  if (workflowId) {
    url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=${per_page}&page=${page}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to fetch workflow runs");
    err.statusCode = response.status;
    throw err;
  }

  return {
    total_count: data.total_count,
    workflow_runs: (data.workflow_runs || []).map((r) => ({
      id: r.id,
      name: r.name,
      head_branch: r.head_branch,
      head_sha: r.head_sha,
      status: r.status, // completed, in_progress, queued
      conclusion: r.conclusion, // success, failure, cancelled, null
      html_url: r.html_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
      run_number: r.run_number,
      event: r.event,
      actor: {
        login: r.actor?.login,
        avatar_url: r.actor?.avatar_url,
      },
    })),
  };
};

export const dispatchWorkflowLogic = async ({ owner, repo, workflowId, ref = "main", inputs = {}, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref,
        inputs,
      }),
    }
  );

  if (response.status === 204) {
    return {
      message: `Workflow #${workflowId} triggered successfully on branch '${ref}'!`,
    };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || "Failed to dispatch workflow run");
    err.statusCode = response.status;
    throw err;
  }

  return { message: "Workflow dispatched successfully" };
};

export const listWorkflowArtifactsLogic = async ({ owner, repo, runId, req }) => {
  const auth = await getAuthenticatedAccessToken(req, false);
  const { githubAccessToken } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || "Failed to fetch workflow artifacts");
    err.statusCode = response.status;
    throw err;
  }

  return {
    artifacts: (data.artifacts || []).map((a) => ({
      id: a.id,
      name: a.name,
      size_in_bytes: a.size_in_bytes,
      created_at: a.created_at,
      expires_at: a.expires_at,
      expired: a.expired,
    })),
  };
};

export const importWorkflowArtifactToVaultLogic = async ({ owner, repo, artifactId, artifactName, destinationFolderId, req }) => {
  const auth = await getAuthenticatedAccessToken(req, true);
  const { githubAccessToken, ownerId } = auth;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = new Error("Failed to download workflow artifact from GitHub");
    err.statusCode = response.status;
    throw err;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = (artifactName || `artifact_${artifactId}`).endsWith(".zip")
    ? artifactName
    : `${artifactName || `artifact_${artifactId}`}.zip`;

  const parentId = destinationFolderId && destinationFolderId !== "root" ? destinationFolderId : null;
  const currentPath = parentId ? await getDirectoryPath(parentId) : [];

  const fileDoc = new File({
    name: fileName,
    userId: ownerId,
    parentDir: parentId,
    type: "file",
    extension: ".zip",
    size: buffer.length,
    path: currentPath,
    uploadStatus: "completed",
  });
  await fileDoc.save();

  await uploadToB2({
    key: `${fileDoc._id}.zip`,
    body: buffer,
    contentType: "application/zip",
  });

  return {
    message: `Artifact '${fileName}' imported into Vault successfully!`,
    file: fileDoc,
  };
};
