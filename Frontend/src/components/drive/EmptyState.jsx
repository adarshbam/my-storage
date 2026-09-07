import React from 'react';
import { Upload, Share2, Clock, Star, Plus } from "lucide-react";
import { cn } from "../../lib/utils";

export default function EmptyState({ specialView, isSearch, openUploadModal, setModalInput, setModalType, setSelectedExt, setNewFileContent }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 sm:py-20 px-4 text-center text-slate-400 max-w-full">
      {specialView ? (
        <>
          <div
            className={cn(
              "p-5 sm:p-6 rounded-full mb-4 shadow-lg text-white/40 border border-white/5 bg-white/[0.02]",
              specialView === "shared" && "shadow-[0_0_30px_rgba(155,77,255,0.15)] text-relay-accent/80 border-relay-accent/20",
              specialView === "recent" && "shadow-[0_0_30px_rgba(0,207,255,0.15)] text-pulse-accent/80 border-pulse-accent/20",
              specialView === "starred" && "shadow-[0_0_30px_rgba(255,209,102,0.15)] text-beacon-accent/80 border-beacon-accent/20",
            )}
          >
            {specialView === "shared" ? (
              <Share2 size={36} className="sm:w-10 sm:h-10" />
            ) : specialView === "recent" ? (
              <Clock size={36} className="sm:w-10 sm:h-10" />
            ) : specialView === "starred" ? (
              <Star size={36} className="sm:w-10 sm:h-10" />
            ) : (
              <Upload size={36} className="sm:w-10 sm:h-10" />
            )}
          </div>
          <p className="text-base sm:text-lg font-medium mb-1.5 text-slate-800 dark:text-white">
            {isSearch
              ? "No search results found"
              : specialView === "shared"
                ? "No secure relays active"
                : specialView === "recent"
                  ? "No recent activity pulse"
                  : specialView === "starred"
                    ? "No priority beacons found"
                    : "No files yet"}
          </p>
          {!isSearch && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 max-w-sm text-center leading-relaxed">
              {specialView === "shared"
                ? "Shared access vaults from other nodes will appear here once authenticated."
                : specialView === "recent"
                  ? "Your recently accessed or modified vault assets will be indexed here."
                  : specialView === "starred"
                    ? "Star your critical assets or directories to beacon them to this control panel."
                    : ""}
            </p>
          )}
          {specialView === "github-repo" && !isSearch && (
            <button
              onClick={() => {
                setModalInput("README.md");
                setModalType("create-file");
                setSelectedExt(".md");
                setNewFileContent("# New Repository\n\nThis is an empty repository.");
              }}
              className="mt-4 px-6 py-2.5 bg-accent-primary text-accent-foreground font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-accent-glow/20 hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              Initialize with README.md
            </button>
          )}
        </>
      ) : (
        <>
          <div
            className="bg-white/40 dark:bg-white/[0.03] p-5 sm:p-6 rounded-full mb-4 cursor-pointer hover:bg-white/60 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_0_30px_rgba(20,184,166,0.06)] dark:shadow-[0_0_30px_rgba(20,184,166,0.1)]"
            onClick={openUploadModal}
          >
            <Upload size={36} className="sm:w-10 sm:h-10 text-accent-primary" />
          </div>
          <p className="text-base sm:text-lg font-medium mb-1.5 text-slate-800 dark:text-white">
            {isSearch ? "No search results found" : "This folder is empty"}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 max-w-sm text-center leading-relaxed">
            {isSearch ? "Try adjusting your search query" : "Drag and drop files here or use the upload button"}
          </p>
        </>
      )}
    </div>
  );
}
