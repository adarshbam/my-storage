import { sanitize } from "../utils/sanitize.js";
import { getSystemConfigHelper } from "../services/systemConfig.service.js";
import Directory from "../models/directoryModel.js";

/**
 * Enforces per-file size limit and user storage quota.
 *
 * Works for both upload flows:
 *  - Vault initiate (JSON body with `size`) → checks declared size
 *  - Direct upload  (binary stream)         → consumes stream, checks actual bytes,
 *                                             attaches req.fileBuffer & req.actualFileSize
 */
export const enforceUploadLimit = async (req, res, next) => {
  try {
    const systemConfig = await getSystemConfigHelper();
    const maxFileSize = systemConfig?.maxFileSizeLimit || 500 * 1024 * 1024;
    const planLimit = req.planContext?.rules?.limits?.maxUploadFileSize;
    const planMaxFileSize =
      planLimit && planLimit > 0 ? planLimit : maxFileSize;

    const effectiveLimit = Math.min(maxFileSize, planMaxFileSize);

    // ── Get user's current storage usage ──
    const rootDir = await Directory.findOne({ _id: req.user.rootDirId })
      .select("size")
      .lean();
    const usedStorage = rootDir ? rootDir.size : 0;
    const planStorageLimit = req.planContext?.rules?.limits?.storageLimit;
    const maxStorage =
      planStorageLimit && planStorageLimit > 0
        ? planStorageLimit
        : req.user?.maxStorage || 5 * 1024 * 1024 * 1024;

    // ── Detect request type ──
    // Vault initiate sends JSON body with a numeric `size` field
    // Direct upload sends a binary stream (or JSON with `content` for text files)
    const isVaultInitiate = req.body && typeof req.body.size === "number";

    if (isVaultInitiate) {
      const declaredSize = req.body.size;

      if (declaredSize > effectiveLimit) {
        return res
          .status(400)
          .json({ error: "File exceeds maximum allowed size" });
      }

      if (usedStorage + declaredSize > maxStorage) {
        return res.status(400).json({ error: "Not enough storage left" });
      }

      return next();
    }

    // ── Direct upload flow — file passes through the server ──

    // Quick pre-check with header (fast reject only, never trusted for acceptance)
    const headerSize = parseInt(sanitize(req.headers.filesize), 10) || 0;
    if (headerSize > effectiveLimit) {
      req.destroy();
      return;
    }

    // Consume the request body into a buffer
    let buffer;
    if (req.body && req.body.content !== undefined) {
      // "Create file" flow — small text file sent as JSON { content: "..." }
      buffer = Buffer.from(req.body.content, "utf-8");
    } else {
      // Binary stream — read chunks and enforce size limit while streaming
      const chunks = [];
      let receivedBytes = 0;

      for await (const chunk of req) {
        receivedBytes += chunk.length;
        if (receivedBytes > effectiveLimit) {
          req.destroy();
          if (!res.headersSent) {
            return res
              .status(400)
              .json({ error: "File exceeds maximum allowed size" });
          }
          return;
        }
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    }

    const actualSize = buffer.length;

    // Authoritative size check (actual bytes, not headers)
    if (actualSize > effectiveLimit) {
      return res
        .status(400)
        .json({ error: "File exceeds maximum allowed size" });
    }

    if (usedStorage + actualSize > maxStorage) {
      return res.status(400).json({ error: "Not enough storage left" });
    }

    // Attach verified buffer for downstream controller
    req.fileBuffer = buffer;
    req.actualFileSize = actualSize;
    next();
  } catch (err) {
    console.error("enforceUploadLimit error:", err);
    if (!res.headersSent) {
      return res.status(500).send("Internal Server Error");
    }
  }
};
