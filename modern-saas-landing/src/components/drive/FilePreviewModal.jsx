import { useState, useEffect } from "react";
import {
  X,
  Download,
  FileText,
  FileCode,
  FileAudio,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Button from "../ui/Button";

export default function FilePreviewModal({ file, isOpen, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !file) return;

    const fetchContent = async () => {
      // Only fetch content for text/code files
      if (isTextOrCode(file.extension)) {
        setLoading(true);
        setError(null);
        try {
          // Add timestamp to prevent caching
          const res = await fetch(
            `${SERVER_URL}/file/${file.id}?t=${Date.now()}`,
            {
              credentials: "include",
            },
          );
          if (!res.ok) throw new Error("Failed to load content");
          const text = await res.text();
          setContent(text);
        } catch (err) {
          console.error(err);
          setError("Failed to load file content");
        } finally {
          setLoading(false);
        }
      } else {
        setContent(null); // Reset content for other types
      }
    };

    fetchContent();

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const fileUrl = `${SERVER_URL}/file/${file.id}`;

  const handleDownload = () => {
    const downloadUrl = `${SERVER_URL}/file/${file.id}?action=download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = (ext) =>
    [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"].includes(
      ext?.toLowerCase(),
    );
  const isVideo = (ext) =>
    [".mp4", ".webm", ".ogg", ".mov"].includes(ext?.toLowerCase());
  const isAudio = (ext) =>
    [".mp3", ".wav", ".ogg", ".m4a"].includes(ext?.toLowerCase());
  const isPdf = (ext) => [".pdf"].includes(ext?.toLowerCase());
  const isTextOrCode = (ext) => {
    const list = [
      ".txt",
      ".md",
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".json",
      ".css",
      ".html",
      ".xml",
      ".yml",
      ".py",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".sql",
      ".sh",
      ".bat",
      ".log",
      ".env",
      ".gitignore",
    ];
    return list.includes(ext?.toLowerCase());
  };

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
      ".java": "java",
      ".c": "c",
      ".cpp": "cpp",
      ".sql": "sql",
      ".sh": "bash",
      ".md": "markdown",
    };
    return map[ext?.toLowerCase()] || "text";
  };

  const renderContent = () => {
    const ext = file.extension?.toLowerCase();

    if (isImage(ext)) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-950/50 rounded-lg overflow-hidden">
          <img
            src={fileUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    if (isVideo(ext)) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-950/50 rounded-lg overflow-hidden">
          <video src={fileUrl} controls className="max-w-full max-h-full" />
        </div>
      );
    }

    if (isPdf(ext)) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full rounded-lg bg-white"
          title={file.name}
        />
      );
    }

    if (isAudio(ext)) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-950/50 rounded-lg overflow-hidden">
          <audio src={fileUrl} controls className="w-full max-w-md" />
        </div>
      );
    }

    if (isTextOrCode(ext)) {
      if (loading)
        return (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        );
      if (error)
        return (
          <div className="flex flex-col items-center justify-center h-64 text-red-500">
            <AlertCircle size={32} className="mb-2" />
            <p>{error}</p>
          </div>
        );

      return (
        <div className="h-full overflow-auto rounded-lg border border-slate-700 bg-[#282c34] text-sm">
          <SyntaxHighlighter
            language={getLanguage(ext)}
            style={oneDark}
            customStyle={{ margin: 0, minHeight: "100%" }}
            showLineNumbers
          >
            {content || ""}
          </SyntaxHighlighter>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="bg-slate-800 p-4 rounded-full mb-4">
          {ext === ".zip" ? <AlertCircle size={32} /> : <FileText size={32} />}
        </div>
        <p className="text-lg font-medium mb-4">Preview not available</p>
        <Button onClick={handleDownload} className="flex items-center gap-2">
          <Download size={16} /> Download File
        </Button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col h-[70vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              {isTextOrCode(file.extension) ? (
                <FileCode size={20} />
              ) : isAudio(file.extension) ? (
                <FileAudio size={20} />
              ) : (
                <FileText size={20} />
              )}
            </div>
            <h3
              className="text-lg font-semibold text-slate-900 dark:text-white truncate"
              title={file.name}
            >
              {file.name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              title="Download"
            >
              <Download size={18} />
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50 ${
            isPdf(file.extension) ? "p-0 overflow-hidden" : "p-4 md:p-6"
          }`}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
