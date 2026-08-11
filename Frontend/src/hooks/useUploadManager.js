import { useRef, useEffect } from 'react';
import { SERVER_URL } from '../lib/api';

export function useUploadManager({ transfers, setTransfers, updateTransfer, ownerId, abortControllers, onUploadComplete }) {
  const MAX_CONCURRENT_UPLOADS = 3;
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
    const { _id, file, dirId, loaded: startByte } = transfer;

    updateTransfer(_id, { status: "active", speed: 0 });

    const xhr = new XMLHttpRequest();
    abortControllers.current[_id] = xhr;

    const isGithub = dirId && typeof dirId === "string" && dirId.startsWith("github:");
    const isDrive = dirId && typeof dirId === "string" && dirId.startsWith("drive:");

    const cleanDirId = isGithub || isDrive ? dirId.split(":")[1] : dirId;
    
    if (isGithub || isDrive) {
      let uploadUrl = isGithub
        ? `${SERVER_URL}/github/file/${cleanDirId}`
        : isDrive
          ? `${SERVER_URL}/drive/file/${cleanDirId || "root"}/upload`
          : cleanDirId
            ? `${SERVER_URL}/file/${cleanDirId}`
            : `${SERVER_URL}/file/`;

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
    } else {
      try {
        const initRes = await fetch(`${SERVER_URL}/file/upload-vault/initiate`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type, parentDirId: cleanDirId }),
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
      }
    }
  };

  return { startUpload };
}
