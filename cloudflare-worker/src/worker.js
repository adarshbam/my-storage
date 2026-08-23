// Cloudflare Edge Gateway Worker for Vault Storage CDN
// Proxies Backblaze B2 Private Bucket via Bandwidth Alliance with HMAC Edge Authentication,
// Edge Caching (caches.default), Range Streaming, and Full CORS Support.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
  "Access-Control-Allow-Headers":
    "Range, If-None-Match, If-Modified-Since, Content-Type, Authorization, X-Purge-Secret",
  "Access-Control-Expose-Headers":
    "Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition, ETag",
  "Access-Control-Max-Age": "86400",
};

const MIME_TYPES = {
  // Documents & Data
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".xml": "application/xml",
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",

  // Code files
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".ts": "text/typescript; charset=utf-8",
  ".tsx": "text/typescript; charset=utf-8",
  ".py": "text/x-python; charset=utf-8",
  ".java": "text/x-java-source; charset=utf-8",
  ".c": "text/x-c; charset=utf-8",
  ".cpp": "text/x-c; charset=utf-8",
  ".h": "text/x-c; charset=utf-8",
  ".hpp": "text/x-c; charset=utf-8",
  ".cs": "text/plain; charset=utf-8",
  ".go": "text/x-go; charset=utf-8",
  ".rs": "text/x-rust; charset=utf-8",
  ".php": "text/x-php; charset=utf-8",
  ".rb": "text/x-ruby; charset=utf-8",
  ".sql": "text/plain; charset=utf-8",
  ".sh": "text/x-sh; charset=utf-8",
  ".bat": "text/plain; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".env": "text/plain; charset=utf-8",
  ".gitignore": "text/plain; charset=utf-8",
  ".log": "text/plain; charset=utf-8",

  // Images
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",

  // Audio / Video
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
};

