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
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title={isCreateFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isCreateFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
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
      <div ref={createModalRef} className={cn("bg-white dark:bg-slate-900", isCreateFullscreen && "h-full flex flex-col p-4")}>
        {modalType === "delete" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
              <div>
                <div className="font-medium text-slate-700 dark:text-slate-300">Permanent Delete</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {isPermanentDelete ? "Item will be permanently erased" : "Item will be moved to trash"}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPermanentDelete}
                onClick={() => setIsPermanentDelete(!isPermanentDelete)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  isPermanentDelete ? "bg-red-500" : "bg-slate-300 dark:bg-slate-600",
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
                variant="outline"
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
                variant="danger"
                className={cn(
                  "flex-1 text-white",
                  isPermanentDelete
                    ? "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    : "bg-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600",
                )}
                onClick={handleDeleteConfirm}
              >
                {isPermanentDelete ? "Delete Permanently" : "Move to Trash"}
              </Button>
            </div>
          </div>
        ) : modalType === "delete-github" ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
              <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-red-800 dark:text-red-200 font-semibold text-lg leading-tight">Wait! This is permanent.</h3>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  You are about to delete <strong className="text-red-700 dark:text-red-100">{modalItem?.name}</strong> from GitHub. This action will create a direct commit and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
              <Button onClick={confirmDeleteGithub} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 px-6 border-none">
                Confirm Delete
              </Button>
            </div>
          </div>
        ) : modalType === "create-file" ? (
          <form onSubmit={handleModalSubmit} className={cn("space-y-4", isCreateFullscreen && "flex-1 flex flex-col")}>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Filename</label>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  className="w-full bg-transparent text-slate-900 dark:text-white font-medium focus:outline-none text-lg"
                  placeholder="untitled"
                  autoFocus
                />
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-800 mx-2"></div>
              <div className="w-32">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Extension</label>
                <select
                  value={selectedExt}
                  onChange={(e) => setSelectedExt(e.target.value)}
                  className="w-full bg-transparent text-[#14b8a6] font-bold focus:outline-none appearance-none cursor-pointer text-lg"
                >
                  {supportedExtensions.map((ext) => (
                    <option key={ext} value={ext} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{ext}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={cn("relative group bg-[#1e1e1e] rounded-xl border border-black/10 dark:border-white/5 overflow-hidden flex flex-col", isCreateFullscreen ? "flex-1" : "h-64")}>
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
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); setModalType(null); }}>Cancel</Button>
                <Button type="submit" className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white px-8">Create & Save</Button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleModalSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                autoFocus
              />
            </div>
            {modalType === "create-repo" && (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                  <span>{isPrivate ? "Private Repository" : "Public Repository"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:ring-offset-2", isPrivate ? "bg-[#14b8a6]" : "bg-slate-200 dark:bg-slate-700")}
                >
                  <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", isPrivate ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
              <Button type="submit">{modalType === "create" ? "Create Folder" : "Submit"}</Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
