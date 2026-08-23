import {
  CLOUDFLARE_CDN_DOMAIN,
  CLOUDFLARE_CDN_SECRET,
} from "../../config/config.js";
import { createHmac } from "node:crypto";

// Cloudflare CDN integration - placeholder for future implementation
export const createCdnDownloadUrl = ({
  fileId,
  extension,
  isThumbnail = false,
  filename,
  expiresInSeconds = 3600,
}) => {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const path = `/files/${isThumbnail ? "thumbnails/" : ""}${fileId}${extension || ""}`;

  // Create HMAC SHA-256 signature
  const hmac = createHmac("sha256", CLOUDFLARE_CDN_SECRET);
  hmac.update(`${path}:${expires}`);
  const signature = hmac.digest("hex");
  const queryParams = new URLSearchParams({
    exp: expires.toString(),
    sig: signature,
    name: filename || "",
  });
  return `${CLOUDFLARE_CDN_DOMAIN}${path}?${queryParams.toString()}`;
};

console.log(
  createCdnDownloadUrl({
    fileId: "6a832f8faa66500d0fc78eb5",
    extension: ".jpeg",
    filename: "6a832f8faa66500d0fc78eb5.jpeg",
    expiresInSeconds: 60,
  }),
);
