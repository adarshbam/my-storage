import { useState, useMemo } from "react";
import { Copy, Check, ChevronDown, ChevronRight, FileCode, Plus, Minus } from "lucide-react";

export function parseGitDiff(patchText = "") {
  if (!patchText) return [];

  const lines = patchText.split("\n");
  const parsedChunks = [];
  let currentChunk = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[2], 10);
      }
      currentChunk = {
        header: line,
        lines: [],
      };
      parsedChunks.push(currentChunk);
    } else if (currentChunk) {
      if (line.startsWith("+")) {
        currentChunk.lines.push({
          type: "add",
          content: line.substring(1),
          oldLine: null,
          newLine: newLineNum++,
        });
      } else if (line.startsWith("-")) {
        currentChunk.lines.push({
          type: "delete",
          content: line.substring(1),
          oldLine: oldLineNum++,
          newLine: null,
        });
      } else {
        currentChunk.lines.push({
          type: "context",
          content: line.startsWith(" ") ? line.substring(1) : line,
          oldLine: oldLineNum++,
          newLine: newLineNum++,
        });
      }
    }
  }

  return parsedChunks;
}

export default function GitDiffViewer({
  filename,
  patch = "",
  status = "modified",
  additions = 0,
  deletions = 0,
  defaultExpanded = true,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const chunks = useMemo(() => parseGitDiff(patch), [patch]);

  const handleCopy = () => {
    navigator.clipboard.writeText(patch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (st) => {
    switch (st) {
      case "added":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "removed":
      case "deleted":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "renamed":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#141416] shadow-md my-3 font-sans text-xs">
      {/* File Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-[#1c1c1f] border-b border-slate-200 dark:border-white/5 select-none">
        <div
          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-0.5">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <FileCode size={16} className="text-accent-primary shrink-0" />
          <span className="font-mono font-bold text-slate-800 dark:text-white truncate">
            {filename}
          </span>
          <span
            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-md border font-bold ${getStatusColor(
              status,
            )}`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {(additions > 0 || deletions > 0) && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              {additions > 0 && (
                <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                  <Plus size={12} />
                  {additions}
                </span>
              )}
              {deletions > 0 && (
                <span className="text-rose-500 font-bold flex items-center gap-0.5">
                  <Minus size={12} />
                  {deletions}
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors"
            title="Copy patch"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Diff Content */}
      {isExpanded && (
        <div className="overflow-x-auto custom-scrollbar font-mono text-[12px] leading-relaxed">
          {chunks.length === 0 ? (
            <div className="p-4 text-center text-slate-400 dark:text-white/40 italic">
              {patch ? "Binary file or no text changes to display." : "No file changes in this commit."}
            </div>
          ) : (
            chunks.map((chunk, cIdx) => (
              <div key={cIdx} className="border-b border-white/5 last:border-b-0">
                {/* Chunk Header */}
                <div className="px-4 py-1 bg-slate-100 dark:bg-[#1a2333] text-slate-500 dark:text-sky-300/70 border-y border-slate-200 dark:border-white/5 font-semibold text-[11px]">
                  {chunk.header}
                </div>

                {/* Chunk Lines */}
                <div>
                  {chunk.lines.map((line, lIdx) => {
                    const isAdd = line.type === "add";
                    const isDel = line.type === "delete";
                    return (
                      <div
                        key={lIdx}
                        className={`flex items-stretch hover:brightness-110 transition-colors ${
                          isAdd
                            ? "bg-emerald-500/10 text-emerald-300 dark:bg-emerald-950/40"
                            : isDel
                              ? "bg-rose-500/10 text-rose-300 dark:bg-rose-950/40"
                              : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {/* Old Line Number */}
                        <span className="w-12 px-2 py-0.5 text-right text-[10px] text-slate-400 dark:text-slate-600 select-none bg-slate-50 dark:bg-black/20 shrink-0 border-r border-slate-200 dark:border-white/5">
                          {line.oldLine || ""}
                        </span>
                        {/* New Line Number */}
                        <span className="w-12 px-2 py-0.5 text-right text-[10px] text-slate-400 dark:text-slate-600 select-none bg-slate-50 dark:bg-black/20 shrink-0 border-r border-slate-200 dark:border-white/5">
                          {line.newLine || ""}
                        </span>
                        {/* Line Marker (+ / - / space) */}
                        <span className="w-6 py-0.5 text-center select-none shrink-0 font-bold opacity-60">
                          {isAdd ? "+" : isDel ? "-" : " "}
                        </span>
                        {/* Code Content */}
                        <span className="flex-1 py-0.5 pr-4 whitespace-pre overflow-x-auto">
                          {line.content}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
