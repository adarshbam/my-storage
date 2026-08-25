import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import GitWorkspace, { GitStash } from "../models/gitWorkspaceModel.js";
import GitSyncJob from "../models/gitSyncJobModel.js";
import { sanitize } from "../utils/sanitize.js";
import { resolveIntegrationOwnerId } from "../utils/integrationHelper.js";
import { uploadToB2, getObjectFromB2, deleteFromB2 } from "../integrations/storage/s3.client.js";
import { updateParentDirectorySize, getDirectoryPath } from "./directory.service.js";
import { withTransaction } from "../utils/transaction.js";
import crypto from "crypto";
import path from "path";

// Helper: Get authenticated GitHub token
async function getGithubToken(req) {
  const ownerId = await resolveIntegrationOwnerId(req);
  const user = await User.findById(ownerId).select("integrations").lean();
  if (!user?.integrations?.github?.accessToken) {
    const err = new Error("GitHub not connected");
    err.statusCode = 403;
    throw err;
  }
  return {
    githubAccessToken: user.integrations.github.accessToken,
    ownerId,
    user,
  };
}

// Helper: Resolve GitWorkspace from workspaceId or folderId
export async function resolveWorkspace(workspaceId, folderId, ownerId) {
  let workspace;
  if (workspaceId) {
    workspace = await GitWorkspace.findOne({ _id: workspaceId, userId: ownerId });
  }
  if (!workspace && folderId) {
    workspace = await GitWorkspace.findOne({ rootDirectoryId: folderId, userId: ownerId });
    if (!workspace) {
      const dir = await Directory.findOne({ _id: folderId, userId: ownerId }).lean();
      if (dir?.gitWorkspace?.workspaceId) {
        workspace = await GitWorkspace.findOne({ _id: dir.gitWorkspace.workspaceId, userId: ownerId });
      } else if (dir?.path?.length > 0) {
        const ancestorIds = dir.path.map((p) => p._id || p);
        workspace = await GitWorkspace.findOne({
          rootDirectoryId: { $in: ancestorIds },
          userId: ownerId,
        });
      }
    }
  }
  return workspace;
}

// Compute Git blob SHA for text/buffer: sha1("blob " + size + "\0" + content)
function computeGitBlobSha(buffer) {
  const header = `blob ${buffer.length}\0`;
  const store = Buffer.concat([Buffer.from(header), buffer]);
  return crypto.createHash("sha1").update(store).digest("hex");
}

/* ============================================================================
   1. CLONE / MOUNT REPO TO VAULT WORKSPACE
   ============================================================================ */

