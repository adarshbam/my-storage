import React from 'react';
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Maximize, Minimize, AlertTriangle, Lock, Globe } from "lucide-react";
import Editor from "react-simple-code-editor";
import * as Prism from "prismjs";
import { cn } from "../../lib/utils";

const supportedExtensions = [".txt", ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json", ".md", ".py"];

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
}) {
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
        isCreateFullscreen && "max-w-none w-full h-full rounded-none border-none",
      )}
      headerActions={
        modalType === "create-file" && (
          <button
            onClick={toggleCreateFullscreen}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title={isCreateFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isCreateFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        )
      }
      title={
        modalType === "create" ? "Create New Folder" :
        modalType === "create-file" ? "Create New File" :
        modalType === "create-repo" ? "Create New GitHub Repository" :
        modalType === "rename" ? "Rename Item" :
        modalType === "delete" ? "Confirm Deletion" : "Danger: Permanent Deletion"
      }
    >
      <div ref={createModalRef} className={cn("bg-vault-surface text-white space-y-4", isCreateFullscreen && "h-full flex flex-col p-4")}>
        {modalType === "delete" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
              <div>
                <div className="font-bold text-white text-sm">Permanent Delete</div>
                <div className="text-xs text-white/50 mt-0.5">
                  {isPermanentDelete ? "Item will be permanently erased" : "Item will be moved to trash"}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPermanentDelete}
                onClick={() => setIsPermanentDelete(!isPermanentDelete)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                  isPermanentDelete ? "bg-rose-500" : "bg-white/20",
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
                {isPermanentDelete ? "Delete Permanently" : "Move to Trash"}
              </Button>
            </div>
          </div>
        ) : modalType === "delete-github" ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-rose-300 font-bold text-sm leading-tight">Wait! This is permanent.</h3>
                <p className="text-rose-400/80 text-xs mt-1">
                  You are about to delete <strong className="text-white">{modalItem?.name}</strong> from GitHub. This action will create a direct commit and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setModalType(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteGithub}>
                Confirm Delete
              </Button>
            </div>
          </div>
        ) : modalType === "create-file" ? (
          <form onSubmit={handleModalSubmit} className={cn("space-y-4", isCreateFullscreen && "flex-1 flex flex-col")}>
            <div className="flex items-center gap-2 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Filename</label>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  className="w-full bg-transparent text-white font-semibold focus:outline-none text-base"
                  placeholder="untitled"
                  autoFocus
                />
              </div>
              <div className="w-px h-10 bg-white/10 mx-2"></div>
              <div className="w-32">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Extension</label>
                <select
                  value={selectedExt}
                  onChange={(e) => setSelectedExt(e.target.value)}
                  className="w-full bg-transparent text-emerald-400 font-bold focus:outline-none appearance-none cursor-pointer text-base"
                >
                  {supportedExtensions.map((ext) => (
                    <option key={ext} value={ext} className="bg-slate-900 text-white">{ext}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={cn("relative group bg-black/40 rounded-2xl border border-white/10 overflow-hidden flex flex-col", isCreateFullscreen ? "flex-1" : "h-64")}>
              <div className="flex-1 overflow-auto custom-scrollbar">
                <Editor
                  value={newFileContent}
                  onValueChange={(code) => setNewFileContent(code)}
                  highlight={(code) => {
                    const lang = getLanguage(selectedExt);
                    try {
                      const grammar = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.clike;
                      return Prism.highlight(code, grammar, lang);
                    } catch (e) {
                      return code;
                    }
                  }}
                  padding={16}
                  style={{ fontFamily: '"Cascadia Code", "Fira Code", monospace', fontSize: 13, minHeight: "100%", color: "#d4d4d4" }}
                  className="w-full focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); setModalType(null); }}>Cancel</Button>
              <Button type="submit" variant="primary" className="px-8">Create & Save</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleModalSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Item Name</label>
              <input
                type="text"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors text-sm font-medium"
                autoFocus
              />
            </div>
            {modalType === "create-repo" && (
              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3 text-xs font-bold text-white/80">
                  {isPrivate ? <Lock size={16} className="text-emerald-400" /> : <Globe size={16} className="text-blue-400" />}
                  <span>{isPrivate ? "Private Repository" : "Public Repository"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2", isPrivate ? "bg-emerald-500" : "bg-white/20")}
                >
                  <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", isPrivate ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalType(null)}>Cancel</Button>
              <Button type="submit" variant="primary">{modalType === "create" ? "Create Folder" : "Submit"}</Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

