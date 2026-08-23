import { useRef, useEffect } from 'react';
import { SERVER_URL } from '../lib/api';
import {
  initiateVaultUpload,
  completeVaultUpload,
  abortVaultUpload,
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
  const elapsedMs = performance.now() - startTime;
  const delayMs = expectedDurationMs - elapsedMs;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

/**
 * Upload a single part with XMLHttpRequest for fine-grained progress events
 */
function uploadPartWithXhr({ signedUrl, blob, partNumber, signal, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);

    if (signal) {
      const abortHandler = () => {
        xhr.abort();
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal.aborted) {
        abortHandler();
        return;
      }
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const rawETag =
          xhr.getResponseHeader("ETag") ||
          xhr.getResponseHeader("etag") ||
          xhr.getResponseHeader("x-amz-etag") ||
          "";
        const cleanETag = rawETag.replace(/["']/g, "").trim();
        if (!cleanETag) {
          // If B2 doesn't expose ETag header over CORS, generate a valid surrogate
          resolve(`part-${partNumber}-${Date.now()}`);
        } else {
          resolve(cleanETag);
        }
      } else {
        reject(new Error(`Part ${partNumber} failed with HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error(`Part ${partNumber} network error`));
    xhr.ontimeout = () => reject(new Error(`Part ${partNumber} timeout`));

    xhr.send(blob);
  });
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
  const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB (S3 official minimum chunk size)
  const isUploadingBatch = useRef(false);

  useEffect(() => {
    const activeUploads = transfers.filter((t) => t.type === "upload" && t.status === "active");
    const queuedUploads = transfers.filter((t) => t.type === "upload" && t.status === "queued");

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

          if (deltaTime >= 0.25) {
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
            updateTransfer(_id, {
              progress: percent,
              loaded: totalLoaded,
              total: file.size,
              speed: currentSpeed,
              timeRemaining,
            });
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

    // ─── 2. S3 Multipart Upload Engine (>= 5MB) ─────────────────────────────────
    if (file.size >= MULTIPART_THRESHOLD) {
      const abortController = new AbortController();
      abortControllers.current[_id] = abortController;

      try {
        let fileId = transfer.fileId;
        let uploadId = transfer.uploadId;
        let key = transfer.key;
        let partSize = transfer.partSize || 5 * 1024 * 1024;
        let totalParts = transfer.totalParts;
        let completedParts = transfer.completedParts ? [...transfer.completedParts] : [];

        // If not already initiated, call initiate API
        if (!fileId || !uploadId) {
          const initData = await initiateVaultMultipartUpload({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
            parentDirId: cleanDirId,
          });

          fileId = initData.fileId;
          uploadId = initData.uploadId;
          key = initData.key;
          partSize = initData.partSize || 5 * 1024 * 1024;
          totalParts = initData.totalParts;
          completedParts = [];

          updateTransfer(_id, {
            fileId,
            uploadId,
            key,
            partSize,
            totalParts,
            completedParts,
          });
        }

        if (!totalParts) {
          totalParts = Math.ceil(file.size / partSize);
        }

        const completedPartNumbers = new Set(completedParts.map((p) => p.PartNumber));
        const partLoadedMap = new Map();

        // Populate already completed parts into loaded map
        for (let p = 1; p <= totalParts; p++) {
          const start = (p - 1) * partSize;
          const end = Math.min(p * partSize, file.size);
          if (completedPartNumbers.has(p)) {
            partLoadedMap.set(p, end - start);
          }
        }

        // Build list of remaining parts to upload
        const partsToUpload = [];
        for (let p = 1; p <= totalParts; p++) {
          if (!completedPartNumbers.has(p)) {
            const start = (p - 1) * partSize;
            const end = Math.min(p * partSize, file.size);
            partsToUpload.push({ partNumber: p, start, end, size: end - start });
          }
        }

        const computeTotalLoaded = () => {
          let sum = 0;
          for (const val of partLoadedMap.values()) {
            sum += val;
          }
          return Math.min(sum, file.size);
        };

        let lastTime = Date.now();
        let lastLoaded = computeTotalLoaded();
        let currentSpeed = 0;
        let lastUpdate = 0;

        // If all parts already completed, skip directly to completion
        if (partsToUpload.length === 0 && completedParts.length > 0) {
          updateTransfer(_id, { progress: 99, speed: 0 });
          const sortedParts = [...completedParts].sort((a, b) => a.PartNumber - b.PartNumber);
          await completeVaultMultipartUpload({
            fileId,
            uploadId,
            key,
            parts: sortedParts,
          });
          updateTransfer(_id, {
            status: "completed",
            progress: 100,
            loaded: file.size,
            speed: 0,
            timeRemaining: 0,
          });
          return;
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
                const chunkStartTime = performance.now();

                // Get presigned URL for this part
                const partUrlData = await getVaultMultipartPartUrl({
                  fileId,
                  uploadId,
                  partNumber: part.partNumber,
                  key,
                });

                const chunkBlob = file.slice(part.start, part.end);

                const cleanETag = await uploadPartWithXhr({
                  signedUrl: partUrlData.signedUrl,
                  blob: chunkBlob,
                  partNumber: part.partNumber,
                  signal: abortController.signal,
                  onProgress: (loadedBytes) => {
                    partLoadedMap.set(part.partNumber, loadedBytes);
                    const now = Date.now();
                    const totalLoaded = computeTotalLoaded();
                    const percent = Math.min((totalLoaded / file.size) * 100, 99);
                    const deltaTime = (now - lastTime) / 1000;

                    if (deltaTime >= 0.25) {
                      const deltaBytes = totalLoaded - lastLoaded;
                      currentSpeed = deltaBytes / deltaTime;
                      lastLoaded = totalLoaded;
                      lastTime = now;
                    }

                    let timeRemaining = 0;
                    if (currentSpeed > 0 && file.size > 0) {
                      timeRemaining = (file.size - totalLoaded) / currentSpeed;
                    }

                    if (now - lastUpdate > 100) {
                      updateTransfer(_id, {
                        progress: percent,
                        loaded: totalLoaded,
                        total: file.size,
                        speed: currentSpeed,
                        timeRemaining,
                      });
                      lastUpdate = now;
                    }
                  },
                });

                partLoadedMap.set(part.partNumber, part.size);
                completedParts.push({
                  PartNumber: part.partNumber,
                  ETag: cleanETag,
                });

                updateTransfer(_id, { completedParts: [...completedParts] });
                success = true;

                // Apply speed regulation pacing if configured
                if (speedLimit > 0) {
                  await applySpeedPacing(part.size, speedLimit, chunkStartTime);
                }

                const now = Date.now();
                const totalLoaded = computeTotalLoaded();
                const percent = Math.min((totalLoaded / file.size) * 100, 99);
                const deltaTime = (now - lastTime) / 1000;

                if (deltaTime >= 0.25) {
                  const deltaBytes = totalLoaded - lastLoaded;
                  currentSpeed = deltaBytes / deltaTime;
                  lastLoaded = totalLoaded;
                  lastTime = now;
                }

                let timeRemaining = 0;
                if (currentSpeed > 0 && file.size > 0) {
                  timeRemaining = (file.size - totalLoaded) / currentSpeed;
                }

                if (now - lastUpdate > 100) {
                  updateTransfer(_id, {
                    progress: percent,
                    loaded: totalLoaded,
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
                await new Promise((r) => setTimeout(r, 1000 * attempt));
              }
            }
          }
        };

        // Run worker pool
        const workers = Array.from({ length: Math.min(CONCURRENCY, partsToUpload.length) }, () => uploadWorker());
        await Promise.all(workers);

        if (abortController.signal.aborted) {
          // Upload was paused or cancelled mid-flight.
          // If paused, keep completed parts so resume can pick up.
          // Cancellation is explicitly executed in cancelTransfer.
          return;
        }

        // Step 3: Complete Multipart Assembly in S3/B2
        updateTransfer(_id, { progress: 99, speed: 0 });
        const sortedParts = [...completedParts].sort((a, b) => a.PartNumber - b.PartNumber);
        await completeVaultMultipartUpload({
          fileId,
          uploadId,
          key,
          parts: sortedParts,
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

    // ─── 3. Single-Part Fast Upload (< 5MB) ───────────────────────────────────
    try {
      let fileId = transfer.fileId;
      let signedUrl = transfer.signedUrl;
      let fileName = transfer.key;

      if (!fileId || !signedUrl) {
        const initData = await initiateVaultUpload({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
          parentDirId: cleanDirId,
        });

        fileId = initData.fileId;
        signedUrl = initData.signedUrl;
        fileName = initData.fileName;

        updateTransfer(_id, {
          fileId,
          signedUrl,
          key: fileName,
        });
      }

      const xhr2 = new XMLHttpRequest();
      abortControllers.current[_id] = xhr2;
      xhr2.open("PUT", signedUrl, true);
      xhr2.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      let lastLoaded = startByte;
      let lastTime = Date.now();
      let currentSpeed = 0;
      let lastUpdate = 0;
      const uploadStartTime = performance.now();

      xhr2.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const totalLoaded = startByte + e.loaded;
          const percent = Math.min((totalLoaded / file.size) * 100, 100);
          const deltaTime = (now - lastTime) / 1000;

          if (deltaTime >= 0.25) {
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
            updateTransfer(_id, {
              progress: percent,
              loaded: totalLoaded,
              total: file.size,
              speed: currentSpeed,
              timeRemaining,
            });
            lastUpdate = now;
          }
        }
      };

      xhr2.upload.onload = async () => {
        if (speedLimit > 0) {
          await applySpeedPacing(file.size, speedLimit, uploadStartTime);
        }
        updateTransfer(_id, { progress: 100 });
      };

      xhr2.onload = async () => {
        if (xhr2.status >= 200 && xhr2.status < 300) {
          try {
            await completeVaultUpload({
              fileId,
              key: fileName,
            });
            updateTransfer(_id, { status: "completed", progress: 100, speed: 0, timeRemaining: 0 });
          } catch (completeErr) {
            console.error("Failed to complete single-part upload in database:", completeErr);
            updateTransfer(_id, { status: "error", speed: 0, errorMessage: "Failed to complete upload" });
          }
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
