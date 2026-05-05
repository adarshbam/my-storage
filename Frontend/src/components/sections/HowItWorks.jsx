import { motion } from "framer-motion";
import { Upload, FolderOpen, Share2 } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Secure Upload",
    desc: "Drop files into the vault. They are encrypted instantly on your device before ever hitting our servers.",
    accent: "from-emerald-400 to-teal-500",
    shadow: "shadow-teal-500/20",
    visual: () => (
      <div className="relative w-full h-48 bg-black/20 rounded-2xl border border-white/5 overflow-hidden flex flex-col items-center justify-center group-hover:border-teal-500/30 transition-colors">
         {/* Upload zone mockup */}
         <div className="w-24 h-24 rounded-full border-2 border-dashed border-teal-500/30 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-teal-500/10 rounded-full animate-ping" />
            <Upload className="text-teal-400" size={32} />
         </div>
         {/* Fake file dropping */}
         <motion.div 
            animate={{ y: [-50, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-4 w-12 h-16 bg-white/10 rounded border border-white/20 flex items-center justify-center"
         >
            <div className="w-6 h-6 rounded-sm bg-teal-400/50" />
         </motion.div>
      </div>
    )
  },
  {
    step: "02",
    icon: FolderOpen,
    title: "Neural Sort",
    desc: "Our local AI automatically categorizes, tags, and organizes your files into secure smart folders.",
    accent: "from-blue-400 to-indigo-500",
    shadow: "shadow-blue-500/20",
    visual: () => (
      <div className="relative w-full h-48 bg-black/20 rounded-2xl border border-white/5 overflow-hidden p-6 group-hover:border-blue-500/30 transition-colors">
         {/* Sorting mockup */}
         <div className="flex flex-col gap-3">
             {[1,2,3].map((i) => (
                 <motion.div 
                    key={i}
                    animate={{ x: [0, 10, 0] }}
                    transition={{ duration: 3, delay: i * 0.2, repeat: Infinity }}
                    className="w-full h-10 bg-white/5 rounded-xl border border-white/10 flex items-center px-3 gap-3"
                 >
                    <FolderOpen className="text-blue-400 w-5 h-5" />
                    <div className="w-1/2 h-2 bg-white/20 rounded-full" />
                 </motion.div>
             ))}
         </div>
      </div>
    )
  },
  {
    step: "03",
    icon: Share2,
    title: "Zero-Trust Share",
    desc: "Generate self-destructing links with password protection. You control who sees what, and for how long.",
    accent: "from-purple-400 to-pink-500",
    shadow: "shadow-purple-500/20",
    visual: () => (
      <div className="relative w-full h-48 bg-black/20 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center group-hover:border-purple-500/30 transition-colors">
         {/* Link generation mockup */}
         <div className="w-3/4 bg-black/40 rounded-xl border border-white/10 p-4 relative">
             <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                <Share2 className="text-purple-400 w-5 h-5" />
                <div className="w-2/3 h-2 bg-white/20 rounded-full" />
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs text-white/40 font-mono">Expires in 24h</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <div className="w-3 h-3 bg-purple-400 rounded-sm" />
                </div>
             </div>
             {/* Scanning laser line over link */}
             <motion.div 
                animate={{ y: [0, 80, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 w-full h-px bg-purple-400 shadow-[0_0_10px_#c084fc]" 
             />
         </div>
      </div>
    )
  },
];

const HowItWorks = () => {
  return (
    <section className="py-32 relative overflow-hidden bg-[#010504]">
      {/* Background Pipeline Glow */}
      <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#14b8a6]/20 to-transparent hidden lg:block" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-24"
        >
          <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-white/50 font-bold tracking-widest text-xs uppercase mb-6">
            The Pipeline
          </span>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight">
            Flawless Execution.
          </h2>
        </motion.div>

        {/* The Pipeline Interface */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative">
          
          {steps.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 relative group"
            >
              {/* Connecting Laser Line (Desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[24px] left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px] z-0 overflow-hidden">
                    <div className="w-full h-full bg-white/5" />
                    {/* Animated energy packet traveling down the line */}
                    <motion.div 
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: index }}
                        className={`absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent`} 
                    />
                </div>
              )}

              {/* The Step Node Container */}
              <div className="relative z-10 rounded-[2.5rem] bg-[#030a08] border border-white/5 p-8 h-full flex flex-col hover:border-white/15 transition-all duration-500 hover:-translate-y-2 shadow-2xl">
                
                {/* Header Row */}
                <div className="flex items-center justify-between mb-8">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${item.accent} text-white shadow-lg`}>
                        <item.icon size={24} />
                    </div>
                    <div className="text-6xl font-black text-white/5 tracking-tighter">
                        {item.step}
                    </div>
                </div>

                {/* The Custom Visual Mockup */}
                <div className="mb-8 flex-1">
                    <item.visual />
                </div>

                {/* Text Content */}
                <div>
                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                        {item.title}
                    </h3>
                    <p className="text-white/50 font-medium leading-relaxed">
                        {item.desc}
                    </p>
                </div>

              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
