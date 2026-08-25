import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Link2,
  X,
  Loader2,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  FolderOpen,
  User,
  Share2,
  Calendar,
  Clipboard,
  ExternalLink,
  ShieldAlert,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code2,
  Download,
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import Button from "../ui/Button";
import { formatSize, getProfilePicUrl, getInitials } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { usePlan } from "../../context/PlanContext";

function getItemIcon(item) {
  if (item.type === "directory") return FolderOpen;
  const ext = (item.extension || item.name?.split(".").pop() || "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"].some((e) => ext.includes(e))) return ImageIcon;
  if (["mp4", "mkv", "mov", "webm"].some((e) => ext.includes(e))) return Film;
  if (["mp3", "wav", "flac"].some((e) => ext.includes(e))) return Music;
  if (["zip", "rar", "7z", "tar"].some((e) => ext.includes(e))) return Archive;
  if (["js", "py", "html", "css", "json", "ts"].some((e) => ext.includes(e))) return Code2;
  return FileText;
}

function formatAvatarUrl(url) {
  if (!url) return null;
  let clean = url;
  if (clean.startsWith("https://localhost:") || clean.startsWith("https://127.0.0.1:")) {
    clean = clean.replace("https://", "http://");
  }
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  return `${SERVER_URL}${clean.startsWith("/") ? "" : "/"}${clean}`;
}

/**
 * Extracts a token from a full URL, relative path, or direct token string.
 */
function extractTokenFromInput(input) {
  if (!input) return "";
  const trimmed = input.trim();
  try {
    const urlObj = new URL(trimmed.startsWith("http") ? trimmed : `http://dummy.com/${trimmed.replace(/^\/+/, "")}`);
    const segments = urlObj.pathname.split("/").filter(Boolean);
    const prefixIdx = segments.findIndex((s) =>
      ["shared-access", "share", "shared", "shared-link", "s"].includes(s)
    );
    if (prefixIdx !== -1 && segments[prefixIdx + 1]) {
      return segments[prefixIdx + 1];
    }
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }
  } catch (_) {}
  const match = trimmed.match(/[a-zA-Z0-9_-]{16,}/);
  return match ? match[0] : trimmed;
}

