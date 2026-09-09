import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/sections/Navbar";
import Footer from "../components/sections/Footer";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  FileCheck,
  HardDrive,
  RefreshCw,
  Server,
  UserCheck,
  Globe,
  Mail,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const lastUpdated = "September 8, 2026";

  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans transition-colors duration-300 relative">
      {/* Global Static Background */}
      <div className="fixed inset-0 z-[0] bg-vault-bg pointer-events-none transition-colors duration-500">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85vw] h-[55vh] bg-[radial-gradient(ellipse,rgba(var(--accent-primary-rgb),0.12)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(var(--accent-primary-rgb),0.09)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-[1100px] mx-auto w-full">
          {/* Header Badge & Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-soft border border-accent-border text-accent-primary text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
              <ShieldCheck size={16} />
              Enterprise Privacy & Trust
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-white/60 max-w-2xl mx-auto">
              How Vault Storage and Cloud OS collects, uses, protects, and handles your personal data, cloud integrations, and Google user data.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-white/40">
              <span>Effective Date: {lastUpdated}</span>
              <span>•</span>
              <span>Version: 3.2 (Enterprise & Google API Certified)</span>
            </div>
          </div>

          {/* CRITICAL GOOGLE LIMITED USE HIGHLIGHT BOX */}
          <div className="mb-12 rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-[0_8px_30px_rgba(16,185,129,0.08)]">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <HardDrive size={28} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  Google API Services User Data Policy Compliance
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">
                    Mandatory Disclosure
                  </span>
                </h3>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-white/80 mb-3 font-medium">
                  Vault’s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-primary font-bold underline hover:text-emerald-600 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                  >
                    Google API Services User Data Policy
                    <ExternalLink size={14} />
                  </a>
                  , including the <strong>Limited Use requirements</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs font-semibold text-slate-600 dark:text-white/70">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>No Google user data is used to train AI / ML models</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>No Google user data is sold to any third parties</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>No humans read your files without your explicit consent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Access tokens are encrypted and revokable at any moment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE OF CONTENTS QUICK NAV */}
          <div className="mb-12 p-5 rounded-2xl bg-white/60 dark:bg-vault-surface/60 backdrop-blur-md border border-slate-200 dark:border-white/10">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-3">
              Table of Contents
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-medium">
              <a href="#overview" className="text-slate-600 dark:text-white/70 hover:text-accent-primary">1. Overview & Architecture</a>
              <a href="#data-collection" className="text-slate-600 dark:text-white/70 hover:text-accent-primary">2. Information We Collect</a>
              <a href="#google-integration" className="text-slate-600 dark:text-white/70 hover:text-accent-primary font-bold text-accent-primary">3. Google Drive Integration & Scopes</a>
              <a href="#data-usage" className="text-slate-600 dark:text-white/70 hover:text-accent-primary">4. How We Use Information</a>
              <a href="#limited-use" className="text-slate-600 dark:text-white/70 hover:text-accent-primary">5. Limited Use & No-AI Pledge</a>
              <a href="#data-retention" className="text-slate-600 dark:text-white/70 hover:text-accent-primary">6. Retention & Deletion</a>
              <a href="#security" className="text-slate-600 dark:text-white/70 hover:text-accent-primary">7. Technical Security Standards</a>
              <a href="#user-rights" className="text-slate-600 dark:text-white/70 hover:text-accent-primary">8. User Rights (GDPR & CCPA)</a>
              <a href="#contact" className="text-slate-600 dark:text-white/70 hover:text-accent-primary">9. Contact & Data Officer</a>
            </div>
          </div>

          {/* MAIN POLICY CONTENT SECTIONS */}
          <div className="space-y-12 text-sm leading-relaxed text-slate-700 dark:text-white/80">
            
            {/* 1. Overview */}
            <section id="overview" className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">1</span>
                Overview & Architecture
              </h2>
              <p className="mb-3">
                Vault Storage ("Vault", "we", "us", or "our") operates an enterprise-grade, cloud-based web operating system and unified virtual workspace. Our platform empowers users to organize, edit, synchronize, and navigate their digital workspaces, multi-cloud storage vaults, and third-party developer integrations within a high-performance browser desktop environment.
              </p>
              <p>
                We operate under the fundamental principle of <strong>Zero-Knowledge and Data Minimization</strong>: you own your data, and we only process the minimum data strictly necessary to deliver high-performance cloud management and seamless multi-cloud synchronization.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section id="data-collection" className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">2</span>
                Information We Collect
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">A. Account Information</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                    When you register, we collect your email address, securely hashed password (via bcrypt with high work factor), and optional profile display name. If you utilize Multi-Factor Authentication (MFA/2FA), we process verified phone numbers via Firebase SMS or TOTP authenticator secrets.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">B. Files and Workspace Content</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                    Files uploaded directly to your Vault are stored in S3-compatible, distributed Backblaze B2 storage with end-to-end encryption in transit (TLS 1.3) and encryption at rest. Metadata including filename, MIME type, file size, folder hierarchy, and timestamps are indexed to power the virtual file explorer.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">C. Technical & Session Data</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                    We collect browser client fingerprints, IP addresses, session cookies (strictly HttpOnly, Secure, SameSite), and diagnostic logs solely for rate limiting, DDoS mitigation via Cloudflare Edge, and active device concurrency controls.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Google Drive Integration & Scopes */}
            <section id="google-integration" className="scroll-mt-28 p-6 sm:p-8 rounded-2xl bg-white/70 dark:bg-vault-surface/70 border border-slate-200 dark:border-white/10 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">3</span>
                Google Drive Integration & Scope Disclosures
              </h2>
              <p className="mb-4">
                Vault provides a specialized virtual chamber called <strong>"Google Drive Chamber"</strong>. This feature allows you to link your Google account to browse, open, edit, transfer, and synchronize your Google Drive files directly inside our web desktop operating system.
              </p>

              <div className="space-y-4 mb-6">
                <div className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-slate-50/50 dark:bg-white/[0.01]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-accent-primary bg-accent-soft px-2.5 py-1 rounded-md">
                      https://www.googleapis.com/auth/drive
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase">
                      Primary Integration Scope
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-white/70 mb-2">
                    <strong>Why this scope is required:</strong> Vault acts as a full-featured virtual operating system and multi-cloud file browser. This permission allows our web desktop interface to:
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1 text-slate-600 dark:text-white/70 pl-2">
                    <li>Render your complete folder tree and file list in the Google Drive Chamber.</li>
                    <li>Stream file contents when you preview or edit documents within the workspace.</li>
                    <li>Allow you to create folders, upload new assets, and rename or organize files.</li>
                    <li>Facilitate bidirectional user-requested copy or move operations between your Vault storage and Google Drive.</li>
                  </ul>
                </div>

                <div className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-slate-50/50 dark:bg-white/[0.01]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-accent-primary bg-accent-soft px-2.5 py-1 rounded-md">
                      https://www.googleapis.com/auth/userinfo.email & profile
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase">
                      Identity Scopes
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-white/70">
                    Used strictly to associate your Google Drive token with your authenticated Vault profile, display your connected Google account email, and verify account ownership.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
                <strong>Zero Unsolicited File Storage:</strong> Browsing files in the Google Drive Chamber streams file data dynamically via Google’s secure APIs. Vault does <em>not</em> mirror, replicate, or store your Google Drive files on our servers unless you explicitly execute a "Copy to Vault" or "Move to Vault" command.
              </div>
            </section>

            {/* 4. How We Use Information */}
            <section id="data-usage" className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">4</span>
                How We Use Information
              </h2>
              <p className="mb-3">
                We strictly use personal information, workspace assets, and third-party tokens for the following purposes:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <li className="p-3 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-accent-primary shrink-0 mt-0.5" />
                  <span>Delivering the virtual desktop and filesystem interface.</span>
                </li>
                <li className="p-3 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-accent-primary shrink-0 mt-0.5" />
                  <span>Executing authenticated read/write/stream operations on your connected Drive.</span>
                </li>
                <li className="p-3 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-accent-primary shrink-0 mt-0.5" />
                  <span>Enforcing your configured plan storage quotas and system access limits.</span>
                </li>
                <li className="p-3 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-accent-primary shrink-0 mt-0.5" />
                  <span>Maintaining infrastructure resilience, preventing abuse, and ensuring auditability.</span>
                </li>
              </ul>
            </section>

            {/* 5. Limited Use & No-AI Pledge */}
            <section id="limited-use" className="scroll-mt-28 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center text-sm font-black">5</span>
                Limited Use, No-AI & No-Sale Pledge
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mb-4 leading-relaxed">
                In strict compliance with Google's API Services User Data Policy, we maintain four non-negotiable guarantees regarding Google user data:
              </p>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <Lock size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">1. Absolute Prohibition on AI/ML Training:</strong>
                    <p className="text-slate-400 text-xs mt-1">
                      Vault does NOT use, feed, transfer, or process your Google Drive documents, images, code, or metadata to train, retrain, fine-tune, or validate any generalized artificial intelligence, machine learning, or large language models (LLMs).
                    </p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <EyeOff size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">2. No Human Inspection:</strong>
                    <p className="text-slate-400 text-xs mt-1">
                      No humans (including Vault engineers or system administrators) are permitted to read or view your Google Drive file contents unless you give explicit written permission for troubleshooting an identified issue, or where required by law.
                    </p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">3. Never Sold or Monetized:</strong>
                    <p className="text-slate-400 text-xs mt-1">
                      We never sell, rent, lease, or monetize your Google user data, files, or tokens to third parties, data brokers, advertising networks, or marketing platforms.
                    </p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <RefreshCw size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">4. Limited Transfer Rule:</strong>
                    <p className="text-slate-400 text-xs mt-1">
                      We do not transfer your Google data to third parties unless strictly necessary to provide the user-facing functionality of our cloud storage service, comply with legal requirements, or as part of a merger or acquisition with prior notice.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. Retention, Revocation & Deletion */}
            <section id="data-retention" className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">6</span>
                Token Revocation & Data Deletion
              </h2>
              <p className="mb-3">
                You retain complete, real-time control over your Google Drive connection at all times:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <RefreshCw size={16} className="text-accent-primary" />
                    Instant In-App Disconnect
                  </h3>
                  <p className="text-slate-600 dark:text-white/70 mb-2">
                    Click "Disconnect" on Google Drive inside your Vault navigation rail at any moment. This immediately purges all stored OAuth tokens from our database and invalidates the session cache.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <ExternalLink size={16} className="text-accent-primary" />
                    Google Account Permissions Revocation
                  </h3>
                  <p className="text-slate-600 dark:text-white/70 mb-2">
                    You can also revoke Vault’s access directly from Google’s security panel at{" "}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-primary underline font-bold"
                    >
                      myaccount.google.com/permissions
                    </a>
                    . Upon revocation, all Google API calls are instantly blocked.
                  </p>
                </div>
              </div>
            </section>

            {/* 7. Security Standards */}
            <section id="security" className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">7</span>
                Technical Security Standards & CASA Compliance
              </h2>
              <p className="mb-3">
                Vault implements defense-in-depth engineering based on OWASP ASVS (Application Security Verification Standard) and Cloud Application Security Assessment (CASA) Tier 2 guidelines:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">Encryption In Transit</div>
                  <p className="text-slate-600 dark:text-white/60">
                    Mandatory HTTPS enforced via TLS 1.3 with strict HSTS and modern cipher suites across all endpoints.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">Encryption At Rest</div>
                  <p className="text-slate-600 dark:text-white/60">
                    AES-256 encryption across object storage, and hashed credentials with salt rotation for user security.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">Zero-Trust Sessions</div>
                  <p className="text-slate-600 dark:text-white/60">
                    Signed, HttpOnly, SameSite=Lax session cookies backed by distributed Redis session invalidation.
                  </p>
                </div>
              </div>
            </section>

            {/* 8. User Rights */}
            <section id="user-rights" className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">8</span>
                Your Rights (GDPR, CCPA/CPRA & Global Privacy)
              </h2>
              <p className="mb-3">
                Under the European General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA), you are entitled to:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-2">
                <li><strong>Right of Access:</strong> Request a copy of all personal and workspace metadata stored by Vault.</li>
                <li><strong>Right to Rectification:</strong> Update or correct your profile and account credentials at any time.</li>
                <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request complete, irreversible deletion of your Vault account and all associated files.</li>
                <li><strong>Right to Data Portability:</strong> Export all files and directories in standard archive formats.</li>
                <li><strong>Right to Non-Discrimination:</strong> We do not discriminate against any user exercising privacy rights.</li>
              </ul>
            </section>

            {/* 9. Contact */}
            <section id="contact" className="scroll-mt-28 p-6 sm:p-8 rounded-2xl bg-white/60 dark:bg-vault-surface/60 border border-slate-200 dark:border-white/10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">9</span>
                Contact & Data Protection Inquiries
              </h2>
              <p className="mb-4 text-xs sm:text-sm text-slate-600 dark:text-white/70">
                If you have questions regarding this Privacy Policy, our Google API integration, or wish to exercise your data subject rights, please contact our Data Protection Office:
              </p>
              <div className="space-y-2 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Mail size={16} className="text-accent-primary" />
                  <span>Email: </span>
                  <a href="mailto:privacy@vaultstorage.com" className="text-accent-primary underline">
                    privacy@vaultstorage.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Globe size={16} className="text-accent-primary" />
                  <span>Support Center: </span>
                  <Link to="/" className="text-accent-primary underline">
                    https://vaultstorage.com
                  </Link>
                </div>
              </div>
            </section>

          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
