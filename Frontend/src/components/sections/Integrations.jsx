import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Layers,
  PlayCircle,
} from "lucide-react";

const PANELS = [
  {
    id: "docs",
    title: "Document Sync",
    subtitle: "Native Office 365 & Google Workspace",
    icon: FileText,
    color: "from-blue-500 to-sky-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    textColor: "text-blue-400",
    desc: "Edit your Word documents, Excel spreadsheets, and Google Docs directly inside the Vault vault. All changes are encrypted instantly.",
    visual: () => (
      <div className="absolute right-0 bottom-0 w-48 h-48 md:w-64 md:h-64 bg-blue-950/40 rounded-tl-[2rem] border-t border-l border-blue-500/30 p-6 flex flex-col shadow-[-20px_-20px_50px_rgba(59,130,246,0.15)] backdrop-blur-md">
        <div className="w-full h-8 flex items-center gap-2 mb-6 border-b border-blue-500/20 pb-4">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <div className="space-y-3 flex-1">
          <div className="w-full h-3 bg-blue-400/20 rounded-full" />
          <div className="w-full h-3 bg-blue-400/20 rounded-full" />
          <div className="w-3/4 h-3 bg-blue-400/20 rounded-full" />
          <div className="w-1/2 h-3 bg-blue-400/20 rounded-full mt-6" />
        </div>
        <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        </div>
      </div>
    ),
  },
  {
    id: "creative",
    title: "Creative Cloud",
    subtitle: "Instant PSD, AI & RAW Previews",
    icon: Layers,
    color: "from-fuchsia-500 to-purple-500",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    textColor: "text-fuchsia-400",
    desc: "Never download massive design files just to check them. Vault generates pixel-perfect previews for Adobe and Figma files in milliseconds.",
    visual: () => (
      <div className="absolute right-0 bottom-0 w-48 h-48 md:w-64 md:h-64 bg-fuchsia-950/40 rounded-tl-[2rem] border-t border-l border-fuchsia-500/30 p-4 md:p-6 grid grid-cols-2 gap-3 shadow-[-20px_-20px_50px_rgba(217,70,239,0.15)] backdrop-blur-md">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 3, delay: i * 0.4, repeat: Infinity }}
            className="w-full h-full bg-gradient-to-br from-fuchsia-500/20 to-purple-500/5 rounded-xl border border-fuchsia-500/20 flex items-center justify-center"
          >
            <ImageIcon className="text-fuchsia-500/40 w-6 h-6" />
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    id: "media",
    title: "Media Engine",
    subtitle: "Stream 4K & 8K Video Native",
    icon: PlayCircle,
    color: "from-rose-500 to-orange-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    textColor: "text-rose-400",
    desc: "Built-in hardware-accelerated media player. Stream heavy drone footage or uncompressed audio directly from your encrypted vault.",
    visual: () => (
      <div className="absolute inset-0 flex items-center justify-end pr-4 md:pr-12">
        <div className="relative w-48 h-32 md:w-64 md:h-40 bg-rose-950/50 rounded-2xl border border-rose-500/30 flex items-center justify-center shadow-[0_0_60px_rgba(244,63,94,0.2)] backdrop-blur-md overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 to-orange-500/10" />
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)] cursor-pointer hover:scale-110 transition-transform relative z-10">
            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[12px] border-l-white border-b-[6px] border-b-transparent ml-1" />
          </div>
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 z-10">
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: ["0%", "100%"] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="h-full bg-rose-400 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "connect",
    title: "Team Comms",
    subtitle: "Slack, Discord & Teams",
    icon: LinkIcon,
    color: "from-teal-400 to-emerald-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    textColor: "text-teal-400",
    desc: "Share secure, expiring links directly to your team's channels. Revoke access with one click if a file falls into the wrong hands.",
    visual: () => (
      <div className="absolute right-0 bottom-0 w-48 h-48 md:w-64 md:h-64 bg-teal-950/40 rounded-tl-[2rem] border-t border-l border-teal-500/30 p-4 md:p-6 flex flex-col justify-end gap-3 shadow-[-20px_-20px_50px_rgba(20,184,166,0.15)] backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ repeat: Infinity, duration: 4, repeatDelay: 1 }}
          className="w-3/4 h-10 md:h-12 bg-teal-500/20 rounded-2xl rounded-tr-sm ml-auto border border-teal-500/20 p-2 flex items-center gap-2"
        >
          <div className="w-5 h-5 rounded-full bg-teal-400/40 flex-shrink-0" />
          <div className="w-full h-1.5 bg-teal-400/20 rounded" />
        </motion.div>
        <div className="w-5/6 h-10 md:h-12 bg-white/5 rounded-2xl rounded-tl-sm border border-white/10 p-2 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="w-3/4 h-1.5 bg-white/10 rounded" />
            <div className="w-1/2 h-1.5 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    ),
  },
];

