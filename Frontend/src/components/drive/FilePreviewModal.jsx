import { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  FileText,
  FileCode,
  FileAudio,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Edit,
  Save,
  Check,
  Maximize,
  Minimize,
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Button from "../ui/Button";
import Editor from "react-simple-code-editor";
import * as Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup"; // for html/xml
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css"; // Base theme for the editor components

export default function FilePreviewModal({ file, isOpen, onClose }) {
  const [content, setContent] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef(null);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (!isOpen || !file) return;

    const fetchContent = async () => {
      // Only fetch content for text/code files
      if (isTextOrCode(file.extension)) {
        setLoading(true);
        setError(null);
        try {
          // Add timestamp to prevent caching
          const url =
            file.provider === "github"
              ? `${SERVER_URL}/github/file/${encodeURIComponent(file.githubPath)}?t=${Date.now()}`
              : `${SERVER_URL}/file/${file.id}?t=${Date.now()}`;
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) throw new Error("Failed to load content");
          const text = await res.text();
          setContent(text);
          setEditedContent(text);
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

  const fileUrl =
    file.provider === "github"
      ? `${SERVER_URL}/github/file/${encodeURIComponent(file.githubPath)}`
      : `${SERVER_URL}/file/${file.id}`;

  const handleSave = async () => {
    if (file.provider === "github") return; // Saving to GitHub not implemented yet
    setSaving(true);
    try {
      const res = await fetch(`${SERVER_URL}/file/${file.id}/save`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save file");
      setContent(editedContent);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const downloadUrl =
      file.provider === "github"
        ? `${SERVER_URL}/github/file/${encodeURIComponent(file.githubPath)}?action=download`
        : `${SERVER_URL}/file/${file.id}?action=download`;
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
            crossOrigin="use-credentials"
          />
        </div>
      );
    }

    if (isVideo(ext)) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-950/50 rounded-lg overflow-hidden">
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-full"
            crossOrigin="use-credentials"
          />
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
          <audio
            src={fileUrl}
            controls
            className="w-full max-w-md"
            crossOrigin="use-credentials"
          />
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

      if (isEditing) {
        return (
          <div className="h-full relative group bg-[#1e1e1e] rounded-xl border border-[#14b8a6]/40 shadow-2xl overflow-hidden flex flex-col min-h-[450px]">
            {/* Editor Toolbar/Header */}
            <div className="px-4 py-2 bg-[#252526] border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="ml-2 text-xs text-slate-400 font-medium tracking-wide">
                  {file.name} — Editor
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ""}
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-[#1e1e1e]">
              <Editor
                value={editedContent || ""}
                onValueChange={(code) => setEditedContent(code)}
                highlight={(code) => {
                  const lang = getLanguage(ext);
                  try {
                    const grammar = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.clike;
                    return Prism.highlight(code, grammar, lang);
                  } catch (e) {
                    return code;
                  }
                }}
                padding={24}
                style={{
                  fontFamily: '"Cascadia Code", "Fira Code", "Fira Mono", "Source Code Pro", monospace',
                  fontSize: 14,
                  minHeight: "100%",
                  color: "#d4d4d4",
                  lineHeight: "1.6",
                }}
                className="w-full focus:outline-none"
                insertSpaces={true}
                tabSize={2}
                textareaId="code-editor-textarea"
              />
            </div>

            {/* Editor Footer/Status Bar */}
            <div className="px-4 py-1.5 bg-[#007acc] flex justify-between items-center text-[11px] text-white font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Check size={10} /> UTF-8
                </span>
                <span className="opacity-80">Spaces: 2</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider">
                  {getLanguage(ext)}
                </span>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full overflow-auto rounded-lg border border-slate-700 bg-[#282c34] text-sm relative group">
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
        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-full mb-4">
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {!isFullscreen && <div className="absolute inset-0" onClick={onClose} />}
      <div 
        ref={modalRef}
        className={`relative bg-white/90 dark:bg-white/[0.05] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)] flex flex-col border border-black/10 dark:border-white/[0.08] animate-in zoom-in-95 duration-200 transition-all ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full max-w-5xl h-[70vh] rounded-[20px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-[#14b8a6]/10 rounded-lg text-[#14b8a6]">
              {isTextOrCode(file.extension) ? (
                <FileCode size={20} />
              ) : isAudio(file.extension) ? (
                <FileAudio size={20} />
              ) : isImage(file.extension) ? (
                <ImageIcon size={20} />
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
            {isTextOrCode(file.extension) && file.provider !== "github" && (
              <>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedContent(content);
                      }}
                      className="text-slate-500 hover:text-red-500"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-[#14b8a6] hover:bg-[#0d9488]"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className={`flex items-center gap-2 ${saveSuccess ? "text-[#14b8a6]" : "text-slate-500"}`}
                  >
                    {saveSuccess ? <Check size={16} /> : <Edit size={16} />}
                    {saveSuccess ? "Saved!" : "Edit"}
                  </Button>
                )}
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </Button>
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