// In-memory B2 Authorization token cache across requests in the same worker isolate
let cachedB2Auth = {
  token: null,
  downloadUrl: null,
  expiresAt: 0,
};

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // ------------------------------------------------------------
      // 1. Handle CORS Preflight (OPTIONS)
      // ------------------------------------------------------------
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      }

      // ------------------------------------------------------------
      // 2. Authenticated Cache Purge Endpoint (POST /purge)
      // ------------------------------------------------------------
      if (request.method === "POST" && pathname === "/purge") {
        const purgeSecret = request.headers.get("X-Purge-Secret");
        if (!env.CDN_SIGNING_SECRET || purgeSecret !== env.CDN_SIGNING_SECRET) {
          return createCorsResponse("Unauthorized purge request.", 403);
        }

        let body = {};
        try {
          body = await request.json();
        } catch {
          // ignore json parse failure
        }

        const targetPath = body.path || url.searchParams.get("path");
        const purgeVersion = body.v || body.version || url.searchParams.get("v");
        const purgeThumbnail =
          body.purgeThumbnail === true ||
          url.searchParams.get("purgeThumbnail") === "true";

        if (!targetPath || !targetPath.startsWith("/files/")) {
          return createCorsJsonResponse(
            { error: "Invalid target path (must start with /files/)" },
            400
          );
        }

        const result = await purgeFileCache(
          url.origin,
          targetPath,
          purgeThumbnail,
          purgeVersion
        );
        return createCorsJsonResponse(result, 200);
      }

      // ------------------------------------------------------------
      // 3. Method check: Only GET & HEAD allowed for file delivery
      // ------------------------------------------------------------
      if (request.method !== "GET" && request.method !== "HEAD") {
        return createCorsResponse("Method Not Allowed", 405, {
          Allow: "GET, HEAD, POST, OPTIONS",
        });
      }

      // ------------------------------------------------------------
      // 4. Public health check (GET /)
      // ------------------------------------------------------------
      if (pathname === "/") {
        return createCorsResponse(
          "Vault Storage CDN Worker is running.",
          200,
          { "Content-Type": "text/plain; charset=utf-8" }
        );
      }

      // ------------------------------------------------------------
      // 5. Determine requested object key & route
      // ------------------------------------------------------------
      let objectKey;
      let routeType;

      if (pathname.startsWith("/files/thumbnails/")) {
        const thumbnailName = decodeURIComponent(
          pathname.slice("/files/thumbnails/".length)
        );

        if (!thumbnailName || thumbnailName.includes("/")) {
          return createCorsResponse("Invalid thumbnail path.", 400);
        }

        objectKey = `thumbnails/${thumbnailName}`;
        routeType = "thumbnail";
      } else if (pathname.startsWith("/files/")) {
        const fileName = decodeURIComponent(
          pathname.slice("/files/".length)
        );

        if (!fileName || fileName.includes("/")) {
          return createCorsResponse("Invalid file path.", 400);
        }

        objectKey = fileName;
        routeType = "file";
      } else {
        return createCorsResponse("Not Found.", 404);
      }

      // ------------------------------------------------------------
      // 6. Validate CDN Signing Secret Configuration
      // ------------------------------------------------------------
      if (!env.CDN_SIGNING_SECRET) {
        return createCorsResponse(
          "CDN signing secret is not configured.",
          500
        );
      }

      // ------------------------------------------------------------
      // 7. Validate version, expiry, and signature parameters
      // ------------------------------------------------------------
      const v = url.searchParams.get("v");
      const expires = url.searchParams.get("exp");
      const signature = url.searchParams.get("sig");

      if (!v || !expires || !signature) {
        return createCorsResponse("Signed URL required.", 401);
      }

      const versionNum = Number(v);
      if (!Number.isInteger(versionNum) || versionNum < 1) {
        return createCorsResponse("Invalid version parameter.", 400);
      }

      const expiresAt = Number(expires);
      if (!Number.isInteger(expiresAt)) {
        return createCorsResponse("Invalid expiration.", 400);
      }

      const now = Math.floor(Date.now() / 1000);
      if (expiresAt <= now) {
        return createCorsResponse("Signed URL has expired.", 403);
      }

      // ------------------------------------------------------------
      // 8. Verify HMAC-SHA256 signature
      // ------------------------------------------------------------
      const dataToVerify = `${pathname}:${v}:${expires}`;

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(env.CDN_SIGNING_SECRET),
        {
          name: "HMAC",
          hash: "SHA-256",
        },
        false,
        ["verify"]
      );

      const providedSignatureBytes = hexToBytes(signature);
      if (!providedSignatureBytes) {
        return createCorsResponse("Invalid signature.", 403);
      }

      const validSignature = await crypto.subtle.verify(
        "HMAC",
        key,
        providedSignatureBytes,
        new TextEncoder().encode(dataToVerify)
      );

      if (!validSignature) {
        return createCorsResponse("Invalid signature.", 403);
      }

      // ------------------------------------------------------------
      // 9. Check Cloudflare Cache (caches.default) using canonical key
      // ------------------------------------------------------------
      const isDownload =
        url.searchParams.get("action") === "download" ||
        url.searchParams.get("download") === "true" ||
        url.searchParams.get("disposition") === "attachment";
      const requestedName = url.searchParams.get("name") || objectKey.split("/").pop();

      const cache = caches.default;
      const canonicalUrl = `${url.origin}${pathname}?v=${v}`;
      const cacheKey = new Request(canonicalUrl, {
        method: "GET",
        headers: request.headers,
      });

      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const dynamicHeaders = new Headers(cachedResponse.headers);
        applyCors(dynamicHeaders);

        const disposition = createContentDisposition(requestedName, isDownload);
        if (disposition) {
          dynamicHeaders.set("Content-Disposition", disposition);
        }

        // Ensure proper MIME type is set even on cached responses
        const mime = getMimeType(requestedName || objectKey, dynamicHeaders.get("Content-Type"));
        dynamicHeaders.set("Content-Type", mime);

        return new Response(request.method === "HEAD" ? null : cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: dynamicHeaders,
        });
      }

      // ------------------------------------------------------------
      // 10. Authenticate with Backblaze B2 (with in-memory token cache)
      // ------------------------------------------------------------
      if (!env.B2_APPLICATION_KEY_ID || !env.B2_APPLICATION_KEY) {
        return createCorsResponse("B2 credentials are not configured.", 500);
      }

      let auth;
      try {
        auth = await getB2Auth(env);
      } catch (authErr) {
        console.error("B2 authentication failed:", authErr.message);
        return createCorsResponse("B2 authentication failed.", 502);
      }

      // ------------------------------------------------------------
      // 11. Fetch object from Backblaze B2
      // ------------------------------------------------------------
      const bucketName =
        env.B2_BUCKET_NAME || env.BACKBLAZE_BUCKET_NAME || "secure-vault-storage";

      const downloadUrl =
        `${auth.downloadUrl}/file/` +
        `${encodeURIComponent(bucketName)}/` +
        `${objectKey
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`;

      const b2Headers = {
        Authorization: auth.token,
      };

      const rangeHeader = request.headers.get("Range");
      if (rangeHeader) {
        b2Headers.Range = rangeHeader;
      }

      const downloadResponse = await fetch(downloadUrl, {
        headers: b2Headers,
        cf: {
          cacheTtl: 86400,
          cacheEverything: true,
        },
      });

      if (!downloadResponse.ok) {
        if (downloadResponse.status === 404) {
          return createCorsResponse("File not found.", 404);
        }

        console.error("B2 download failed:", {
          status: downloadResponse.status,
          routeType,
          objectKey,
        });

        return createCorsResponse("B2 file download failed.", 502);
      }

      // ------------------------------------------------------------
      // 12. Build Final Response Headers & Cache in Cloudflare Edge
      // ------------------------------------------------------------
      const headers = new Headers();
      applyCors(headers);

      // Detect and enforce accurate MIME type
      const mimeType = getMimeType(
        requestedName || objectKey,
        downloadResponse.headers.get("Content-Type")
      );
      headers.set("Content-Type", mimeType);

      const contentLength = downloadResponse.headers.get("Content-Length");
      if (contentLength) {
        headers.set("Content-Length", contentLength);
      }

      const contentRange = downloadResponse.headers.get("Content-Range");
      if (contentRange) {
        headers.set("Content-Range", contentRange);
      }

      headers.set("Accept-Ranges", "bytes");

      // Cache at edge for 24h, allow stale-while-revalidate
      headers.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
      );

      const disposition = createContentDisposition(requestedName, isDownload);
      if (disposition) {
        headers.set("Content-Disposition", disposition);
      }

      // If full 200 response (not a range slice), cache in caches.default
      if (downloadResponse.status === 200) {
        const cachePutKey = new Request(canonicalUrl, {
          method: "GET",
        });

        const responseToCache = new Response(downloadResponse.body, {
          status: 200,
          headers: new Headers(headers),
        });

        if (ctx && typeof ctx.waitUntil === "function") {
          ctx.waitUntil(cache.put(cachePutKey, responseToCache.clone()));
        } else {
          await cache.put(cachePutKey, responseToCache.clone());
        }

        return new Response(request.method === "HEAD" ? null : responseToCache.body, {
          status: 200,
          headers,
        });
      }

      return new Response(request.method === "HEAD" ? null : downloadResponse.body, {
        status: downloadResponse.status,
        headers,
      });
    } catch (error) {
      console.error("Worker error:", error);
      return createCorsResponse("Worker failed.", 500);
    }
  },
};

