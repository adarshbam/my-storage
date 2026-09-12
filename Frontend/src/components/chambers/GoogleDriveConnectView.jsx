import { useState } from "react";
import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import { VaultLogo, VaultDriveIcon } from "../ui/VaultIcons";
import {
  RefreshCw,
  HardDrive,
  FolderTree,
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function GoogleDriveConnectView({
  onConnect,
  isConnecting = false,
  error = null,
  disconnectedNotice = false,
  onRetry = null,
}) {
  const [hasAgreed, setHasAgreed] = useState(true);

  const handleConnectClick = () => {
    if (!hasAgreed || isConnecting) return;
    onConnect();
  };

  const capabilities = [
    {
      icon: HardDrive,
      title: "Cloud Drive Explorer",
      description:
        "Directly browse your Google Drive directories, view file details, and stream audio, video, and documents natively in your browser.",
    },
    {
      icon: FolderTree,
      title: "Full Directory Management",
      description:
        "Navigate nested hierarchies, create new folders and text/code files, and organize assets with instantaneous updates.",
    },
    {
      icon: ArrowLeftRight,
      title: "Cross-Chamber Transfer",
      description:
        "Seamlessly drag and drop or copy/paste files and directories between encrypted Vault storage and Google Drive with live progress.",
    },
    {
      icon: ShieldCheck,
      title: "Zero-Harvesting Privacy Guarantee",
      description:
        "Files stream strictly on-demand via authenticated Google APIs. OAuth tokens are encrypted at rest with instant revocation.",
    },
  ];

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center py-6 sm:py-10 px-3 sm:px-6 animate-in fade-in duration-300">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Disconnect confirmation banner if recently disconnected */}
        {disconnectedNotice && (
          <div className="w-full mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs sm:text-sm flex items-center gap-3 backdrop-blur-md">
            <AlertTriangle size={18} className="shrink-0 text-amber-500" />
            <span>
              Google Drive has been disconnected from Vault OS. You can reconnect anytime to restore chamber access.
            </span>
          </div>
        )}

        {/* Error notification if connection failed or session expired */}
        {error && !disconnectedNotice && (
          <div className="w-full mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-3 backdrop-blur-md">
            <AlertTriangle size={18} className="shrink-0 text-rose-500" />
            <div className="flex-1 text-left">
              <div className="font-semibold mb-0.5">Authorization Notice</div>
              <div className="text-xs opacity-90">
                {error?.includes("invalid_grant") || error?.includes("expired")
                  ? "Your Google Drive session has expired or the token was revoked. Reconnect your Google account to restore instant access."
                  : error}
              </div>
            </div>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                className="px-3 py-1 text-xs shrink-0 flex items-center gap-1.5"
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </Button>
            )}
          </div>
        )}

        {/* Main Glassmorphic Presentation Card */}
        <div className="w-full rounded-3xl bg-white/80 dark:bg-vault-surface/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-slate-900/5 dark:shadow-black/40 p-6 sm:p-10 flex flex-col items-center text-center relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none opacity-40 dark:opacity-20 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
            }}
          />

          {/* Visual Connection Bridge: Vault OS <-> Sync Stream <-> Google Drive */}
          <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6 py-3 px-5 sm:px-7 rounded-2xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 mb-6 shadow-sm">
            {/* Vault Node */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-soft border border-accent-border text-accent-primary shadow-sm">
              <VaultLogo size={22} />
              <span className="text-xs font-black tracking-widest uppercase">VAULT</span>
            </div>

            {/* Glowing Sync Stream */}
            <div className="flex items-center gap-1 text-slate-400 dark:text-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <RefreshCw
                size={16}
                className="text-amber-500 animate-spin [animation-duration:8s]"
              />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping [animation-delay:400ms]" />
            </div>

            {/* Google Drive Node */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
              <VaultDriveIcon size={22} />
              <span className="text-xs font-black tracking-wider uppercase">Google Drive</span>
            </div>
          </div>

          {/* Chamber Status Pill */}
          <div className="relative z-10 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
              Chamber Integration
            </span>
          </div>

          {/* Heading & Subtitle */}
          <h2 className="relative z-10 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
            {error && !disconnectedNotice
              ? "Google Drive Authorization Expired"
              : "Link Google Drive Chamber to Vault OS"}
          </h2>
          <p className="relative z-10 text-xs sm:text-sm text-slate-600 dark:text-white/60 max-w-xl mx-auto leading-relaxed mb-8">
            Connect your Google Drive account to turn Vault OS into a unified cloud command center. Browse directories, manage files, stream media, and transfer data between Vault and Google Drive with ease.
          </p>

          {/* 4 Core Capabilities Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full text-left mb-8">
            {capabilities.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.025] border border-slate-200/60 dark:border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform">
                      <Icon size={16} />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/50 leading-relaxed pl-0.5">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Strict Security & Compliance Guarantees */}
          <div className="relative z-10 w-full p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 mb-8 text-left">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider mb-2.5">
              <ShieldCheck size={16} />
              <span>Strict Security & Data Protection Guarantees</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs text-slate-600 dark:text-white/70">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero AI Training:</strong> Drive files are never used to train machine learning models.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>On-Demand Streaming:</strong> Files remain on Google Drive and stream only when accessed.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Never Sold or Shared:</strong> Strictly adheres to Google API Services User Data Policy.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Revoke Anytime:</strong> One-click disconnect from Vault OS or directly via Google Account.
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Consent Agreement Checkbox */}
          <div className="relative z-10 mb-6 text-left max-w-lg">
            <Checkbox
              id="google-drive-consent"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              variant="accent"
              size="md"
              labelClassName="text-[11px] sm:text-xs text-slate-600 dark:text-white/70 leading-relaxed font-normal"
              label="I authorize Vault OS to connect to my Google Drive account to view, organize, and transfer files as outlined in the data security policy above."
            />
          </div>

          {/* Action Trigger Area */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <Button
              onClick={handleConnectClick}
              disabled={!hasAgreed || isConnecting}
              className={`px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto ${
                !hasAgreed ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isConnecting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <VaultDriveIcon size={20} />
              )}
              <span>
                {isConnecting
                  ? "Connecting to Google Drive..."
                  : error && !disconnectedNotice
                  ? "Reconnect Google Drive"
                  : "Connect Google Drive"}
              </span>
            </Button>
          </div>

          {/* Compliance & Policy Info */}
          <p className="relative z-10 text-[11px] text-slate-400 dark:text-white/40 mt-4 leading-relaxed max-w-md">
            Vault's use of information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 hover:underline"
            >
              Google API Services User Data Policy
            </a>
            . You can disconnect your Google Drive chamber at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