export default function AccessSharedLinkModal({ isOpen, onClose, onClaimSuccess }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inputUrl, setInputUrl] = useState("");
  const [extractedToken, setExtractedToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkData, setLinkData] = useState(null);

  // Password state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [unlocking, setUnlocking] = useState(false);

  // Claim state
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  // Plan state
  const { isNoPlan, hasFeature } = usePlan();

  const isFullAdmin = (linkData?.permission || []).includes("owner") || Boolean(linkData?.requiresFullAdminPlan);
  const hasGithub = (linkData?.items || []).some((i) => i.provider === "github") || Boolean(linkData?.hasGithubItems);
  const hasGdrive = (linkData?.items || []).some((i) => i.provider === "google_drive" || i.provider === "drive") || Boolean(linkData?.hasGdriveItems);
  const hasDropbox = (linkData?.items || []).some((i) => i.provider === "dropbox") || Boolean(linkData?.hasDropboxItems);

  const isFullAdminBlocked = isFullAdmin && isNoPlan;
  const isExternalBlocked =
    (hasGithub && (isNoPlan || !hasFeature("github_backup"))) ||
    (hasGdrive && (isNoPlan || !hasFeature("gdrive_sync"))) ||
    (hasDropbox && (isNoPlan || !hasFeature("dropbox_sync")));

  const isClaimBlocked = isFullAdminBlocked || isExternalBlocked;

  if (!isOpen) return null;

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text);
          handleInspect(text);
        }
      }
    } catch (err) {
      console.warn("Clipboard access denied:", err);
    }
  };

  const handleInspect = async (rawInput = inputUrl, pwd = "") => {
    const token = extractTokenFromInput(rawInput);
    if (!token) {
      setError("Please enter a valid share link or token.");
      return;
    }

    setExtractedToken(token);
    setLoading(true);
    setError(null);
    setPasswordError(null);
    setOwnerImgError(false);

    try {
      const url = pwd
        ? `${SERVER_URL}/share/token/${token}?password=${encodeURIComponent(pwd)}`
        : `${SERVER_URL}/share/token/${token}`;

      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();

      if (res.ok) {
        setLinkData(data);
      } else {
        if (res.status === 401 && pwd) {
          setPasswordError(data.error || "Incorrect password");
        } else if (res.status === 401 && data.requiresPassword) {
          setLinkData(data);
        } else {
          setError(data.error || "Share link not found, expired, or deactivated.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
      setUnlocking(false);
    }
  };

  const handleUnlockWithPassword = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError("Please enter the password");
      return;
    }
    setUnlocking(true);
    handleInspect(extractedToken || inputUrl, password.trim());
  };

  const handleClaim = async () => {
    if (!extractedToken) return;

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/shared-access/${extractedToken}`)}`);
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const res = await fetch(`${SERVER_URL}/share/claim/${extractedToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        setClaimSuccess(true);
        if (onClaimSuccess) {
          onClaimSuccess(extractedToken);
        }
        setTimeout(() => {
          onClose();
          navigate("/dashboard/shared");
        }, 1500);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to connect to this shared relay.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    } finally {
      setClaiming(false);
    }
  };

  const handleOpenFullPage = () => {
    if (extractedToken) {
      onClose();
      navigate(`/shared-access/${extractedToken}`);
    }
  };

  const handleReset = () => {
    setInputUrl("");
    setExtractedToken("");
    setLinkData(null);
    setError(null);
    setPassword("");
    setPasswordError(null);
    setOwnerImgError(false);
    setClaimSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-vault-panel/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent-primary border border-accent-border flex items-center justify-center shrink-0 shadow-accent-glow-sm">
              <Link2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Access Shared Relay</h2>
              <p className="text-xs text-slate-500 dark:text-white/40">
                Paste a shared link or security token to view & connect
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input & Paste Section */}
        {!linkData && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-white/60">
                Shared Link or Relay Token
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleInspect(inputUrl);
                    }
                  }}
                  placeholder="e.g. http://localhost:5173/shared-access/..."
                  className="w-full pl-4 pr-24 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm font-mono placeholder-slate-400 dark:placeholder-white/30 focus:border-accent-primary outline-none transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="absolute right-2 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-semibold text-slate-700 dark:text-white flex items-center gap-1.5 transition-colors"
                  title="Paste from clipboard"
                >
                  <Clipboard size={13} />
                  <span>Paste</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-red-500">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={() => handleInspect(inputUrl)}
              disabled={loading || !inputUrl.trim()}
              className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-accent-glow"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Inspecting Link...
                </>
              ) : (
                <>
                  <FolderOpen size={16} />
                  Inspect & Connect
                </>
              )}
            </Button>
          </div>
        )}

        {/* Link Data Preview State */}
        {linkData && (
          <div className="space-y-4 animate-fade-in">
            {claimSuccess ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center text-center space-y-2">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full animate-bounce">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-base font-bold text-emerald-400">Access Granted!</h3>
                <p className="text-xs text-slate-600 dark:text-white/60">
                  Added to your <strong>Shared With Me</strong> relays.
                </p>
              </div>
            ) : linkData.requiresPassword ? (
              /* Password Gate */
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3 text-center">
                <div className="w-10 h-10 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Password Protected Relay
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    This shared link requires an encrypted password to view.
                  </p>
                </div>

                <form onSubmit={handleUnlockWithPassword} className="space-y-3 pt-1">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      placeholder="Enter security password"
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-mono focus:border-amber-400 outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {passwordError && (
                    <p className="text-xs text-red-500 text-left">{passwordError}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={unlocking || !password.trim()}
                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    {unlocking ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Unlocking...
                      </>
                    ) : (
                      <>
                        <Key size={14} />
                        Unlock Access
                      </>
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              /* Unlocked Relay Preview */
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent-primary border border-accent-border flex items-center justify-center shrink-0">
                        <Share2 size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {linkData.title || (linkData.items?.length === 1 ? linkData.items[0].name : "Shared Vault Node")}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-white/40 font-mono">
                          <span>{linkData.items?.length || 0} items</span>
                          <span>•</span>
                          <span className="capitalize">{linkData.permission?.[0] || "Read Only"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Owner info */}
                  {linkData.owner && (
                    <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center gap-2.5 text-xs">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {linkData.owner.profilepic && !ownerImgError ? (
                          <img
                            src={getProfilePicUrl(linkData.owner.profilepic)}
                            alt={linkData.owner.name}
                            className="w-full h-full object-cover"
                            onError={() => setOwnerImgError(true)}
                          />
                        ) : (
                          <span className="text-[10px] font-black text-accent-primary uppercase select-none">
                            {getInitials(linkData.owner.name, linkData.owner.email)}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-600 dark:text-white/60 truncate">
                        Shared by <strong>{linkData.owner.name || linkData.owner.email}</strong>
                      </span>
                    </div>
                  )}

                  {/* Items preview list */}
                  {linkData.items && linkData.items.length > 0 && (
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar pt-1">
                      {linkData.items.slice(0, 4).map((item) => {
                        const Icon = getItemIcon(item);
                        return (
                          <div
                            key={item.id || item._id}
                            className="px-2.5 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Icon size={13} className="text-slate-400 dark:text-white/50 shrink-0" />
                              <span className="truncate text-slate-700 dark:text-white/80">{item.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-white/40 font-mono shrink-0">
                              {item.size ? formatSize(item.size) : item.type}
                            </span>
                          </div>
                        );
                      })}
                      {linkData.items.length > 4 && (
                        <p className="text-[10px] text-center text-slate-400 dark:text-white/40 font-mono">
                          +{linkData.items.length - 4} more items
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Plan Gating Warning Banners */}
                {isFullAdminBlocked && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Lock className="text-amber-500 shrink-0" size={16} />
                      <span><strong>Subscription Required:</strong> Full Admin access requires an active storage plan.</span>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        navigate("/dashboard/billing");
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500 text-black text-[11px] font-bold shrink-0 hover:bg-amber-400"
                    >
                      View Plans
                    </button>
                  </div>
                )}

                {isExternalBlocked && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Lock className="text-amber-500 shrink-0" size={16} />
                      <span><strong>Plan Upgrade Required:</strong> Shared GitHub/Google Drive assets require a Professional or Ultimate plan.</span>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        navigate("/dashboard/billing");
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500 text-black text-[11px] font-bold shrink-0 hover:bg-amber-400"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-500">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handleClaim}
                    disabled={claiming || isClaimBlocked}
                    className="flex-1 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-accent-glow disabled:opacity-50"
                  >
                    {claiming ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Connecting...
                      </>
                    ) : isClaimBlocked ? (
                      <>
                        <Lock size={14} />
                        Subscription Plan Required
                      </>
                    ) : (
                      <>
                        <FolderOpen size={14} />
                        Accept & Add to Relays
                      </>
                    )}
                  </Button>

                  <button
                    onClick={handleOpenFullPage}
                    className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-bold flex items-center justify-center transition-colors shrink-0"
                    title="Open Full Access View"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Back / Reset link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white underline transition-colors"
              >
                Connect a different link
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
