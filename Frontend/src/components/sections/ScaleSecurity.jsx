import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Search, HardDrive, Share2, RefreshCw } from "lucide-react";

const FEATURES = [
  {
    id: "encryption",
    icon: ShieldCheck,
    title: "Military-Grade Encryption",
    desc: "AES-256 bit encryption for all your files at rest and in transit. Your keys, your rules. Zero-knowledge architecture means even we can't see your data.",
    color: "from-emerald-400 to-teal-500",
    glowColor: "rgba(16,185,129,0.2)",
    activeBg: "bg-emerald-500/10",
    activeBorder: "border-emerald-500/30",
    textColor: "text-emerald-400",
  },
  {
    id: "search",
    icon: Search,
    title: "Neural AI Search",
    desc: "Find files instantly without remembering names. Our on-device AI recognizes objects, text, and faces in your images to pull up exactly what you need.",
    color: "from-cyan-400 to-blue-500",
    glowColor: "rgba(6,182,212,0.2)",
    activeBg: "bg-cyan-500/10",
    activeBorder: "border-cyan-500/30",
    textColor: "text-cyan-400",
  },
  {
    id: "backups",
    icon: HardDrive,
    title: "Continuous Backups",
    desc: "Set it and forget it. Every change is instantly replicated across three geographic regions. Your digital life is completely immune to hardware failure.",
    color: "from-teal-400 to-emerald-500",
    glowColor: "rgba(20,184,166,0.2)",
    activeBg: "bg-teal-500/10",
    activeBorder: "border-teal-500/30",
    textColor: "text-teal-400",
  },
  {
    id: "sharing",
    icon: Share2,
    title: "Expiring Secure Links",
    desc: "Share massive files or folders with a single link. Set passwords, view-once permissions, and auto-expiring timers for total control over your shared data.",
    color: "from-indigo-400 to-purple-500",
    glowColor: "rgba(99,102,241,0.2)",
    activeBg: "bg-indigo-500/10",
    activeBorder: "border-indigo-500/30",
    textColor: "text-indigo-400",
  },
  {
    id: "ransomware",
    icon: RefreshCw,
    title: "Ransomware Rescue",
    desc: "Turn back time. Our immutable version history lets you instantly roll back your entire drive to any second in the last 30 days. Untouchable by malware.",
    color: "from-lime-400 to-green-500",
    glowColor: "rgba(132,204,22,0.2)",
    activeBg: "bg-lime-500/10",
    activeBorder: "border-lime-500/30",
    textColor: "text-lime-400",
  }
];

// --- VISUALIZERS ---

const EncryptionVisualizer = () => {
  const [matrix, setMatrix] = useState([]);
  useEffect(() => {
    const chars = '0123456789ABCDEF!@#$%^&*';
    const generate = () => Array(150).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]);
    setMatrix(generate());
    const interval = setInterval(() => setMatrix(generate()), 100);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-emerald-950/20">
      <div className="absolute inset-0 grid grid-cols-[repeat(auto-fit,minmax(20px,1fr))] gap-2 p-8 opacity-20 overflow-hidden mix-blend-screen">
        {matrix.map((char, i) => (
          <div key={i} className="text-emerald-500 font-mono text-xl font-bold text-center leading-none">{char}</div>
        ))}
      </div>
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-48 h-48 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_100px_rgba(16,185,129,0.3)] backdrop-blur-xl"
      >
        <ShieldCheck size={96} className="text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
      </motion.div>
    </div>
  )
}

const SearchVisualizer = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-cyan-950/20">
      <div className="relative w-80 h-96 bg-cyan-900/10 rounded-[2.5rem] border border-cyan-500/20 p-6 shadow-[0_0_60px_rgba(6,182,212,0.15)] backdrop-blur-md overflow-hidden">
        {/* Floating image wireframes */}
        <div className="grid grid-cols-2 gap-4 h-full relative z-0">
            <div className="space-y-4">
                <div className="h-32 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 relative overflow-hidden">
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-4 border border-cyan-400/50 rounded flex items-center justify-center bg-cyan-400/10">
                        <span className="text-cyan-400 text-[10px] font-bold">98% Match</span>
                    </motion.div>
                </div>
                <div className="h-40 bg-cyan-500/5 rounded-2xl border border-cyan-500/10" />
            </div>
            <div className="space-y-4 pt-12">
                <div className="h-24 bg-cyan-500/5 rounded-2xl border border-cyan-500/10" />
                <div className="h-36 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 relative overflow-hidden">
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, delay: 1, repeat: Infinity }} className="absolute inset-x-4 top-4 bottom-12 border border-cyan-400/50 rounded flex items-center justify-center bg-cyan-400/10">
                        <span className="text-cyan-400 text-[10px] font-bold">Text Found</span>
                    </motion.div>
                </div>
            </div>
        </div>
        
        {/* Giant Scanner Line sweeping down and up */}
        <motion.div 
          animate={{ y: [-20, 400, -20] }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
          className="absolute left-0 right-0 top-0 h-[2px] bg-cyan-300 shadow-[0_0_40px_10px_rgba(6,182,212,0.6)] z-10"
        />
        <motion.div 
          animate={{ y: [-20, 400, -20] }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
          className="absolute left-0 right-0 top-0 h-32 bg-gradient-to-b from-transparent to-cyan-400/20 z-0 pointer-events-none"
        />
      </div>
    </div>
  )
}

