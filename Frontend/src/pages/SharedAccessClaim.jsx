import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Loader2,
  ShieldAlert,
  CheckCircle,
  FolderOpen,
  User,
  Lock,
  Key,
  Eye,
  EyeOff,
  Download,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code2,
  Share2,
  Globe,
  Calendar,
  Layers,
} from "lucide-react";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { formatSize } from "../lib/utils";

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

export default function SharedAccessClaim() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [linkData, setLinkData] = useState(null);
  const [success, setSuccess] = useState(false);

  // Password unlock state
  const [enteredPassword, setEnteredPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    fetchLinkDetails();
  }, [token]);

  const fetchLinkDetails = async (pwd = "") => {
    setLoading(true);
    setError(null);
    try {
      const url = pwd
        ? `${SERVER_URL}/share/token/${token}?password=${encodeURIComponent(pwd)}`
        : `${SERVER_URL}/share/token/${token}`;

      const res = await fetch(url, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setLinkData(data);
        setPasswordError(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401 && pwd) {
          setPasswordError(errData.error || "Incorrect password");
        } else {
          setError(
            errData.error ||
              "This share link is invalid, expired, or has been deactivated."
          );
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
    if (!enteredPassword.trim()) {
      setPasswordError("Please enter the password");
      return;
    }
    setUnlocking(true);
    fetchLinkDetails(enteredPassword.trim());
  };

  const handleDownload = (itemId) => {
    const pwdParam = enteredPassword ? `?password=${encodeURIComponent(enteredPassword)}` : "";
    window.location.href = `${SERVER_URL}/share/token/${token}/download/${itemId}${pwdParam}`;
  };

  const handleClaim = async () => {
    if (!user) {
      navigate(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    setClaiming(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/share/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/dashboard/shared");
        }, 2000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to claim shared access.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans transition-colors duration-300 relative flex items-center justify-center p-4">
      {/* Background radial effects */}
      <div className="fixed inset-0 z-[0] bg-[#f0f9f7] dark:bg-[#020b08] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-[radial-gradient(ellipse,rgba(20,184,166,0.12)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(20,184,166,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-lg bg-white/70 dark:bg-vault-surface/90 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
        
        {loading ? (
          <div className="flex flex-col items-center text-center py-6 space-y-4">
            <Skeleton variant="circular" className="w-16 h-16 bg-[#14b8a6]/20 mb-2" />
            <Skeleton className="w-48 h-6 rounded-lg" />
            <Skeleton className="w-64 h-4 rounded-md opacity-60" />
            <div className="w-full bg-slate-500/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/[0.04] rounded-2xl p-4 space-y-3 mt-4">
              <Skeleton className="w-24 h-3 rounded" />
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-8 h-8" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="w-32 h-3.5 rounded" />
                  <Skeleton className="w-20 h-3 rounded opacity-50" />
                </div>
              </div>
            </div>
            <Skeleton className="w-full h-11 rounded-xl mt-2" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="p-4 bg-red-500/10 text-red-500 rounded-full mb-4">
              <ShieldAlert size={36} />
            </div>
            <h2 className="text-xl font-bold mb-2">Access Link Unavailable</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm sm:text-base leading-relaxed">
              {error}
            </p>
            <Link to="/" className="w-full">
              <Button className="w-full py-2.5 rounded-xl">Go to Dashboard</Button>
            </Link>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="p-4 bg-emerald-500/15 text-emerald-500 rounded-full mb-4 animate-bounce">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Granted!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Connecting you to the shared Vault Node...
            </p>
          </div>
        ) : linkData?.requiresPassword ? (
          /* Password Protection Gate */
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 mb-4 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Lock size={32} />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold mb-1 text-white">
              Password Protected Vault
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              This relay link requires an encrypted security key to access.
            </p>

            <form onSubmit={handleUnlockWithPassword} className="w-full space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Enter vault password"
                  autoFocus
                  className="w-full pl-4 pr-12 py-3 bg-black/50 border border-white/10 text-white rounded-2xl text-sm focus:border-amber-400 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordError && (
                <p className="text-xs text-rose-400 text-left font-medium">
                  {passwordError}
                </p>
              )}

              <Button
                type="submit"
                disabled={unlocking}
                className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                {unlocking ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Unlocking Vault...
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    Unlock Access
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : (
          /* Unlocked Content / Shared Vault View */
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Share2 size={22} />
              </div>
              <div className="overflow-hidden">
                <h2 className="text-xl font-bold text-white truncate">
                  {linkData?.title || (linkData?.items?.length === 1 ? linkData.items[0].name : "Shared Vault Node")}
                </h2>
                <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
                  <span>{linkData?.items?.length || 0} items</span>
                  <span>•</span>
                  <span className="capitalize">{linkData?.permission?.[0] || "Read Only"}</span>
                </div>
              </div>
            </div>

            {/* Owner Details Card */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-3 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-vault-emerald/10 text-vault-emerald border border-vault-emerald/20 flex items-center justify-center overflow-hidden">
                {linkData?.owner?.profilepic ? (
                  <img
                    src={linkData.owner.profilepic}
                    alt={linkData.owner.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={18} />
                )}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate">
                  Shared by {linkData?.owner?.name || "Vault Member"}
                </p>
                <p className="text-[11px] text-white/40 truncate font-mono">
                  {linkData?.owner?.email}
                </p>
              </div>
            </div>

            {/* Items List / Preview */}
            <div className="space-y-2 mb-6 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {linkData?.items && linkData.items.length > 0 ? (
                linkData.items.map((item) => {
                  const ItemIcon = getItemIcon(item);
                  return (
                    <div
                      key={item.id || item._id}
                      className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-white/70">
                          <ItemIcon size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-white truncate" title={item.name}>
                            {item.name}
                          </p>
                          <span className="text-[10px] text-white/40 font-mono">
                            {item.size ? formatSize(item.size) : item.type === "directory" ? "Folder" : "File"}
                          </span>
                        </div>
                      </div>

                      {item.type === "file" && (
                        <button
                          onClick={() => handleDownload(item.id || item._id)}
                          className="px-2.5 py-1.5 rounded-lg bg-vault-emerald/10 hover:bg-vault-emerald/20 text-vault-emerald text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                          title="Download file"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-black/20 border border-dashed border-white/10 rounded-xl text-center text-xs text-white/40">
                  Full Vault Node Access Granted
                </div>
              )}
            </div>

            {/* Expiry Warning if set */}
            {linkData?.expiresAt && (
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono mb-5">
                <Calendar size={13} />
                <span>Expires on {new Date(linkData.expiresAt).toLocaleDateString()}</span>
              </div>
            )}

            {/* Claim to Vault Button */}
            <Button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.25)]"
            >
              {claiming ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Connecting Vault...
                </>
              ) : user ? (
                <>
                  <FolderOpen size={16} />
                  Accept & Add to My Vault
                </>
              ) : (
                <>
                  <User size={16} />
                  Login to Claim Node
                </>
              )}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
