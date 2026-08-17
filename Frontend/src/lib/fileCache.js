import { SERVER_URL } from "./api";

// High-performance In-Memory LRU Cache for File Content
const MAX_CACHE_SIZE = 100;
const fileContentCache = new Map();

/**
 * Retrieve cached text content for a file
 * @param {string} fileId
 * @returns {string|null}
 */
export function getCachedContent(fileId) {
  if (!fileId) return null;
  const key = String(fileId);
  if (fileContentCache.has(key)) {
    const value = fileContentCache.get(key);
    // Refresh LRU order (delete and re-insert)
    fileContentCache.delete(key);
    fileContentCache.set(key, value);
    return value;
  }
  return null;
}

/**
 * Store text content in cache
 * @param {string} fileId
 * @param {string} content
 */
export function setCachedContent(fileId, content) {
  if (!fileId || content === null || content === undefined) return;
  const key = String(fileId);

  // Evict oldest if capacity exceeded
  if (fileContentCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = fileContentCache.keys().next().value;
    fileContentCache.delete(oldestKey);
  }

  fileContentCache.set(key, content);
}

/**
 * Invalidate cached content for a specific file
 * @param {string} fileId
 */
export function invalidateCache(fileId) {
  if (!fileId) return;
  fileContentCache.delete(String(fileId));
}

/**
 * Clear the entire in-memory cache
 */
export function clearCache() {
  fileContentCache.clear();
}

/**
 * Check if a file extension represents a text or code document
 * @param {string} ext
 * @returns {boolean}
 */
export function isTextOrCode(ext) {
  const textExtensions = [
    ".txt",
    ".md",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".css",
    ".html",
    ".xml",
    ".yml",
    ".yaml",
    ".py",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".sql",
    ".sh",
    ".bat",
    ".log",
    ".env",
    ".gitignore",
  ];
  return textExtensions.includes(ext?.toLowerCase());
}

/**
 * Construct the read URL for a file
 */
export function getFileUrl(file, ownerId) {
  if (!file) return "";
  let url =
    file.provider === "github"
      ? `${SERVER_URL}/github/file/${file.githubPath?.split("/").map(encodeURIComponent).join("/")}`
      : file.provider === "google_drive"
        ? `${SERVER_URL}/drive/file/${file._id}`
        : `${SERVER_URL}/file/${file._id}`;

  if (ownerId) {
    url += (url.includes("?") ? "&" : "?") + `ownerId=${ownerId}`;
  }
  return url;
}

// In-flight prefetch tracking to avoid duplicate concurrent requests
const activePrefetches = new Set();

/**
 * Lightweight background prefetch on hover or selection (text/code files < 500KB)
 * @param {object} file
 * @param {string} [ownerId]
 */
export function prefetchFileContent(file, ownerId) {
  if (!file || !file._id) return;
  const cacheKey = String(file._id);

  // Skip if already in cache or already being prefetched
  if (fileContentCache.has(cacheKey) || activePrefetches.has(cacheKey)) return;

  // Only prefetch text/code files under 500KB
  if (!isTextOrCode(file.extension)) return;
  if (file.size && file.size > 500 * 1024) return;

  const url = getFileUrl(file, ownerId);
  if (!url) return;

  activePrefetches.add(cacheKey);

  fetch(url, { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error("Prefetch failed");
      return res.text();
    })
    .then((text) => {
      setCachedContent(cacheKey, text);
    })
    .catch(() => {
      // Silently ignore prefetch failures (will be fetched normally on click)
    })
    .finally(() => {
      activePrefetches.delete(cacheKey);
    });
}
