import { useState, useRef, useCallback } from "react";
import { Upload, X, File, FileText, Image, Music, Video } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { cn, formatSize } from "../../lib/utils";

export default function FileUploadModal({ isOpen, onClose, onUpload, onFilesSelected }) {
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

  const getFileIconConfig = (file) => {
    const type = file.type.split("/")[0];
    switch (type) {
      case "image":
        return {
          icon: <Image className="text-purple-400" size={20} />,
          bgClass: "bg-purple-500/10 border-purple-500/20 text-purple-400"
        };
      case "video":
        return {
          icon: <Video className="text-rose-400" size={20} />,
          bgClass: "bg-rose-500/10 border-rose-500/20 text-rose-400"
        };
      case "audio":
        return {
          icon: <Music className="text-amber-400" size={20} />,
          bgClass: "bg-amber-500/10 border-amber-500/20 text-amber-400"
        };
      case "text":
        return {
          icon: <FileText className="text-sky-400" size={20} />,
          bgClass: "bg-sky-500/10 border-sky-500/20 text-sky-400"
        };
      default:
        return {
          icon: <File className="text-slate-400" size={20} />,
          bgClass: "bg-white/5 border-white/10 text-slate-400"
        };
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setFiles([]);
        onClose();
      }}
      title="Upload Files"
      className="max-w-2xl bg-vault-surface border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
    >
      <div className="space-y-6">
        <div
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-10 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer group overflow-hidden",
            dragActive
              ? "border-vault-emerald bg-vault-emerald/10 shadow-[0_0_25px_rgba(20,184,166,0.15)]"
              : "border-white/10 hover:border-vault-emerald/40 bg-black/40 hover:bg-black/50",
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

          <div className="w-16 h-16 bg-vault-emerald/10 text-vault-emerald border border-vault-emerald/20 rounded-2xl flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(20,184,166,0.1)] group-hover:scale-105 transition-transform duration-300">
            <Upload size={28} />
          </div>
          
          <h3 className="text-base font-bold text-white mb-2 tracking-wide uppercase">
            Click to upload or drag files here
          </h3>
          <p className="text-white/50 text-xs max-w-xs mb-3">
            Securely encrypt and store documents, media, or archive files.
          </p>
          <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">
            Supports all file extensions
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/5">
            <h4 className="text-[11px] font-bold tracking-wider uppercase text-white/40 mb-2">
              Selected Files ({files.length})
            </h4>
            <div className="max-h-56 overflow-y-auto space-y-2.5 pr-2 scrollbar-thin">
              {files.map((file, index) => {
                const config = getFileIconConfig(file);
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-3.5 bg-black/40 hover:bg-black/65 border border-white/5 hover:border-vault-emerald/20 rounded-xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] group/item"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className={cn("p-2.5 rounded-xl border shrink-0 flex items-center justify-center transition-all", config.bgClass)}>
                        {config.icon}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-[320px]">
                          {file.name}
                        </p>
                        <p className="text-xs font-mono text-white/40 mt-0.5">
                          {formatSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="p-2 text-white/20 hover:text-danger-accent hover:bg-danger-accent/10 rounded-lg transition-all opacity-60 hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t border-white/5 mt-6">
          <Button
            variant="ghost"
            onClick={() => {
              setFiles([]);
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={files.length === 0}
            className={cn(
              files.length === 0 && "opacity-40 cursor-not-allowed",
              "px-8 py-3 rounded-xl",
            )}
          >
            Upload {files.length > 0 && `(${files.length})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