// ------------------------------------------------------------
// Helper: Authenticate with B2 and cache token for 20 hours
// ------------------------------------------------------------
async function getB2Auth(env) {
  const now = Date.now();
  if (
    cachedB2Auth.token &&
    cachedB2Auth.downloadUrl &&
    cachedB2Auth.expiresAt > now
  ) {
    return cachedB2Auth;
  }

  const basicAuth = btoa(
    `${env.B2_APPLICATION_KEY_ID}:${env.B2_APPLICATION_KEY}`
  );

  const authResponse = await fetch(
    "https://api.backblazeb2.com/b2api/v4/b2_authorize_account",
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    }
  );

  if (!authResponse.ok) {
    throw new Error(
      `B2 auth failed (${authResponse.status}): ${await authResponse.text()}`
    );
  }

  const auth = await authResponse.json();
  const downloadUrl = auth.apiInfo?.storageApi?.downloadUrl;
  const token = auth.authorizationToken;

  if (!downloadUrl || !token) {
    throw new Error("Invalid B2 authorization payload");
  }

  cachedB2Auth = {
    token,
    downloadUrl,
    expiresAt: now + 20 * 60 * 60 * 1000, // 20 hours
  };

  return cachedB2Auth;
}

// ------------------------------------------------------------
// Helper: Detect Content-Type from extension or fallback
// ------------------------------------------------------------
function getMimeType(filenameOrKey, b2ContentType) {
  if (filenameOrKey) {
    const dotIndex = filenameOrKey.lastIndexOf(".");
    if (dotIndex !== -1) {
      const ext = filenameOrKey.slice(dotIndex).toLowerCase();
      if (MIME_TYPES[ext]) {
        return MIME_TYPES[ext];
      }
    }
  }

  if (
    b2ContentType &&
    b2ContentType !== "application/octet-stream" &&
    b2ContentType !== "binary/octet-stream"
  ) {
    return b2ContentType;
  }

  return "application/octet-stream";
}

