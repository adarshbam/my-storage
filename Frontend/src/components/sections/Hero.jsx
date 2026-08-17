import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  HardDrive,
  Share2,
  Globe,
  Lock,
  Sparkles,
} from "lucide-react";
import { VaultLogo } from "../ui/VaultIcons";

const FEATURE_NODES = [
  {
    id: "store",
    title: "Store Everything",
    desc: "Photos, videos, docs & code",
    icon: HardDrive,
  },
  {
    id: "share",
    title: "Share Securely",
    desc: "Encrypted links & permissions",
    icon: Share2,
  },
  {
    id: "access",
    title: "Access Anywhere",
    desc: "Web, mobile & desktop",
    icon: Globe,
  },
  {
    id: "protect",
    title: "Always Protected",
    desc: "Zero-knowledge encryption",
    icon: Lock,
  },
];

const Hero = () => {
  const [activeNode, setActiveNode] = useState(0);

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-32 pb-20 overflow-hidden bg-vault-bg">
      {/* Dynamic Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70vw] h-[45vh] bg-accent-soft rounded-full blur-[140px] opacity-70" />
        <div className="absolute bottom-10 right-1/4 w-[35vw] h-[35vw] bg-accent-glow rounded-full blur-[120px] opacity-20" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-[1300px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT: Confident Typography & Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft border border-accent-border mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
              <span className="text-xs font-bold tracking-wider uppercase text-accent-primary">
                Built for privacy. Designed for control.
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.08]">
              Your digital life, <br />
              <span className="text-accent-primary">
                finally secure.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-white/60 max-w-xl mb-9 font-medium leading-relaxed">
              Vault gives you zero-knowledge encryption, lightning-fast sync, and granular control over your files and media across all your devices.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-10">
              <Link to="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm tracking-wide bg-accent-primary text-accent-foreground shadow-lg shadow-accent-glow/25 hover:opacity-95 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer">
                  <Zap size={16} fill="currentColor" />
                  <span>Start Free Trial</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>

              <a href="#features" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-sm text-slate-700 dark:text-white/80 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/10 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer">
                  <ShieldCheck size={16} className="text-accent-primary" />
                  <span>Explore Architecture</span>
                </button>
              </a>
            </div>

            {/* Trust Micro-Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-500 dark:text-white/50">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
                <ShieldCheck size={14} className="text-accent-primary" />
                <span>Zero-knowledge AES-256</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
                <Sparkles size={14} className="text-accent-primary" />
                <span>1024 MB Free Vault</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
                <span>No credit card required</span>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: High-Performance Lightweight SVG/CSS Orbital Radar Architecture */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 relative flex flex-col items-center justify-center"
          >
            <div className="relative w-full max-w-[540px] aspect-square rounded-3xl p-4 flex items-center justify-center">
              
              {/* Concentric Orbital Radar System */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Outer Ring */}
                <div className="w-[90%] h-[90%] rounded-full border border-slate-300/40 dark:border-white/[0.06] flex items-center justify-center" />
                
                {/* Middle Ring */}
                <div className="absolute w-[66%] h-[66%] rounded-full border border-slate-300/60 dark:border-white/[0.08] flex items-center justify-center" />
                
                {/* Inner Accent Ring */}
                <div className="absolute w-[44%] h-[44%] rounded-full border border-accent-border bg-accent-soft/30 flex items-center justify-center shadow-accent-glow" />

                {/* Rotating Sweep Beam */}
                <div className="absolute w-[80%] h-[80%] rounded-full animate-radar-sweep opacity-30">
                  <div className="w-1/2 h-1/2 bg-gradient-to-br from-accent-primary to-transparent rounded-tl-full" />
                </div>
              </div>

              {/* Central Glowing Vault Shield */}
              <div className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white dark:bg-vault-surface border-2 border-accent-primary flex items-center justify-center shadow-xl shadow-accent-glow/40">
                <VaultLogo size={48} className="text-accent-primary" />
              </div>

              {/* Connected Interactive Feature Cards Stack (Right Column Overlay) */}
              <div className="absolute right-0 sm:-right-4 inset-y-4 flex flex-col justify-between z-20 w-44 sm:w-56 pointer-events-auto">
                {FEATURE_NODES.map((node, idx) => {
                  const isActive = activeNode === idx;
                  const Icon = node.icon;
                  return (
                    <div
                      key={node.id}
                      onMouseEnter={() => setActiveNode(idx)}
                      onClick={() => setActiveNode(idx)}
                      className={`p-3 sm:p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border backdrop-blur-xl ${
                        isActive
                          ? "bg-white dark:bg-vault-surface border-accent-primary shadow-lg shadow-accent-glow/20 translate-x-[-8px]"
                          : "bg-white/75 dark:bg-vault-surface/70 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? "bg-accent-primary text-accent-foreground"
                              : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60"
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {node.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-white/50 truncate">
                            {node.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
