import React from 'react';
import { Upload, Share2, Clock, Star, Plus, Sparkles, Zap } from "lucide-react";
import { cn } from "../../lib/utils";
import { usePlan } from "../../context/PlanContext";

export default function EmptyState({ specialView, isSearch, openUploadModal, setModalInput, setModalType, setSelectedExt, setNewFileContent, title, description }) {
  const { isNoPlan, isNoSubscription, canUseFreeTrial, allowUpload } = usePlan();
  const isPlanRestricted = !specialView && !isSearch && (isNoPlan || isNoSubscription || allowUpload === false);

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 sm:py-20 px-4 text-center text-slate-400 max-w-full">
      {specialView ? (
        <>
          <div
            className="p-5 sm:p-6 rounded-full mb-4 text-accent-primary border border-accent-border/40 bg-accent-soft shadow-[0_0_30px_var(--accent-glow)]"
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
            {title || (isSearch
              ? "No search results found"
              : specialView === "shared"
                ? "No secure relays active"
                : specialView === "recent"
                  ? "No recent activity pulse"
                  : specialView === "starred"
                    ? "No priority beacons found"
                    : "No files yet")}
          </p>
          {!isSearch && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 max-w-sm text-center leading-relaxed">
              {description || (specialView === "shared"
                ? "Shared access vaults from other nodes will appear here once authenticated."
                : specialView === "recent"
                  ? "Your recently accessed or modified vault assets will be indexed here."
                  : specialView === "starred"
                    ? "Star your critical assets or directories to beacon them to this control panel."
                    : "")}
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
      ) : isPlanRestricted ? (
        <>
          <div
            className="bg-accent-soft p-5 sm:p-6 rounded-full mb-4 cursor-pointer hover:opacity-80 transition-all duration-300 shadow-accent-glow-sm border border-accent-border text-accent-primary"
            onClick={() => window.dispatchEvent(new CustomEvent("subscription:prompt"))}
          >
            <Sparkles size={36} className="sm:w-10 sm:h-10 animate-pulse" />
          </div>
          <p className="text-base sm:text-lg font-bold mb-1.5 text-slate-800 dark:text-white">
            {title || "Storage Subscription Required"}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 max-w-sm text-center leading-relaxed">
            {description ||
              (canUseFreeTrial
                ? "You currently have no active storage subscription. Start your 30-Day Free Trial to enable file uploads and cloud sync."
                : "Your vault is in read-only mode. An active storage plan is required to upload files.")}
          </p>
          <div className="flex items-center gap-2.5 mt-4">
            {canUseFreeTrial ? (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("subscription:prompt"))}
                className="px-4 py-2.5 bg-accent-primary text-accent-foreground font-bold text-xs rounded-xl shadow-accent-glow flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-all"
              >
                <Sparkles size={14} /> Start 30-Day Free Trial
              </button>
            ) : (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("subscription:prompt"))}
                className="px-4 py-2.5 bg-accent-primary text-accent-foreground font-bold text-xs rounded-xl shadow-md shadow-accent-glow/20 flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-all"
              >
                <Zap size={14} fill="currentColor" /> Choose a Storage Plan
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div
            className="bg-accent-soft p-5 sm:p-6 rounded-full mb-4 cursor-pointer hover:opacity-90 transition-all duration-300 border border-accent-border/40 shadow-[0_0_30px_var(--accent-glow)]"
            onClick={openUploadModal}
          >
            <Upload size={36} className="sm:w-10 sm:h-10 text-accent-primary" />
          </div>
          <p className="text-base sm:text-lg font-medium mb-1.5 text-slate-800 dark:text-white">
            {title || (isSearch ? "No search results found" : "This folder is empty")}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 max-w-sm text-center leading-relaxed">
            {description || (isSearch ? "Try adjusting your search query" : "Drag and drop files here or use the upload button")}
          </p>
        </>
      )}
    </div>
  );
}
