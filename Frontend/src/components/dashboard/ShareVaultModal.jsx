import { useState, useEffect } from "react";
import { X, Copy, Info, AlertTriangle, ShieldAlert, Calendar, Share2, Trash2 } from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import Button from "../ui/Button";

export default function ShareVaultModal({ isOpen, onClose, items = [] }) {
  const [shareLinks, setShareLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState("read");
  const [ownerAgreed, setOwnerAgreed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchShareLinks();
      setGeneratedLink("");
      setExpiryDate("");
      setSelectedPermission("read");
      setOwnerAgreed(false);
      setCopiedLink(false);
    }
  }, [isOpen]);

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

  const handleCreateShareLink = async () => {
    if (selectedPermission === "owner" && !ownerAgreed) {
      alert("Please accept the risk agreement before generating an Owner link.");
      return;
    }
    setGeneratingLink(true);
    try {
      const res = await fetch(`${SERVER_URL}/share/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresAt: expiryDate || null,
          permission: [selectedPermission],
          items: items.map(item => ({
            id: item._id || item.id,
            type: item.type,
            provider: item.provider || "local",
            name: item.name
          })),
        }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const fullUrl = `${window.location.origin}/shared-access/${data.token}`;
        setGeneratedLink(fullUrl);
        fetchShareLinks();
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
        "Are you sure you want to revoke this share link? This will instantly revoke access for everyone who claimed access through this link!"
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl bg-vault-surface border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-h-[85vh] overflow-y-auto overflow-x-hidden scrollbar-none">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white bg-black/40 hover:bg-white/10 rounded-lg transition-all"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-vault-emerald/10 text-vault-emerald rounded-xl border border-vault-emerald/20">
            <Share2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wider text-white uppercase">
              {items.length > 0 ? "Share Items" : "Share Vault"}
            </h2>
          </div>
        </div>
        
        <p className="text-sm text-white/50 mb-4 ml-[52px]">
          Create a secure link to grant external users access to {items.length > 0 ? "the selected items" : "your Vault node"}.
        </p>

        {items.length > 0 && (
          <div className="mb-6 ml-[52px] bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[10px] font-bold tracking-wider uppercase text-white/40 block mb-2">
              Selected items ({items.length}):
            </span>
            <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto custom-scrollbar">
              {items.map((item) => (
                <div
                  key={item._id || item.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 border border-white/10 rounded-lg text-xs"
                >
                  <span className={item.type === "directory" ? "text-vault-emerald" : "text-white/70"}>
                    {item.type === "directory" ? "📁" : "📄"}
                  </span>
                  <span className="text-white truncate max-w-[120px]" title={item.name}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Create Link */}
          <div className="space-y-5 relative">
            
            <h3 className="font-bold text-vault-emerald text-xs uppercase tracking-widest border-b border-vault-emerald/20 pb-2">
              Generate Secure Link
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold tracking-wider uppercase text-white/40 mb-1.5">
                  Expiry Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-emerald pointer-events-none" size={16} />
                  <input
                    type="date"
                    value={expiryDate}
                    onClick={(e) => {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.target.showPicker();
                      }
                    }}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toLocaleDateString('en-CA')}
                    className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 text-white rounded-xl text-sm focus:border-vault-emerald outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-wider uppercase text-white/40 mb-1.5">
                  Security Clearance
                </label>
                <select
                  value={selectedPermission}
                  onChange={(e) => {
                    setSelectedPermission(e.target.value);
                    setOwnerAgreed(false);
                  }}
                  className="w-full px-4 py-2 bg-black/40 border border-white/10 text-white rounded-xl text-sm focus:border-vault-emerald outline-none transition-all cursor-pointer [&>option]:bg-vault-black"
                >
                  <option value="read">Read Only (Standard)</option>
                  <option value="write">Read & Write (Elevated)</option>
                  <option value="owner">Owner (Full Control + External Nodes)</option>
                </select>
              </div>

              {selectedPermission === "read" && (
                <div className="p-3 bg-document-accent/10 border border-document-accent/20 text-document-accent text-xs rounded-xl flex items-start gap-2.5">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">Standard Clearance</span>
                    <span className="text-white/60">Guests can browse and view all local files inside this Vault node. No external integrations are shared.</span>
                  </div>
                </div>
              )}

              {selectedPermission === "write" && (
                <div className="p-3 bg-media-accent/10 border border-media-accent/20 text-media-accent text-xs rounded-xl flex items-start gap-2.5">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">Elevated Clearance</span>
                    <span className="text-white/60">Guests can browse, view, create, rename, and delete files inside this local Vault node.</span>
                  </div>
                </div>
              )}

              {selectedPermission === "owner" && (
                <div className="p-3 bg-danger-accent/10 border border-danger-accent/30 text-danger-accent text-xs rounded-xl flex flex-col gap-3 shadow-[0_0_15px_rgba(255,90,122,0.1)]">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-1 uppercase tracking-wider text-xs">Maximum Clearance (High Risk)</span>
                      <span className="text-white/70">Grants full write and delete permissions, AND shares active Google Drive & GitHub integrations using your active credentials.</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-black/30 p-2 rounded-lg border border-danger-accent/20 transition-colors hover:bg-black/50">
                    <input
                      type="checkbox"
                      checked={ownerAgreed}
                      onChange={(e) => setOwnerAgreed(e.target.checked)}
                      className="rounded border-danger-accent text-danger-accent focus:ring-danger-accent/30"
                    />
                    <span className="text-[10px] font-bold tracking-wider text-danger-accent uppercase">
                      I understand the risk
                    </span>
                  </label>
                </div>
              )}

              <Button
                onClick={handleCreateShareLink}
                disabled={generatingLink || (selectedPermission === "owner" && !ownerAgreed)}
                className="w-full py-3"
              >
                {generatingLink ? "Generating Tokens..." : "Generate Secure Link"}
              </Button>
            </div>

            {generatedLink && (
              <div className="mt-4 p-4 bg-vault-emerald/10 border border-vault-emerald/30 rounded-xl space-y-3 shadow-[0_0_20px_rgba(0,212,165,0.1)]">
                <p className="text-xs font-bold tracking-widest uppercase text-vault-emerald">
                  Terminal Access Granted
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 bg-black/60 border border-vault-emerald/20 text-white font-mono text-xs rounded-lg px-3 py-2 focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedLink)}
                    className="px-4 bg-vault-emerald hover:bg-vault-emerald/90 text-black font-bold uppercase text-[10px] tracking-wider rounded-lg transition-colors flex items-center justify-center shrink-0"
                  >
                    {copiedLink ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Manage Links */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              {(() => {
                const selectedIds = items.map(i => (i._id || i.id).toString()).sort();
                const filteredLinks = shareLinks.filter(link => {
                  const linkItemIds = (link.items || []).map(i => i.id.toString()).sort();
                  if (items.length === 0) {
                    return linkItemIds.length === 0;
                  } else {
                    return linkItemIds.length === selectedIds.length && linkItemIds.every((id, idx) => id === selectedIds[idx]);
                  }
                });
                return (
                  <>
                    <h3 className="font-bold text-white/50 text-xs uppercase tracking-widest">
                      Active Nodes ({filteredLinks.length})
                    </h3>
                  </>
                );
              })()}
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-none">
              {loadingLinks ? (
                <div className="text-center py-8 text-white/30 text-sm font-mono animate-pulse">
                  Scanning active nodes...
                </div>
              ) : (() => {
                const selectedIds = items.map(i => (i._id || i.id).toString()).sort();
                const filteredLinks = shareLinks.filter(link => {
                  const linkItemIds = (link.items || []).map(i => i.id.toString()).sort();
                  if (items.length === 0) {
                    return linkItemIds.length === 0;
                  } else {
                    return linkItemIds.length === selectedIds.length && linkItemIds.every((id, idx) => id === selectedIds[idx]);
                  }
                });
                if (filteredLinks.length === 0) {
                  return (
                    <div className="text-center py-8 bg-black/20 border border-dashed border-white/10 rounded-xl text-white/30 text-xs font-mono uppercase tracking-widest">
                      No active share links.
                    </div>
                  );
                }
                return filteredLinks.map((link) => (
                  <div
                    key={link._id}
                    className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl hover:border-white/20 transition-all group"
                  >
                    <div className="overflow-hidden pr-2 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {link.permission && link.permission.length > 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                              link.permission.includes("owner")
                                ? "bg-danger-accent/20 text-danger-accent border border-danger-accent/30"
                                : link.permission.includes("write")
                                ? "bg-media-accent/20 text-media-accent border border-media-accent/30"
                                : "bg-document-accent/20 text-document-accent border border-document-accent/30"
                            }`}
                          >
                            {link.permission[0]}
                          </span>
                        )}
                        <span className="text-xs font-mono text-white/60 truncate">
                          Expires:{" "}
                          {link.expiresAt
                            ? new Date(link.expiresAt).toLocaleDateString()
                            : "Never"}
                        </span>
                      </div>
                      
                      <div className="text-[10px] font-mono text-white/30 truncate flex items-center gap-2 mt-1">
                        Token: ••••••••{link.token.substring(link.token.length - 8)}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleRevokeShareLink(link._id)}
                      className="p-2 text-white/30 hover:text-danger-accent hover:bg-danger-accent/10 rounded-lg transition-all opacity-50 group-hover:opacity-100"
                      title="Revoke Node Access"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
