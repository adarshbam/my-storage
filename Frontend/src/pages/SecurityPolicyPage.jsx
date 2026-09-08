import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/sections/Navbar";
import Footer from "../components/sections/Footer";
import {
  ShieldCheck,
  Lock,
  Server,
  Key,
  CheckCircle2,
  FileCode,
  Layers,
  Cpu,
  Mail,
  ExternalLink,
} from "lucide-react";

export default function SecurityPolicyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const lastAudited = "September 8, 2026";

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
              <ShieldCheck size={16} />
              Zero-Knowledge & Infrastructure Security
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
              Security Architecture & Audit
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-white/60 max-w-2xl mx-auto">
              A comprehensive technical overview of Vault's zero-trust model, cryptographic primitives, CASA Tier 2 alignment, and cloud boundary controls.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-white/40">
              <span>Audit Benchmark: {lastAudited}</span>
              <span>•</span>
              <span>Standard: OWASP ASVS v4.0 & CASA Tier 2</span>
            </div>
          </div>

          <div className="space-y-12 text-sm leading-relaxed text-slate-700 dark:text-white/80">
            
            {/* Core Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white/60 dark:bg-vault-surface/60 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="p-3 rounded-xl bg-accent-soft text-accent-primary w-fit mb-4">
                  <Lock size={22} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Zero-Knowledge Storage</h3>
                <p className="text-xs text-slate-600 dark:text-white/70">
                  Data in your Vault is chunked and stored in distributed S3-compatible Backblaze B2 clusters with strict isolation and tamper-evident metadata.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/60 dark:bg-vault-surface/60 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="p-3 rounded-xl bg-accent-soft text-accent-primary w-fit mb-4">
                  <Server size={22} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Cloudflare Edge Defense</h3>
                <p className="text-xs text-slate-600 dark:text-white/70">
                  Edge routing protected by Cloudflare WAF, managed DDoS mitigation, signed CDN access URLs, and TLS 1.3 encryption.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/60 dark:bg-vault-surface/60 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="p-3 rounded-xl bg-accent-soft text-accent-primary w-fit mb-4">
                  <Key size={22} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Strict Token Isolation</h3>
                <p className="text-xs text-slate-600 dark:text-white/70">
                  Third-party OAuth tokens (Google Drive, GitHub) are encrypted at rest with AES-256 and never exposed to the client DOM.
                </p>
              </div>
            </div>

            {/* Cloud Application Security Assessment (CASA) Alignment */}
            <section className="p-6 sm:p-8 rounded-2xl bg-white/70 dark:bg-vault-surface/70 border border-slate-200 dark:border-white/10 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-sm font-black">1</span>
                Google CASA & OWASP ASVS Alignment
              </h2>
              <p className="mb-4 text-xs sm:text-sm">
                To satisfy the strict standards required for Google Drive cloud integrations, our architecture is engineered according to the App Defense Alliance (ADA) Cloud Application Security Assessment (CASA) framework:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-accent-primary" />
                    Authentication Architecture
                  </div>
                  <p className="text-slate-600 dark:text-white/60">
                    Bcrypt password hashing with high salt rounds, rate-limited login endpoints, multi-factor authentication (MFA/2FA) via Firebase SMS and TOTP authenticator secrets.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-accent-primary" />
                    Session & Transport Security
                  </div>
                  <p className="text-slate-600 dark:text-white/60">
                    Cryptographically signed, HttpOnly, SameSite cookies with Redis-backed distributed token invalidation and strict device concurrency enforcement.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-accent-primary" />
                    Input Sanitization & Injection Prevention
                  </div>
                  <p className="text-slate-600 dark:text-white/60">
                    Strict schema validation (Joi/Zod), parameterization across database queries, query escaping for Google Drive full-text search, and XSS sanitization.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-accent-primary" />
                    Streamed Zero-Buffering Transfers
                  </div>
                  <p className="text-slate-600 dark:text-white/60">
                    Bidirectional sync between Google Drive and Backblaze B2 occurs through piped Node.js streams without unencrypted disk persistence on host instances.
                  </p>
                </div>
              </div>
            </section>

            {/* Vulnerability Disclosure */}
            <section className="p-6 sm:p-8 rounded-2xl bg-white/60 dark:bg-vault-surface/60 border border-slate-200 dark:border-white/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Responsible Vulnerability Disclosure
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 mb-4">
                We welcome independent security researchers to audit our platform responsibly. If you discover a potential vulnerability, please report it directly to our security team. We acknowledge and address all verified reports within 48 hours.
              </p>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                <Mail size={16} className="text-accent-primary" />
                <span>Security Inbox: </span>
                <a href="mailto:security@vaultstorage.com" className="text-accent-primary underline">
                  security@vaultstorage.com
                </a>
              </div>
            </section>

          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
