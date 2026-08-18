import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Copy,
  Check,
  Info,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Share2,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Key,
  Globe,
  Shield,
  QrCode,
  Sparkles,
  ExternalLink,
  Layers,
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import Button from "../ui/Button";
import { usePlan } from "../../context/PlanContext";

export default function ShareVaultModal({ isOpen, onClose, items = [] }) {
  const { hasFeature, isNoPlan } = usePlan();

  const [shareLinks, setShareLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  // Form State
  const [selectedItems, setSelectedItems] = useState([]);
  const [title, setTitle] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("read");
  const [accessType, setAccessType] = useState("public"); // "public" | "restricted"
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [expiryPreset, setExpiryPreset] = useState("never"); // "never", "1h", "24h", "7d", "30d", "custom"
  const [customExpiryDate, setCustomExpiryDate] = useState("");
  const [maxDownloads, setMaxDownloads] = useState("");
  const [ownerAgreed, setOwnerAgreed] = useState(false);

  // Result state
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQRPreview, setShowQRPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchShareLinks();
      setSelectedItems(items || []);
      setTitle("");
      setSelectedPermission("read");
      setAccessType("public");
      setHasPassword(false);
      setPassword("");
      setShowPassword(false);
      setExpiryPreset("never");
      setCustomExpiryDate("");
      setMaxDownloads("");
      setOwnerAgreed(false);
      setGeneratedLink("");
      setCopiedLink(false);
      setShowQRPreview(false);
    }
  }, [isOpen, items]);

  const fetchShareLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await fetch(`${SERVER_URL}/share/links`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setShareLinks(data.links || []);
      }
    } catch (error) {
      console.error("Error fetching share links:", error);
    } finally {
      setLoadingLinks(false);
    }
  };

  const calculateExpiryTimestamp = () => {
    const now = new Date();
    if (expiryPreset === "1h") return new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString();
    if (expiryPreset === "24h") return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    if (expiryPreset === "7d") return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    if (expiryPreset === "30d") return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    if (expiryPreset === "custom" && customExpiryDate) return new Date(customExpiryDate).toISOString();
    return null; // Never expires
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setHasPassword(true);
    setShowPassword(true);
  };

  const handleRemoveItem = (id) => {
    setSelectedItems((prev) => prev.filter((i) => (i._id || i.id) !== id));
  };

  const handleCreateShareLink = async () => {
    if (selectedPermission === "owner" && !ownerAgreed) {
      alert("Please accept the risk agreement before generating an Owner link.");
      return;
    }
    if (hasPassword && !password.trim()) {
      alert("Please enter a password or uncheck 'Require Password'.");
      return;
    }

    setGeneratingLink(true);
    try {
      const expiresAt = calculateExpiryTimestamp();

      const res = await fetch(`${SERVER_URL}/share/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          expiresAt,
          permission: [selectedPermission],
          accessType,
          hasPassword,
          password: hasPassword ? password.trim() : null,
          maxDownloads: maxDownloads ? Number(maxDownloads) : null,
          items: selectedItems.map((item) => ({
            id: item._id || item.id,
            type: item.type,
            provider: item.provider || "local",
            name: item.name,
            size: item.size || 0,
            extension: item.extension || "",
          })),
        }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const fullUrl = `${window.location.origin}/shared-access/${data.token}`;
        setGeneratedLink(fullUrl);
        fetchShareLinks();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to generate share link");
      }
    } catch (error) {
      console.error("Error creating share link:", error);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRevokeShareLink = async (linkId) => {
    if (
      !window.confirm(
        "Are you sure you want to revoke this share link? External access will be permanently revoked."
      )
    )
      return;

    try {
      const res = await fetch(`${SERVER_URL}/share/link/${linkId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        if (generatedLink && generatedLink.includes(linkId)) {
          setGeneratedLink("");
        }
        fetchShareLinks();
      }
    } catch (error) {
      console.error("Error revoking share link:", error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-vault-surface text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[88vh] overflow-y-auto custom-scrollbar">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-accent-soft text-accent-primary rounded-2xl border border-accent-border shadow-accent-glow-sm">
            <Share2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
              {selectedItems.length > 0 ? "Share Selected Items" : "Share Entire Vault"}
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-white/50 mb-5">
          Generate an encrypted relay link with custom permissions, password protection, and expiration timers.
        </p>

        {/* Selected Items Chip Box */}
        {selectedItems.length > 0 ? (
          <div className="mb-6 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-white/40">
                Selected Items ({selectedItems.length}):
              </span>
              <button
                onClick={() => setSelectedItems([])}
                className="text-[10px] text-slate-400 hover:text-danger-accent transition-colors"
              >
                Clear (Share Whole Vault)
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[90px] overflow-y-auto custom-scrollbar">
              {selectedItems.map((item) => (
                <div
                  key={item._id || item.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white shadow-sm"
                >
                  <span className={item.type === "directory" ? "text-accent-primary" : "text-slate-600 dark:text-white/70"}>
                    {item.type === "directory" ? "📁" : "📄"}
                  </span>
                  <span className="text-slate-900 dark:text-white truncate max-w-[140px]" title={item.name}>
                    {item.name}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item._id || item.id)}
                    className="p-0.5 text-slate-400 hover:text-danger-accent"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-accent-soft/30 border border-accent-border/40 rounded-2xl p-3 flex items-center gap-3">
            <Layers size={18} className="text-accent-primary shrink-0" />
            <span className="text-xs text-slate-700 dark:text-white/70">
              <strong>Entire Vault Node:</strong> All root files and folders will be accessible under the specified clearance.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Configure & Generate */}
          <div className="space-y-4">
            <h3 className="font-bold text-accent-primary text-xs uppercase tracking-widest border-b border-accent-border/30 pb-2 flex items-center gap-2">
              <Key size={14} />
              Configure Relay Node
            </h3>

            {(!hasFeature("share_links") || isNoPlan) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl flex items-start gap-2">
                <Lock size={15} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Plan Required</span>
                  <span className="text-white/60">
                    Generating links requires an active storage plan.{" "}
                    <Link to="/dashboard/billing" onClick={onClose} className="text-amber-400 font-bold underline">
                      Upgrade plan
                    </Link>
                  </span>
                </div>
              </div>
            )}

            {/* Link Title / Label */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-white/40 mb-1">
                Link Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Project Delivery Assets"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs focus:border-accent-primary outline-none transition-all shadow-sm"
              />
            </div>

            {/* Security Clearance */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-white/40 mb-1">
                Security Clearance
              </label>
              <select
                value={selectedPermission}
                disabled={!hasFeature("share_links") || isNoPlan}
                onChange={(e) => {
                  setSelectedPermission(e.target.value);
                  setOwnerAgreed(false);
                }}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs focus:border-accent-primary outline-none transition-all cursor-pointer [&>option]:bg-white dark:[&>option]:bg-vault-black disabled:opacity-40 shadow-sm"
              >
                <option value="read">Read Only (Standard)</option>
                <option value="write">Read & Write (Elevated)</option>
                <option value="owner">Full Admin / Owner (Full Node + Integrations)</option>
              </select>
            </div>

            {selectedPermission === "read" && (
              <div className="p-2.5 bg-document-accent/10 border border-document-accent/20 text-document-accent text-[11px] rounded-xl flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>Guests can view and download files. No edits allowed.</span>
              </div>
            )}

            {selectedPermission === "write" && (
              <div className="p-2.5 bg-media-accent/10 border border-media-accent/20 text-media-accent text-[11px] rounded-xl flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>Guests can view, upload, rename, edit, and delete files.</span>
              </div>
            )}

            {selectedPermission === "owner" && (
              <div className="p-3 bg-danger-accent/10 border border-danger-accent/30 text-danger-accent text-xs rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>Full control + shared Google Drive & GitHub credentials.</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none bg-black/30 p-2 rounded-lg border border-danger-accent/20">
                  <input
                    type="checkbox"
                    checked={ownerAgreed}
                    onChange={(e) => setOwnerAgreed(e.target.checked)}
                    className="rounded border-danger-accent text-danger-accent"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    I understand the risk
                  </span>
                </label>
              </div>
            )}

            {/* Access Mode: Public vs Restricted */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-white/40 mb-1 font-mono">
                Access Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccessType("public")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    accessType === "public"
                      ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/40"
                      : "bg-slate-100 dark:bg-black/30 text-slate-600 dark:text-white/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                  }`}
                >
                  <Globe size={13} />
                  Public (Direct)
                </button>
                <button
                  type="button"
                  onClick={() => setAccessType("restricted")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    accessType === "restricted"
                      ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/40"
                      : "bg-slate-100 dark:bg-black/30 text-slate-600 dark:text-white/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                  }`}
                >
                  <Shield size={13} />
                  Restricted (Auth)
                </button>
              </div>
            </div>

            {/* Password Protection */}
            <div className="p-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white/80 cursor-pointer">
                  <Lock size={13} className={hasPassword ? "text-amber-500" : "text-slate-400 dark:text-white/40"} />
                  Password Protection
                </label>
                <input
                  type="checkbox"
                  checked={hasPassword}
                  onChange={(e) => setHasPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-black/50 text-amber-500"
                />
              </div>

              {hasPassword && (
                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter security password"
                      className="w-full pl-3 pr-16 py-1.5 bg-white dark:bg-black/60 border border-amber-500/30 text-slate-900 dark:text-white rounded-xl text-xs focus:border-amber-400 outline-none font-mono shadow-sm"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles size={11} /> Generate Random Password
                  </button>
                </div>
              )}
            </div>

            {/* Expiration Preset Selection */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-white/40 mb-1 font-mono">
                Link Expiration
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {[
                  { id: "never", label: "Never" },
                  { id: "24h", label: "24 Hours" },
                  { id: "7d", label: "7 Days" },
                  { id: "30d", label: "30 Days" },
                  { id: "custom", label: "Custom Date" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setExpiryPreset(preset.id)}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold border transition-all ${
                      expiryPreset === preset.id
                        ? "bg-accent-soft text-accent-primary border-accent-border font-bold shadow-sm"
                        : "bg-slate-100 dark:bg-black/30 text-slate-600 dark:text-white/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {expiryPreset === "custom" && (
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-primary pointer-events-none" size={14} />
                  <input
                    type="date"
                    value={customExpiryDate}
                    onChange={(e) => setCustomExpiryDate(e.target.value)}
                    min={new Date().toLocaleDateString('en-CA')}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs focus:border-accent-primary outline-none cursor-pointer shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleCreateShareLink}
              disabled={generatingLink || (selectedPermission === "owner" && !ownerAgreed) || !hasFeature("share_links") || isNoPlan}
              className="w-full py-2.5 text-xs font-bold shadow-accent-glow"
            >
              {generatingLink ? "Generating Secure Tokens..." : "Generate Relay Link"}
            </Button>

            {/* Generated Link Result State */}
            {generatedLink && (
              <div className="mt-3 p-3.5 bg-accent-soft/30 border border-accent-border/40 rounded-2xl space-y-2.5 animate-fade-in shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold tracking-widest uppercase text-accent-primary">
                    Relay Link Ready
                  </p>
                  <button
                    onClick={() => setShowQRPreview(!showQRPreview)}
                    className="text-[10px] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                  >
                    <QrCode size={12} /> {showQRPreview ? "Hide QR" : "Show QR"}
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 bg-white dark:bg-black/60 border border-slate-200 dark:border-accent-border/30 text-slate-900 dark:text-white font-mono text-xs rounded-xl px-3 py-2 focus:outline-none shadow-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedLink)}
                    className="px-3.5 py-2 rounded-xl bg-accent-primary text-accent-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                {showQRPreview && (
                  <div className="p-3 bg-slate-900 rounded-xl text-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatedLink)}&bgcolor=07110e&color=00d4a5`}
                      alt="QR Code"
                      className="w-36 h-36 mx-auto rounded-lg mb-1"
                    />
                    <span className="text-[10px] text-white/50 font-mono">Scan to open on mobile</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Active Links for this Item / Vault */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
              <h3 className="font-bold text-slate-500 dark:text-white/50 text-xs font-mono uppercase tracking-widest">
                Active Relay Nodes ({shareLinks.length})
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {loadingLinks ? (
                <div className="text-center py-10 text-slate-400 dark:text-white/30 text-xs font-mono animate-pulse">
                  Scanning active nodes...
                </div>
              ) : shareLinks.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-black/20 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 dark:text-white/30 text-xs font-mono uppercase tracking-widest">
                  No active share links.
                </div>
              ) : (
                shareLinks.map((link) => {
                  const isLinkExpired = link.isExpired || (link.expiresAt && new Date(link.expiresAt) < new Date());
                  return (
                    <div
                      key={link._id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 rounded-2xl transition-all group shadow-sm"
                    >
                      <div className="overflow-hidden pr-2 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider shrink-0 ${
                              link.permission?.includes("owner")
                                ? "bg-danger-accent/20 text-danger-accent"
                                : link.permission?.includes("write")
                                ? "bg-media-accent/20 text-media-accent"
                                : "bg-document-accent/20 text-document-accent"
                            }`}
                          >
                            {link.permission?.[0] || "read"}
                          </span>

                          {link.hasPassword && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-500/20 text-amber-600 dark:text-amber-300">
                              🔒 Protected
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-slate-500 dark:text-white/50 truncate">
                            {isLinkExpired ? "Expired" : link.expiresAt ? `Exp: ${new Date(link.expiresAt).toLocaleDateString()}` : "Never"}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-slate-600 dark:text-white/60 truncate flex items-center gap-2">
                          Token: ••••••••{link.token.substring(link.token.length - 8)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/shared-access/${link.token}`)}
                          className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                          title="Copy Link"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleRevokeShareLink(link._id)}
                          className="p-2 text-slate-400 hover:text-danger-accent hover:bg-danger-accent/10 rounded-xl transition-colors"
                          title="Revoke Link"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
