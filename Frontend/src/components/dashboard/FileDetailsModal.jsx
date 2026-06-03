import { X, Calendar, HardDrive, Shield, FileType, User } from "lucide-react";
import { formatSize, formatDate } from "../../lib/utils";
import getFileImage from "../../lib/FileImages";
import { VaultDriveIcon, VaultGitIcon, EncryptionBadgeIcon } from "../ui/VaultIcons";

export default function FileDetailsModal({ item, onClose }) {
  if (!item) return null;

  const isDirectory = item.type === "directory" || item.provider === "shared_drive";
  const provider = item.provider || "local";
  const ext = item.name.split('.').pop()?.toLowerCase() || "";

  // Environment styling
  let envClass = "text-vault-emerald bg-vault-emerald/10 border-vault-emerald/30";
  if (provider === "google_drive" || provider === "shared_drive") envClass = "text-document-accent bg-document-accent/10 border-document-accent/30";
  else if (provider === "github") envClass = "text-creative-accent bg-creative-accent/10 border-creative-accent/30";
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-vault-surface/90 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
          <h2 className="text-sm font-bold tracking-widest text-white/70 uppercase">Asset Details</h2>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white bg-black/40 hover:bg-white/10 rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Hero Section */}
        <div className="p-8 flex flex-col items-center border-b border-white/5 relative overflow-hidden">
          <div className={`absolute inset-0 opacity-10 bg-gradient-radial to-transparent from-white`} />
          
          <div className="w-20 h-20 rounded-xl bg-vault-black border border-white/10 flex items-center justify-center shrink-0 mb-4 relative z-10 shadow-xl">
            {isDirectory ? (
               provider === "google_drive" ? <VaultDriveIcon size={40} className="text-document-accent drop-shadow-[0_0_15px_rgba(77,166,255,0.4)]" /> :
               provider === "github" ? <VaultGitIcon size={40} className="text-creative-accent drop-shadow-[0_0_15px_rgba(198,92,255,0.4)]" /> :
               <div className="text-vault-emerald drop-shadow-[0_0_15px_rgba(0,212,165,0.4)]">
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
               </div>
            ) : (
               <img src={getFileImage(ext)} alt="icon" className="w-12 h-12 object-contain drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]" draggable={false} />
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-white text-center break-all z-10">{item.name}</h3>
          
          <div className={`mt-3 px-3 py-1 rounded-full text-xs font-mono border z-10 ${envClass}`}>
            {provider === 'local' ? 'VAULT NODE' : provider.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        {/* Metadata List */}
        <div className="p-6 space-y-4">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/5">
              <FileType size={14} className="text-white/50" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Type</p>
              <p className="text-sm text-white/80">{isDirectory ? "Directory (Chamber)" : `File (${ext.toUpperCase() || 'Unknown'})`}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/5">
              <HardDrive size={14} className="text-white/50" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Size</p>
              <p className="text-sm text-white/80">{isDirectory ? `${item.itemCount || 0} items` : formatSize(item.size)}</p>
            </div>
          </div>

          {(item.createdAt || item.updatedAt) && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/5">
                <Calendar size={14} className="text-white/50" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Date Modified</p>
                <p className="text-sm text-white/80">{formatDate(item.updatedAt || item.createdAt)}</p>
              </div>
            </div>
          )}

          {item.ownerEmail && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/5">
                <User size={14} className="text-white/50" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Owner</p>
                <p className="text-sm text-white/80">{item.ownerEmail}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 mt-2 border-t border-white/5">
            <div className="w-8 h-8 rounded-lg bg-vault-emerald/10 flex items-center justify-center border border-vault-emerald/20">
              <Shield size={14} className="text-vault-emerald" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-vault-emerald/50 tracking-wider">Security</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <EncryptionBadgeIcon size={12} className="text-vault-emerald" />
                <span className="text-sm font-mono text-vault-emerald">AES-256 Encrypted</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
