import {
  CLOUDFLARE_CDN_DOMAIN,
  CLOUDFLARE_CDN_SECRET,
  BACKEND_URL,
} from "../../config/config.js";
import { createHmac } from "node:crypto";

// Cloudflare CDN integration
export const createCloudflareCdnDownloadUrl = ({
  fileId,
  extension,
  version = 1,
  isThumbnail = false,
  filename,
  expiresInSeconds = 3600,
  action,
}) => {
  if (!CLOUDFLARE_CDN_DOMAIN || CLOUDFLARE_CDN_DOMAIN === "undefined") {
    const queryParams = new URLSearchParams();
    if (action) queryParams.set("action", action);
    const qs = queryParams.toString();
    return isThumbnail
      ? `${BACKEND_URL}/file/${fileId}/thumbnail${qs ? `?${qs}` : ""}`
      : `${BACKEND_URL}/file/${fileId}${qs ? `?${qs}` : ""}`;
  }

  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const path = `/files/${isThumbnail ? "thumbnails/" : ""}${fileId}${extension || ""}`;
  const v = version || 1;

  // Create HMAC SHA-256 signature covering path, contentVersion, and expiration
  const hmac = createHmac("sha256", CLOUDFLARE_CDN_SECRET || "default-secret");
  hmac.update(`${path}:${v}:${expires}`);
  const signature = hmac.digest("hex");

  const queryParams = new URLSearchParams({
    v: v.toString(),
    exp: expires.toString(),
    sig: signature,
  });

  if (filename) {
    queryParams.set("name", filename);
  }

  if (action) {
    queryParams.set("action", action);
  }

  return `${CLOUDFLARE_CDN_DOMAIN}${path}?${queryParams.toString()}`;
};

export const createCdnDownloadUrl = createCloudflareCdnDownloadUrl;