export const cloneRepoToVaultLogic = async ({ owner, repo, branch, destinationFolderId, folderName, req }) => {
  const { githubAccessToken, ownerId } = await getGithubToken(req);
  const cleanOwner = sanitize(owner);
  const cleanRepo = sanitize(repo);
  const customName = folderName ? sanitize(folderName) : `${cleanRepo}`;

  // 1. Fetch repository details to get default branch & metadata
  const repoRes = await fetch(`https://api.github.com/repos/${cleanOwner}/${cleanRepo}`, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!repoRes.ok) {
    const errData = await repoRes.json().catch(() => ({}));
    const err = new Error(errData.message || `Failed to fetch repo ${cleanOwner}/${cleanRepo}`);
    err.statusCode = repoRes.status;
    throw err;
  }
  const repoData = await repoRes.json();
  const targetBranch = branch || repoData.default_branch || "main";

  // 2. Fetch target branch commit SHA
  const refRes = await fetch(
    `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/git/ref/heads/${encodeURIComponent(targetBranch)}`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!refRes.ok) {
    const err = new Error(`Branch '${targetBranch}' not found on repository.`);
    err.statusCode = refRes.status;
    throw err;
  }
  const refData = await refRes.json();
  const baseSha = refData.object?.sha;

  // 3. Fetch entire git tree recursively
  const treeRes = await fetch(
    `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/git/trees/${encodeURIComponent(baseSha)}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!treeRes.ok) {
    const err = new Error("Failed to fetch repository tree.");
    err.statusCode = treeRes.status;
    throw err;
  }
  const treeData = await treeRes.json();
  const treeItems = treeData.tree || [];

  // 4. Create root workspace Directory in Vault
  const parentDirId = destinationFolderId && destinationFolderId !== "root" ? destinationFolderId : null;
  const rootDirPath = parentDirId ? await getDirectoryPath(parentDirId) : [];

  const rootDirectory = new Directory({
    name: customName,
    userId: ownerId,
    parentDir: parentDirId,
    type: "directory",
    provider: "git_workspace",
    path: rootDirPath,
    gitWorkspace: {
      repoOwner: cleanOwner,
      repoName: cleanRepo,
      branch: targetBranch,
      baseSha,
      headSha: baseSha,
    },
  });
  await rootDirectory.save();

  // 5. Create GitWorkspace record
  const gitWorkspace = new GitWorkspace({
    userId: ownerId,
    rootDirectoryId: rootDirectory._id,
    repoOwner: cleanOwner,
    repoName: cleanRepo,
    branch: targetBranch,
    baseSha,
    headSha: baseSha,
    cloneUrl: repoData.clone_url || "",
    htmlUrl: repoData.html_url || "",
    isPrivate: repoData.private || false,
    lastSyncedAt: new Date(),
    status: "clean",
  });
  await gitWorkspace.save();

  // Update root Directory with workspaceId
  rootDirectory.gitWorkspace.workspaceId = gitWorkspace._id;
  await rootDirectory.save();

  // 6. Build folder hierarchy and file models
  // Map relative directory paths to created Directory ObjectIds
  const dirMap = new Map();
  dirMap.set("", rootDirectory._id);

  // Filter directories first
  const dirItems = treeItems.filter((i) => i.type === "tree");
  for (const item of dirItems) {
    const parts = item.path.split("/");
    const dirName = parts.pop();
    const parentPath = parts.join("/");
    const parentId = dirMap.get(parentPath) || rootDirectory._id;
    const currentPath = await getDirectoryPath(parentId);

    const subDir = new Directory({
      name: dirName,
      userId: ownerId,
      parentDir: parentId,
      type: "directory",
      provider: "git_workspace",
      path: currentPath,
      gitWorkspace: {
        workspaceId: gitWorkspace._id,
        repoOwner: cleanOwner,
        repoName: cleanRepo,
        branch: targetBranch,
        baseSha,
      },
    });
    await subDir.save();
    dirMap.set(item.path, subDir._id);
  }

  // 7. Download and populate files (blobs) in chunks
  const fileItems = treeItems.filter((i) => i.type === "blob");
  let totalBytes = 0;
  const CHUNK_SIZE = 8;

  for (let i = 0; i < fileItems.length; i += CHUNK_SIZE) {
    const chunk = fileItems.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (fileItem) => {
        try {
          const parts = fileItem.path.split("/");
          const fileName = parts.pop();
          const parentPath = parts.join("/");
          const parentId = dirMap.get(parentPath) || rootDirectory._id;
          const currentPath = await getDirectoryPath(parentId);
          const ext = path.extname(fileName) || "";

          // Fetch raw blob content from GitHub
          const blobRes = await fetch(
            `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/git/blobs/${encodeURIComponent(fileItem.sha)}`,
            {
              headers: {
                Authorization: `Bearer ${githubAccessToken}`,
                Accept: "application/vnd.github+json",
              },
            }
          );

          let buffer = Buffer.alloc(0);
          if (blobRes.ok) {
            const blobData = await blobRes.json();
            if (blobData.content) {
              buffer = Buffer.from(blobData.content, blobData.encoding === "base64" ? "base64" : "utf-8");
            }
          }

          const fileDoc = new File({
            name: fileName,
            userId: ownerId,
            parentDir: parentId,
            type: "file",
            extension: ext,
            size: buffer.length,
            path: currentPath,
            uploadStatus: "completed",
            gitStatus: {
              status: "unmodified",
              staged: false,
              originalSha: fileItem.sha,
              remoteSha: fileItem.sha,
            },
          });
          await fileDoc.save();

          // Upload to B2 storage
          const s3Key = `${fileDoc._id}${ext}`;
          await uploadToB2({
            key: s3Key,
            body: buffer,
            contentType: "application/octet-stream",
          });

          totalBytes += buffer.length;
        } catch (e) {
          console.error(`Error cloning file ${fileItem.path}:`, e);
        }
      })
    );
  }

  // Update root directory size
  rootDirectory.size = totalBytes;
  await rootDirectory.save();

  return {
    message: `Repository '${cleanOwner}/${cleanRepo}' cloned to Vault successfully!`,
    workspaceId: gitWorkspace._id,
    rootDirectoryId: rootDirectory._id,
    directoryName: customName,
    branch: targetBranch,
    filesCount: fileItems.length,
    directoriesCount: dirItems.length + 1,
    size: totalBytes,
  };
};

/* ============================================================================
   2. WORKING TREE CHANGE TRACKER & WORKSPACE STATUS
   ============================================================================ */

export const getWorkspaceStatusLogic = async ({ workspaceId, folderId, req }) => {
  const { githubAccessToken, ownerId } = await getGithubToken(req);

  const workspace = await resolveWorkspace(workspaceId, folderId, ownerId);

  if (!workspace) {
    const err = new Error("Git Workspace not found");
    err.statusCode = 404;
    throw err;
  }

  // Find all descendant directories and files for this workspace
  const allWorkspaceDirs = await Directory.find({
    userId: ownerId,
    $or: [{ _id: workspace.rootDirectoryId }, { "gitWorkspace.workspaceId": workspace._id }],
  }).lean();

  const dirIds = allWorkspaceDirs.map((d) => d._id);
  const allFiles = await File.find({
    userId: ownerId,
    parentDir: { $in: dirIds },
  }).lean();

  // Deterministic relative path map using ancestor graph
  const dirMapById = new Map(allWorkspaceDirs.map((d) => [d._id.toString(), d]));
  const getRelativePathForDir = (dirId) => {
    if (!dirId || dirId.toString() === workspace.rootDirectoryId.toString()) return "";
    const dir = dirMapById.get(dirId.toString());
    if (!dir) return "";
    const parentRel = getRelativePathForDir(dir.parentDir);
    return parentRel ? `${parentRel}/${dir.name}` : dir.name;
  };

  const dirPathMap = new Map();
  for (const dir of allWorkspaceDirs) {
    dirPathMap.set(dir._id.toString(), getRelativePathForDir(dir._id));
  }

  // Inspect files to classify status (untracked/added, modified, unmodified)
  const untracked = [];
  const modified = [];
  const staged = [];

  for (const file of allFiles) {
    const parentRel = dirPathMap.get(file.parentDir?.toString()) || "";
    const relPath = parentRel ? `${parentRel}/${file.name}` : file.name;

    const fileGitStatus = file.gitStatus || {};
    const isStaged = workspace.stagedFiles.some((s) => s.path === relPath) || fileGitStatus.staged;

    if (!fileGitStatus.originalSha || fileGitStatus.status === "added") {
      untracked.push({
        _id: file._id,
        name: file.name,
        path: relPath,
        size: file.size,
        extension: file.extension,
        status: "added",
        staged: isStaged,
      });
    } else if (fileGitStatus.status === "modified") {
      modified.push({
        _id: file._id,
        name: file.name,
        path: relPath,
        size: file.size,
        extension: file.extension,
        status: "modified",
        staged: isStaged,
        originalSha: fileGitStatus.originalSha,
      });
    }

    if (isStaged) {
      staged.push({
        _id: file._id,
        name: file.name,
        path: relPath,
        size: file.size,
        status: fileGitStatus.status || "modified",
      });
    }
  }

  // Check remote branch ahead/behind status via compare API
  let aheadBy = 0;
  let behindBy = 0;
  let remoteSha = workspace.baseSha;

  try {
    const refRes = await fetch(
      `https://api.github.com/repos/${workspace.repoOwner}/${workspace.repoName}/git/ref/heads/${encodeURIComponent(workspace.branch)}`,
      {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }
    );
    if (refRes.ok) {
      const refData = await refRes.json();
      remoteSha = refData.object?.sha || workspace.baseSha;

      if (remoteSha !== workspace.baseSha) {
        const compareRes = await fetch(
          `https://api.github.com/repos/${workspace.repoOwner}/${workspace.repoName}/compare/${encodeURIComponent(workspace.baseSha)}...${encodeURIComponent(remoteSha)}`,
          {
            headers: { Authorization: `Bearer ${githubAccessToken}` },
          }
        );
        if (compareRes.ok) {
          const compData = await compareRes.json();
          behindBy = compData.ahead_by || 0;
          aheadBy = compData.behind_by || 0;
        }
      }
    }
  } catch (e) {
    console.error("Error comparing branch status:", e);
  }

  return {
    workspace: {
      _id: workspace._id,
      rootDirectoryId: workspace.rootDirectoryId,
      repoOwner: workspace.repoOwner,
      repoName: workspace.repoName,
      branch: workspace.branch,
      baseSha: workspace.baseSha,
      remoteSha,
      lastSyncedAt: workspace.lastSyncedAt,
      isPrivate: workspace.isPrivate,
      htmlUrl: workspace.htmlUrl,
    },
    untracked,
    modified,
    deleted: [],
    staged,
    aheadBy,
    behindBy,
    isClean: untracked.length === 0 && modified.length === 0 && staged.length === 0,
  };
};

