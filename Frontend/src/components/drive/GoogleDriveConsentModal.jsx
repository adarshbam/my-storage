import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import {
  ShieldCheck,
  Lock,
  HardDrive,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { VaultLogo, VaultDriveIcon } from "../ui/VaultIcons";

export default function GoogleDriveConsentModal({
  isOpen,
  onClose,
  onConfirm,
  isConnecting = false,
}) {
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleAuthorize = () => {
    if (!hasAgreed || isConnecting) return;
    onConfirm();
  };

  const handleClose = () => {
    setHasAgreed(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Link Google Drive to Vault OS"
      className="max-w-xl"
    >
      <div className="space-y-5">
        {/* Visual Bridge Header */}
        <div className="flex items-center justify-center gap-4 py-3 px-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-accent-soft border border-accent-border text-accent-primary">
            <VaultLogo size={22} />
            <span className="text-xs font-black tracking-widest uppercase">VAULT</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 dark:text-white/30">
            <RefreshCw size={16} className="animate-spin text-accent-primary [animation-duration:6s]" />
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <VaultDriveIcon size={22} />
            <span className="text-xs font-black tracking-wider uppercase">Google Drive</span>
          </div>
        </div>

        {/* Scope and Purpose Overview */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Permission & Cloud Synchronization Notice
          </h3>
          <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
            Linking your Google Drive allows Vault’s virtual desktop to function as a seamless cloud file manager. You will be prompted by Google to grant access to view, edit, organize, and sync your Drive files.
          </p>
        </div>

        {/* Permissions & Security Guarantees */}
        <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
            <ShieldCheck size={16} />
            Strict Data Protection Guarantees
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-white/80">
            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Zero AI Training:</strong> Drive files are never used to train machine learning models.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>No File Harvesting:</strong> Files remain on Google Drive and stream only on-demand.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Never Sold or Shared:</strong> Zero advertising tracking or third-party data sales.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Revoke Anytime:</strong> Disconnect in one click or directly via Google Security.</span>
            </div>
          </div>
        </div>

        {/* Compliance Link */}
        <div className="text-xs text-slate-500 dark:text-white/60 leading-relaxed">
          Vault’s use and transfer of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary font-bold underline inline-flex items-center gap-0.5"
          >
            Google API Services User Data Policy
            <ExternalLink size={12} />
          </a>
          , including the Limited Use requirements. Read our full{" "}
          <Link to="/privacy" target="_blank" className="text-accent-primary underline font-bold">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" target="_blank" className="text-accent-primary underline font-bold">
            Terms of Service
          </Link>
          .
        </div>

        {/* Required User Consent Checkbox */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
          <Checkbox
            id="gdrive-consent"
            checked={hasAgreed}
            onChange={(e) => setHasAgreed(e.target.checked)}
            variant="accent"
            size="md"
          >
            <span className="text-xs text-slate-700 dark:text-white/90 leading-normal font-medium">
              I have read, understood, and agree to the{" "}
              <Link to="/privacy" target="_blank" className="text-accent-primary underline font-bold">
                Privacy Policy
              </Link>
              ,{" "}
              <Link to="/terms" target="_blank" className="text-accent-primary underline font-bold">
                Terms of Service
              </Link>
              , and Google Limited Use disclosure. I authorize Vault to link with my Google Drive account.
            </span>
          </Checkbox>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={handleAuthorize}
            disabled={!hasAgreed || isConnecting}
            className="px-5 py-2.5 text-xs uppercase tracking-wider font-bold shadow-md shadow-accent-glow/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isConnecting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <VaultDriveIcon size={16} />
                Authorize & Link Drive
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
