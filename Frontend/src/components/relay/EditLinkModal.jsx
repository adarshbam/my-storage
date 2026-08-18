import { useState, useEffect } from "react";
import { X, Lock, Key, Calendar, Shield, ShieldAlert, AlertTriangle, Info, Check, Save } from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import Button from "../ui/Button";

export default function EditLinkModal({ isOpen, onClose, link, onUpdated }) {
  const [title, setTitle] = useState("");
  const [permission, setPermission] = useState("read");
  const [accessType, setAccessType] = useState("restricted");
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [maxDownloads, setMaxDownloads] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownerAgreed, setOwnerAgreed] = useState(false);

  useEffect(() => {
    if (link && isOpen) {
      setTitle(link.title || "");
      setPermission(
        link.permission && link.permission.includes("owner")
          ? "owner"
          : link.permission && link.permission.includes("write")
          ? "write"
          : "read"
      );
      setAccessType(link.accessType || "restricted");
      setHasPassword(Boolean(link.hasPassword));
      setPassword("");
      setExpiryDate(
        link.expiresAt
          ? new Date(link.expiresAt).toISOString().split("T")[0]
          : ""
      );
      setMaxDownloads(link.maxDownloads ? String(link.maxDownloads) : "");
      setIsActive(link.isActive !== false);
      setOwnerAgreed(link.permission && link.permission.includes("owner"));
    }
  }, [link, isOpen]);

  if (!isOpen || !link) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (permission === "owner" && !ownerAgreed) {
      alert("Please accept the risk agreement for Full Admin clearance.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        permission: [permission],
        accessType,
        isActive,
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : null,
        maxDownloads: maxDownloads ? Number(maxDownloads) : null,
        hasPassword,
      };

      if (hasPassword && password.trim()) {
        payload.password = password.trim();
      }

      const res = await fetch(`${SERVER_URL}/share/link/${link._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        onUpdated && onUpdated(data.link);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to update link settings");
      }
    } catch (err) {
      console.error("Error updating share link:", err);
      alert("An error occurred while saving changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-vault-surface text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
        >
          <X size={16} />
        </button>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-1 flex items-center gap-2">
          <Key size={18} className="text-accent-primary" />
          Edit Link Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-white/50 mb-5">
          Modify permissions, password protection, and access rules for this relay node.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Title / Alias */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-white/40 mb-1.5">
              Custom Link Label (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Project Delivery Assets"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:border-accent-primary outline-none transition-all shadow-sm"
            />
          </div>

          {/* Security Clearance */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-white/40 mb-1.5">
              Security Clearance
            </label>
            <select
              value={permission}
              onChange={(e) => {
                setPermission(e.target.value);
                setOwnerAgreed(false);
              }}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:border-accent-primary outline-none transition-all cursor-pointer [&>option]:bg-white dark:[&>option]:bg-vault-black shadow-sm"
            >
              <option value="read">Read Only (Standard)</option>
              <option value="write">Read & Write (Elevated)</option>
              <option value="owner">Full Admin / Owner (Full Node + External Integrations)</option>
            </select>
          </div>

          {permission === "owner" && (
            <div className="p-3 bg-danger-accent/10 border border-danger-accent/30 text-danger-accent text-xs rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>Grants complete write, delete, and shared external service credentials.</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ownerAgreed}
                  onChange={(e) => setOwnerAgreed(e.target.checked)}
                  className="rounded border-danger-accent text-danger-accent"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider">I understand the risk</span>
              </label>
            </div>
          )}

          {/* Access Mode */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-white/40 mb-1.5 font-mono">
              Access Restriction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccessType("restricted")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  accessType === "restricted"
                    ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                    : "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-white/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                }`}
              >
                Restricted (Auth Required)
              </button>
              <button
                type="button"
                onClick={() => setAccessType("public")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  accessType === "public"
                    ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                    : "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-white/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                }`}
              >
                Public (Direct Link)
              </button>
            </div>
          </div>

          {/* Password Protection */}
          <div className="p-3.5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white/80 cursor-pointer">
                <Lock size={14} className={hasPassword ? "text-amber-500" : "text-slate-400 dark:text-white/40"} />
                Require Password
              </label>
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => setHasPassword(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-black/50 text-amber-500 focus:ring-0"
              />
            </div>

            {hasPassword && (
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={link.hasPassword ? "Enter new password to change (leave blank to keep current)" : "Set security password"}
                  className="w-full px-3 py-2 bg-white dark:bg-black/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs focus:border-amber-400 outline-none shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-white/40 mb-1.5">
              Expiration Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-primary pointer-events-none" size={15} />
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toLocaleDateString('en-CA')}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:border-accent-primary outline-none cursor-pointer shadow-sm"
              />
            </div>
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl">
            <span className="text-xs font-semibold text-slate-700 dark:text-white/70">Link Active Status</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isActive
                  ? "bg-accent-soft text-accent-primary border-accent-border font-bold shadow-sm"
                  : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10"
              }`}
            >
              {isActive ? "Active (Accessible)" : "Disabled (Blocked)"}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/60 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={saving || (permission === "owner" && !ownerAgreed)}
              className="flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              {saving ? "Saving Changes..." : "Save Settings"}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