/* ============================================================================
   3. STAGE & UNSTAGE FILES
   ============================================================================ */

/* ============================================================================
   3. STAGE & UNSTAGE FILES
   ============================================================================ */

export const stageFilesLogic = async ({ workspaceId, filePaths = [], stageAll = false, req }) => {
  const { ownerId } = await getGithubToken(req);
  const workspace = await resolveWorkspace(workspaceId, req?.body?.folderId || req?.query?.folderId, ownerId);
  if (!workspace) throw new Error("Git Workspace not found");

  const status = await getWorkspaceStatusLogic({ workspaceId: workspace._id, req });
  const candidates = [...status.untracked, ...status.modified];

  const targetPaths = stageAll ? candidates.map((c) => c.path) : filePaths;

  for (const candidate of candidates) {
    if (targetPaths.includes(candidate.path)) {
      const existingIdx = workspace.stagedFiles.findIndex((s) => s.path === candidate.path);
      const stageEntry = {
        path: candidate.path,
        status: candidate.status,
        fileId: candidate._id,
      };
      if (existingIdx !== -1) {
        workspace.stagedFiles[existingIdx] = stageEntry;
      } else {
        workspace.stagedFiles.push(stageEntry);
      }
      await File.updateOne({ _id: candidate._id }, { $set: { "gitStatus.staged": true } });
    }
  }

  await workspace.save();
  return { message: "Files staged successfully", stagedFiles: workspace.stagedFiles };
};

