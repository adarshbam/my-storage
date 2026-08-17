import { useState } from "react";
import { X, Copy, Check, Download, QrCode, ExternalLink } from "lucide-react";
import Button from "../ui/Button";

export default function LinkQRCodeModal({ isOpen, onClose, url, title }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !url) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&bgcolor=07110e&color=ffffff&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-vault-surface text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
        >
          <X size={16} />
        </button>

        <div className="w-10 h-10 mx-auto mb-3 bg-accent-soft text-accent-primary border border-accent-border rounded-2xl flex items-center justify-center shadow-accent-glow-sm">
          <QrCode size={20} />
        </div>

        <h3 className="font-bold text-slate-900 dark:text-white text-base truncate mb-1">
          {title || "Relay Link QR Code"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-white/40 mb-5">
          Scan with any mobile camera to securely access this vault node.
        </p>

        {/* QR Image Container */}
        <div className="p-4 bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-2xl inline-block mb-5 shadow-inner">
          <img
            src={qrImageUrl}
            alt="Link QR Code"
            className="w-52 h-52 rounded-xl mx-auto"
          />
        </div>

        {/* URL Box */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl p-1.5 pl-3 mb-4 shadow-sm">
          <span className="text-xs font-mono text-slate-600 dark:text-white/60 truncate flex-1 text-left">
            {url}
          </span>
          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              copied
                ? "bg-emerald-500 text-white"
                : "bg-accent-soft hover:bg-accent-soft/80 text-accent-primary"
            }`}
            title="Copy URL"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        <Button onClick={onClose} className="w-full py-2.5 text-xs font-bold">
          Done
        </Button>
      </div>
    </div>
  );
}
