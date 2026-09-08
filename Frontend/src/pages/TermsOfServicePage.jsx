import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/sections/Navbar";
import Footer from "../components/sections/Footer";
import {
  Scale,
  FileText,
  ShieldAlert,
  Server,
  Key,
  HardDrive,
  CreditCard,
  Ban,
  CheckCircle2,
  Mail,
  Globe,
} from "lucide-react";

export default function TermsOfServicePage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const lastUpdated = "September 8, 2026";

  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans transition-colors duration-300 relative">
      {/* Global Static Background */}
      <div className="fixed inset-0 z-[0] bg-gradient-to-br from-[#f2faf7] via-[#e6f4f1] to-[#eaf7f4] dark:from-[#010a08] dark:via-[#021612] dark:to-[#010806] pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85vw] h-[55vh] bg-[radial-gradient(ellipse,rgba(20,184,166,0.12)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(16,185,129,0.09)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-[1100px] mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-soft border border-accent-border text-accent-primary text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
              <Scale size={16} />
              Enterprise Terms of Agreement
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              Terms of Service
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-white/60 max-w-2xl mx-auto">
              Please read these Terms of Service carefully before accessing or using Vault Storage & Virtual Cloud Operating System.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-white/40">
              <span>Effective Date: {lastUpdated}</span>
              <span>•</span>
              <span>Version: 3.2</span>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="mb-12 rounded-2xl p-6 bg-white/60 dark:bg-vault-surface/60 backdrop-blur-md border border-slate-200 dark:border-white/10">
            <div className="flex items-start gap-3">
              <FileText className="text-accent-primary shrink-0 mt-0.5" size={20} />
              <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 leading-relaxed">
                By creating an account, linking external cloud integrations (such as Google Drive or GitHub), or accessing any part of the Vault workspace, you agree to be bound by these Terms of Service and our{" "}
                <Link to="/privacy" className="text-accent-primary underline font-bold">
                  Privacy Policy
                </Link>
                . If you disagree with any part of these terms, you may not access the service.
              </p>
            </div>
          </div>

          {/* MAIN TERMS CONTENT */}
          <div className="space-y-12 text-sm leading-relaxed text-slate-700 dark:text-white/80">
            
            {/* 1. Definitions & Service Scope */}
            <section className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">1</span>
                Description of Service & Cloud OS Platform
              </h2>
              <p className="mb-3">
                Vault provides a high-performance web-based virtual operating system and decentralized multi-cloud management platform. Features include zero-knowledge encrypted object storage ("Vault Chambers"), integrated media streaming, interactive code editing, live cloud sync with external storage services (including Google Drive and GitHub), directory sharing, and role-based workspace management.
              </p>
              <p>
                We reserve the right to upgrade, enhance, modify, or temporarily suspend portions of the service for security maintenance or platform evolution, while committing to commercial best-effort uptime.
              </p>
            </section>

            {/* 2. User Accounts & Security */}
            <section className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">2</span>
                Account Registration, Passwords & 2FA
              </h2>
              <div className="space-y-3 text-xs sm:text-sm">
                <p>
                  To use Vault, you must be at least 18 years old (or the legal age of majority in your jurisdiction) and capable of forming a binding contract. You agree to provide accurate, current, and complete registration information.
                </p>
                <div className="p-4 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Key size={16} className="text-accent-primary" />
                    Account Custody & Credentials
                  </div>
                  <p className="text-slate-600 dark:text-white/70">
                    You are solely responsible for safeguarding your password, active browser sessions, and Multi-Factor Authentication (2FA) verification tokens. You must immediately notify Vault of any unauthorized access to your account. Vault is not liable for any loss resulting from compromised credentials.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Third-Party Integrations (Google Drive, GitHub) */}
            <section className="scroll-mt-28 p-6 sm:p-8 rounded-2xl bg-white/70 dark:bg-vault-surface/70 border border-slate-200 dark:border-white/10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">3</span>
                Third-Party Integrations & Google Drive Services
              </h2>
              <p className="mb-3 text-xs sm:text-sm">
                Vault allows users to connect third-party accounts, specifically <strong>Google Drive</strong> and <strong>GitHub</strong>, to facilitate multi-cloud file management and developer workflows directly within our virtual desktop.
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-slate-600 dark:text-white/70 pl-2">
                <li>
                  <strong>Direct Account Linkage:</strong> When connecting Google Drive, you authenticate directly through Google’s secure OAuth 2.0 flow. Vault never accesses your Google account password.
                </li>
                <li>
                  <strong>Independent Terms:</strong> Your use of Google Drive remains subject to Google’s Terms of Service and policies. You represent that you have the requisite permissions to access, modify, or sync the Google Drive files connected to your Vault workspace.
                </li>
                <li>
                  <strong>Disconnection & Revocation:</strong> You may unlink third-party integrations at any time through the navigation rail or via Google’s account security dashboard.
                </li>
              </ul>
            </section>

            {/* 4. User Content & Ownership */}
            <section className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">4</span>
                Intellectual Property & 100% User Content Ownership
              </h2>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm mb-4">
                <strong>You retain 100% ownership of your files:</strong> Vault claims zero intellectual property rights or copyright ownership over any documents, code, media, or archives you upload, store, or manage within the platform.
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                You grant Vault only the strictly limited, worldwide, non-exclusive license to host, store, transfer, and stream your content solely for the technical execution of the service (e.g., transmitting encrypted chunks to object storage, generating previews, or streaming media to your authorized browser session).
              </p>
            </section>

            {/* 5. Acceptable Use Policy */}
            <section className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">5</span>
                Acceptable Use Policy (AUP)
              </h2>
              <p className="mb-3 text-xs sm:text-sm">
                You agree not to misuse the Vault platform. Prohibited activities include, but are not limited to:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2">
                  <Ban size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <span>Distributing malware, viruses, ransomware, or malicious executables.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2">
                  <Ban size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <span>Storing or sharing unlawful, defamatory, infringing, or abusive material.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2">
                  <Ban size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <span>Attempting unauthorized probing, vulnerability scanning, or penetration attacks.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-2">
                  <Ban size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <span>Circumventing plan storage quotas, rate limits, or concurrent device thresholds.</span>
                </div>
              </div>
            </section>

            {/* 6. Subscriptions, Storage Quotas & Billing */}
            <section className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">6</span>
                Subscriptions, Quotas & Payment Terms
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 mb-3">
                Vault offers free and paid subscription tiers (e.g., Starter, Pro, Enterprise). Storage quotas, upload limits, and premium features (such as enhanced cloud chambers or advanced concurrency) are enforced per your subscribed plan tier.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-white/70 pl-2">
                <li>Payments are processed securely via PCI-DSS compliant providers (Razorpay).</li>
                <li>Subscriptions renew automatically unless cancelled before the billing cycle conclusion.</li>
                <li>Refund requests are handled in accordance with our billing policy and applicable consumer laws.</li>
              </ul>
            </section>

            {/* 7. Disclaimers & Limitation of Liability */}
            <section className="scroll-mt-28 p-6 sm:p-8 rounded-2xl bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">7</span>
                Warranty Disclaimer & Limitation of Liability
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 mb-3 uppercase tracking-wide font-bold">
                PLEASE READ THIS SECTION CAREFULLY.
              </p>
              <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed mb-3">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
              </p>
              <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL VAULT STORAGE, ITS DIRECTORS, EMPLOYEES, OR PARTNERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF DATA, REVENUE, OR GOODWILL) ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM.
              </p>
            </section>

            {/* 8. Governing Law & Dispute Resolution */}
            <section className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">8</span>
                Governing Law & Dispute Resolution
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                These Terms shall be governed by and construed in accordance with standard international commercial laws, without regard to its conflict of law principles. Any dispute arising under these Terms shall be resolved through good-faith negotiation, followed if necessary by binding arbitration.
              </p>
            </section>

            {/* 9. Contact */}
            <section className="scroll-mt-28 p-6 sm:p-8 rounded-2xl bg-white/60 dark:bg-vault-surface/60 border border-slate-200 dark:border-white/10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">9</span>
                Contact Information
              </h2>
              <p className="mb-4 text-xs sm:text-sm text-slate-600 dark:text-white/70">
                For questions concerning these Terms of Service, please reach out to our legal department:
              </p>
              <div className="space-y-2 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Mail size={16} className="text-accent-primary" />
                  <span>Email: </span>
                  <a href="mailto:legal@vaultstorage.com" className="text-accent-primary underline">
                    legal@vaultstorage.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Globe size={16} className="text-accent-primary" />
                  <span>Web: </span>
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