export const unstageFilesLogic = async ({ workspaceId, filePaths = [], unstageAll = false, req }) => {
  const { ownerId } = await getGithubToken(req);
  const workspace = await resolveWorkspace(workspaceId, req?.body?.folderId || req?.query?.folderId, ownerId);
  if (!workspace) throw new Error("Git Workspace not found");

  if (unstageAll) {
    const fileIds = workspace.stagedFiles.map((s) => s.fileId).filter(Boolean);
    await File.updateMany({ _id: { $in: fileIds } }, { $set: { "gitStatus.staged": false } });
    workspace.stagedFiles = [];
  } else {
    workspace.stagedFiles = workspace.stagedFiles.filter((s) => {
      if (filePaths.includes(s.path)) {
        if (s.fileId) {
          File.updateOne({ _id: s.fileId }, { $set: { "gitStatus.staged": false } }).catch(() => {});
        }
        return false;
      }
      return true;
    });
  }

  await workspace.save();
  return { message: "Files unstaged successfully", stagedFiles: workspace.stagedFiles };
};

/* ============================================================================
   4. ATOMIC MULTI-FILE COMMIT DIRECTLY TO GITHUB
   ============================================================================ */

export const commitWorkspaceLogic = async ({ workspaceId, message, description, req }) => {
  const { githubAccessToken, ownerId } = await getGithubToken(req);
  const workspace = await resolveWorkspace(workspaceId, req?.body?.folderId || req?.query?.folderId, ownerId);
  if (!workspace) throw new Error("Git Workspace not found");

  if (!workspace.stagedFiles || workspace.stagedFiles.length === 0) {
    const err = new Error("No staged changes to commit. Please stage files first.");
    err.statusCode = 400;
    throw err;
  }

  const cleanMessage = sanitize(message) + (description ? `\n\n${sanitize(description)}` : "");
  const { repoOwner, repoName, branch, baseSha } = workspace;

  // 1. Upload blobs to GitHub for each staged file
  const treeEntries = [];

  for (const staged of workspace.stagedFiles) {
    if (staged.status === "deleted") {
      // Tree entry with null sha to delete file in git
      treeEntries.push({
        path: staged.path,
        mode: "100644",
        type: "blob",
        sha: null,
      });
    } else if (staged.fileId) {
      const fileDoc = await File.findById(staged.fileId).lean();
      if (fileDoc) {
        const s3Key = `${fileDoc._id}${fileDoc.extension || ""}`;
        const objectData = await getObjectFromB2({ key: s3Key });
        const byteArray = await objectData.Body.transformToByteArray();
        const buffer = Buffer.from(byteArray);
        const base64Content = buffer.toString("base64");

        // Create blob on GitHub
        const blobRes = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/git/blobs`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${githubAccessToken}`,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: base64Content,
              encoding: "base64",
            }),
          }
        );

        if (!blobRes.ok) {
          const errData = await blobRes.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to create Git blob for ${staged.path}`);
        }

        const blobData = await blobRes.json();
        treeEntries.push({
          path: staged.path,
          mode: "100644",
          type: "blob",
          sha: blobData.sha,
        });
      }
    }
  }

  // 2. Create new Git Tree based on current base_tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base_tree: baseSha,
        tree: treeEntries,
      }),
    }
  );

  if (!treeRes.ok) {
    const errData = await treeRes.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to create Git tree object");
  }
  const treeData = await treeRes.json();
  const newTreeSha = treeData.sha;

  // 3. Create new Commit object
  const commitRes = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/git/commits`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: cleanMessage,
        tree: newTreeSha,
        parents: [baseSha],
      }),
    }
  );

  if (!commitRes.ok) {
    const errData = await commitRes.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to create Git commit object");
  }
  const commitData = await commitRes.json();
  const newCommitSha = commitData.sha;

  // 4. Update branch reference to point to new commit
  const updateRefRes = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sha: newCommitSha,
        force: false,
      }),
    }
  );

  if (!updateRefRes.ok) {
    const errData = await updateRefRes.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to update branch '${branch}' ref`);
  }

  // 5. Update local database records
  const stagedFileIds = workspace.stagedFiles.map((s) => s.fileId).filter(Boolean);
  await File.updateMany(
    { _id: { $in: stagedFileIds } },
    {
      $set: {
        "gitStatus.status": "unmodified",
        "gitStatus.staged": false,
      },
    }
  );

  workspace.baseSha = newCommitSha;
  workspace.headSha = newCommitSha;
  workspace.stagedFiles = [];
  workspace.lastSyncedAt = new Date();
  workspace.status = "clean";
  await workspace.save();

  // Update root directory baseSha
  await Directory.updateOne(
    { _id: workspace.rootDirectoryId },
    {
      $set: {
        "gitWorkspace.baseSha": newCommitSha,
        "gitWorkspace.headSha": newCommitSha,
      },
    }
  );

  return {
    message: `Committed and pushed ${treeEntries.length} file changes to '${branch}' successfully!`,
    commitSha: newCommitSha,
    shortSha: newCommitSha.substring(0, 7),
    branch,
    committedFiles: treeEntries.map((t) => t.path),
  };
};

/* ============================================================================
   5. BIDIRECTIONAL PULL & SYNC ENGINE
   ============================================================================ */

export const pullRemoteChangesLogic = async ({ workspaceId, req }) => {
  const { githubAccessToken, ownerId } = await getGithubToken(req);
  const workspace = await resolveWorkspace(workspaceId, req?.body?.folderId || req?.query?.folderId, ownerId);
  if (!workspace) throw new Error("Git Workspace not found");

  const { repoOwner, repoName, branch, baseSha } = workspace;

  // 1. Fetch remote branch HEAD SHA
  const refRes = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/${encodeURIComponent(branch)}`,
    {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    }
  );

  if (!refRes.ok) throw new Error(`Remote branch '${branch}' not found`);
  const refData = await refRes.json();
  const remoteSha = refData.object?.sha;

  if (remoteSha === baseSha) {
    return { upToDate: true, message: "Workspace is already up to date with remote branch!" };
  }

  // 2. Fetch remote tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${encodeURIComponent(remoteSha)}?recursive=1`,
    {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    }
  );

  if (!treeRes.ok) throw new Error("Failed to fetch remote tree for pull");
  const treeData = await treeRes.json();
  const remoteTreeItems = treeData.tree || [];

  // 3. Map local directory hierarchy
  const allWorkspaceDirs = await Directory.find({
    userId: ownerId,
    $or: [{ _id: workspace.rootDirectoryId }, { "gitWorkspace.workspaceId": workspace._id }],
  }).lean();

  const dirMapById = new Map(allWorkspaceDirs.map((d) => [d._id.toString(), d]));
  const getRelativePathForDir = (dirId) => {
    if (!dirId || dirId.toString() === workspace.rootDirectoryId.toString()) return "";
    const dir = dirMapById.get(dirId.toString());
    if (!dir) return "";
    const parentRel = getRelativePathForDir(dir.parentDir);
    return parentRel ? `${parentRel}/${dir.name}` : dir.name;
  };

  const dirPathMap = new Map();
  dirPathMap.set("", workspace.rootDirectoryId);
  for (const dir of allWorkspaceDirs) {
    dirPathMap.set(getRelativePathForDir(dir._id), dir._id);
  }

  // Create any new remote directories
  const remoteDirItems = remoteTreeItems.filter((i) => i.type === "tree");
  for (const item of remoteDirItems) {
    if (!dirPathMap.has(item.path)) {
      const parts = item.path.split("/");
      const dirName = parts.pop();
      const parentPath = parts.join("/");
      const parentId = dirPathMap.get(parentPath) || workspace.rootDirectoryId;
      const currentPath = await getDirectoryPath(parentId);

      const newDir = new Directory({
        name: dirName,
        userId: ownerId,
        parentDir: parentId,
        type: "directory",
        provider: "git_workspace",
        path: currentPath,
        gitWorkspace: {
          workspaceId: workspace._id,
          repoOwner,
          repoName,
          branch,
          baseSha: remoteSha,
        },
      });
      await newDir.save();
      dirPathMap.set(item.path, newDir._id);
      dirMapById.set(newDir._id.toString(), newDir.toObject());
    }
  }

  // 4. Update / Insert remote files
  const remoteFileItems = remoteTreeItems.filter((i) => i.type === "blob");
  let updatedCount = 0;

  for (const fileItem of remoteFileItems) {
    const parts = fileItem.path.split("/");
    const fileName = parts.pop();
    const parentPath = parts.join("/");
    const parentId = dirPathMap.get(parentPath) || workspace.rootDirectoryId;
    const ext = path.extname(fileName) || "";

    const existingFile = await File.findOne({
      userId: ownerId,
      parentDir: parentId,
      name: fileName,
    });

    if (!existingFile || existingFile.gitStatus?.originalSha !== fileItem.sha) {
      // Fetch new blob content
      const blobRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/blobs/${encodeURIComponent(fileItem.sha)}`,
        { headers: { Authorization: `Bearer ${githubAccessToken}` } }
      );

      if (blobRes.ok) {
        const blobData = await blobRes.json();
        const buffer = Buffer.from(blobData.content || "", blobData.encoding === "base64" ? "base64" : "utf-8");

        let targetFile = existingFile;
        if (!targetFile) {
          const currentPath = await getDirectoryPath(parentId);
          targetFile = new File({
            name: fileName,
            userId: ownerId,
            parentDir: parentId,
            type: "file",
            extension: ext,
            path: currentPath,
          });
        }

        targetFile.size = buffer.length;
        targetFile.gitStatus = {
          status: "unmodified",
          staged: false,
          originalSha: fileItem.sha,
          remoteSha: fileItem.sha,
        };
        await targetFile.save();

        // Update in B2
        await uploadToB2({
          key: `${targetFile._id}${ext}`,
          body: buffer,
          contentType: "application/octet-stream",
        });

        updatedCount++;
      }
    }
  }

  workspace.baseSha = remoteSha;
  workspace.headSha = remoteSha;
  workspace.lastSyncedAt = new Date();
  workspace.status = "clean";
  await workspace.save();

  await Directory.updateOne(
    { _id: workspace.rootDirectoryId },
    { $set: { "gitWorkspace.baseSha": remoteSha, "gitWorkspace.headSha": remoteSha } }
  );

  return {
    message: `Pull completed successfully. ${updatedCount} files updated from remote branch '${branch}'.`,
    updatedFilesCount: updatedCount,
    newSha: remoteSha,
  };
};

/* ============================================================================
   6. BRANCH SWITCHING & CHECKOUT
   ============================================================================ */

export const switchWorkspaceBranchLogic = async ({ workspaceId, targetBranch, createNew = false, req }) => {
  const { githubAccessToken, ownerId } = await getGithubToken(req);
  const workspace = await resolveWorkspace(workspaceId, req?.body?.folderId || req?.query?.folderId, ownerId);
  if (!workspace) throw new Error("Git Workspace not found");

  const { repoOwner, repoName } = workspace;
  const cleanBranch = targetBranch.trim();

  // If creating new branch, push ref first
  if (createNew) {
    const createRefRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: `refs/heads/${cleanBranch}`,
          sha: workspace.baseSha,
        }),
      }
    );
    if (!createRefRes.ok) {
      const errData = await createRefRes.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create new branch '${cleanBranch}'`);
    }
  }

  // Pull target branch snapshot
  workspace.branch = cleanBranch;
  await workspace.save();

  await Directory.updateOne(
    { _id: workspace.rootDirectoryId },
    { $set: { "gitWorkspace.branch": cleanBranch } }
  );

  // Trigger full pull on the target branch
  const pullResult = await pullRemoteChangesLogic({ workspaceId: workspace._id, req });

  return {
    message: `Switched to branch '${cleanBranch}' successfully!`,
    branch: cleanBranch,
    details: pullResult,
  };
};

