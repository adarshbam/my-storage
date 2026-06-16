import {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import {
  X,
  Pause,
  Play,
  Trash2,
  Minimize2,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import { formatSpeed, formatTime, cn } from "../../lib/utils";
import getFileImage from "../../lib/FileImages";
import Card from "../ui/Card";

// Custom helper to generate 24 character hex strings for MongoDB ObjectId compatibility
const generateObjectId = () => {
  return [...Array(24)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
};

const TransferManager = forwardRef((props, ref) => {
  const [transfers, setTransfers] = useState([]);
  const [minimized, setMinimized] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState(50 * 1024 * 1024); // Dynamic limit, default 50MB
  const downloadReaders = useRef({});
  const abortControllers = useRef({});
  const downloadWritables = useRef({});

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`${SERVER_URL}/system-config`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.maxFileSizeLimit) {
            setMaxFileSize(data.maxFileSizeLimit);
          }
        }
      } catch (err) {
        console.error("Failed to fetch system config in client size validation", err);
      }
    }
    loadConfig();
  }, []);

  const searchParams = new URLSearchParams(window.location.search);
  const ownerId = searchParams.get("ownerId");

  // --- HELPER: Update a specific transfer's status/progress ---
  const updateTransfer = useCallback((id, updates) => {
    setTransfers((prev) =>
      prev.map((t) => (t._id === id ? { ...t, ...updates } : t)),
    );
  }, []);

  // --- UPLOAD LOGIC ---
  const MAX_CONCURRENT_UPLOADS = 3;

  // We need to keep track if we are currently "uploading a batch" to know when to trigger onUploadComplete
  const isUploadingBatch = useRef(false);

  useEffect(() => {
    const activeUploads = transfers.filter(
      (t) => t.type === "upload" && t.status === "active",
    );
    const queuedUploads = transfers.filter(
      (t) => t.type === "upload" && t.status === "queued",
    );

    // 1. Start new uploads if slot available
    if (
      activeUploads.length < MAX_CONCURRENT_UPLOADS &&
      queuedUploads.length > 0
    ) {
      const nextUpload = queuedUploads[0];
      startUpload(nextUpload);
    }

    // 2. Check for batch completion
    const hasActiveOrQueued =
      activeUploads.length > 0 || queuedUploads.length > 0;

    if (hasActiveOrQueued) {
      isUploadingBatch.current = true;
    } else if (isUploadingBatch.current) {
      // We were uploading, and now we are done (0 active, 0 queued)
      isUploadingBatch.current = false;
      if (props.onUploadComplete) {
        props.onUploadComplete();
      }
    }
  }, [transfers, props.onUploadComplete]);

  const startUpload = (transfer) => {
    const { _id, file, dirId, loaded: startByte } = transfer;

    // Update status to active immediately to prevent double starting
    updateTransfer(_id, { status: "active", speed: 0 });

    const xhr = new XMLHttpRequest();
    abortControllers.current[_id] = xhr;

    // Detect destination provider via prefix
    const isGithub =
      dirId && typeof dirId === "string" && dirId.startsWith("github:");
    const isDrive =
      dirId && typeof dirId === "string" && dirId.startsWith("drive:");

    const cleanDirId = isGithub || isDrive ? dirId.split(":")[1] : dirId;

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
          updateTransfer(_id, {
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

    xhr.upload.onload = () => {
      updateTransfer(_id, { progress: 100 });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        updateTransfer(_id, {
          status: "completed",
          progress: 100,
          speed: 0,
          timeRemaining: 0,
        });
        // Remove from list after a short delay or keep it?
        // User wants to see progress. We keep it as completed.
      } else {
        let errMsg = "Error";
        try {
          const resObj = JSON.parse(xhr.responseText);
          errMsg = resObj.error || resObj.message || "Error";
        } catch (e) {
          if (xhr.responseText) {
            errMsg = xhr.responseText;
          }
        }
        updateTransfer(_id, { status: "error", speed: 0, errorMessage: errMsg });
      }
      delete abortControllers.current[_id];
    };

    xhr.onerror = () => {
      updateTransfer(_id, { status: "error", speed: 0 });
      delete abortControllers.current[_id];
    };

    xhr.onabort = () => {
      console.log(`Upload paused/cancelled for ${file.name}`);
    };

    if (startByte > 0) {
      xhr.send(file.slice(startByte));
    } else {
      xhr.send(file);
    }
  };

  const uploadFile = useCallback(
    (file, dirId, existingId = null, startByte = 0) => {
      const id = existingId || generateObjectId();

      if (!existingId) {
        if (file.size > maxFileSize) {
          setTransfers((prev) => [
            ...prev,
            {
              _id: id,
              type: "upload",
              name: file.name,
              progress: 0,
              loaded: 0,
              total: file.size,
              status: "error",
              errorMessage: "File too large",
              speed: 0,
              timeRemaining: 0,
              file: file,
              dirId: dirId,
            },
          ]);
          setMinimized(false);
          return;
        }
        setTransfers((prev) => [
          ...prev,
          {
            _id: id,
            type: "upload",
            name: file.name,
            progress: 0,
            loaded: 0,
            total: file.size,
            status: "queued", // Start as queued
            speed: 0,
            timeRemaining: 0,
            file: file,
            dirId: dirId,
          },
        ]);
        setMinimized(false);
      } else {
        // Resuming an existing transfer (paused -> queued)
        updateTransfer(id, { status: "queued", speed: 0 });
      }
    },
    [updateTransfer, maxFileSize],
  );

  const uploadFiles = useCallback((files, dirId) => {
    const newTransfers = files.map((file) => ({
      _id: generateObjectId(),
      type: "upload",
      name: file.name,
      progress: 0,
      loaded: 0,
      total: file.size,
      status: file.size > maxFileSize ? "error" : "queued",
      errorMessage: file.size > maxFileSize ? "File too large" : undefined,
      speed: 0,
      timeRemaining: 0,
      file: file,
      dirId: dirId,
    }));

    setTransfers((prev) => [...prev, ...newTransfers]);
    setMinimized(false);
  }, [maxFileSize]);

  // --- DOWNLOAD LOGIC ---
  const downloadFile = async (
    url,
    filename,
    id = generateObjectId(),
    startByte = 0,
  ) => {
    if (ownerId) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}ownerId=${ownerId}`;
    }
    const hasFileSystemAccess = "showSaveFilePicker" in window;

    if (!hasFileSystemAccess) {
      const urlObj = new URL(url, window.location.origin);
      if (!urlObj.searchParams.has("action")) {
        urlObj.searchParams.set("action", "download");
      }
      const a = document.createElement("a");
      a.href = urlObj.toString();
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    let writable;
    try {
      if (startByte === 0 || !downloadWritables.current[id]) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
        });
        writable = await fileHandle.createWritable();
        downloadWritables.current[id] = writable;
      } else {
        writable = downloadWritables.current[id];
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("User cancelled file picker");
      } else {
        console.error("File picker error:", err);
      }
      return;
    }

    const controller = new AbortController();
    abortControllers.current[id] = controller;

    if (startByte === 0) {
      setTransfers((prev) => [
        ...prev,
        {
          _id: id,
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
      setMinimized(false);
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
        if (done) {
          updateTransfer(id, { progress: 100, loaded: total });
          break;
        }

        if (startByte + received === 0) {
          await writable.write(value);
        } else {
          await writable.write({
            type: "write",
            position: startByte + received,
            data: value,
          });
        }
        received += value.length;

        const totalLoaded = startByte + received;
        const now = Date.now();

        if (now - lastTime >= 500) {
          speed = (received - lastLoaded) / ((now - lastTime) / 1000);
          lastLoaded = received;
          lastTime = now;
        }

        if (now - lastUpdate >= 100 || totalLoaded >= total) {
          updateTransfer(id, {
            loaded: totalLoaded,
            progress: total ? Math.min((totalLoaded / total) * 100, 100) : 100,
            speed,
            timeRemaining: speed ? (total - totalLoaded) / speed : 0,
          });
          lastUpdate = now;
        }
      }

      await writable.close();
      delete downloadWritables.current[id];
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
        if (writable) {
          try {
            await writable.abort();
            delete downloadWritables.current[id];
          } catch (e) {}
        }
      }
    } finally {
      delete abortControllers.current[id];
      delete downloadReaders.current[id];
    }
  };

  const cancelTransfer = (id) => {
    const transfer = transfers.find((t) => t._id === id);
    if (transfer && transfer.status === "active") {
      if (downloadReaders.current[id]) {
        downloadReaders.current[id]
          .cancel(new DOMException("Aborted", "AbortError"))
          .catch(() => {});
      }
      if (abortControllers.current[id]) {
        // Check if it's XHR or AbortController
        if (abortControllers.current[id].abort) {
          abortControllers.current[id].abort();
        }
      }
    }
    if (downloadWritables.current[id]) {
      downloadWritables.current[id].abort().catch(() => {});
      delete downloadWritables.current[id];
    }
    setTransfers((prev) => prev.filter((t) => t._id !== id));
  };

  const pauseTransfer = (id) => {
    const transfer = transfers.find((t) => t._id === id);
    if (!transfer || transfer.status !== "active") return;

    if (downloadReaders.current[id]) {
      downloadReaders.current[id]
        .cancel(new DOMException("Aborted", "AbortError"))
        .catch(() => {});
    }

    if (abortControllers.current[id]) {
      if (abortControllers.current[id].abort) {
        abortControllers.current[id].abort();
      }
    }

    updateTransfer(id, { status: "paused", speed: 0 });
  };

  const resumeTransfer = (id) => {
    const transfer = transfers.find((t) => t._id === id);
    if (!transfer || transfer.status !== "paused") return;

    if (transfer.type === "upload") {
      uploadFile(transfer.file, transfer.dirId, transfer._id, transfer.loaded);
    } else {
      downloadFile(transfer.url, transfer.name, transfer._id, transfer.loaded);
    }
  };

  const retryTransfer = (id) => {
    const transfer = transfers.find((t) => t._id === id);
    if (!transfer || transfer.status !== "error") return;

    if (transfer.type === "upload") {
      updateTransfer(id, {
        status: "queued",
        progress: 0,
        loaded: 0,
        speed: 0,
        timeRemaining: 0,
      });
    } else {
      updateTransfer(id, {
        status: "active",
        progress: 0,
        loaded: 0,
        speed: 0,
        timeRemaining: 0,
      });
      downloadFile(transfer.url, transfer.name, transfer._id, 0);
    }
  };

  const clearCompleted = () => {
    setTransfers((prev) => prev.filter((t) => t.status !== "completed"));
  };

  useImperativeHandle(ref, () => ({
    uploadFile,
    uploadFiles,
    downloadFile,
  }));

  if (transfers.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 md:w-96 shadow-2xl">
      <Card className="p-0 overflow-hidden border-black/10 dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.05] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <span className="font-medium text-sm text-slate-900 dark:text-white">
            Transfers ({transfers.length})
          </span>
          <div className="flex items-center gap-1">
            {transfers.some((t) => t.status === "completed") && (
              <button
                onClick={clearCompleted}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"
                title="Clear completed"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"
            >
              {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="max-h-80 overflow-y-auto p-0">
            {transfers.map((transfer) => (
              <div
                key={transfer._id}
                className="p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <img
                      src={getFileImage(transfer.name.split(".").pop())}
                      alt="icon"
                      className="w-5 h-5 object-contain"
                      onError={(e) => (e.target.src = "/file-images/file.png")}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className="text-sm font-medium truncate text-slate-900 dark:text-slate-100"
                        title={transfer.name}
                      >
                        {transfer.name}
                      </p>
                      <div className="flex items-center gap-1 ml-2">
                        {transfer.status === "active" ? (
                          <button
                            onClick={() => pauseTransfer(transfer._id)}
                            className="text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            title="Pause"
                          >
                            <Pause size={14} />
                          </button>
                        ) : transfer.status === "paused" ? (
                          <button
                            onClick={() => resumeTransfer(transfer._id)}
                            className="text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            title="Resume"
                          >
                            <Play size={14} />
                          </button>
                        ) : transfer.status === "error" ? (
                          <button
                            onClick={() => retryTransfer(transfer._id)}
                            className="text-slate-500 dark:text-slate-400 hover:text-[#14b8a6] dark:hover:text-[#14b8a6] transition-colors"
                            title="Retry Upload"
                          >
                            <RotateCcw
                              size={14}
                              className="animate-hover-spin"
                            />
                          </button>
                        ) : null}
                        <button
                          onClick={() => cancelTransfer(transfer._id)}
                          className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          transfer.status === "completed"
                            ? "bg-green-500"
                            : transfer.status === "error"
                              ? "bg-red-500"
                              : transfer.status === "paused"
                                ? "bg-yellow-500"
                                : "bg-blue-500",
                        )}
                        style={{
                          width: `${
                            transfer.status === "completed"
                              ? 100
                              : transfer.progress
                          }%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {transfer.status === "active" && (
                          <>
                            {formatSpeed(transfer.speed)} •{" "}
                            {formatTime(transfer.timeRemaining)}
                          </>
                        )}
                        {transfer.status === "queued" && "Queued"}
                        {transfer.status === "paused" && "Paused"}
                        {transfer.status === "completed" && "Completed"}
                        {transfer.status === "error" &&
                          (transfer.errorMessage || "Error")}
                      </span>
                      <span>
                        {transfer.status === "completed"
                          ? 100
                          : Math.round(transfer.progress)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
});

export default TransferManager;
