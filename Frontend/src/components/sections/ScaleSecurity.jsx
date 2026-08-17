import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Search,
  HardDrive,
  Share2,
  RefreshCw,
} from "lucide-react";

const FEATURES = [
  {
    id: "encryption",
    icon: ShieldCheck,
    title: "Military-Grade Encryption",
    desc: "AES-256 bit encryption for all your files at rest and in transit. Your keys, your rules. Zero-knowledge architecture means even we can't see your data.",
    accentClass: "text-accent-primary",
    bgClass: "bg-accent-soft",
    borderClass: "border-accent-border",
  },
  {
    id: "search",
    icon: Search,
    title: "Neural AI Search",
    desc: "Find files instantly without remembering names. Local AI searches file content, tags, and document text to surface what you need in milliseconds.",
    accentClass: "text-cyan-500",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/30",
  },
  {
    id: "backups",
    icon: HardDrive,
    title: "Continuous Backups",
    desc: "Every revision is automatically mirrored across secure data nodes. Your critical files remain permanently protected against local hardware failures.",
    accentClass: "text-teal-500",
    bgClass: "bg-teal-500/10",
    borderClass: "border-teal-500/30",
  },
  {
    id: "sharing",
    icon: Share2,
    title: "Expiring Secure Links",
    desc: "Share massive files or folders with a single encrypted link. Set passwords, max download limits, and auto-expiring timers for complete control.",
    accentClass: "text-indigo-500",
    bgClass: "bg-indigo-500/10",
    borderClass: "border-indigo-500/30",
  },
  {
    id: "ransomware",
    icon: RefreshCw,
    title: "Ransomware Rescue",
    desc: "Instant point-in-time recovery. Immutable version histories let you roll back your entire vault to any state in the last 30 days.",
    accentClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
  },
];

// --- VISUALIZERS ---

const EncryptionVisualizer = () => {
  const [matrix, setMatrix] = useState([]);
  useEffect(() => {
    const chars = "0123456789ABCDEF!@#$%&*";
    const generate = () =>
      Array(120)
        .fill(0)
        .map(() => chars[Math.floor(Math.random() * chars.length)]);
    setMatrix(generate());
    const interval = setInterval(() => setMatrix(generate()), 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950/20">
      <div className="absolute inset-0 grid grid-cols-[repeat(auto-fit,minmax(24px,1fr))] gap-2 p-6 opacity-20 overflow-hidden select-none">
        {matrix.map((char, i) => (
          <div
            key={i}
            className="text-accent-primary font-mono text-sm font-bold text-center leading-none"
          >
            {char}
          </div>
        ))}
      </div>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white/80 dark:bg-vault-surface/80 border border-accent-border flex flex-col items-center justify-center shadow-xl shadow-accent-glow/20 backdrop-blur-xl"
      >
        <ShieldCheck size={56} className="text-accent-primary mb-2" />
        <span className="text-[11px] font-mono font-bold tracking-widest text-slate-700 dark:text-white/80 uppercase">
          AES-256 ACTIVE
        </span>
      </motion.div>
    </div>
  );
};

const SearchVisualizer = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 bg-slate-950/20">
      <div className="relative w-full max-w-sm h-72 rounded-2xl bg-white/80 dark:bg-vault-surface/80 border border-slate-200 dark:border-white/10 p-5 shadow-lg backdrop-blur-md overflow-hidden flex flex-col justify-between">
        {/* Mock search items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-xs font-bold">
                JS
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                encryption-protocol.ts
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 font-bold font-mono">
              99% match
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-accent-soft text-accent-primary flex items-center justify-center text-xs font-bold">
                PDF
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                security-audit-report.pdf
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-soft text-accent-primary font-bold font-mono">
              Indexed
            </span>
          </div>
        </div>

        {/* Scan line effect */}
        <motion.div
          animate={{ y: [-10, 260, -10] }}
          transition={{ duration: 3.5, ease: "easeInOut", repeat: Infinity }}
          className="absolute left-0 right-0 top-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee] z-20 pointer-events-none"
        />

        <div className="text-[11px] font-mono text-slate-400 dark:text-white/40 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
          <span>Neural Query Engine</span>
          <span className="text-cyan-500 font-bold">0.4ms</span>
        </div>
      </div>
    </div>
  );
};

