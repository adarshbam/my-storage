import React from "react";
import Skeleton from "../ui/Skeleton";

/**
 * High-performance, GPU-accelerated Skeleton loader for File Previews
 * Replaces normal spinning loaders with realistic IDE, media, and document shimmer layouts.
 */
export default function FilePreviewSkeleton({ type = "code", fileName = "" }) {
  if (type === "code" || type === "text") {
    // Realistic code structure mock lines with indentations and widths
    const mockCodeLines = [
      { indent: 0, width: "35%", opacity: 0.9 },
      { indent: 0, width: "50%", opacity: 0.7 },
      { indent: 1, width: "65%", opacity: 0.8 },
      { indent: 1, width: "45%", opacity: 0.6 },
      { indent: 2, width: "75%", opacity: 0.85 },
      { indent: 2, width: "55%", opacity: 0.7 },
      { indent: 2, width: "30%", opacity: 0.5 },
      { indent: 1, width: "20%", opacity: 0.5 },
      { indent: 1, width: "80%", opacity: 0.8 },
      { indent: 2, width: "60%", opacity: 0.75 },
      { indent: 2, width: "40%", opacity: 0.6 },
      { indent: 1, width: "25%", opacity: 0.5 },
      { indent: 0, width: "15%", opacity: 0.6 },
    ];

    return (
      <div className="h-full flex flex-col bg-[#1e1e1e] rounded-xl border border-white/10 shadow-2xl overflow-hidden min-h-[420px] animate-in fade-in duration-150">
        {/* Editor Mock Header */}
        <div className="px-4 py-2.5 bg-[#252526] border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]/40 animate-pulse" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]/40 animate-pulse" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]/40 animate-pulse" />
            <Skeleton className="ml-3 w-28 h-3.5 rounded bg-white/10" />
          </div>
          <Skeleton className="w-16 h-3 rounded bg-white/10" />
        </div>

        {/* Code Lines Body */}
        <div className="flex-1 p-5 overflow-hidden flex gap-4 bg-[#1e1e1e]">
          {/* Gutter Line Numbers */}
          <div className="flex flex-col gap-2.5 text-right select-none opacity-20 text-xs font-mono text-slate-400 shrink-0 w-6">
            {mockCodeLines.map((_, i) => (
              <span key={i} className="leading-none">
                {i + 1}
              </span>
            ))}
          </div>

          {/* Code Shimmer Blocks */}
          <div className="flex-1 flex flex-col gap-2.5 pt-0.5">
            {mockCodeLines.map((line, idx) => (
              <div
                key={idx}
                className="flex items-center"
                style={{
                  paddingLeft: line.indent ? `${line.indent * 1.25}rem` : "0",
                }}
              >
                <Skeleton
                  className="h-3.5 rounded-sm bg-white/10"
                  style={{
                    width: line.width,
                    opacity: line.opacity,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Editor Mock Status Bar */}
        <div className="px-4 py-1.5 bg-[#007acc]/40 border-t border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-14 h-2.5 rounded bg-white/20" />
            <Skeleton className="w-16 h-2.5 rounded bg-white/20" />
          </div>
          <Skeleton className="w-12 h-2.5 rounded bg-white/20" />
        </div>
      </div>
    );
  }

  if (type === "image") {
    return (
      <div className="relative flex flex-col items-center justify-center h-full min-h-[350px] bg-slate-950/40 rounded-2xl border border-white/5 overflow-hidden p-6 animate-in fade-in duration-150">
        <div className="w-full max-w-md aspect-[16/10] relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
          <Skeleton className="w-full h-full rounded-2xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none opacity-40">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
              <span className="text-xs font-mono">IMG</span>
            </div>
            <span className="text-xs text-white/50 font-medium">
              Loading image preview...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "pdf") {
    return (
      <div className="w-full h-full min-h-[400px] bg-slate-900/60 rounded-xl border border-white/10 p-6 flex flex-col gap-4 animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <Skeleton className="w-40 h-5 rounded" />
          <Skeleton className="w-20 h-4 rounded" />
        </div>
        <div className="flex-1 space-y-3 pt-2">
          <Skeleton className="w-full h-4 rounded opacity-80" />
          <Skeleton className="w-[90%] h-4 rounded opacity-70" />
          <Skeleton className="w-[95%] h-4 rounded opacity-75" />
          <Skeleton className="w-[70%] h-4 rounded opacity-60" />
          <div className="h-4" />
          <Skeleton className="w-[85%] h-4 rounded opacity-80" />
          <Skeleton className="w-[92%] h-4 rounded opacity-70" />
          <Skeleton className="w-[60%] h-4 rounded opacity-60" />
        </div>
      </div>
    );
  }

  if (type === "media") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-slate-950/50 rounded-2xl border border-white/5 p-6 animate-in fade-in duration-150">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="w-full aspect-video rounded-xl" />
          <div className="flex items-center justify-between px-2">
            <Skeleton className="w-24 h-4 rounded" />
            <Skeleton className="w-16 h-4 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Modal Shell Skeleton (Used for instant Suspense fallback)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[70vh] rounded-3xl bg-vault-surface/90 border border-vault-emerald/20 shadow-2xl flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg bg-vault-emerald/10" />
            <div className="space-y-1.5">
              <Skeleton className="w-36 h-4 rounded" />
              <Skeleton className="w-24 h-3 rounded opacity-50" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        </div>

        {/* Body Skeleton */}
        <div className="flex-1 p-6 bg-slate-950/50 overflow-hidden">
          <FilePreviewSkeleton type="code" />
        </div>
      </div>
    </div>
  );
}
