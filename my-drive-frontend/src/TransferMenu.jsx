import {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { SERVER_URL } from "./api";
import { getChunks, clearFile, saveChunk } from "./downloadDB";
import { formatSize, formatSpeed, formatTime } from "./utils";
import getFileImage from "./FileImages";
import "./TransferList.css"; // Reuse existing CSS

const TransferMenu = forwardRef((props, ref) => {
  const [transfers, setTransfers] = useState([]);
  const downloadReaders = useRef({});
  const abortControllers = useRef({});

  // --- HELPER: Update a specific transfer's status/progress ---
  const updateTransfer = useCallback((id, updates) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
  }, []);

  // --- UPLOAD LOGIC ---
  const uploadFile = useCallback(
    (file, dirId, existingId = null, startByte = 0) => {
      const id = existingId || uuidv4();
      const xhr = new XMLHttpRequest();
      abortControllers.current[id] = xhr;

      if (!existingId) {
        // New Transfer
        setTransfers((prev) => [
          ...prev,
          {
            id,
            type: "upload",
            name: file.name,
            progress: 0,
            loaded: 0,
            total: file.size,
            status: "active",
            speed: 0,
            timeRemaining: 0,
            file: file,
            dirId: dirId,
          },
        ]);
      } else {
        // Resuming: Update status to active
        updateTransfer(id, { status: "active", speed: 0 });
      }

      xhr.open("POST", `${SERVER_URL}/file/${dirId || ""}`, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("filename", file.name);
      xhr.setRequestHeader("x-file-id", id);
      xhr.setRequestHeader("x-start-byte", startByte.toString());

      let lastLoaded = startByte;
      let lastTime = Date.now();
      let currentSpeed = 0;
      let lastUpdate = 0;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          // Total uploaded = what we started with + what current XHR has sent
          const totalLoaded = startByte + e.loaded;
          // IMPORTANT: e.total in XHR is the size of the *request body* (slice), not full file
          // So we use file.size for the calcs
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
            updateTransfer(id, {
              progress: percent,
              loaded: totalLoaded,
              total: file.size,
              speed: currentSpeed,
              timeRemaining: timeRemaining,
            });
            lastUpdate = now;
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateTransfer(id, {
            status: "completed",
            progress: 100,
            speed: 0,
            timeRemaining: 0,
          });
        } else {
          updateTransfer(id, { status: "error", speed: 0 });
        }
        delete abortControllers.current[id];
      };

      xhr.onerror = () => {
        updateTransfer(id, { status: "error", speed: 0 });
        delete abortControllers.current[id];
      };

      xhr.onabort = () => {
        console.log(`Upload paused/cancelled for ${file.name}`);
        // We don't set status here because cancelTransfer/pauseTransfer sets it
      };

      // Send the appropriate slice
      if (startByte > 0) {
        xhr.send(file.slice(startByte));
      } else {
        xhr.send(file);
      }
    },
    [updateTransfer],
  );

  // --- DOWNLOAD LOGIC ---
  const downloadFile = async (url, filename, id = uuidv4(), startByte = 0) => {
    const controller = new AbortController();
    abortControllers.current[id] = controller;

    if (startByte === 0) {
      setTransfers((prev) => [
        ...prev,
        {
          id,
          type: "download",
          name: filename,
          progress: 0,
          loaded: 0,
          total: 0,
          status: "active",
          speed: 0,
          timeRemaining: 0,
          url,
        },
      ]);
    } else {
      updateTransfer(id, { status: "active", speed: 0 });
    }

    let received = 0;

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        credentials: "include",
        headers: { Range: `bytes=${startByte}-` },
      });

      if (!(res.status === 200 || res.status === 206)) {
        throw new Error("Download failed");
      }

      const total = Number(res.headers.get("X-Total-Size")) || 0;
      updateTransfer(id, { total });

      const reader = res.body.getReader();
      downloadReaders.current[id] = reader;

      let lastTime = Date.now();
      let lastLoaded = received;
      let speed = 0;
      let lastUpdate = 0;

      while (true) {
        if (controller.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        const { done, value } = await reader.read();
        if (done) break;

        await saveChunk(id, startByte + received, value);
        received += value.length;

        const totalLoaded = startByte + received;
        const now = Date.now();

        if (now - lastTime >= 500) {
          speed = (received - lastLoaded) / ((now - lastTime) / 1000);
          lastLoaded = received;
          lastTime = now;
        }

        // Throttle UI updates to ~10fps (100ms) to prevent main thread blocking
        if (now - lastUpdate >= 100 || totalLoaded >= total) {
          updateTransfer(id, {
            loaded: totalLoaded,
            progress: Math.min((totalLoaded / total) * 100, 100),
            speed,
            timeRemaining: speed ? (total - totalLoaded) / speed : 0,
          });
          lastUpdate = now;
        }
      }

      // ✅ reconstruct ONLY when 100%
      const chunks = await getChunks(id);
      const blob = new Blob(chunks, { type: "application/octet-stream" });
      triggerFileDownload(blob, filename);
      await clearFile(id);

      updateTransfer(id, { status: "completed" });
    } catch (err) {
      if (err.name === "AbortError") {
        updateTransfer(id, {
          status: "paused",
          loaded: startByte + received,
          speed: 0,
        });
      } else {
        console.error("Download error:", err);
        updateTransfer(id, { status: "error" });
      }
    } finally {
      delete abortControllers.current[id];
      delete downloadReaders.current[id];
    }
  };

  const triggerFileDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // --- ACTIONS ---

  const cancelTransfer = (id) => {
    console.log("Cancelling transfer", id);
    const transfer = transfers.find((t) => t.id === id);
    if (transfer && transfer.status === "active") {
      // Cancel reader first for immediate stop
      if (downloadReaders.current[id]) {
        downloadReaders.current[id]
          .cancel(new DOMException("Aborted", "AbortError"))
          .catch(() => {});
      }
      if (abortControllers.current[id]) {
        abortControllers.current[id].abort();
      }
    }
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  };

  const clearCompleted = () => {
    setTransfers((prev) => prev.filter((t) => t.status !== "completed"));
  };

  // --- ACTIONS ---

  const pauseTransfer = (id) => {
    const transfer = transfers.find((t) => t.id === id);
    if (!transfer || transfer.status !== "active") return;

    // 1. Cancel the reader first to stop data buffering immediately
    if (downloadReaders.current[id]) {
      downloadReaders.current[id]
        .cancel(new DOMException("Aborted", "AbortError"))
        .catch(() => {});
    }

    // 2. Abort the network request
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
    }

    // 3. Update UI immediately (actual chunk saving happens in downloadFile catch block)
    updateTransfer(id, { status: "paused", speed: 0 });
  };

  const resumeTransfer = (id) => {
    const transfer = transfers.find((t) => t.id === id);
    if (!transfer || transfer.status !== "paused") return;

    console.log(`Resuming ${transfer.type} for ${transfer.name}...`);

    if (transfer.type === "upload") {
      uploadFile(transfer.file, transfer.dirId, transfer.id, transfer.loaded);
    } else {
      downloadFile(transfer.url, transfer.name, transfer.id, transfer.loaded);
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    uploadFile,
    downloadFile,
  }));

  if (transfers.length === 0) return null;

  return (
    <div className="transfer-list-container">
      <div className="transfer-header">
        <span>Transfers ({transfers.length})</span>
        {transfers.some((t) => t.status === "completed") && (
          <button className="clear-btn" onClick={clearCompleted}>
            Clear Completed
          </button>
        )}
      </div>
      <div className="transfer-items">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="transfer-item">
            <img
              src={
                transfer.type === "directory"
                  ? "/folder.png"
                  : getFileImage(transfer.name.split(".").pop())
              }
              alt="icon"
              className="transfer-icon"
            />
            <div className="transfer-details">
              <div className="transfer-name" title={transfer.name}>
                {transfer.name}
              </div>
              <div className="transfer-meta">
                <span>
                  {transfer.status === "active" && (
                    <>
                      {formatSpeed(transfer.speed)}
                      {transfer.timeRemaining > 0 &&
                        ` • ${formatTime(transfer.timeRemaining)} left`}
                    </>
                  )}
                  {transfer.status === "paused" && "Paused"}
                  {transfer.status === "completed" && "Completed"}
                  {transfer.status === "error" && "Error"}
                </span>
                <span>{Math.round(transfer.progress)}%</span>
              </div>
              <div className="tm-progress-track">
                <div
                  className={`tm-progress-fill ${transfer.status}`}
                  style={{ width: `${transfer.progress}%` }}
                />
              </div>
            </div>
            <div className="transfer-actions">
              {transfer.status === "active" && (
                <button
                  className="action-btn"
                  onClick={() => pauseTransfer(transfer.id)}
                  title="Pause"
                  style={{ cursor: "pointer" }}
                >
                  ⏸
                </button>
              )}
              {transfer.status === "paused" && (
                <button
                  className="action-btn"
                  onClick={() => resumeTransfer(transfer.id)}
                  title="Resume"
                  style={{ cursor: "pointer" }}
                >
                  ▶
                </button>
              )}
              <button
                className="action-btn"
                onClick={() => cancelTransfer(transfer.id)}
                title="Cancel"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default TransferMenu;
