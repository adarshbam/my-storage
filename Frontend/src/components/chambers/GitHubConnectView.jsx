import { useState } from "react";
import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import { VaultLogo, VaultGitIcon } from "../ui/VaultIcons";
import {
  RefreshCw,
  FolderGit2,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function GitHubConnectView({
  onConnect,
  isConnecting = false,
  error = null,
  disconnectedNotice = false,
}) {
  const [hasAgreed, setHasAgreed] = useState(true);

  const handleConnectClick = () => {
    if (!hasAgreed || isConnecting) return;
    onConnect();
  };

  const capabilities = [
    {
      icon: FolderGit2,
      title: "Repository Explorer",
      description:
        "Browse full directory trees, read source files with live syntax highlighting, and preview Markdown documentation directly in your browser.",
    },
    {
      icon: GitBranch,
      title: "Branches, Commits & PRs",
      description:
        "Switch branches, review commit timelines, inspect pull request discussions, and monitor GitHub Actions CI/CD workflows seamlessly.",
    },
    {
      icon: RefreshCw,
      title: "Vault Bridge & Bi-directional Sync",
      description:
        "Clone remote repositories into your encrypted Vault storage or transfer Vault assets directly into GitHub branches with one click.",
    },
    {
      icon: ShieldCheck,
      title: "Zero-Harvesting Privacy Guarantee",
      description:
        "Code and repositories stream strictly on-demand via authenticated GitHub APIs. OAuth tokens are encrypted at rest with instant revocation.",
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
              GitHub has been disconnected from Vault OS. You can reconnect anytime to restore chamber access.
            </span>
          </div>
        )}

        {/* Error notification if connection failed or session expired */}
        {error && !disconnectedNotice && (
          <div className="w-full mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-3 backdrop-blur-md">
            <AlertTriangle size={18} className="shrink-0 text-rose-500" />
            <div className="flex-1">
              <div className="font-semibold mb-0.5">Authorization Notice</div>
              <div className="text-xs opacity-90">{error}</div>
            </div>
          </div>
        )}

        {/* Main Glassmorphic Presentation Card */}
        <div className="w-full rounded-3xl bg-white/80 dark:bg-vault-surface/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-slate-900/5 dark:shadow-black/40 p-6 sm:p-10 flex flex-col items-center text-center relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none opacity-40 dark:opacity-20 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)",
            }}
          />

          {/* Visual Connection Bridge: Vault OS <-> Sync Stream <-> GitHub */}
          <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6 py-3 px-5 sm:px-7 rounded-2xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 mb-6 shadow-sm">
            {/* Vault Node */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-soft border border-accent-border text-accent-primary shadow-sm">
              <VaultLogo size={22} />
              <span className="text-xs font-black tracking-widest uppercase">VAULT</span>
            </div>

            {/* Glowing Sync Stream */}
            <div className="flex items-center gap-1 text-slate-400 dark:text-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-ping" />
              <RefreshCw
                size={16}
                className="text-accent-primary animate-spin [animation-duration:8s]"
              />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-ping [animation-delay:400ms]" />
            </div>

            {/* GitHub Node */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-white/[0.08] dark:text-white border border-slate-800 dark:border-white/15 shadow-sm">
              <VaultGitIcon size={22} />
              <span className="text-xs font-black tracking-wider uppercase">GitHub</span>
            </div>
          </div>

          {/* Chamber Status Pill */}
          <div className="relative z-10 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-accent-soft text-accent-primary border border-accent-border">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_6px_var(--accent-glow)]" />
              Chamber Integration
            </span>
          </div>

          {/* Heading & Subtitle */}
          <h2 className="relative z-10 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
            Link GitHub Chamber to Vault OS
          </h2>
          <p className="relative z-10 text-xs sm:text-sm text-slate-600 dark:text-white/60 max-w-xl mx-auto leading-relaxed mb-8">
            Connect your GitHub account to turn Vault OS into a unified command center. Browse your repositories, inspect branch histories, manage pull requests, and synchronize code seamlessly.
          </p>

          {/* 4 Core Capabilities Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full text-left mb-8">
            {capabilities.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.025] border border-slate-200/60 dark:border-white/5 hover:border-accent-border/40 hover:bg-accent-soft/5 transition-all group"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-2 rounded-xl bg-accent-soft text-accent-primary border border-accent-border/40 group-hover:scale-105 transition-transform">
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
                  <strong>Encrypted Credentials:</strong> OAuth tokens are AES-256 encrypted at rest.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>On-Demand Streaming:</strong> Repository files are accessed strictly when requested.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Training:</strong> Your code is never used to train machine learning models.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Revoke Anytime:</strong> One-click disconnect with immediate token deletion.
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Consent Agreement Checkbox */}
          <div className="relative z-10 mb-6 text-left max-w-lg">
            <Checkbox
              id="github-consent"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              variant="accent"
              size="md"
              labelClassName="text-[11px] sm:text-xs text-slate-600 dark:text-white/70 leading-relaxed font-normal"
              label="I authorize Vault OS to connect to my GitHub account to read repositories, branches, and code as outlined in the data security policy above."
            />
          </div>

          {/* Action Trigger Area */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <Button
              onClick={handleConnectClick}
              disabled={!hasAgreed || isConnecting}
              className={`px-8 py-3.5 rounded-2xl bg-accent-primary hover:opacity-90 text-accent-foreground font-bold text-sm shadow-xl shadow-accent-glow flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto ${
                !hasAgreed ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isConnecting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <VaultGitIcon size={20} />
              )}
              <span>{isConnecting ? "Connecting to GitHub..." : "Connect GitHub Account"}</span>
            </Button>
          </div>

          {/* OAuth Scope & Disconnect Policy Info */}
          <p className="relative z-10 text-[11px] text-slate-400 dark:text-white/40 mt-4 leading-relaxed max-w-md">
            You will be redirected to GitHub to authorize access (<span className="font-mono text-[10px]">repo</span>, <span className="font-mono text-[10px]">user:email</span>). You can disconnect your GitHub chamber at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
