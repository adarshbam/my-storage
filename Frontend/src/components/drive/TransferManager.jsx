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
  Gauge,
  Lock,
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import { getFileCdnUrl } from "../../api/files.api";
import { formatSpeed, formatTime, cn } from "../../lib/utils";
import getFileImage from "../../lib/FileImages";
import Card from "../ui/Card";
import { useUploadManager } from "../../hooks/useUploadManager";
import { useDownloadManager } from "../../hooks/useDownloadManager";
import { usePlan } from "../../context/PlanContext";

const generateObjectId = () => {
  return [...Array(24)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
};

export const SPEED_LEVELS = [
  {
    level: 1,
    id: "level-1",
    label: "Level 1: 500 KB/s",
    shortLabel: "500 KB/s",
    bytesPerSec: 500 * 1024,
    minTier: "Novice",
    tierBadge: "Novice",
    description: "Standard Speed (Lowest)",
  },
  {
    level: 2,
    id: "level-2",
    label: "Level 2: 2 MB/s",
    shortLabel: "2 MB/s",
    bytesPerSec: 2 * 1024 * 1024,
    minTier: "Professional",
    tierBadge: "Pro",
    description: "Fast Speed",
  },
  {
    level: 3,
    id: "level-3",
    label: "Level 3: 5 MB/s",
    shortLabel: "5 MB/s",
    bytesPerSec: 5 * 1024 * 1024,
    minTier: "Professional",
    tierBadge: "Pro",
    description: "Turbo Speed",
  },
  {
    level: 4,
    id: "level-4",
    label: "Level 4: 10 MB/s",
    shortLabel: "10 MB/s",
    bytesPerSec: 10 * 1024 * 1024,
    minTier: "Ultimate",
    tierBadge: "Ultimate",
    description: "Ultra Fast Speed",
  },
  {
    level: 5,
    id: "level-5",
    label: "Level 5: Unlimited (No Limit)",
    shortLabel: "Unlimited",
    bytesPerSec: 0,
    minTier: "Ultimate",
    tierBadge: "Ultimate",
    description: "Maximum Speed (Infinite)",
  },
];

const TransferManager = forwardRef((props, ref) => {
  const [transfers, setTransfers] = useState([]);
  const [minimized, setMinimized] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState(50 * 1024 * 1024);
  const downloadReaders = useRef({});
  const abortControllers = useRef({});
  const downloadWritables = useRef({});

  const { planTier, isNoSubscription, isFreeTrial } = usePlan();
  const planSlug = (planTier?.slug || planTier?.type || "").toLowerCase();
  const isTrial = isFreeTrial || planSlug.includes("trial");
  const isUltimate = isTrial || planSlug.includes("ultimate") || planSlug.includes("enterprise");
  const isProfessional = planSlug.includes("pro");
  const isNovice = !isUltimate && !isProfessional;

  // Max unlocked speed level based on plan:
  // Novice / Free: Level 1 only (500 KB/s)
  // Professional: Levels 1, 2, 3 (up to 5 MB/s)
  // Ultimate / Trial: All 5 Levels (up to Unlimited)
  const maxAllowedLevel = isUltimate ? 5 : isProfessional ? 3 : 1;

  const [selectedLevel, setSelectedLevel] = useState(() => {
    const saved = localStorage.getItem("vault_speed_level");
    const parsed = saved ? parseInt(saved, 10) : (isUltimate ? 5 : isProfessional ? 3 : 1);
    return Math.min(Math.max(parsed || 1, 1), maxAllowedLevel);
  });

  useEffect(() => {
    setSelectedLevel((prev) => {
      const clamped = Math.min(prev, maxAllowedLevel);
      localStorage.setItem("vault_speed_level", clamped.toString());
      return clamped;
    });
  }, [maxAllowedLevel]);

  const currentLevelObj = SPEED_LEVELS.find((l) => l.level === selectedLevel) || SPEED_LEVELS[0];
  const speedLimit = currentLevelObj.bytesPerSec;

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

  const updateTransfer = useCallback((id, updates) => {
    setTransfers((prev) => prev.map((t) => (t._id === id ? { ...t, ...updates } : t)));
  }, []);

  const { startUpload } = useUploadManager({
    transfers,
    setTransfers,
    updateTransfer,
    ownerId,
    abortControllers,
    onUploadComplete: props.onUploadComplete,
    speedLimit,
  });

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
            status: "queued",
            speed: 0,
            timeRemaining: 0,
            file: file,
            dirId: dirId,
          },
        ]);
        setMinimized(false);
      } else {
        updateTransfer(id, { status: "queued", speed: 0 });
      }
    },
    [updateTransfer, maxFileSize],
  );

  const uploadFiles = useCallback(
    (files, dirId) => {
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
    },
    [maxFileSize],
  );

  const { startDownload } = useDownloadManager({
    updateTransfer,
    abortControllers,
    downloadReaders,
    downloadWritables,
    speedLimit,
  });

  const downloadFile = async (url, filename, id = generateObjectId(), startByte = 0) => {
    if (ownerId) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}ownerId=${ownerId}`;
    }

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

    // Determine if this is a Vault Storage file and obtain signed CDN URL
    let streamUrl = url;

    const isVaultFile =
      typeof url === "string" &&
      url.includes("/file/") &&
      !url.includes("/drive/file/") &&
      !url.includes("/github/file/") &&
      !url.includes("/directory/");

    if (isVaultFile) {
      try {
        const match = url.match(/\/file\/([a-fA-F0-9]{24})/);
        if (match) {
          const fileId = match[1];
          const cdnData = await getFileCdnUrl(fileId, {
            ...(ownerId ? { ownerId } : {}),
            action: "download",
          });
          if (cdnData && cdnData.url) {
            streamUrl = cdnData.url;
          }
        }
      } catch (err) {
        console.error("Failed to obtain CDN download URL, falling back to direct route:", err.message);
      }
    }

    startDownload({ _id: id, url: streamUrl, name: filename });
  };

  const cancelTransfer = (id) => {
    const transfer = transfers.find((t) => t._id === id);
    if (transfer && transfer.status === "active") {
      if (downloadReaders.current[id]) {
        downloadReaders.current[id].cancel(new DOMException("Aborted", "AbortError")).catch(() => {});
      }
      if (abortControllers.current[id]) {
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
      downloadReaders.current[id].cancel(new DOMException("Aborted", "AbortError")).catch(() => {});
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
      updateTransfer(id, { status: "queued", progress: 0, loaded: 0, speed: 0, timeRemaining: 0 });
    } else {
      updateTransfer(id, { status: "active", progress: 0, loaded: 0, speed: 0, timeRemaining: 0 });
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
      <Card className="p-0 overflow-visible border-black/10 dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.05] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl">
          <span className="font-medium text-sm text-slate-900 dark:text-white">
            Transfers ({transfers.length})
          </span>
          <div className="flex items-center gap-1.5">
            {/* Speed Regulation Governor */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={cn(
                  "px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors border",
                  isNovice
                    ? "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5"
                    : isProfessional
                      ? "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5"
                      : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                )}
                title="Transfer Speed Governor"
              >
                <Gauge size={13} className={currentLevelObj.bytesPerSec > 0 ? "text-amber-500" : "text-emerald-500"} />
                <span className="text-[11px] font-semibold">
                  {currentLevelObj.shortLabel}
                </span>
                {isNovice && <Lock size={10} className="text-purple-500 shrink-0" />}
              </button>

              {showSpeedMenu && (
                <div className="absolute right-0 bottom-full mb-1.5 w-56 py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 text-xs backdrop-blur-xl">
                  <div className="px-3 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1.5 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Speed Governor
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                        isUltimate
                          ? "bg-sky-500/10 text-sky-500 border-sky-500/20"
                          : isProfessional
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      )}
                    >
                      {isUltimate ? "Ultimate Plan" : isProfessional ? "Pro Plan" : "Novice Plan"}
                    </span>
                  </div>

                  {SPEED_LEVELS.map((level) => {
                    const isUnlocked = level.level <= maxAllowedLevel;
                    const isSelected = selectedLevel === level.level;

                    return (
                      <button
                        key={level.id}
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => {
                          if (isUnlocked) {
                            setSelectedLevel(level.level);
                            localStorage.setItem("vault_speed_level", level.level.toString());
                            setShowSpeedMenu(false);
                          }
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 transition-colors flex items-center justify-between",
                          !isUnlocked
                            ? "opacity-50 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/30"
                            : isSelected
                              ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-500/10"
                              : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                        )}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{level.label}</span>
                            {!isUnlocked && (
                              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                                <Lock size={8} /> {level.tierBadge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {level.description}
                          </span>
                        </div>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {transfers.some((t) => t.status === "completed") && (
              <button onClick={clearCompleted} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400" title="Clear completed">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={() => setMinimized(!minimized)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400">
              {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
          </div>
        </div>
        {!minimized && (
          <div className="max-h-80 overflow-y-auto p-0 rounded-b-2xl">
            {transfers.map((transfer) => (
              <div key={transfer._id} className="p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <img src={getFileImage(transfer.name.split(".").pop())} alt="icon" className="w-5 h-5 object-contain" onError={(e) => (e.target.src = "/file-images/file.png")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100" title={transfer.name}>{transfer.name}</p>
                        {transfer.total >= 5 * 1024 * 1024 && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                            Multipart
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {transfer.status === "active" ? (
                          <button onClick={() => pauseTransfer(transfer._id)} className="text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" title="Pause"><Pause size={14} /></button>
                        ) : transfer.status === "paused" ? (
                          <button onClick={() => resumeTransfer(transfer._id)} className="text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" title="Resume"><Play size={14} /></button>
                        ) : transfer.status === "error" ? (
                          <button onClick={() => retryTransfer(transfer._id)} className="text-slate-500 dark:text-slate-400 hover:text-[#14b8a6] dark:hover:text-[#14b8a6] transition-colors" title="Retry Upload"><RotateCcw size={14} className="animate-hover-spin" /></button>
                        ) : null}
                        <button onClick={() => cancelTransfer(transfer._id)} className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Remove"><X size={14} /></button>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
                      <div className={cn("h-full transition-all duration-300", transfer.status === "completed" ? "bg-green-500" : transfer.status === "error" ? "bg-red-500" : transfer.status === "paused" ? "bg-yellow-500" : "bg-blue-500")} style={{ width: `${transfer.status === "completed" ? 100 : transfer.progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {transfer.status === "active" && <>{formatSpeed(transfer.speed)} • {formatTime(transfer.timeRemaining)}</>}
                        {transfer.status === "queued" && "Queued"}
                        {transfer.status === "paused" && "Paused"}
                        {transfer.status === "completed" && "Completed"}
                        {transfer.status === "error" && (transfer.errorMessage || "Error")}
                      </span>
                      <span>{transfer.status === "completed" ? 100 : Math.round(transfer.progress)}%</span>
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