const BackupVisualizer = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 bg-slate-950/20">
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {["Primary Node (Frankfurt)", "Secondary Node (N. Virginia)", "Cold Replica (Tokyo)"].map((node, i) => (
          <motion.div
            key={node}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-vault-surface/80 border border-slate-200 dark:border-white/10 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                <HardDrive size={16} />
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-white">
                {node}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                SYNCED
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SharingVisualizer = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 bg-slate-950/20">
      <div className="relative w-full max-w-sm rounded-2xl bg-white/80 dark:bg-vault-surface/80 border border-slate-200 dark:border-white/10 p-5 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-indigo-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              Secure Share Capsule
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-mono font-bold">
            Expiring in 24h
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs font-mono text-slate-600 dark:text-white/60 truncate">
          https://vault.app/s/e7a9b2...
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40 pt-2 border-t border-slate-100 dark:border-white/5">
          <span>Password Protected</span>
          <span className="text-emerald-500 font-bold">1/1 Access Used</span>
        </div>
      </div>
    </div>
  );
};

const RansomwareVisualizer = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 bg-slate-950/20">
      <div className="relative w-full max-w-sm rounded-2xl bg-white/80 dark:bg-vault-surface/80 border border-slate-200 dark:border-white/10 p-5 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-amber-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              Time Machine Rollback
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-mono font-bold">
            Snapshot OK
          </span>
        </div>

        <div className="space-y-2">
          {["Target Snapshot: 10 mins ago", "State: 1,420 Files Restored", "Malware Invalidation: 100%"].map((item, i) => (
            <div
              key={i}
              className="text-xs font-mono text-slate-600 dark:text-white/70 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const ScaleSecurity = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FEATURES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="security" className="py-24 relative bg-vault-bg overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-[1300px]">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft border border-accent-border text-accent-primary font-bold tracking-wider text-xs uppercase mb-4">
            <ShieldCheck size={14} /> Zero-Knowledge Architecture
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-5">
            Security built for <br />
            <span className="text-accent-primary">uncompromising privacy.</span>
          </h2>
          <p className="text-slate-600 dark:text-white/60 text-base sm:text-lg font-medium max-w-xl mx-auto">
            From client-side cryptography to geo-distributed replicas, Vault is engineered so that only you have the keys to your files.
          </p>
        </div>

        {/* Feature Grid with Interactive Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl p-4 sm:p-8 bg-slate-50/70 dark:bg-vault-surface/40 border border-slate-200/70 dark:border-white/5">
          {/* Left Feature Selector Tabs */}
          <div className="lg:col-span-6 flex flex-col gap-2.5">
            {FEATURES.map((feat, idx) => {
              const isActive = idx === activeIndex;
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`cursor-pointer p-4.5 rounded-2xl transition-all duration-200 border ${
                    isActive
                      ? "bg-white dark:bg-vault-surface border-accent-border shadow-md"
                      : "bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? "bg-accent-primary text-accent-foreground"
                          : "bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-white/50"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                        {feat.title}
                      </h3>
                      {isActive && (
                        <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed max-w-md">
                          {feat.desc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Monolith Visualizer */}
          <div className="lg:col-span-6 w-full aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 dark:bg-[#020806] border border-slate-200 dark:border-white/10 relative shadow-inner flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 w-full h-full"
              >
                {activeIndex === 0 && <EncryptionVisualizer />}
                {activeIndex === 1 && <SearchVisualizer />}
                {activeIndex === 2 && <BackupVisualizer />}
                {activeIndex === 3 && <SharingVisualizer />}
                {activeIndex === 4 && <RansomwareVisualizer />}
              </motion.div>
            </AnimatePresence>

            {/* Footer indicator pill */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-vault-surface/90 border border-slate-200 dark:border-white/10 shadow-md text-[11px] font-mono font-bold text-slate-700 dark:text-white/80 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
              <span>Node Security Layer // {activeIndex + 1}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScaleSecurity;
