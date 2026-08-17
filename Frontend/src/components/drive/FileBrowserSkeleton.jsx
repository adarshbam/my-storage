import React from "react";
import Skeleton from "../ui/Skeleton";

/**
 * FileBrowserSkeleton
 * YouTube-style fluid skeleton placeholders matching FileBrowser Grid & List layout.
 */
export const FileBrowserSkeleton = ({
  viewMode = "grid",
  count = 12,
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-1.5 pb-20 relative select-none flex-1 content-start animate-fade-in">
        {/* List Header Mock */}
        <div className="grid grid-cols-[1fr,100px,150px,40px] gap-4 px-4 py-3 text-sm font-semibold text-slate-500 border-b border-slate-200/50 dark:border-slate-800/50 mb-2 items-center">
          <div>Name</div>
          <div className="text-right">Size</div>
          <div className="text-right pr-4">Modified</div>
          <div></div>
        </div>

        {/* List Rows */}
        {items.map((i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-vault-surface/50 border border-white/5"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {/* Left: Icon & Name */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-sm">
                <Skeleton className="h-4 w-4/5 rounded" />
                <Skeleton className="h-3 w-1/3 rounded opacity-60" />
              </div>
            </div>

            {/* Middle: Badges / Tags (Desktop) */}
            <div className="hidden md:flex items-center gap-3 mr-8">
              <Skeleton className="w-16 h-5 rounded-md" />
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="w-12 h-3 rounded" />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="w-7 h-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid Mode Skeleton
  return (
    <div className="pb-20 relative select-none flex-1 content-start grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6 p-6 rounded-[2.5rem] vault-glass-panel animate-fade-in">
      {items.map((i) => (
        <div
          key={i}
          className="flex flex-col rounded-2xl bg-vault-surface/60 border border-white/5 overflow-hidden shadow-sm"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          {/* Top Thumbnail Box */}
          <div className="relative aspect-[4/3] w-full bg-black/40 border-b border-white/5 p-3 flex flex-col justify-between overflow-hidden">
            {/* Top-left badge placeholder */}
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-16 h-5 rounded-md" />
            </div>

            {/* Center icon placeholder */}
            <div className="self-center">
              <Skeleton className="w-12 h-12 rounded-xl" />
            </div>

            {/* Bottom action placeholders */}
            <div className="flex items-center justify-between gap-1.5 opacity-40">
              <Skeleton className="w-14 h-5 rounded-md" />
              <Skeleton className="w-7 h-5 rounded-md" />
            </div>
          </div>

          {/* Bottom Content Area */}
          <div className="p-4 space-y-2">
            {/* Title Line */}
            <Skeleton className="h-4 w-4/5 rounded" />
            {/* Subtitle / Size & Badge Line */}
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-2/5 rounded opacity-60" />
              <Skeleton className="h-4 w-16 rounded-md opacity-40" />
            </div>

            {/* Bottom Meta Line (Status tags/dots) */}
            <div className="flex items-center gap-2 pt-1.5 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-1.5 h-1.5 rounded-full opacity-70" />
                <Skeleton className="h-2.5 w-12 rounded opacity-50" />
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <Skeleton className="w-1.5 h-1.5 rounded-full opacity-70" />
                <Skeleton className="h-2.5 w-10 rounded opacity-50" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileBrowserSkeleton;
