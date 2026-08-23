import { useRef, useEffect } from 'react';
import { SERVER_URL } from '../lib/api';
import {
  initiateVaultMultipartUpload,
  getVaultMultipartPartUrl,
  completeVaultMultipartUpload,
  abortVaultMultipartUpload,
} from '../api/files.api';

/**
 * Pacing delay calculation for token-bucket rate limiting
 */
async function applySpeedPacing(chunkLength, maxBytesPerSec, startTime) {
  if (!maxBytesPerSec || maxBytesPerSec <= 0) return;
  const expectedDurationMs = (chunkLength / maxBytesPerSec) * 1000;
  const elapsedMs = Date.now() - startTime;
  if (elapsedMs < expectedDurationMs) {
    const delayMs = expectedDurationMs - elapsedMs;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export function useUploadManager({
  transfers,
  setTransfers,
  updateTransfer,
  ownerId,
  abortControllers,
  onUploadComplete,
  speedLimit = 0,
}) {
  const MAX_CONCURRENT_UPLOADS = 3;
  const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB
  const isUploadingBatch = useRef(false);

  useEffect(() => {
    const activeUploads = transfers.filter(t => t.type === "upload" && t.status === "active");
    const queuedUploads = transfers.filter(t => t.type === "upload" && t.status === "queued");

    if (activeUploads.length < MAX_CONCURRENT_UPLOADS && queuedUploads.length > 0) {
      const nextUpload = queuedUploads[0];
      startUpload(nextUpload);
    }

    const hasActiveOrQueued = activeUploads.length > 0 || queuedUploads.length > 0;

    if (hasActiveOrQueued) {
      isUploadingBatch.current = true;
    } else if (isUploadingBatch.current) {
      isUploadingBatch.current = false;
      if (onUploadComplete) {
        onUploadComplete();
      }
    }
  }, [transfers, onUploadComplete]);

  const startUpload = async (transfer) => {
    const { _id, file, dirId, loaded: startByte = 0 } = transfer;

    updateTransfer(_id, { status: "active", speed: 0 });

    const isGithub = dirId && typeof dirId === "string" && dirId.startsWith("github:");
    const isDrive = dirId && typeof dirId === "string" && dirId.startsWith("drive:");
    const cleanDirId = isGithub || isDrive ? dirId.split(":")[1] : dirId;

    // ─── 1. External Providers (GitHub / Google Drive) ───────────────────────────
    if (isGithub || isDrive) {
      const xhr = new XMLHttpRequest();
      abortControllers.current[_id] = xhr;

      let uploadUrl = isGithub
        ? `${SERVER_URL}/github/file/${cleanDirId}`
        : `${SERVER_URL}/drive/file/${cleanDirId || "root"}/upload`;

      if (ownerId) {
        const separator = uploadUrl.includes("?") ? "&" : "?";
        uploadUrl = `${uploadUrl}${separator}ownerId=${ownerId}`;
      }

      xhr.open("POST", uploadUrl, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("filename", file.name);
      xhr.setRequestHeader("filesize", file.size);
      xhr.setRequestHeader("x-file-id", _id);
      xhr.setRequestHeader("x-start-byte", startByte.toString());

      let lastLoaded = startByte;
      let lastTime = Date.now();
      let currentSpeed = 0;
      let lastUpdate = 0;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const totalLoaded = startByte + e.loaded;
          const percent = Math.min((totalLoaded / file.size) * 100, 100);
          const deltaTime = (now - lastTime) / 1000;

          if (deltaTime >= 0.5) {
            const deltaBytes = totalLoaded - lastLoaded;
            currentSpeed = deltaBytes / deltaTime;
            lastLoaded = totalLoaded;
            lastTime = now;
          }

          let timeRemaining = 0;
          if (currentSpeed > 0 && file.size > 0) {
            timeRemaining = (file.size - totalLoaded) / currentSpeed;
          }

          if (now - lastUpdate > 100 || percent >= 100) {
            updateTransfer(_id, { progress: percent, loaded: totalLoaded, total: file.size, speed: currentSpeed, timeRemaining });
            lastUpdate = now;
          }
        }
      };

      xhr.upload.onload = () => updateTransfer(_id, { progress: 100 });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateTransfer(_id, { status: "completed", progress: 100, speed: 0, timeRemaining: 0 });
        } else {
          let errMsg = "Error";
          try {
            const resObj = JSON.parse(xhr.responseText);
            errMsg = resObj.error || resObj.message || "Error";
          } catch (e) {
            if (xhr.responseText) errMsg = xhr.responseText;
          }
          updateTransfer(_id, { status: "error", speed: 0, errorMessage: errMsg });
        }
        delete abortControllers.current[_id];
      };

      xhr.onerror = () => {
        updateTransfer(_id, { status: "error", speed: 0 });
        delete abortControllers.current[_id];
      };

      if (startByte > 0) xhr.send(file.slice(startByte));
      else xhr.send(file);
      return;
    }

    // ─── 2. Large File S3 Multipart Upload Engine (>= 50MB) ─────────────────────
    if (file.size >= MULTIPART_THRESHOLD) {
      const abortController = new AbortController();
      abortControllers.current[_id] = abortController;

      try {
        // Step 1: Initiate Multipart in backend / S3
        const initData = await initiateVaultMultipartUpload({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
          parentDirId: cleanDirId,
        });

        const { fileId, uploadId, key, partSize, totalParts } = initData;
        const completedParts = [];
        let totalUploadedBytes = 0;
        let lastLoaded = 0;
        let lastTime = Date.now();
        let currentSpeed = 0;
        let lastUpdate = 0;

        // Build list of part indices (1-indexed)
        const partsToUpload = [];
        for (let p = 1; p <= totalParts; p++) {
          const start = (p - 1) * partSize;
          const end = Math.min(p * partSize, file.size);
          partsToUpload.push({ partNumber: p, start, end, size: end - start });
        }

        // Parallel chunk worker queue (concurrency 4 if unlimited, 1 if speed-limited)
        const CONCURRENCY = speedLimit > 0 ? 1 : 4;
        let currentIndex = 0;

        const uploadWorker = async () => {
          while (currentIndex < partsToUpload.length) {
            if (abortController.signal.aborted) break;

            const part = partsToUpload[currentIndex++];
            if (!part) break;

            let attempt = 0;
            let success = false;
            const maxAttempts = 3;

            while (attempt < maxAttempts && !success && !abortController.signal.aborted) {
              attempt++;
              try {
                const chunkStartTime = Date.now();

                // Get presigned URL for this specific part
                const partUrlData = await getVaultMultipartPartUrl({
                  fileId,
                  uploadId,
                  partNumber: part.partNumber,
                  key,
                });

                const chunkBlob = file.slice(part.start, part.end);

                const putRes = await fetch(partUrlData.signedUrl, {
                  method: "PUT",
                  body: chunkBlob,
                  signal: abortController.signal,
                });

                if (!putRes.ok) {
                  throw new Error(`Part ${part.partNumber} PUT returned HTTP ${putRes.status}`);
                }

                // Extract ETag from response header
                const rawETag = putRes.headers.get("ETag") || putRes.headers.get("etag") || "";
                const cleanETag = rawETag.replace(/["']/g, "").trim();

                if (!cleanETag) {
                  throw new Error(`Part ${part.partNumber} missing ETag header`);
                }

                completedParts.push({
                  PartNumber: part.partNumber,
                  ETag: cleanETag,
                });

                totalUploadedBytes += part.size;
                success = true;

                // Apply speed regulation pacing if configured
                if (speedLimit > 0) {
                  await applySpeedPacing(part.size, speedLimit, chunkStartTime);
                }

                const now = Date.now();
                const percent = Math.min((totalUploadedBytes / file.size) * 100, 100);
                const deltaTime = (now - lastTime) / 1000;

                if (deltaTime >= 0.5) {
                  const deltaBytes = totalUploadedBytes - lastLoaded;
                  currentSpeed = deltaBytes / deltaTime;
                  lastLoaded = totalUploadedBytes;
                  lastTime = now;
                }

                let timeRemaining = 0;
                if (currentSpeed > 0 && file.size > 0) {
                  timeRemaining = (file.size - totalUploadedBytes) / currentSpeed;
                }

                if (now - lastUpdate > 100 || percent >= 100) {
                  updateTransfer(_id, {
                    progress: percent,
                    loaded: totalUploadedBytes,
                    total: file.size,
                    speed: currentSpeed,
                    timeRemaining,
                  });
                  lastUpdate = now;
                }
              } catch (partErr) {
                if (abortController.signal.aborted) return;
                console.warn(`Retry attempt ${attempt} for part ${part.partNumber}:`, partErr.message);
                if (attempt >= maxAttempts) {
                  throw partErr;
                }
                // Exponential backoff wait before retrying part
                await new Promise((r) => setTimeout(r, 1000 * attempt));
              }
            }
          }
        };

        // Run worker pool
        const workers = Array.from({ length: Math.min(CONCURRENCY, partsToUpload.length) }, () => uploadWorker());
        await Promise.all(workers);

        if (abortController.signal.aborted) {
          await abortVaultMultipartUpload({ fileId, uploadId, key }).catch(() => {});
          return;
        }

        // Step 3: Complete Multipart Assembly in S3/B2
        updateTransfer(_id, { progress: 99, speed: 0 });
        await completeVaultMultipartUpload({
          fileId,
          uploadId,
          key,
          parts: completedParts,
        });

        updateTransfer(_id, {
          status: "completed",
          progress: 100,
          loaded: file.size,
          speed: 0,
          timeRemaining: 0,
        });
      } catch (mpErr) {
        if (abortController.signal.aborted) return;
        console.error("Multipart upload failed:", mpErr);
        updateTransfer(_id, {
          status: "error",
          speed: 0,
          errorMessage: mpErr.message || "Multipart upload failed",
        });
      } finally {
        delete abortControllers.current[_id];
      }
      return;
    }

    // ─── 3. Single-Part Fast Upload (< 50MB) ──────────────────────────────────
    try {
      const initRes = await fetch(`${SERVER_URL}/file/upload-vault/initiate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
          parentDirId: cleanDirId,
        }),
      });

      if (!initRes.ok) throw new Error("Failed to initiate upload");
      const { signedUrl } = await initRes.json();

      const xhr2 = new XMLHttpRequest();
      abortControllers.current[_id] = xhr2;
      xhr2.open("PUT", signedUrl, true);
      xhr2.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      let lastLoaded = startByte;
      let lastTime = Date.now();
      let currentSpeed = 0;
      let lastUpdate = 0;

      xhr2.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const totalLoaded = startByte + e.loaded;
          const percent = Math.min((totalLoaded / file.size) * 100, 100);
          const deltaTime = (now - lastTime) / 1000;

          if (deltaTime >= 0.5) {
            const deltaBytes = totalLoaded - lastLoaded;
            currentSpeed = deltaBytes / deltaTime;
            lastLoaded = totalLoaded;
            lastTime = now;
          }

          let timeRemaining = 0;
          if (currentSpeed > 0 && file.size > 0) {
            timeRemaining = (file.size - totalLoaded) / currentSpeed;
          }

          if (now - lastUpdate > 100 || percent >= 100) {
            updateTransfer(_id, { progress: percent, loaded: totalLoaded, total: file.size, speed: currentSpeed, timeRemaining });
            lastUpdate = now;
          }
        }
      };

      xhr2.upload.onload = () => updateTransfer(_id, { progress: 100 });
      xhr2.onload = () => {
        if (xhr2.status >= 200 && xhr2.status < 300) {
          updateTransfer(_id, { status: "completed", progress: 100, speed: 0, timeRemaining: 0 });
        } else {
          updateTransfer(_id, { status: "error", speed: 0, errorMessage: "S3 upload failed" });
        }
        delete abortControllers.current[_id];
      };

      xhr2.onerror = () => {
        updateTransfer(_id, { status: "error", speed: 0 });
        delete abortControllers.current[_id];
      };

      xhr2.send(startByte > 0 ? file.slice(startByte) : file);
    } catch (err) {
      console.error("Initiation error:", err);
      updateTransfer(_id, { status: "error", errorMessage: err.message });
      delete abortControllers.current[_id];
    }
  };

  return { startUpload };
}
