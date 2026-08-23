import React from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import {
  Maximize,
  Minimize,
  AlertTriangle,
  Lock,
  Globe,
  FileCode,
  FolderPlus,
  Edit2,
  Trash2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileText,
} from "lucide-react";
import Editor from "react-simple-code-editor";
import * as Prism from "prismjs";
import { cn } from "../../lib/utils";
import { renderFileIcon } from "../../lib/FileImages";

const supportedExtensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".json",
  ".css",
  ".html",
  ".md",
  ".sql",
  ".txt",
];

const getLanguage = (ext) => {
  const map = {
    ".js": "javascript",
    ".jsx": "jsx",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".json": "json",
    ".css": "css",
    ".html": "html",
    ".py": "python",
    ".md": "markdown",
    ".sql": "sql",
  };
  return map[ext] || "text";
};

export default function FileOperationModals({
  modalType,
  setModalType,
  modalItem,
  setModalItem,
  modalInput,
  setModalInput,
  selectedExt,
  setSelectedExt,
  newFileContent,
  setNewFileContent,
  isPermanentDelete,
  setIsPermanentDelete,
  isCreateFullscreen,
  createModalRef,
  toggleCreateFullscreen,
  handleModalSubmit,
  handleDeleteConfirm,
  confirmDeleteGithub,
  isPrivate,
  setIsPrivate,
  selectedCount = 0,
}) {
  const lineCount = (newFileContent || "").split("\n").length;
  const charCount = (newFileContent || "").length;

  const getModalTitle = () => {
    switch (modalType) {
      case "create":
        return "Create New Folder";
      case "create-file":
        return "Create Encrypted File";
      case "create-repo":
        return "Initialize GitHub Repository";
      case "rename":
        return "Rename Asset";
      case "delete":
        return "Confirm Deletion";
      case "delete-github":
        return "Delete from GitHub";
      default:
        return "File Operation";
    }
  };

  return (
    <Modal
      isOpen={!!modalType}
      onClose={() => {
        if (document.fullscreenElement) document.exitFullscreen();
        setModalType(null);
        setModalInput("");
        setNewFileContent("");
      }}
      className={cn(
        modalType === "create-file" ? "max-w-4xl" : "max-w-md",
        isCreateFullscreen && "max-w-none w-full h-full rounded-none border-none p-0",
      )}
      headerActions={
        modalType === "create-file" && (
          <button
            type="button"
            onClick={toggleCreateFullscreen}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
            title={isCreateFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isCreateFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        )
      }
      title={getModalTitle()}
    >
      <div
        ref={createModalRef}
        className={cn(
          "text-slate-900 dark:text-white space-y-4",
          isCreateFullscreen && "h-full flex flex-col p-4",
        )}
      >
        {/* ── DELETE MODAL ── */}
        {modalType === "delete" ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3.5 p-4 bg-rose-500/10 dark:bg-rose-500/10 rounded-2xl border border-rose-500/20">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-sm">
                <Trash2 size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                  Delete {modalItem ? modalItem.name : `${selectedCount || "selected"} items`}
                </div>
                <div className="text-xs text-slate-600 dark:text-white/60 mt-0.5 font-medium">
                  {isPermanentDelete
                    ? modalItem
                      ? "This item will be permanently erased from disk."
                      : "These items will be permanently erased from disk."
                    : modalItem
                      ? "Item will be moved to the recycle bin."
                      : "Items will be moved to the recycle bin."}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-vault-panel/60 rounded-2xl border border-slate-200 dark:border-white/10">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Erase Permanently
                </span>
                <span className="text-[11px] text-slate-500 dark:text-white/50">
                  Bypass the recycle bin
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPermanentDelete}
                onClick={() => setIsPermanentDelete(!isPermanentDelete)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  isPermanentDelete ? "bg-rose-500 shadow-sm" : "bg-slate-300 dark:bg-white/20",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    isPermanentDelete ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setModalType(null);
                  setModalItem(null);
                  setIsPermanentDelete(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={isPermanentDelete ? "destructive" : "warning"}
                className="flex-1"
                onClick={handleDeleteConfirm}
              >
                {isPermanentDelete ? "Delete Forever" : "Move to Trash"}
              </Button>
            </div>
          </div>
        ) : modalType === "delete-github" ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
              <div className="p-3 bg-rose-500/20 text-rose-500 rounded-2xl shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-rose-600 dark:text-rose-300 font-bold text-sm leading-tight">
                  Permanent GitHub Commit
                </h3>
                <p className="text-rose-600/90 dark:text-rose-400/90 text-xs mt-1">
                  You are about to delete <strong className="text-slate-900 dark:text-white">{modalItem?.name}</strong> from GitHub. This will create an irreversible commit.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalType(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteGithub}>
                Confirm Delete
              </Button>
            </div>
          </div>
        ) : modalType === "create-file" ? (
          /* ── CREATE FILE MODAL (IDE Surface with Syntax Highlighting & Status Bar) ── */
          <form
            onSubmit={handleModalSubmit}
            className={cn("space-y-4", isCreateFullscreen && "flex-1 flex flex-col")}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 dark:bg-vault-panel/60 p-3.5 px-4 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-sm">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest mb-1">
                  Filename
                </label>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  className="w-full bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-white/30"
                  placeholder="e.g. config-service"
                  autoFocus
                />
              </div>

              <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-white/10 mx-1" />

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest mb-1">
                  Extension
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                  <select
                    value={selectedExt}
                    onChange={(e) => setSelectedExt(e.target.value)}
                    className="bg-white dark:bg-white/10 text-accent-primary font-black text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 outline-none cursor-pointer shadow-sm"
                  >
                    {supportedExtensions.map((ext) => (
                      <option
                        key={ext}
                        value={ext}
                        className="bg-white dark:bg-vault-surface text-slate-900 dark:text-white font-semibold"
                      >
                        {ext}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Code Editor Writing Surface */}
            <div
              className={cn(
                "relative group bg-[#18181b] rounded-2xl border border-slate-300 dark:border-white/10 overflow-hidden flex flex-col shadow-2xl",
                isCreateFullscreen ? "flex-1 min-h-[440px]" : "h-80",
              )}
            >
              <div className="px-4 py-2.5 bg-[#202023] border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-primary shadow-accent-glow-sm" />
                  <span className="text-white font-bold">
                    {modalInput.trim() || "untitled"}
                    {selectedExt}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 uppercase text-[10px] font-bold tracking-wider">
                  {getLanguage(selectedExt)}
                </span>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar bg-[#18181b]">
                <Editor
                  value={newFileContent}
                  onValueChange={(code) => setNewFileContent(code)}
                  highlight={(code) => {
                    const lang = getLanguage(selectedExt);
                    try {
                      const grammar =
                        Prism.languages[lang] ||
                        Prism.languages.javascript ||
                        Prism.languages.clike;
                      return Prism.highlight(code, grammar, lang);
                    } catch {
                      return code;
                    }
                  }}
                  padding={16}
                  style={{
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    fontSize: 13,
                    minHeight: "100%",
                    color: "#f1f5f9",
                    lineHeight: "1.6",
                  }}
                  className="w-full focus:outline-none"
                  placeholder="// Enter encrypted file contents here..."
                />
              </div>

              {/* Status Bar */}
              <div className="px-4 py-2 bg-[#121214] border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>
                  {lineCount} {lineCount === 1 ? "line" : "lines"} • {charCount} chars
                </span>
                <span className="text-accent-primary font-bold flex items-center gap-1.5">
                  <ShieldCheck size={13} /> UTF-8 • AES-256
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (document.fullscreenElement) document.exitFullscreen();
                  setModalType(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="px-8 shadow-accent-glow">
                Create & Encrypt
              </Button>
            </div>
          </form>
        ) : (
          /* ── CREATE FOLDER / RENAME MODAL ── */
          <form onSubmit={handleModalSubmit} className="space-y-5">
            {/* Top Icon Badge for Create Folder */}
            {modalType === "create" && (
              <div className="flex items-center gap-3.5 p-4 bg-accent-soft border border-accent-border rounded-2xl shadow-accent-glow-sm">
                <div className="w-11 h-11 rounded-xl bg-accent-primary text-accent-foreground flex items-center justify-center shrink-0 shadow-md">
                  <FolderPlus size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    New Vault Node
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-white/60 mt-0.5">
                    Organize your files inside an encrypted directory.
                  </p>
                </div>
              </div>
            )}

            {modalType === "rename" && modalItem && (
              <div className="p-3 bg-slate-50 dark:bg-vault-panel/60 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent-soft border border-accent-border flex items-center justify-center text-accent-primary shrink-0">
                  <Edit2 size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/40">
                    Current Name
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {modalItem.name}
                  </div>
                </div>
              </div>
            )}

            {modalType === "create-repo" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                    Repository Name *
                  </label>
                  <input
                    type="text"
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="e.g. cloud-storage-backend"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-vault-panel/60 text-slate-900 dark:text-white focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-white/30 shadow-sm"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 dark:text-white/40 mt-1.5">
                    Repository names should be alphanumeric and can contain hyphens or underscores.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                    Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setIsPrivate(false)}
                      className={cn(
                        "p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col gap-1.5 select-none",
                        !isPrivate
                          ? "bg-blue-500/10 border-blue-500/40 shadow-sm ring-1 ring-blue-500/30"
                          : "bg-slate-50 dark:bg-vault-panel/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10",
                      )}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <Globe size={16} className={!isPrivate ? "text-blue-400" : "text-slate-400"} />
                        <span>Public</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-white/50 leading-relaxed">
                        Anyone on the internet can see this repository.
                      </p>
                    </div>

                    <div
                      onClick={() => setIsPrivate(true)}
                      className={cn(
                        "p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col gap-1.5 select-none",
                        isPrivate
                          ? "bg-accent-soft border-accent-border shadow-sm ring-1 ring-accent-primary/30"
                          : "bg-slate-50 dark:bg-vault-panel/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10",
                      )}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <Lock size={16} className={isPrivate ? "text-accent-primary" : "text-slate-400"} />
                        <span>Private</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-white/50 leading-relaxed">
                        You choose who can see and commit.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                  {modalType === "create" ? "Folder Name" : "New Name"}
                </label>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder={modalType === "create" ? "e.g. Financial Reports 2026" : "Enter new filename"}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-vault-panel/60 text-slate-900 dark:text-white focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-white/30 shadow-sm"
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalType(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!modalInput.trim()} className="shadow-accent-glow">
                {modalType === "create-repo"
                  ? "Create Repository"
                  : modalType === "create"
                    ? "Create Folder"
                    : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
