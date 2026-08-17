import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Layers,
  PlayCircle,
} from "lucide-react";

const PANELS = [
  {
    id: "docs",
    title: "Document Sync",
    subtitle: "Native Office 365 & Google Docs",
    icon: FileText,
    color: "from-blue-500 to-sky-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    textColor: "text-blue-500 dark:text-blue-400",
    desc: "Edit documents, spreadsheets, and markdown notes directly inside Vault. All modifications are encrypted instantly at the block level.",
    visual: () => (
      <div className="absolute right-0 bottom-0 w-48 h-48 md:w-64 md:h-64 bg-blue-950/30 rounded-tl-3xl border-t border-l border-blue-500/20 p-5 flex flex-col shadow-lg backdrop-blur-md">
        <div className="w-full h-6 flex items-center gap-2 mb-4 border-b border-blue-500/20 pb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="space-y-2.5 flex-1">
          <div className="w-full h-2.5 bg-blue-400/20 rounded-full" />
          <div className="w-full h-2.5 bg-blue-400/20 rounded-full" />
          <div className="w-3/4 h-2.5 bg-blue-400/20 rounded-full" />
          <div className="w-1/2 h-2.5 bg-blue-400/20 rounded-full mt-4" />
        </div>
        <div className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
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
    textColor: "text-fuchsia-500 dark:text-fuchsia-400",
    desc: "Never download massive design assets just to inspect them. Vault generates instant previews for high-resolution graphics in milliseconds.",
    visual: () => (
      <div className="absolute right-0 bottom-0 w-48 h-48 md:w-64 md:h-64 bg-fuchsia-950/30 rounded-tl-3xl border-t border-l border-fuchsia-500/20 p-4 grid grid-cols-2 gap-2.5 shadow-lg backdrop-blur-md">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, delay: i * 0.4, repeat: Infinity }}
            className="w-full h-full bg-fuchsia-500/15 rounded-xl border border-fuchsia-500/20 flex items-center justify-center"
          >
            <ImageIcon className="text-fuchsia-500/50 w-5 h-5" />
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    id: "media",
    title: "Media Engine",
    subtitle: "Stream 4K & High-Res Audio",
    icon: PlayCircle,
    color: "from-rose-500 to-orange-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    textColor: "text-rose-500 dark:text-rose-400",
    desc: "Hardware-accelerated media streaming directly from your encrypted vault without downloading the full archive first.",
    visual: () => (
      <div className="absolute inset-0 flex items-center justify-end pr-4 md:pr-10">
        <div className="relative w-44 h-28 md:w-56 md:h-36 bg-rose-950/40 rounded-2xl border border-rose-500/20 flex items-center justify-center shadow-lg backdrop-blur-md overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform">
            <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[10px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "connect",
    title: "Team Comms",
    subtitle: "Slack, Discord & Teams Relay",
    icon: LinkIcon,
    color: "from-teal-400 to-emerald-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    textColor: "text-teal-500 dark:text-teal-400",
    desc: "Share secure, expiring links directly with team channels. Revoke access with one click whenever an asset is updated.",
    visual: () => (
      <div className="absolute right-0 bottom-0 w-48 h-48 md:w-64 md:h-64 bg-teal-950/30 rounded-tl-3xl border-t border-l border-teal-500/20 p-4 flex flex-col justify-end gap-2.5 shadow-lg backdrop-blur-md">
        <div className="w-3/4 h-10 bg-teal-500/20 rounded-xl ml-auto border border-teal-500/20 p-2 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-teal-400/50" />
          <div className="w-full h-1.5 bg-teal-400/20 rounded" />
        </div>
        <div className="w-5/6 h-10 bg-white/5 rounded-xl border border-white/10 p-2 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white/20" />
          <div className="w-3/4 h-1.5 bg-white/20 rounded" />
        </div>
      </div>
    ),
  },
];

const Integrations = () => {
  const [activePanel, setActivePanel] = useState(0);

  return (
    <section id="ecosystem" className="py-24 relative bg-vault-bg overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-[1300px]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft border border-accent-border text-accent-primary font-bold tracking-wider text-xs uppercase mb-4">
            Ecosystem
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-5">
            Deep integration with <br />
            <span className="text-accent-primary">your favorite tools.</span>
          </h2>
          <p className="text-slate-600 dark:text-white/60 text-base sm:text-lg font-medium">
            Vault connects seamlessly with the developer tools and storage providers you already use every day.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="w-full h-[700px] lg:h-[500px] flex flex-col lg:flex-row gap-3 bg-slate-50 dark:bg-[#040c09] p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-white/10 relative overflow-hidden shadow-sm">
          {PANELS.map((panel, idx) => {
            const isActive = activePanel === idx;

            return (
              <motion.div
                key={panel.id}
                onHoverStart={() => setActivePanel(idx)}
                onClick={() => setActivePanel(idx)}
                animate={{ flex: isActive ? 4 : 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`relative overflow-hidden rounded-2xl cursor-pointer border transition-colors duration-300 flex-shrink-0 lg:flex-shrink ${
                  isActive
                    ? `${panel.border} ${panel.bg}`
                    : "border-transparent bg-white/40 dark:bg-white/[0.02] hover:bg-white/80 dark:hover:bg-white/[0.05]"
                }`}
              >
                {/* Inactive state icon & label */}
                <div
                  className={`absolute inset-0 p-5 flex flex-col items-center justify-center lg:justify-start lg:pt-10 transition-opacity duration-200 ${
                    isActive ? "opacity-0 pointer-events-none" : "opacity-100"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-white/50">
                    <panel.icon size={20} />
                  </div>
                  <div
                    className="hidden lg:block mt-8 whitespace-nowrap"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    <span className="text-slate-500 dark:text-white/40 font-bold tracking-wider uppercase text-xs">
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
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 p-6 md:p-10 h-full flex flex-col justify-between"
                    >
                      <div className="relative z-20 max-w-md">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${panel.color} text-white mb-5 shadow-md`}
                        >
                          <panel.icon size={24} />
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                          {panel.title}
                        </h3>
                        <p className={`font-bold ${panel.textColor} mb-3 text-xs uppercase tracking-wider`}>
                          {panel.subtitle}
                        </p>
                        <p className="text-slate-600 dark:text-white/60 text-sm leading-relaxed max-w-sm">
                          {panel.desc}
                        </p>
                      </div>

                      {/* Visual Content Component */}
                      <div className="absolute inset-0 z-10 pointer-events-none opacity-40 lg:opacity-100">
                        <panel.visual />
                      </div>
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