const BackupVisualizer = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-teal-950/20" style={{ perspective: '1200px' }}>
      <div className="relative w-64 h-64 flex flex-col items-center justify-center" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(60deg) rotateZ(-45deg)' }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ z: [0, 20, 0] }}
            transition={{ duration: 4, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-72 h-72 border border-teal-500/40 rounded-[2.5rem] bg-teal-500/5 backdrop-blur-md"
            style={{ 
              transform: `translateZ(${i * -80}px)`,
              boxShadow: i === 0 ? 'inset 0 0 50px rgba(20,184,166,0.2)' : '0 20px 60px rgba(20,184,166,0.1)'
            }}
          >
            {/* Grid pattern on the plate */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.15)_1px,transparent_1px)] bg-[size:24px_24px] rounded-[2.5rem] pointer-events-none" />
            
            {/* Pulsing data nodes */}
            <div className="absolute top-1/4 left-1/4 w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_20px_#2dd4bf] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_20px_#2dd4bf] animate-pulse" style={{ animationDelay: '1s' }} />
          </motion.div>
        ))}
        {/* Vertical beam connecting them */}
        <div className="absolute w-1.5 h-[240px] bg-gradient-to-b from-teal-400/80 to-transparent shadow-[0_0_30px_#2dd4bf]" style={{ transform: 'translateZ(-160px) rotateX(90deg)' }} />
      </div>
    </div>
  )
}

const SharingVisualizer = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-indigo-950/20" style={{ perspective: '1000px' }}>
      <div className="relative w-96 h-96 flex items-center justify-center" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(55deg)' }}>
         {/* Central Node */}
         <div className="absolute w-24 h-24 rounded-[2rem] bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center z-20 shadow-[0_0_60px_rgba(99,102,241,0.5)] backdrop-blur-md" style={{ transform: 'rotateX(-55deg)' }}>
           <Share2 size={48} className="text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
         </div>
         
         {/* Orbiting rings */}
         <div className="absolute w-64 h-64 rounded-full border-[3px] border-indigo-500/30 shadow-[inset_0_0_30px_rgba(99,102,241,0.3)]" />
         <div className="absolute w-96 h-96 rounded-full border-2 border-indigo-500/15" />
         
         {/* Moving Data Packets (SVG) */}
         <svg className="absolute w-full h-full overflow-visible z-10" viewBox="0 0 384 384">
             {/* Inner orbit packet */}
             <motion.circle 
                cx="192" cy="64" r="8" fill="#818cf8"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                style={{ originX: '192px', originY: '192px' }}
                className="drop-shadow-[0_0_15px_#818cf8]"
             />
             {/* Outer orbit packet */}
             <motion.circle 
                cx="192" cy="0" r="6" fill="#818cf8"
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                style={{ originX: '192px', originY: '192px' }}
                className="drop-shadow-[0_0_12px_#818cf8]"
             />
         </svg>
      </div>
    </div>
  )
}

