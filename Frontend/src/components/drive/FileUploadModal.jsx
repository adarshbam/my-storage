import { useState, useRef, useCallback } from "react";
import { Upload, X, ShieldCheck, FileUp, Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { cn, formatSize } from "../../lib/utils";
import { renderFileIcon } from "../../lib/FileImages";

export default function FileUploadModal({
  isOpen,
  onClose,
  onUpload,
  onFilesSelected,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  }, []);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const handleSubmit = () => {
    if (files.length > 0) {
      const uploadFn = onFilesSelected || onUpload;
      if (uploadFn) {
        uploadFn(files);
      }
      setFiles([]);
      onClose();
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setFiles([]);
        onClose();
      }}
      title="Upload Encrypted Assets"
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Drop Zone */}
        <div
          data-tour="upload-dropzone"
          className={cn(
            "relative border-2 border-dashed rounded-3xl p-8 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer group select-none",
            dragActive
              ? "border-accent-primary bg-accent-soft shadow-xl shadow-accent-glow/15 scale-[1.01]"
              : "border-slate-300 dark:border-white/10 hover:border-accent-border bg-slate-50/80 dark:bg-vault-panel/40 hover:bg-slate-100/90 dark:hover:bg-vault-panel/70 shadow-sm",
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleChange}
          />

          <div className="w-16 h-16 bg-accent-soft text-accent-primary border border-accent-border rounded-3xl flex items-center justify-center mb-4 group-hover:scale-105 group-hover:shadow-accent-glow transition-all duration-200 shadow-md">
            <Upload size={28} className="transition-transform group-hover:-translate-y-0.5" />
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
            Drag & drop your files here
          </h3>
          <p className="text-slate-500 dark:text-white/60 text-xs max-w-sm mb-4 leading-relaxed">
            Encrypted client-side before transit. Only your key can decrypt them.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white shadow-sm group-hover:bg-accent-primary group-hover:text-accent-foreground group-hover:border-transparent transition-all">
            <FileUp size={14} />
            <span>Browse Files</span>
          </div>
        </div>

        {/* Selected Files Queue */}
        {files.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider">
                <span>Queue ({files.length})</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-soft text-accent-primary border border-accent-border font-mono">
                  {formatSize(totalSize)}
                </span>
              </div>
              <button
                type="button"
                onClick={clearAllFiles}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear all
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {files.map((file, index) => {
                const ext = file.name.split(".").pop() || "";
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-3 bg-white dark:bg-vault-panel/60 border border-slate-200/90 dark:border-white/5 rounded-2xl shadow-sm hover:border-slate-300 dark:hover:border-white/15 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 shrink-0 flex items-center justify-center">
                        {renderFileIcon(ext, { size: 20 })}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-[340px]">
                          {file.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-white/40 mt-0.5">
                          {formatSize(file.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors shrink-0"
                      title="Remove file"
                    >
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Security Indicator */}
        <div
          data-tour="upload-encryption-badge"
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium"
        >
          <ShieldCheck size={16} className="shrink-0 text-emerald-500" />
          <span>Zero-Knowledge AES-256 encryption active for all outgoing transfers.</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <Button
            variant="secondary"
            onClick={() => {
              setFiles([]);
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            data-tour="upload-submit-btn"
            onClick={handleSubmit}
            disabled={files.length === 0}
            className="px-7"
          >
            Upload {files.length > 0 ? `(${files.length})` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