/* ============================================================================
   7. GIT STASH & WORKING SNAPSHOTS
   ============================================================================ */

export const stashChangesLogic = async ({ workspaceId, message = "WIP stash", req }) => {
  const { ownerId } = await getGithubToken(req);
  const workspace = await resolveWorkspace(workspaceId, req?.body?.folderId || req?.query?.folderId, ownerId);
  if (!workspace) throw new Error("Git Workspace not found");

  const status = await getWorkspaceStatusLogic({ workspaceId: workspace._id, req });
  const dirtyFiles = [...status.untracked, ...status.modified];

  if (dirtyFiles.length === 0) {
    return { message: "No local changes to stash. Working tree is clean." };
  }

  const stashedEntries = [];

  for (const dirty of dirtyFiles) {
    const fileDoc = await File.findById(dirty._id).lean();
    if (fileDoc) {
      const s3Key = `${fileDoc._id}${fileDoc.extension || ""}`;
      let content = "";
      try {
        const objectData = await getObjectFromB2({ key: s3Key });
        const byteArray = await objectData.Body.transformToByteArray();
        content = Buffer.from(byteArray).toString("base64");
      } catch (e) {
        // ignore
      }

      stashedEntries.push({
        path: dirty.path,
        status: dirty.status,
        content,
        size: dirty.size,
        extension: dirty.extension,
      });

      // If added/untracked, delete the local working file
      if (dirty.status === "added") {
        await File.deleteOne({ _id: dirty._id });
        await deleteFromB2({ key: s3Key });
      } else {
        // Revert modified file to unmodified status
        await File.updateOne(
          { _id: dirty._id },
          { $set: { "gitStatus.status": "unmodified", "gitStatus.staged": false } }
        );
      }
    }
  }

  const stash = new GitStash({
    workspaceId: workspace._id,
    userId: ownerId,
    message: sanitize(message),
    branch: workspace.branch,
    baseSha: workspace.baseSha,
    files: stashedEntries,
  });
  await stash.save();

  workspace.stagedFiles = [];
  await workspace.save();

  return {
    message: `Saved working directory changes to stash: "${message}" (${stashedEntries.length} files)`,
    stashId: stash._id,
    stashedFilesCount: stashedEntries.length,
  };
};

