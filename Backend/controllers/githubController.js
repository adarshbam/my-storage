import * as githubService from '../services/github.service.js';

export const disconnectGithub = async (req, res, next) => {
  try {
    const result = await githubService.disconnectGithubLogic({
      userId: req.user.id,
      rootDirId: req.user.rootDirId,
      req,
      res,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to disconnect Github" });
    }
  }
};

export const createRepository = async (req, res, next) => {
  try {
    const result = await githubService.createRepositoryLogic({
      name: req.body.name,
      description: req.body.description,
      isPrivate: req.body.private,
      req,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to create repository" });
    }
  }
};

export const listRepositories = async (req, res, next) => {
  try {
    const result = await githubService.listRepositoriesLogic({ req });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch repositories" });
    }
  }
};

export const getRepositoryContents = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";
    
    const result = await githubService.getRepositoryContentsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      ref: req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch repository contents" });
    }
  }
};

export const getFiles = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    await githubService.getFilesLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      ref: req.query.ref,
      action: req.query.action,
      req,
      res,
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch file" });
    }
  }
};

export const updateFiles = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.updateFilesLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      data: req.body,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to update file" });
    }
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.deleteFileLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      sha: req.body.sha,
      branch: req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to delete file" });
    }
  }
};

export const createFile = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.createFileLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      req,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to create file" });
    }
  }
};

export const deleteFolder = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.deleteFolderLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      branch: req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to delete folder recursively" });
    }
  }
};

export const downloadRepository = async (req, res, next) => {
  try {
    await githubService.downloadRepositoryLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      branch: req.query.ref,
      req,
      res,
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Internal Server Error" });
    }
  }
};

export const downloadFolder = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    await githubService.downloadFolderLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      branch: req.query.ref,
      req,
      res,
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Folder download failed" });
    }
  }
};

export const listBranches = async (req, res, next) => {
  try {
    const result = await githubService.listBranchesLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch branches" });
    }
  }
};

export const searchRepository = async (req, res, next) => {
  try {
    const result = await githubService.searchRepositoryLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      query: req.query.q,
      ref: req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to search repository" });
    }
  }
};

export const getRepositoryDetails = async (req, res, next) => {
  try {
    const result = await githubService.getRepositoryDetailsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch repository details" });
    }
  }
};

export const moveGithubItems = async (req, res, next) => {
  try {
    const result = await githubService.moveGithubItemsLogic({
      items: req.body.items,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Failed to move items" });
    }
  }
};

export const transferFromVault = async (req, res, next) => {
  try {
    const result = await githubService.transferFromVaultLogic({
      items: req.body.items,
      targetPath: req.body.targetPath,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to transfer to GitHub" });
    }
  }
};
