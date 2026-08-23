import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Download,
  FileText,
  FileCode,
  FileAudio,
  AlertCircle,
  Image as ImageIcon,
  Edit,
  Save,
  Check,
  Maximize,
  Minimize,
  Copy,
  CheckCheck,
  WrapText,
  FileVideo,
  History,
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import { getFileCdnUrl } from "../../api/files.api";
import Button from "../ui/Button";
import Editor from "react-simple-code-editor";
import { usePlan } from "../../context/PlanContext";
import FilePreviewSkeleton from "./FilePreviewSkeleton";
import {
  getCachedContent,
  setCachedContent,
  invalidateCache,
  isTextOrCode,
} from "../../lib/fileCache";

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
import "prismjs/themes/prism-tomorrow.css";

const MAX_HIGHLIGHT_LINES = 2500;

/**
 * Lightweight, GPU-accelerated Code Viewer with line numbers and 0-lag rendering
 */
function CodeViewer({ code, language, wrapText = false }) {
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => {
    if (!code) return [];
    return code.split("\n");
  }, [code]);

  const isVeryLarge = lines.length > MAX_HIGHLIGHT_LINES;

  const highlightedHtml = useMemo(() => {
    if (!code) return "";
    try {
      const grammar =
        Prism.languages[language] ||
        Prism.languages.javascript ||
        Prism.languages.clike ||
        Prism.languages.markup;

      // For extraordinarily huge files, highlight safely or fallback to raw escaped text
      const targetCode = isVeryLarge
        ? lines.slice(0, MAX_HIGHLIGHT_LINES).join("\n") +
          `\n\n/* ... Truncated ${lines.length - MAX_HIGHLIGHT_LINES} lines for high performance ... */`
        : code;

      return Prism.highlight(targetCode, grammar, language);
    } catch {
      return code.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m]));
    }
  }, [code, language, isVeryLarge, lines]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-[#141416] rounded-2xl border border-slate-300 dark:border-white/10 shadow-2xl overflow-hidden relative group">
      {/* Code Header Bar */}
      <div className="px-4 py-2.5 bg-[#1c1c1f] border-b border-white/5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {lines.length} {lines.length === 1 ? "line" : "lines"}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 uppercase font-mono tracking-wider font-bold">
            {language}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-sm"
          title="Copy code"
        >
          {copied ? (
            <>
              <CheckCheck size={14} className="text-accent-primary" />
              <span className="text-accent-primary">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Viewport with Gutter Line Numbers */}
      <div className="flex-1 overflow-auto custom-scrollbar flex bg-[#141416] text-sm font-mono leading-relaxed">
        {/* Line Numbers Gutter */}
        <div className="py-4 pl-3 pr-4 select-none text-right text-slate-600 text-xs font-mono border-r border-white/5 bg-[#101012] shrink-0 min-w-[3.5rem]">
          {(isVeryLarge ? lines.slice(0, MAX_HIGHLIGHT_LINES + 2) : lines).map(
            (_, idx) => (
              <div key={idx} className="h-6 leading-6">
                {idx + 1}
              </div>
            ),
          )}
        </div>

        {/* Code Pre Block */}
        <pre
          className={`flex-1 py-4 px-4 m-0 overflow-x-auto text-slate-200 ${
            wrapText ? "whitespace-pre-wrap break-words" : "whitespace-pre"
          }`}
          style={{ fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace' }}
        >
          <code
            className={`language-${language} text-[13px] leading-6 inline-block w-full`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>

      {/* Footer Bar */}
      <div className="px-4 py-2 bg-[#0e0e10] border-t border-white/5 flex justify-between items-center text-[11px] text-slate-400 font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-accent-primary font-bold">
            <Check size={12} /> UTF-8
          </span>
          <span className="opacity-80">Spaces: 2</span>
        </div>
        <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono text-slate-300 font-bold">
          READ ONLY
        </span>
      </div>
    </div>
  );
}

export default function FilePreviewModal({
  file,
  isOpen,
  onClose,
  ownerId,
  selectedBranch,
  onViewHistory,
}) {
  const { isNoPlan, rules } = usePlan();
  const allowEdit = !isNoPlan && (rules?.permissions?.allowUpload ?? true);

  // Check cache immediately on state initialization for instant 0ms mount
  const initialCached = file?._id ? getCachedContent(file._id) : null;

  const [content, setContent] = useState(initialCached);
  const [editedContent, setEditedContent] = useState(initialCached || "");
  const [loading, setLoading] = useState(
    !initialCached && isTextOrCode(file?.extension),
  );
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSha, setCurrentSha] = useState(file?.sha || null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(file?.name || "");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [wrapText, setWrapText] = useState(false);
  const [cdnUrl, setCdnUrl] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (file?.sha) setCurrentSha(file.sha);
    if (file?.name) setTempName(file.name);
    setImgLoaded(false);
  }, [file]);

  const handleRenameSubmit = async () => {
    if (!tempName.trim() || tempName === file.name) {
      setIsRenaming(false);
      setTempName(file.name);
      return;
    }

    try {
      const isGithub = file.provider === "github";
      if (isGithub) {
        alert(
          "GitHub inline renaming is limited. Use the dashboard menu for full control.",
        );
        setTempName(file.name);
        setIsRenaming(false);
        return;
      }

      let url = `${SERVER_URL}/file/${file._id}`;
      if (ownerId) {
        url += `?ownerId=${ownerId}`;
      }
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newFileName: tempName.trim() }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Rename failed");

      // Invalidate cache on rename
      invalidateCache(file._id);

      // Update the file object in place for the current view
      file.name = tempName.trim();
      setIsRenaming(false);
    } catch (err) {
      console.error(err);
      alert("Failed to rename file");
      setTempName(file.name);
      setIsRenaming(false);
    }
  };

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
    if (!isOpen || !file) {
      setCdnUrl(null);
      return;
    }

    // Reset preview and loading states
    setImgLoaded(false);
    setCdnUrl(null);
    setError(null);

    // Abort controller for fast network cancellation
    const abortController = new AbortController();

    const isVaultStorage =
      file.provider !== "github" && file.provider !== "google_drive";

    const fetchContent = async () => {
      const ext = file.extension?.toLowerCase();
      const isText = isTextOrCode(ext);

      if (isVaultStorage) {
        // 1. Check RAM cache for text/code first for 0ms instant display
        if (isText) {
          const cached = getCachedContent(file._id);
          if (cached !== null) {
            setContent(cached);
            setEditedContent(cached);
            setLoading(false);
            setError(null);
            return;
          }
        }

        setLoading(true);
        setError(null);

        try {
          // Fetch signed CDN URL from Express backend
          const params = ownerId ? { ownerId } : {};
          const cdnData = await getFileCdnUrl(file._id, params);
          if (!cdnData || !cdnData.url) {
            throw new Error("Failed to obtain CDN preview URL");
          }

          if (abortController.signal.aborted) return;
          setCdnUrl(cdnData.url);

          // For text/code, fetch content directly from the signed CDN URL
          if (isText) {
            const res = await fetch(cdnData.url, {
              signal: abortController.signal,
            });

            if (!res.ok) throw new Error("Failed to load content from CDN");
            const text = await res.text();

            if (abortController.signal.aborted) return;

            // Store in high-performance RAM cache
            setCachedContent(file._id, text);

            setContent(text);
            setEditedContent(text);
          } else {
            setContent(null);
          }
        } catch (err) {
          if (err.name === "AbortError" || abortController.signal.aborted) return;
          console.error("CDN Preview fetch error:", err);
          setError(err.message || "Failed to load file content");
        } finally {
          if (!abortController.signal.aborted) {
            setLoading(false);
          }
        }
      } else {
        // External provider (GitHub or Google Drive)
        if (isText) {
          const cached = getCachedContent(file._id);
          if (cached !== null) {
            setContent(cached);
            setEditedContent(cached);
            setLoading(false);
            setError(null);
            return;
          }

          setLoading(true);
          setError(null);

          try {
            let url =
              file.provider === "github"
                ? `${SERVER_URL}/github/file/${file.githubPath?.split("/").map(encodeURIComponent).join("/")}${
                    selectedBranch ? `?ref=${encodeURIComponent(selectedBranch)}` : ""
                  }`
                : `${SERVER_URL}/drive/file/${file._id}`;

            if (ownerId) {
              url += (url.includes("?") ? "&" : "?") + `ownerId=${ownerId}`;
            }

            const res = await fetch(url, {
              credentials: "include",
              signal: abortController.signal,
            });

            if (!res.ok) throw new Error("Failed to load content");
            const text = await res.text();

            if (abortController.signal.aborted) return;

            setCachedContent(file._id, text);

            setContent(text);
            setEditedContent(text);
          } catch (err) {
            if (err.name === "AbortError" || abortController.signal.aborted) return;
            console.error(err);
            setError("Failed to load file content");
          } finally {
            if (!abortController.signal.aborted) {
              setLoading(false);
            }
          }
        } else {
          setContent(null);
          setLoading(false);
        }
      }
    };

    fetchContent();

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      abortController.abort();
      document.body.style.overflow = "unset";
    };
  }, [file, isOpen, ownerId, selectedBranch]);

  if (!isOpen || !file) return null;

  const isVaultStorage =
    file.provider !== "github" && file.provider !== "google_drive";

  let externalFileUrl = "";
  if (!isVaultStorage) {
    externalFileUrl =
      file.provider === "github"
        ? `${SERVER_URL}/github/file/${file.githubPath?.split("/").map(encodeURIComponent).join("/")}${
            selectedBranch ? `?ref=${encodeURIComponent(selectedBranch)}` : ""
          }`
        : `${SERVER_URL}/drive/file/${file._id}`;

    if (ownerId) {
      externalFileUrl +=
        (externalFileUrl.includes("?") ? "&" : "?") + `ownerId=${ownerId}`;
    }
  }

  const previewSrc = isVaultStorage ? cdnUrl : externalFileUrl;

  const handleSave = async () => {
    setSaving(true);
    try {
      const isGithub = file.provider === "github";
      let url = isGithub
        ? `${SERVER_URL}/github/file/${file.githubPath?.split("/").map(encodeURIComponent).join("/")}${
            selectedBranch ? `?ref=${encodeURIComponent(selectedBranch)}` : ""
          }`
        : `${SERVER_URL}/file/${file._id}/save`;

      if (ownerId) {
        url += (url.includes("?") ? "&" : "?") + `ownerId=${ownerId}`;
      }

      const body = isGithub
        ? JSON.stringify({
            content: btoa(unescape(encodeURIComponent(editedContent))),
            sha: currentSha,
          })
        : JSON.stringify({ content: editedContent });

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: body,
        credentials: "include",
      });

      let data = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { message: text };
      }

      if (!res.ok)
        throw new Error(data.error || data.message || "Failed to save file");

      if (isGithub && data.content?.sha) {
        setCurrentSha(data.content.sha);
      }

      // Update RAM cache with newly saved content
      setCachedContent(file._id, editedContent);

      setContent(editedContent);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    let downloadUrl =
      file.provider === "github"
        ? `${SERVER_URL}/github/file/${file.githubPath?.split("/").map(encodeURIComponent).join("/")}?action=download`
        : file.provider === "google_drive"
          ? `${SERVER_URL}/drive/file/${file._id}?action=download`
          : `${SERVER_URL}/file/${file._id}?action=download`;
    if (ownerId) {
      downloadUrl += `&ownerId=${ownerId}`;
    }

    if (isVaultStorage) {
      try {
        const cdnData = await getFileCdnUrl(file._id, {
          ...(ownerId ? { ownerId } : {}),
          action: "download",
        });
        if (cdnData && cdnData.url) {
          downloadUrl = cdnData.url;
        }
      } catch (err) {
        console.error(
          "Failed to obtain CDN download URL for modal download, falling back to direct route:",
          err.message,
        );
      }
    }

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

  const getLanguage = (ext) => {
    const map = {
      ".js": "javascript",
      ".jsx": "jsx",
      ".ts": "typescript",
      ".tsx": "tsx",
      ".json": "json",
      ".css": "css",
      ".html": "markup",
      ".xml": "markup",
      ".py": "python",
      ".java": "java",
      ".c": "c",
      ".cpp": "cpp",
      ".h": "c",
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
        <div className="relative flex items-center justify-center h-full bg-slate-950/50 rounded-2xl overflow-hidden border border-white/5">
          {(!imgLoaded || (isVaultStorage && !cdnUrl)) && (
            <div className="absolute inset-0 z-0">
              <FilePreviewSkeleton type="image" />
            </div>
          )}
          {previewSrc && (
            <img
              src={previewSrc}
              alt={file.name}
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 relative z-10 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              crossOrigin={isVaultStorage ? undefined : "use-credentials"}
              onLoad={() => setImgLoaded(true)}
              onError={() => setError("Failed to load image")}
            />
          )}
        </div>
      );
    }

    if (isVideo(ext)) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-950/50 rounded-2xl overflow-hidden border border-white/5">
          {previewSrc ? (
            <video
              src={previewSrc}
              controls
              className="max-w-full max-h-full rounded-lg"
              crossOrigin={isVaultStorage ? undefined : "use-credentials"}
            />
          ) : (
            <FilePreviewSkeleton type="video" />
          )}
        </div>
      );
    }

    if (isPdf(ext)) {
      return (
        <div className="w-full h-full">
          {previewSrc ? (
            <iframe
              src={previewSrc}
              className="w-full h-full rounded-2xl bg-white border-0"
              title={file.name}
            />
          ) : (
            <FilePreviewSkeleton type="pdf" />
          )}
        </div>
      );
    }

    if (isAudio(ext)) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-950/50 rounded-2xl overflow-hidden border border-white/5">
          {previewSrc ? (
            <audio
              src={previewSrc}
              controls
              className="w-full max-w-md"
              crossOrigin={isVaultStorage ? undefined : "use-credentials"}
            />
          ) : (
            <div className="text-slate-400 text-sm">Loading audio preview...</div>
          )}
        </div>
      );
    }

    if (isTextOrCode(ext)) {
      if (loading) {
        return <FilePreviewSkeleton type="code" fileName={file.name} />;
      }

      if (error) {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-red-400">
            <AlertCircle size={36} className="mb-2" />
            <p className="font-medium">{error}</p>
          </div>
        );
      }

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
                  {file.name} — Live Editor
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
                    const grammar =
                      Prism.languages[lang] ||
                      Prism.languages.javascript ||
                      Prism.languages.clike;
                    return Prism.highlight(code, grammar, lang);
                  } catch {
                    return code;
                  }
                }}
                padding={24}
                style={{
                  fontFamily:
                    '"Cascadia Code", "Fira Code", "Fira Mono", monospace',
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
            <div className="px-4 py-2 bg-[#121214] border-t border-white/5 flex justify-between items-center text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-accent-primary font-bold">
                  <Check size={12} /> UTF-8
                </span>
                <span className="opacity-80">Spaces: 2</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider font-mono text-slate-300 font-bold">
                  {getLanguage(ext)}
                </span>
              </div>
            </div>
          </div>
        );
      }

      // Fast, lightweight Code Viewer
      return (
        <CodeViewer
          code={content || ""}
          language={getLanguage(ext)}
          wrapText={wrapText}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="bg-slate-200 dark:bg-white/[0.04] p-5 rounded-full mb-4 border border-slate-300 dark:border-white/5">
          {ext === ".zip" ? <AlertCircle size={32} /> : <FileText size={32} />}
        </div>
        <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">Preview not available</p>
        <p className="text-xs text-slate-500 dark:text-white/40 mb-5">
          Binary format ({ext?.toUpperCase() || "File"}) can be downloaded to view.
        </p>
        <Button onClick={handleDownload} className="flex items-center gap-2 shadow-accent-glow">
          <Download size={16} /> Download File
        </Button>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200 ${
        isFullscreen ? "p-0" : "p-3 sm:p-6"
      }`}
    >
      {!isFullscreen && <div className="absolute inset-0" onClick={onClose} />}
      <div
        ref={modalRef}
        className={`relative bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_35px_var(--accent-glow)] flex flex-col border border-slate-200/90 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-150 transition-all ${
          isFullscreen
            ? "w-full h-full rounded-none"
            : "w-full max-w-6xl h-[82vh] rounded-3xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3.5 overflow-hidden">
            <div className="p-2.5 bg-accent-soft border border-accent-border rounded-2xl text-accent-primary shrink-0 shadow-sm shadow-accent-glow/10">
              {isTextOrCode(file.extension) ? (
                <FileCode size={20} />
              ) : isAudio(file.extension) ? (
                <FileAudio size={20} />
              ) : isVideo(file.extension) ? (
                <FileVideo size={20} />
              ) : isImage(file.extension) ? (
                <ImageIcon size={20} />
              ) : (
                <FileText size={20} />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              {isRenaming ? (
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit();
                    if (e.key === "Escape") {
                      setIsRenaming(false);
                      setTempName(file.name);
                    }
                  }}
                  autoFocus
                  className="bg-white dark:bg-black/40 border border-accent-primary rounded-xl px-2.5 py-1 text-sm font-bold text-slate-900 dark:text-white outline-none w-full max-w-[240px] shadow-sm"
                />
              ) : (
                <h3
                  className={`text-base font-black text-slate-900 dark:text-white tracking-tight truncate ${
                    allowEdit
                      ? "cursor-pointer hover:text-accent-primary"
                      : "cursor-default"
                  } transition-colors`}
                  title={allowEdit ? "Double click to rename" : file.name}
                  onDoubleClick={() => {
                    if (allowEdit) setIsRenaming(true);
                  }}
                >
                  {file.name}
                </h3>
              )}
              <span className="text-[10px] text-slate-500 dark:text-white/40 font-mono flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-accent-primary font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse"></span>
                  AES-256 SECURED
                </span>
                <span className="opacity-40">|</span>
                <span className="uppercase tracking-wider">
                  {file.provider === "github"
                    ? "GITHUB SECURE RELAY"
                    : file.provider === "google_drive"
                      ? "DRIVE SECURE RELAY"
                      : "VAULT LOCAL NODE"}
                </span>
                {isNoPlan && (
                  <>
                    <span className="opacity-40">|</span>
                    <span className="text-amber-500 font-bold tracking-wider">
                      READ ONLY
                    </span>
                  </>
                )}
                {isEditing && (
                  <>
                    <span className="opacity-40">|</span>
                    <span className="text-accent-primary font-bold tracking-wider">
                      LIVE EDIT
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isTextOrCode(file.extension) && !loading && (
              <>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWrapText(!wrapText)}
                    title={wrapText ? "Disable Word Wrap" : "Enable Word Wrap"}
                    className={wrapText ? "text-accent-primary bg-accent-soft" : "text-slate-500 dark:text-white/60"}
                  >
                    <WrapText size={16} />
                  </Button>
                )}
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedContent(content);
                      }}
                      className="text-slate-500 hover:text-rose-500"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || !allowEdit}
                      className="flex items-center gap-2 bg-accent-primary text-accent-foreground shadow-accent-glow"
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                ) : allowEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className={`flex items-center gap-2 font-bold ${
                      saveSuccess ? "text-accent-primary bg-accent-soft" : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {saveSuccess ? <Check size={16} /> : <Edit size={16} />}
                    {saveSuccess ? "Saved!" : "Edit"}
                  </Button>
                ) : null}
                <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />
              </>
            )}
            {file.provider === "github" && onViewHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewHistory(file)}
                title="View Commit History"
                className="text-slate-600 dark:text-white/70 hover:text-accent-primary flex items-center gap-1.5 font-bold"
              >
                <History size={16} />
                <span className="hidden sm:inline text-xs">History</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              title="Download"
              className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white"
            >
              <Download size={18} />
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`flex-1 overflow-auto bg-slate-100/70 dark:bg-black/40 ${
            isPdf(file.extension) ? "p-0 overflow-hidden" : "p-4 md:p-6"
          }`}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