export const listStashesLogic = async ({ workspaceId, req }) => {
  const { ownerId } = await getGithubToken(req);
  const workspace = await resolveWorkspace(workspaceId, req?.query?.folderId, ownerId);
  const queryWorkspaceId = workspace ? workspace._id : workspaceId;

  const stashes = await GitStash.find({ workspaceId: queryWorkspaceId, userId: ownerId })
    .sort({ createdAt: -1 })
    .lean();

  return {
    stashes: stashes.map((s) => ({
      _id: s._id,
      message: s.message,
      branch: s.branch,
      createdAt: s.createdAt,
      filesCount: s.files?.length || 0,
      files: (s.files || []).map((f) => ({ path: f.path, status: f.status, size: f.size })),
    })),
  };
};

export const popStashLogic = async ({ stashId, req }) => {
  const { ownerId } = await getGithubToken(req);
  const stash = await GitStash.findOne({ _id: stashId, userId: ownerId });
  if (!stash) throw new Error("Stash not found");

  const workspace = await GitWorkspace.findById(stash.workspaceId);
  if (!workspace) throw new Error("Git Workspace not found");

  // Restore stashed files preserving nested subdirectories
  for (const stashedFile of stash.files || []) {
    const buffer = Buffer.from(stashedFile.content || "", "base64");
    const parts = stashedFile.path.split("/");
    const fileName = parts.pop();
    const parentPath = parts.join("/");

    let parentId = workspace.rootDirectoryId;
    if (parentPath) {
      const segs = parentPath.split("/");
      let currentParentId = workspace.rootDirectoryId;
      for (const seg of segs) {
        let existingDir = await Directory.findOne({
          userId: ownerId,
          parentDir: currentParentId,
          name: seg,
        });
        if (!existingDir) {
          const currentPathArr = await getDirectoryPath(currentParentId);
          existingDir = new Directory({
            name: seg,
            userId: ownerId,
            parentDir: currentParentId,
            type: "directory",
            provider: "git_workspace",
            path: currentPathArr,
            gitWorkspace: {
              workspaceId: workspace._id,
              repoOwner: workspace.repoOwner,
              repoName: workspace.repoName,
              branch: workspace.branch,
            },
          });
          await existingDir.save();
        }
        currentParentId = existingDir._id;
      }
      parentId = currentParentId;
    }

    let fileDoc = await File.findOne({
      userId: ownerId,
      parentDir: parentId,
      name: fileName,
    });

    const currentPath = await getDirectoryPath(parentId);
    if (!fileDoc) {
      fileDoc = new File({
        name: fileName,
        userId: ownerId,
        parentDir: parentId,
        path: currentPath,
        type: "file",
        extension: stashedFile.extension || path.extname(fileName) || "",
        size: buffer.length,
        gitStatus: {
          status: stashedFile.status || "modified",
          staged: false,
        },
      });
      await fileDoc.save();
    } else {
      fileDoc.size = buffer.length;
      fileDoc.gitStatus = {
        status: stashedFile.status || "modified",
        staged: false,
      };
      await fileDoc.save();
    }

    await uploadToB2({
      key: `${fileDoc._id}${fileDoc.extension || ""}`,
      body: buffer,
      contentType: "application/octet-stream",
    });
  }

  await GitStash.deleteOne({ _id: stashId });
  return { message: "Stash applied and removed from stash list successfully" };
};