// ------------------------------------------------------------
// Helper: Apply CORS headers to a Headers instance
// ------------------------------------------------------------
function applyCors(headers) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
}

// ------------------------------------------------------------
// Helper: Create CORS-enabled text/plain response
// ------------------------------------------------------------
function createCorsResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers(CORS_HEADERS);
  for (const [k, v] of Object.entries(extraHeaders)) {
    headers.set(k, v);
  }
  return new Response(body, { status, headers });
}

// ------------------------------------------------------------
// Helper: Create CORS-enabled JSON response
// ------------------------------------------------------------
function createCorsJsonResponse(data, status = 200) {
  const headers = new Headers(CORS_HEADERS);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), { status, headers });
}

// ------------------------------------------------------------
// Helper: Convert hex HMAC signature -> Uint8Array
// ------------------------------------------------------------
function hexToBytes(hex) {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ------------------------------------------------------------
// Helper: Content-Disposition (inline vs attachment)
// ------------------------------------------------------------
function createContentDisposition(rawFilename, isAttachment = false) {
  if (!rawFilename) return null;

  const clean = rawFilename.replace(/[\r\n\x00-\x1f\x7f]/g, "").trim();
  if (!clean) return null;

  const asciiName = clean
    .replace(/["\\]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_");

  const utf8Name = encodeURIComponent(clean).replace(
    /['()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

  const type = isAttachment ? "attachment" : "inline";
  return `${type}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`;
}

// ------------------------------------------------------------
// Helper: Purge canonical cache entry
// ------------------------------------------------------------
async function purgeFileCache(
  origin,
  pathname,
  purgeThumbnail = false,
  version = null
) {
  const cache = caches.default;
  const purged = [];

  const fileUrls = version
    ? [`${origin}${pathname}?v=${version}`, `${origin}${pathname}`]
    : [
        `${origin}${pathname}`,
        `${origin}${pathname}?v=1`,
        `${origin}${pathname}?v=2`,
        `${origin}${pathname}?v=3`,
      ];

  for (const fileCanonicalUrl of fileUrls) {
    const fileRequest = new Request(fileCanonicalUrl, { method: "GET" });
    const fileDeleted = await cache.delete(fileRequest);
    if (fileDeleted) {
      purged.push(fileCanonicalUrl);
    }
  }

  if (
    purgeThumbnail &&
    pathname.startsWith("/files/") &&
    !pathname.startsWith("/files/thumbnails/")
  ) {
    const rawFileName = pathname.slice("/files/".length);
    const fileId = rawFileName.replace(/\.[^/.]+$/, "");
    const thumbUrls = version
      ? [
          `${origin}/files/thumbnails/${fileId}.webp?v=${version}`,
          `${origin}/files/thumbnails/${fileId}.webp`,
        ]
      : [
          `${origin}/files/thumbnails/${fileId}.webp`,
          `${origin}/files/thumbnails/${fileId}.webp?v=1`,
          `${origin}/files/thumbnails/${fileId}.webp?v=2`,
          `${origin}/files/thumbnails/${fileId}.webp?v=3`,
        ];

    for (const thumbCanonicalUrl of thumbUrls) {
      const thumbRequest = new Request(thumbCanonicalUrl, { method: "GET" });
      const thumbDeleted = await cache.delete(thumbRequest);
      if (thumbDeleted) {
        purged.push(thumbCanonicalUrl);
      }
    }
  }

  return {
    success: true,
    purged,
  };
}
