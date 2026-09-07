import { createContext, useContext, useState, useEffect } from "react";
import { SERVER_URL } from "../lib/api";
import { batchDelete } from "../api/files.api";
import { Trash2, AlertCircle, Loader2, Scissors, Copy, Check, X } from "lucide-react";
import { formatSize } from "../lib/utils";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";

const ChamberTransferContext = createContext(null);

export function ChamberTransferProvider({ children, user, effectiveMaxStorage }) {
  // Global drag state tracking across sidebar and viewports
  const [activeDragSource, setActiveDragSource] = useState(null);

  // Global clipboard state (persisted in sessionStorage)
  const [clipboard, setClipboard] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("vault_clipboard")) || null;
    } catch {
      return null;
    }
  });

  const updateClipboard = (data) => {
    if (data) {
      sessionStorage.setItem("vault_clipboard", JSON.stringify(data));
    } else {
      sessionStorage.removeItem("vault_clipboard");
    }
    setClipboard(data);
    window.dispatchEvent(new CustomEvent("vault:clipboard_change", { detail: data }));
  };

  useEffect(() => {
    const handleSync = (e) => {
      setClipboard(e.detail);
    };
    window.addEventListener("vault:clipboard_change", handleSync);
    return () => window.removeEventListener("vault:clipboard_change", handleSync);
  }, []);

  const copyItems = (items, provider = "local") => {
    if (!items || items.length === 0) return;
    const prepared = {
      action: "copy",
      provider,
      items: items.map((item) => ({
        _id: item._id || item.id,
        name: item.name,
        type: item.type || (item.extension ? "file" : "directory"),
        provider: item.provider || provider,
        extension: item.extension || "",
        size: item.size || 0,
        mimeType: item.mimeType || "",
        githubPath: item.githubPath || "",
      })),
    };
    updateClipboard(prepared);
  };

  const cutItems = (items, provider = "local") => {
    if (!items || items.length === 0) return;
    const prepared = {
      action: "cut",
      provider,
      items: items.map((item) => ({
        _id: item._id || item.id,
        name: item.name,
        type: item.type || (item.extension ? "file" : "directory"),
        provider: item.provider || provider,
        extension: item.extension || "",
        size: item.size || 0,
        mimeType: item.mimeType || "",
        githubPath: item.githubPath || "",
      })),
    };
    updateClipboard(prepared);
  };

  const clearClipboard = () => {
    updateClipboard(null);
  };

  // Global Esc key listener to cancel cut/copy and unhighlight items
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        clearClipboard();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Trash drop confirmation modal state
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [trashModalItems, setTrashModalItems] = useState([]);
  const [isDeletingToTrash, setIsDeletingToTrash] = useState(false);
  const [trashError, setTrashError] = useState(null);

  // Cross-provider transfer state & progress
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState(null);

  // Trigger global refresh event so any active viewport re-fetches its contents
  const triggerGlobalRefresh = () => {
    window.dispatchEvent(new CustomEvent("vault:refresh"));
  };

  // Handle request to move items to Trash via sidebar drop
  const requestMoveToTrash = (items) => {
    if (!items || items.length === 0) return;
    // Only local Vault items are eligible to go to Trash
    const localItems = items.filter(
      (i) => (!i.provider || i.provider === "local") && i.provider !== "google_drive" && i.provider !== "github"
    );
    if (localItems.length === 0) {
      alert("Only Vault items can be moved to the Trash.");
      return;
    }
    setTrashModalItems(localItems);
    setTrashError(null);
    setTrashModalOpen(true);
  };

  const confirmMoveToTrash = async () => {
    if (trashModalItems.length === 0) return;
    setIsDeletingToTrash(true);
    setTrashError(null);
    try {
      const payload = trashModalItems.map((item) => ({
        _id: item._id || item.id,
        type: item.type || (item.extension ? "file" : "directory"),
      }));
      await batchDelete(payload);
      setTrashModalOpen(false);
      setTrashModalItems([]);
      triggerGlobalRefresh();
    } catch (err) {
      console.error("Failed to move to trash:", err);
      setTrashError(err?.message || "Failed to move items to Trash. Please try again.");
    } finally {
      setIsDeletingToTrash(false);
    }
  };

  // Transfer Drive items -> Vault (Atomic Move with live HUD progress)
  const transferDriveToVault = async (items, targetFolderId = null) => {
    if (!items || items.length === 0) return;
    const driveItems = items.filter((i) => i.provider === "google_drive" || i.provider === "drive");
    if (driveItems.length === 0) return;

    let destFolderId = targetFolderId;
    if (!destFolderId || destFolderId === "root") {
      destFolderId = user?.rootDirId;
    }

    const total = driveItems.length;
    setTransferStatus({
      active: true,
      direction: "Drive ➔ Vault",
      sourceProvider: "google_drive",
      targetProvider: "local",
      currentFileName: driveItems[0].name,
      currentFileSize: driveItems[0].size || 0,
      currentIndex: 1,
      totalItems: total,
      phase: "streaming",
      progress: Math.min(100 / total * 0.08, 4),
      error: null,
    });
    setIsTransferring(true);

    try {
      for (let idx = 0; idx < total; idx++) {
        const item = driveItems[idx];
        const base = (idx / total) * 100;
        const slice = 100 / total;

        setTransferStatus((prev) => ({
          ...prev,
          currentFileName: item.name,
          currentFileSize: item.size || 0,
          currentIndex: idx + 1,
          phase: "streaming",
          progress: base + Math.min(slice * 0.08, 4),
        }));

        // Dynamic progress animation ticker while network transfer is active
        const progressTimer = setInterval(() => {
          setTransferStatus((prev) => {
            if (!prev || prev.phase !== "streaming") return prev;
            const targetCap = base + slice * 0.94;
            const diff = targetCap - (prev.progress || base);
            if (diff <= 0.4) return prev;
            const inc = Math.max(0.2, diff * 0.05);
            return {
              ...prev,
              progress: Math.min(targetCap, (prev.progress || base) + inc),
            };
          });
        }, 200);

        try {
          const res = await fetch(`${SERVER_URL}/drive/transfer-to-vault`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [
                {
                  _id: item._id || item.id,
                  name: item.name,
                  mimeType: item.mimeType || "application/octet-stream",
                  type: item.type || (item.mimeType === "application/vnd.google-apps.folder" ? "directory" : "file"),
                },
              ],
              targetFolderId: destFolderId,
              action: "move",
            }),
            credentials: "include",
          });

          clearInterval(progressTimer);

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || `Failed to move ${item.name} to Vault`);
          }

          setTransferStatus((prev) => ({
            ...prev,
            progress: ((idx + 1) / total) * 100,
          }));
        } catch (fetchErr) {
          clearInterval(progressTimer);
          throw fetchErr;
        }
      }

      setTransferStatus((prev) => ({
        ...prev,
        phase: "complete",
        progress: 100,
      }));

      clearClipboard();
      triggerGlobalRefresh();

      setTimeout(() => {
        setTransferStatus(null);
      }, 1800);
    } catch (err) {
      console.error("Transfer to Vault error:", err);
      setTransferStatus((prev) => ({
        ...prev,
        phase: "error",
        error: err.message || "Failed to transfer files from Google Drive to Vault",
      }));
    } finally {
      setIsTransferring(false);
    }
  };

  // Transfer Vault items -> Drive (Atomic Move with live HUD progress)
  const transferVaultToDrive = async (items, targetDriveFolderId = "root") => {
    if (!items || items.length === 0) return;
    const localItems = items.filter((i) => !i.provider || i.provider === "local");
    if (localItems.length === 0) return;

    let destDriveId = targetDriveFolderId;
    if (!destDriveId || /^[0-9a-fA-F]{24}$/.test(destDriveId)) {
      destDriveId = "root";
    }

    const total = localItems.length;
    setTransferStatus({
      active: true,
      direction: "Vault ➔ Drive",
      sourceProvider: "local",
      targetProvider: "google_drive",
      currentFileName: localItems[0].name,
      currentFileSize: localItems[0].size || 0,
      currentIndex: 1,
      totalItems: total,
      phase: "streaming",
      progress: Math.min(100 / total * 0.08, 4),
      error: null,
    });
    setIsTransferring(true);

    try {
      for (let idx = 0; idx < total; idx++) {
        const item = localItems[idx];
        const base = (idx / total) * 100;
        const slice = 100 / total;

        setTransferStatus((prev) => ({
          ...prev,
          currentFileName: item.name,
          currentFileSize: item.size || 0,
          currentIndex: idx + 1,
          phase: "streaming",
          progress: base + Math.min(slice * 0.08, 4),
        }));

        const progressTimer = setInterval(() => {
          setTransferStatus((prev) => {
            if (!prev || prev.phase !== "streaming") return prev;
            const targetCap = base + slice * 0.94;
            const diff = targetCap - (prev.progress || base);
            if (diff <= 0.4) return prev;
            const inc = Math.max(0.2, diff * 0.05);
            return {
              ...prev,
              progress: Math.min(targetCap, (prev.progress || base) + inc),
            };
          });
        }, 200);

        try {
          const res = await fetch(`${SERVER_URL}/drive/transfer-from-vault`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [
                {
                  _id: item._id || item.id,
                  name: item.name,
                  extension: item.extension,
                  size: item.size,
                  type: item.type || (item.extension ? "file" : "directory"),
                },
              ],
              targetDriveFolderId: destDriveId,
              action: "move",
            }),
            credentials: "include",
          });

          clearInterval(progressTimer);

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || `Failed to move ${item.name} to Google Drive`);
          }

          setTransferStatus((prev) => ({
            ...prev,
            progress: ((idx + 1) / total) * 100,
          }));
        } catch (fetchErr) {
          clearInterval(progressTimer);
          throw fetchErr;
        }
      }

      setTransferStatus((prev) => ({
        ...prev,
        phase: "complete",
        progress: 100,
      }));

      clearClipboard();
      triggerGlobalRefresh();

      setTimeout(() => {
        setTransferStatus(null);
      }, 1800);
    } catch (err) {
      console.error("Transfer to Drive error:", err);
      setTransferStatus((prev) => ({
        ...prev,
        phase: "error",
        error: err.message || "Failed to transfer files from Vault to Google Drive",
      }));
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <ChamberTransferContext.Provider
      value={{
        activeDragSource,
        setActiveDragSource,
        clipboard,
        copyItems,
        cutItems,
        clearClipboard,
        transferDriveToVault,
        transferVaultToDrive,
        requestMoveToTrash,
        triggerGlobalRefresh,
        isTransferring,
        transferStatus,
      }}
    >
      {children}

      {/* ── ACTIVE CUT / MOVE FLOATING BANNER (Cancel Option) ── */}
      {clipboard && clipboard.action === "cut" && clipboard.items.length > 0 && !transferStatus && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-black/95 text-white border border-amber-500/30 shadow-2xl backdrop-blur-xl">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Scissors size={16} />
            </div>
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-bold truncate max-w-[200px]">
                {clipboard.items.length === 1
                  ? `Moving: ${clipboard.items[0].name}`
                  : `${clipboard.items.length} items cut`}
              </span>
              <span className="text-[10px] text-white/50 font-mono">
                Paste in destination or press Esc
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearClipboard}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1.5"
              title="Cancel move and unhighlight files"
            >
              <X size={14} />
              <span>Cancel Move</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── CHAMBER TRANSFER PROGRESS HUD ── */}
      {transferStatus && (
        <div className="fixed bottom-6 right-6 z-[10000] w-96 max-w-[calc(100vw-32px)] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="p-4 rounded-3xl bg-slate-900/95 dark:bg-[#0c0c0e]/95 backdrop-blur-2xl text-white border border-slate-700/60 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_30px_rgba(16,185,129,0.15)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-linkdrive-accent/20 text-linkdrive-accent flex items-center justify-center shrink-0 shadow-sm">
                  {transferStatus.phase === "complete" ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : (
                    <Loader2 size={18} className="animate-spin text-linkdrive-accent" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    {transferStatus.phase === "complete"
                      ? "Transfer Complete"
                      : transferStatus.phase === "error"
                      ? "Transfer Failed"
                      : "Cloud Transfer Active"}
                  </h4>
                  <span className="text-[10px] font-mono text-linkdrive-accent font-bold">
                    {transferStatus.direction}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-white/10 text-white/70">
                {transferStatus.currentIndex} / {transferStatus.totalItems}
              </span>
            </div>

            {/* File Info */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 mb-3">
              <div className="font-bold text-xs truncate text-white mb-0.5">
                {transferStatus.currentFileName}
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/50 font-mono">
                <span>{transferStatus.currentFileSize ? formatSize(transferStatus.currentFileSize) : "Processing..."}</span>
                <span
                  className={
                    transferStatus.phase === "error"
                      ? "text-rose-400 font-bold"
                      : transferStatus.phase === "complete"
                      ? "text-emerald-400 font-bold"
                      : "text-linkdrive-accent font-bold"
                  }
                >
                  {transferStatus.phase === "complete"
                    ? "Finished (100%)"
                    : transferStatus.phase === "error"
                    ? "Failed"
                    : `Moving... ${Math.round(transferStatus.progress || 0)}%`}
                </span>
              </div>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden mb-2.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden ${
                  transferStatus.phase === "complete"
                    ? "bg-emerald-400"
                    : transferStatus.phase === "error"
                    ? "bg-rose-500"
                    : "bg-gradient-to-r from-linkdrive-accent via-emerald-400 to-cyan-400"
                }`}
                style={{
                  width: `${Math.max(4, Math.min(100, transferStatus.progress || 0))}%`,
                }}
              >
                {transferStatus.phase === "streaming" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                )}
              </div>
            </div>

            {/* Error Message if any */}
            {transferStatus.phase === "error" && transferStatus.error && (
              <div className="p-2.5 mb-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="leading-snug break-words max-h-28 overflow-y-auto custom-scrollbar font-medium">
                    {transferStatus.error}
                  </span>
                  <button
                    onClick={() => setTransferStatus(null)}
                    className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-500/20 hover:bg-rose-500/40 text-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Notice Text */}
            <p className="text-[10px] text-white/40 leading-tight">
              {transferStatus.phase === "complete"
                ? "All files moved and synchronized safely."
                : transferStatus.phase === "error"
                ? "The operation was aborted to preserve your storage."
                : "Heavy cloud-to-cloud transfer in progress. Please do not close this window."}
            </p>
          </div>
        </div>
      )}
      {children}

      {/* ── TRASH CONFIRMATION MODAL (Drop to Sidebar Trash) ── */}
      <Modal
        isOpen={trashModalOpen}
        onClose={() => {
          if (!isDeletingToTrash) {
            setTrashModalOpen(false);
            setTrashModalItems([]);
          }
        }}
        title="Move to Trash"
        className="max-w-md"
      >
        <div className="space-y-4 text-slate-900 dark:text-white">
          <div className="flex items-center gap-3.5 p-4 bg-rose-500/10 dark:bg-rose-500/10 rounded-2xl border border-rose-500/20">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-sm">
              <Trash2 size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {trashModalItems.length === 1
                  ? trashModalItems[0].name
                  : `${trashModalItems.length} items`}
              </div>
              <div className="text-xs text-slate-600 dark:text-white/60 mt-0.5">
                {trashModalItems.length === 1
                  ? "Are you sure you want to move this file to the trash?"
                  : "Are you sure you want to move these files to the trash?"}
              </div>
            </div>
          </div>

          {trashError && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
              <AlertCircle size={16} className="shrink-0" />
              <span>{trashError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              disabled={isDeletingToTrash}
              onClick={() => {
                setTrashModalOpen(false);
                setTrashModalItems([]);
              }}
              className="px-4 py-2 text-sm"
            >
              Cancel
            </Button>
            <Button
              disabled={isDeletingToTrash}
              onClick={confirmMoveToTrash}
              className="px-5 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20"
            >
              {isDeletingToTrash ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Moving...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Move to Trash</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </ChamberTransferContext.Provider>
  );
}

export function useChamberTransfer() {
  const context = useContext(ChamberTransferContext);
  if (!context) {
    throw new Error("useChamberTransfer must be used within a ChamberTransferProvider");
  }
  return context;
}
