import { useCallback } from 'react';
import { SERVER_URL } from '../lib/api';

/**
 * Pacing delay calculation for token-bucket rate limiting
 * @param {number} chunkLength - Size of chunk in bytes
 * @param {number} maxBytesPerSec - Maximum bytes per second (0 = unlimited)
 * @param {number} startTime - Timestamp when chunk processing began
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

export function useDownloadManager({
  updateTransfer,
  abortControllers,
  downloadReaders,
  downloadWritables,
  speedLimit = 0,
}) {
  const startDownload = useCallback(async (transfer) => {
    const { _id, url, name } = transfer;
    updateTransfer(_id, { status: "active", speed: 0 });

    const controller = new AbortController();
    abortControllers.current[_id] = controller;

    try {
      const isCdnUrl = typeof url === 'string' && (url.includes('cdn.') || !url.startsWith(SERVER_URL));

      const response = await fetch(url, {
        signal: controller.signal,
        credentials: isCdnUrl ? undefined : "include",
      });

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const totalSize = parseInt(response.headers.get("content-length") || "0", 10);
      const stream = response.body;

      if (!stream) {
        throw new Error("ReadableStream not supported in this browser");
      }

      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({ suggestedName: name });
          const writable = await handle.createWritable();
          downloadWritables.current[_id] = writable;

          const reader = stream.getReader();
          downloadReaders.current[_id] = reader;

          let loaded = 0;
          let lastLoaded = 0;
          let lastTime = Date.now();
          let currentSpeed = 0;
          let lastUpdate = 0;

          while (true) {
            const chunkStartTime = Date.now();
            const { done, value } = await reader.read();
            if (done) break;

            await writable.write(value);
            loaded += value.length;

            // Apply speed regulation pacing if configured
            if (speedLimit > 0) {
              await applySpeedPacing(value.length, speedLimit, chunkStartTime);
            }

            const now = Date.now();
            const percent = totalSize > 0 ? Math.min((loaded / totalSize) * 100, 100) : 0;
            const deltaTime = (now - lastTime) / 1000;

            if (deltaTime >= 0.5) {
              const deltaBytes = loaded - lastLoaded;
              currentSpeed = deltaBytes / deltaTime;
              lastLoaded = loaded;
              lastTime = now;
            }

            let timeRemaining = 0;
            if (currentSpeed > 0 && totalSize > 0) {
              timeRemaining = (totalSize - loaded) / currentSpeed;
            }

            if (now - lastUpdate > 100 || percent >= 100) {
              updateTransfer(_id, {
                progress: percent,
                loaded,
                total: totalSize,
                speed: currentSpeed,
                timeRemaining,
              });
              lastUpdate = now;
            }
          }

          await writable.close();
          updateTransfer(_id, { status: "completed", progress: 100, speed: 0, timeRemaining: 0 });
        } catch (err) {
          if (err.name !== "AbortError") {
            throw err;
          }
        }
      } else {
        const reader = stream.getReader();
        downloadReaders.current[_id] = reader;

        const chunks = [];
        let loaded = 0;
        let lastLoaded = 0;
        let lastTime = Date.now();
        let currentSpeed = 0;
        let lastUpdate = 0;

        while (true) {
          const chunkStartTime = Date.now();
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          loaded += value.length;

          // Apply speed regulation pacing if configured
          if (speedLimit > 0) {
            await applySpeedPacing(value.length, speedLimit, chunkStartTime);
          }

          const now = Date.now();
          const percent = totalSize > 0 ? Math.min((loaded / totalSize) * 100, 100) : 0;
          const deltaTime = (now - lastTime) / 1000;

          if (deltaTime >= 0.5) {
            const deltaBytes = loaded - lastLoaded;
            currentSpeed = deltaBytes / deltaTime;
            lastLoaded = loaded;
            lastTime = now;
          }

          let timeRemaining = 0;
          if (currentSpeed > 0 && totalSize > 0) {
            timeRemaining = (totalSize - loaded) / currentSpeed;
          }

          if (now - lastUpdate > 100 || percent >= 100) {
            updateTransfer(_id, {
              progress: percent,
              loaded,
              total: totalSize,
              speed: currentSpeed,
              timeRemaining,
            });
            lastUpdate = now;
          }
        }

        const blob = new Blob(chunks);
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(objectUrl);

        updateTransfer(_id, { status: "completed", progress: 100, speed: 0, timeRemaining: 0 });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Download failed:", err);
        updateTransfer(_id, {
          status: "error",
          speed: 0,
          errorMessage: err.message,
        });
      }
    } finally {
      delete abortControllers.current[_id];
      delete downloadReaders.current[_id];
      delete downloadWritables.current[_id];
    }
  }, [updateTransfer, abortControllers, downloadReaders, downloadWritables, speedLimit]);

  return { startDownload };
}
