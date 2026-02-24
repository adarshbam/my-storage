import { useState, useRef, useCallback } from "react";
import { Upload, X, File, FileText, Image, Music, Video } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { cn, formatSize } from "../../lib/utils";

export default function FileUploadModal({ isOpen, onClose, onUpload }) {
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
      onUpload(files);
      setFiles([]);
      onClose();
    }
  };

  const getFileIcon = (file) => {
    const type = file.type.split("/")[0];
    switch (type) {
      case "image":
        return <Image className="text-purple-500" size={24} />;
      case "video":
        return <Video className="text-red-500" size={24} />;
      case "audio":
        return <Music className="text-yellow-500" size={24} />;
      case "text":
        return <FileText className="text-blue-500" size={24} />;
      default:
        return <File className="text-slate-500" size={24} />;
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
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer",
            dragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
              : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50 dark:bg-slate-900",
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

          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
            <Upload size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Click to upload or drag and drop
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
            SVG, PNG, JPG or GIF (max. 800x400px)
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-900 dark:text-white">
              Selected Files ({files.length})
            </h4>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                      {getFileIcon(file)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
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
            onClick={handleSubmit}
            disabled={files.length === 0}
            className={cn(
              files.length === 0 && "opacity-50 cursor-not-allowed",
            )}
          >
            Upload {files.length > 0 && `(${files.length})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