export const dropStashLogic = async ({ stashId, req }) => {
  const { ownerId } = await getGithubToken(req);
  await GitStash.deleteOne({ _id: stashId, userId: ownerId });
  return { message: "Stash dropped successfully" };
};

/* ============================================================================
   8. AUTOMATED VAULT-TO-GITHUB FOLDER BACKUP & SCHEDULED SYNC
   ============================================================================ */

export const configureFolderBackupLogic = async ({ directoryId, repoOwner, repoName, targetBranch = "vault-backup", frequency = "manual", req }) => {
  const { ownerId } = await getGithubToken(req);
  const cleanOwner = sanitize(repoOwner);
  const cleanRepo = sanitize(repoName);
  const cleanBranch = sanitize(targetBranch);

  let job = await GitSyncJob.findOne({ directoryId, userId: ownerId });
  if (!job) {
    job = new GitSyncJob({
      userId: ownerId,
      directoryId,
      repoOwner: cleanOwner,
      repoName: cleanRepo,
      targetBranch: cleanBranch,
      frequency,
      enabled: true,
    });
  } else {
    job.repoOwner = cleanOwner;
    job.repoName = cleanRepo;
    job.targetBranch = cleanBranch;
    job.frequency = frequency;
    job.enabled = true;
  }
  await job.save();

  await Directory.updateOne(
    { _id: directoryId },
    {
      $set: {
        gitSync: {
          jobId: job._id,
          enabled: true,
          repoOwner: cleanOwner,
          repoName: cleanRepo,
          targetBranch: cleanBranch,
        },
      },
    }
  );

  return {
    message: `Automated GitHub backup configured for ${cleanOwner}/${cleanRepo} (${cleanBranch})`,
    job,
  };
};