const Integrations = () => {
  const [activePanel, setActivePanel] = useState(0);

  return (
    <section id="ecosystem" className="py-24 relative bg-transparent overflow-hidden my-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-[1400px]">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <span className="text-[#14b8a6] font-bold tracking-widest text-xs uppercase mb-4 block">
            Ecosystem
          </span>
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
            Deep integration with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14b8a6] to-[#3b82f6]">
              your favorite apps.
            </span>
          </h2>
          <p className="text-slate-600 dark:text-white/60 text-lg md:text-xl font-medium">
            Vault doesn't just store files; it connects them. Work seamlessly
            with the tools you already love directly in the browser.
          </p>
        </div>

        {/* The Accordion Container */}
        <div className="w-full h-[800px] lg:h-[600px] flex flex-col lg:flex-row gap-4 bg-[#020705] p-4 md:p-5 rounded-[3rem] shadow-[0_30px_100px_rgba(20,184,166,0.2)] border border-[#14b8a6]/20 relative overflow-hidden">
          {/* Ambient glow inside accordion container */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#14b8a6]/10 blur-[120px] rounded-full pointer-events-none" />

          {PANELS.map((panel, idx) => {
            const isActive = activePanel === idx;

            return (
              <motion.div
                key={panel._id}
                onHoverStart={() => setActivePanel(idx)}
                onClick={() => setActivePanel(idx)}
                animate={{ flex: isActive ? 5 : 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={`relative overflow-hidden rounded-[2.5rem] cursor-pointer border transition-colors duration-500 flex-shrink-0 lg:flex-shrink ${
                  isActive
                    ? `${panel.border} ${panel.bg}`
                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.06]"
                }`}
              >
                {/* Inactive State Content */}
                <div
                  className={`absolute inset-0 p-6 flex flex-col items-center justify-center lg:justify-start lg:pt-12 transition-opacity duration-300 ${isActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border border-white/10 bg-white/5 text-white/50 shadow-inner">
                    <panel.icon size={24} />
                  </div>
                  <div
                    className="hidden lg:block mt-10 whitespace-nowrap origin-center"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    <span className="text-white/40 font-bold tracking-widest uppercase text-sm">
                      {panel.title}
                    </span>
                  </div>
                  <div className="block lg:hidden mt-4">
                    <span className="text-white/40 font-bold tracking-widest uppercase text-xs text-center block">
                      {panel.title}
                    </span>
                  </div>
                </div>

                {/* Active Expanded Content */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 }}
                      className="absolute inset-0 p-8 md:p-12 h-full flex flex-col"
                    >
                      <div className="relative z-20 max-w-[280px] md:max-w-md">
                        <div
                          className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${panel.color} text-white mb-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]`}
                        >
                          <panel.icon size={32} />
                        </div>
                        <h3 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
                          {panel.title}
                        </h3>
                        <p
                          className={`font-bold ${panel.textColor} mb-4 text-sm md:text-base tracking-wide uppercase`}
                        >
                          {panel.subtitle}
                        </p>
                        <p className="text-white/60 text-base md:text-lg leading-relaxed max-w-sm hidden sm:block">
                          {panel.desc}
                        </p>
                      </div>

                      {/* Rich Visual Content Component */}
                      <div className="absolute inset-0 z-10 pointer-events-none opacity-40 lg:opacity-100 mix-blend-screen">
                        <panel.visual />
                      </div>

                      {/* Dark gradient fade from left to ensure text is always readable */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#020705] via-[#020705]/80 to-transparent z-10 pointer-events-none w-full lg:w-3/4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Integrations;
