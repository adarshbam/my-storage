import { useCallback } from 'react';
import { SERVER_URL } from '../lib/api';
import { applyDynamicSpeedPacing } from './useSpeedGovernor';

export function useDownloadManager({
  updateTransfer,
  abortControllers,
  downloadReaders,
  downloadWritables,
}) {
  const startDownload = useCallback(async (transfer) => {
    const { _id, url, name, fetchOptions } = transfer;
    updateTransfer(_id, { status: "active", speed: 0 });

    const controller = new AbortController();
    abortControllers.current[_id] = controller;

    try {
      const isCdnUrl = typeof url === 'string' && (url.includes('cdn.') || !url.startsWith(SERVER_URL));

      const response = await fetch(url, {
        ...(fetchOptions || {}),
        signal: controller.signal,
        credentials: isCdnUrl ? undefined : "include",
      });

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const totalSize = parseInt(
        response.headers.get("x-total-size") ||
        response.headers.get("content-length") ||
        "0",
        10
      );
      const stream = response.body;

      if (!stream) {
        throw new Error("ReadableStream not supported in this browser");
      }

      let savedViaPicker = false;
      if (window.showSaveFilePicker) {
        let writable = null;
        try {
          const handle = await window.showSaveFilePicker({ suggestedName: name });
          writable = await handle.createWritable();
          downloadWritables.current[_id] = writable;
          savedViaPicker = true;

          const reader = stream.getReader();
          downloadReaders.current[_id] = reader;

          let loaded = 0;
          let lastLoaded = 0;
          let lastTime = Date.now();
          let currentSpeed = 0;
          let lastUpdate = 0;

          while (true) {
            const chunkStartTime = performance.now();
            const { done, value } = await reader.read();
            if (done) break;

            await writable.write(value);
            loaded += value.length;

            // Apply dynamic, interruptible speed regulation pacing
            await applyDynamicSpeedPacing(value.length, chunkStartTime, controller.signal);

            const now = Date.now();
            const percent = totalSize > 0 ? Math.min((loaded / totalSize) * 100, 100) : 0;
            const deltaTime = (now - lastTime) / 1000;

            if (deltaTime >= 0.5) {
              const deltaBytes = loaded - lastLoaded;
              currentSpeed = deltaBytes / deltaTime;
              lastLoaded = loaded;
              lastTime = now;
            }

            let timeRemaining = null;
            if (currentSpeed > 0 && totalSize > 0 && loaded < totalSize) {
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

          if (loaded === 0) {
            await writable.abort().catch(() => {});
            throw new Error("Downloaded file was empty");
          }

          await writable.close();
          updateTransfer(_id, { status: "completed", progress: 100, speed: 0, timeRemaining: 0 });
        } catch (err) {
          if (!writable && (err.name === "SecurityError" || err.name === "NotAllowedError")) {
            savedViaPicker = false;
          } else if (err.name === "AbortError") {
            if (!writable) {
              controller.abort();
              updateTransfer(_id, { status: "paused", speed: 0 });
            }
            return;
          } else {
            throw err;
          }
        }
      }

      if (!savedViaPicker) {
        const reader = stream.getReader();
        downloadReaders.current[_id] = reader;

        const chunks = [];
        let loaded = 0;
        let lastLoaded = 0;
        let lastTime = Date.now();
        let currentSpeed = 0;
        let lastUpdate = 0;

        while (true) {
          const chunkStartTime = performance.now();
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          loaded += value.length;

          // Apply dynamic, interruptible speed regulation pacing
          await applyDynamicSpeedPacing(value.length, chunkStartTime, controller.signal);

          const now = Date.now();
          const percent = totalSize > 0 ? Math.min((loaded / totalSize) * 100, 100) : 0;
          const deltaTime = (now - lastTime) / 1000;

          if (deltaTime >= 0.5) {
            const deltaBytes = loaded - lastLoaded;
            currentSpeed = deltaBytes / deltaTime;
            lastLoaded = loaded;
            lastTime = now;
          }

          let timeRemaining = null;
          if (currentSpeed > 0 && totalSize > 0 && loaded < totalSize) {
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

        if (loaded === 0) {
          throw new Error("Downloaded file was empty");
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
  }, [updateTransfer, abortControllers, downloadReaders, downloadWritables]);

  return { startDownload };
}