export const runFolderBackupSyncLogic = async ({ directoryId, req }) => {
  const { githubAccessToken, ownerId } = await getGithubToken(req);

  const job = await GitSyncJob.findOne({ directoryId, userId: ownerId });
  const dir = await Directory.findById(directoryId).lean();
  if (!dir) throw new Error("Directory not found");

  const repoOwner = job?.repoOwner || req.body.repoOwner;
  const repoName = job?.repoName || req.body.repoName;
  const targetBranch = job?.targetBranch || req.body.targetBranch || "vault-backup";

  if (!repoOwner || !repoName) throw new Error("Target GitHub repository required for backup sync");

  // 1. Check or create target branch on GitHub
  let baseSha;
  const branchRes = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/${encodeURIComponent(targetBranch)}`,
    { headers: { Authorization: `Bearer ${githubAccessToken}` } }
  );

  if (branchRes.ok) {
    const branchData = await branchRes.json();
    baseSha = branchData.object?.sha;
  } else {
    // Branch doesn't exist; get default branch SHA and create it
    const repoInfoRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    });
    const repoInfo = await repoInfoRes.json();
    const defaultBranch = repoInfo.default_branch || "main";

    const defaultRefRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/${encodeURIComponent(defaultBranch)}`,
      { headers: { Authorization: `Bearer ${githubAccessToken}` } }
    );
    const defaultRef = await defaultRefRes.json();
    baseSha = defaultRef.object?.sha;

    await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/refs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: `refs/heads/${targetBranch}`,
        sha: baseSha,
      }),
    });
  }

  // 2. Traverse all files in the Vault directory subtree preserving relative paths
  const allSubDirs = await Directory.find({
    userId: ownerId,
    $or: [{ _id: directoryId }, { "path._id": directoryId }],
  }).lean();

  const subDirIds = allSubDirs.map((d) => d._id);
  const files = await File.find({ userId: ownerId, parentDir: { $in: subDirIds } }).lean();

  if (files.length === 0) {
    return { message: "Folder has no files to backup. Add files to backup." };
  }

  const dirMapById = new Map(allSubDirs.map((d) => [d._id.toString(), d]));
  const getRelativePathForDir = (dirId) => {
    if (!dirId || dirId.toString() === directoryId.toString()) return "";
    const dir = dirMapById.get(dirId.toString());
    if (!dir) return "";
    const parentRel = getRelativePathForDir(dir.parentDir);
    return parentRel ? `${parentRel}/${dir.name}` : dir.name;
  };

  const treeEntries = [];
  for (const file of files) {
    const parentRel = getRelativePathForDir(file.parentDir);
    const relPath = parentRel ? `${parentRel}/${file.name}` : file.name;
    const s3Key = `${file._id}${file.extension || ""}`;
    try {
      const objectData = await getObjectFromB2({ key: s3Key });
      const byteArray = await objectData.Body.transformToByteArray();
      const buffer = Buffer.from(byteArray);
      const base64Content = buffer.toString("base64");

      const blobRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/blobs`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${githubAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: base64Content, encoding: "base64" }),
        }
      );

      if (blobRes.ok) {
        const blobData = await blobRes.json();
        treeEntries.push({
          path: relPath,
          mode: "100644",
          type: "blob",
          sha: blobData.sha,
        });
      }
    } catch (e) {
      console.error(`Backup error for file ${file.name}:`, e);
    }
  }

  // 3. Create tree & commit
  const treeRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/trees`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ base_tree: baseSha, tree: treeEntries }),
  });
  const treeData = await treeRes.json();

  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const commitRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/commits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `[Vault Auto-Backup] ${dir.name} Snapshot (${timestamp}): ${treeEntries.length} files synced`,
      tree: treeData.sha,
      parents: [baseSha],
    }),
  });
  const commitData = await commitRes.json();
  const commitSha = commitData.sha;

  // 4. Update branch ref
  await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/${encodeURIComponent(targetBranch)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sha: commitSha, force: false }),
    }
  );

  if (job) {
    job.lastSyncStatus = "success";
    job.lastSyncedAt = new Date();
    job.lastCommitSha = commitSha;
    job.filesCount = treeEntries.length;
    await job.save();
  }

  return {
    message: `Vault folder '${dir.name}' successfully backed up to ${repoOwner}/${repoName} (${targetBranch})!`,
    commitSha,
    shortSha: commitSha.substring(0, 7),
    filesCount: treeEntries.length,
  };
};