const RansomwareVisualizer = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-lime-950/20" style={{ perspective: '1000px' }}>
      <motion.div
        animate={{ rotateY: [0, 8, -8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-72 h-96 rounded-[2.5rem] border border-lime-500/40 bg-lime-500/10 p-8 shadow-[0_0_80px_rgba(132,204,22,0.2)] backdrop-blur-md overflow-hidden"
      >
        <div className="flex justify-between items-start mb-10">
            <RefreshCw size={48} className="text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.8)]" />
            <div className="px-4 py-1.5 rounded-full bg-lime-500/20 text-lime-400 text-xs font-bold font-mono tracking-widest border border-lime-500/30">RESTORED</div>
        </div>

        {/* Glitch lines overlay */}
        <motion.div 
            animate={{ opacity: [0, 0.4, 0, 0.8, 0] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.5, 0.6, 1] }}
            className="absolute inset-0 bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(132,204,22,0.3)_2px,rgba(132,204,22,0.3)_4px)] mix-blend-overlay pointer-events-none"
        />

        {/* Scanning restore effect */}
        <motion.div 
          animate={{ y: [-100, 400] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }} 
          className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent to-lime-400/30 border-b-2 border-lime-400 z-10" 
        />

        <div className="space-y-5 relative z-0">
            <div className="w-full h-6 bg-lime-500/20 rounded-lg" />
            <div className="w-5/6 h-6 bg-lime-500/20 rounded-lg" />
            <div className="w-4/6 h-6 bg-lime-500/20 rounded-lg" />
            <div className="w-full h-6 bg-lime-500/20 rounded-lg mt-10" />
            <div className="w-3/4 h-6 bg-lime-500/20 rounded-lg" />
        </div>
      </motion.div>
    </div>
  )
}

// --- MAIN COMPONENT ---

const ScaleSecurity = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto cycle features
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FEATURES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-transparent py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <section 
            id="security" 
            className="max-w-[1400px] mx-auto relative bg-[#050c0a] overflow-hidden rounded-[3rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
        >
            {/* Big subtle ambient glow behind the section content */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[150px] opacity-[0.15] rounded-full transition-colors duration-1000 pointer-events-none"
              style={{ backgroundColor: FEATURES[activeIndex].glowColor }}
            />

            <div className="relative z-10 px-8 py-20 md:p-20">
                <div className="mb-20">
                    <span className="inline-flex items-center gap-2 text-white/50 font-bold tracking-widest text-xs uppercase mb-6">
                        <span className="w-8 h-px bg-white/30" />
                        Zero-Knowledge Architecture
                    </span>
                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05]">
                        Beyond Standard <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Security.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    
                    {/* Left: The Feature List */}
                    <div className="lg:col-span-5 flex flex-col gap-3">
                        {FEATURES.map((feat, idx) => {
                            const isActive = idx === activeIndex;
                            return (
                                <div 
                                    key={feat.id}
                                    onClick={() => setActiveIndex(idx)}
                                    className={`cursor-pointer group relative p-6 rounded-[2rem] transition-all duration-500 ${
                                        isActive 
                                        ? `${feat.activeBg} ${feat.activeBorder} border shadow-2xl backdrop-blur-md` 
                                        : 'hover:bg-white/[0.03] border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-start gap-6">
                                        <div className={`mt-1 flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                            isActive 
                                            ? `bg-gradient-to-br ${feat.color} shadow-lg text-slate-900 scale-110` 
                                            : 'bg-white/5 text-white/40 group-hover:text-white/80'
                                        }`}>
                                            <feat.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                        </div>
                                        <div>
                                            <h3 className={`text-2xl md:text-3xl font-bold tracking-tight transition-all duration-500 ${
                                                isActive ? 'text-white' : 'text-white/40 group-hover:text-white/60'
                                            }`}>
                                                {feat.title}
                                            </h3>
                                            
                                            <AnimatePresence>
                                                {isActive && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                                        className="overflow-hidden"
                                                    >
                                                        <p className="pt-4 text-lg text-white/60 leading-relaxed max-w-md">
                                                            {feat.desc}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Right: The Monolith Showcase */}
                    <div className="lg:col-span-7 relative w-full aspect-square lg:aspect-[4/3] max-h-[800px] rounded-[3rem] overflow-hidden bg-[#020504] border border-white/10 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
                        {/* Glass glare overlay */}
                        <div className="absolute inset-0 z-30 pointer-events-none rounded-[3rem] border border-white/5" />
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-30" />
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent z-30 pointer-events-none" />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute inset-0 w-full h-full"
                            >
                                {activeIndex === 0 && <EncryptionVisualizer />}
                                {activeIndex === 1 && <SearchVisualizer />}
                                {activeIndex === 2 && <BackupVisualizer />}
                                {activeIndex === 3 && <SharingVisualizer />}
                                {activeIndex === 4 && <RansomwareVisualizer />}
                            </motion.div>
                        </AnimatePresence>

                        {/* Visualizer Footer Bar */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full bg-[#0a1411]/80 backdrop-blur-xl border border-white/10 flex items-center gap-4 shadow-2xl">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-white/70 text-xs font-bold tracking-widest uppercase font-mono">
                                System Active // Node {activeIndex + 1}
                            </span>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    </div>
  )
}

export default ScaleSecurity;
