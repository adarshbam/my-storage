import {
  CLOUDFLARE_CDN_DOMAIN,
  CLOUDFLARE_CDN_SECRET,
  BACKEND_URL,
} from "../../config/config.js";
import { createHmac } from "node:crypto";

// Cloudflare CDN integration for private signed URLs
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

// Generate stateless cryptographic token for Public Media Edge Delivery
export const generatePublicMediaToken = ({
  fileId,
  contentVersion = 1,
  allowedOrigins = ["*"],
}) => {
  const payload = {
    f: String(fileId),
    v: Number(contentVersion || 1),
    o: Array.isArray(allowedOrigins) && allowedOrigins.length > 0 ? allowedOrigins : ["*"],
    p: 1, // public media indicator
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = createHmac("sha256", CLOUDFLARE_CDN_SECRET || "default-secret");
  hmac.update(payloadB64);
  const sig = hmac.digest("hex");

  return `${payloadB64}.${sig}`;
};

// Verify stateless public media token
export const verifyPublicMediaToken = (token, expectedFileId = null) => {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [payloadB64, providedSig] = token.split(".");
  if (!payloadB64 || !providedSig) {
    return null;
  }

  const hmac = createHmac("sha256", CLOUDFLARE_CDN_SECRET || "default-secret");
  hmac.update(payloadB64);
  const expectedSig = hmac.digest("hex");

  if (providedSig !== expectedSig) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (expectedFileId && String(payload.f) !== String(expectedFileId)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

// Generate permanent CDN stream URL for public media
export const createPublicMediaCdnUrl = ({
  fileId,
  extension = "",
  token,
  filename,
  version = 1,
}) => {
  if (!CLOUDFLARE_CDN_DOMAIN || CLOUDFLARE_CDN_DOMAIN === "undefined") {
    const qs = new URLSearchParams({ token });
    if (filename) qs.set("name", filename);
    return `${BACKEND_URL}/file/public-stream/${fileId}?${qs.toString()}`;
  }

  // 10-year signed URL compatible with current Cloudflare Worker, including public media token
  const expiresInSeconds = 315360000; // 10 years
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const path = `/files/${fileId}${extension || ""}`;
  const v = version || 1;

  const hmac = createHmac("sha256", CLOUDFLARE_CDN_SECRET || "default-secret");
  hmac.update(`${path}:${v}:${expires}`);
  const signature = hmac.digest("hex");

  const queryParams = new URLSearchParams({
    v: String(v),
    exp: String(expires),
    sig: signature,
    action: "inline",
  });

  if (filename) queryParams.set("name", filename);
  if (token) queryParams.set("token", token);

  return `${CLOUDFLARE_CDN_DOMAIN}${path}?${queryParams.toString()}`;
};
