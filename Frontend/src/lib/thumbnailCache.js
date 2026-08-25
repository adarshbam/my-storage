import { useState, useEffect } from "react";
import { getThumbnailCdnUrl } from "../api/files.api";

// In-memory cache for temporary signed CDN thumbnail URLs
// Key: fileId -> Value: { url: string, expiresAt: number, version: number }
const thumbnailCdnCache = new Map();

// In-flight request deduplication map
// Key: fileId -> Value: Promise<string | null>
const pendingRequests = new Map();

/**
 * Fetches a signed CDN thumbnail URL with in-flight deduplication and memory caching.
 * @param {string} fileId - The MongoDB ObjectId of the file
 * @param {object} [options] - Options including contentVersion and forceRefresh
 * @returns {Promise<string | null>} The signed Cloudflare CDN thumbnail URL
 */
export async function fetchThumbnailCdnUrl(fileId, options = {}) {
  if (!fileId) return null;
  const { version, forceRefresh = false } = options;
  const now = Date.now();

  const cached = thumbnailCdnCache.get(fileId);
  if (!forceRefresh && cached && cached.expiresAt > now) {
    if (version === undefined || cached.version === version) {
      return cached.url;
    }
  }

  // Deduplicate in-flight requests for the same fileId
  if (pendingRequests.has(fileId)) {
    return pendingRequests.get(fileId);
  }

  const requestPromise = (async () => {
    try {
      const data = await getThumbnailCdnUrl(fileId);
      if (data && data.url) {
        const expiresIn = data.expiresInSeconds || 3600;
        // Expire from in-memory cache 60 seconds before CDN signature expires
        const expiresAt = now + Math.max(expiresIn - 60, 60) * 1000;
        thumbnailCdnCache.set(fileId, {
          url: data.url,
          expiresAt,
          version: version || 1,
        });
        return data.url;
      }
      return null;
    } finally {
      pendingRequests.delete(fileId);
    }
  })();

  pendingRequests.set(fileId, requestPromise);
  return requestPromise;
}

/**
 * React hook to retrieve and observe the signed CDN thumbnail URL for an item.
 * Preserves lazy loading and respects item.hasThumbnail.
 * @param {object} item - File item metadata object
 * @returns {{ thumbnailUrl: string | null, loading: boolean, error: boolean }}
 */
export function useThumbnailUrl(item) {
  const fileId = item?._id;
  const hasThumbnail = item?.hasThumbnail;
  const provider = item?.provider || "local";
  const isDirectory = item?.type === "directory" || provider === "shared_drive";

  // Use pre-signed CDN thumbnailUrl if already provided by directory API (0ms instant render)
  const initialUrl = item?.thumbnailUrl || (fileId ? thumbnailCdnCache.get(fileId)?.url : null);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(!initialUrl && !!fileId && hasThumbnail && provider === "local" && !isDirectory);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If we already have a pre-signed URL on the item, use it immediately with zero network overhead
    if (item?.thumbnailUrl) {
      setThumbnailUrl(item.thumbnailUrl);
      setLoading(false);
      setError(false);
      return;
    }

    // Only request thumbnail for Vault Storage files that indicate a thumbnail exists
    if (!fileId || isDirectory || !hasThumbnail || provider !== "local") {
      setThumbnailUrl(null);
      setLoading(false);
      setError(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);

    fetchThumbnailCdnUrl(fileId, { version: item?.contentVersion })
      .then((url) => {
        if (isMounted) {
          if (url) {
            setThumbnailUrl(url);
          } else {
            setError(true);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn(`[thumbnailCache] CDN thumbnail URL error for file ${fileId}:`, err.message || err);
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fileId, hasThumbnail, provider, isDirectory, item?.contentVersion, item?.thumbnailUrl]);

  return { thumbnailUrl, loading, error };
}
