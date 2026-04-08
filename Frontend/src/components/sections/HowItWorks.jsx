import { useState } from "react";
import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Upload",
    desc: "Drag and drop your files or enable auto-camera backup.",
  },
  {
    step: "02",
    title: "Organize",
    desc: "Sort into folders, add tags, or let AI organize for you.",
  },
  {
    step: "03",
    title: "Share",
    desc: "Send a link to friends or collaborate with your team.",
  },
];

const HowItWorks = () => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const defaultBtnStyle = "bg-[#062922] dark:bg-[#062922] text-[#2dd4bf] border-[#0f463e] shadow-[0_2px_10px_rgba(0,0,0,0.2)]";

  return (
    <section className="py-32 relative overflow-hidden bg-slate-50/50 dark:bg-[#05110e]/80 border-y border-slate-200 dark:border-white/[0.05] backdrop-blur-sm">
      {/* Decorative Blur (Subtle local highlight with slow pulse) */}
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-[#14b8a6]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-[#14b8a6]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Simple as 1, 2, 3
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, index) => {
            const isHovered = hoveredCard === index;
            
            return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="relative z-10"
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className={`glass-panel bg-white/40 dark:bg-[#020b08]/80 p-8 rounded-[2rem] transition-all duration-300 text-center group h-full relative overflow-hidden z-10 border ${
                isHovered ? 'dark:bg-[#020b08]/90 bg-white/80 -translate-y-2 border-[#14b8a6]/30 shadow-[0_8px_30px_rgba(20,184,166,0.12)]' : 'border-black/5 dark:border-white/[0.05]'
              }`}>
                {/* Soft Gradient Background Highlight */}
                <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 pointer-events-none to-transparent ${
                  isHovered ? 'opacity-100 from-[#14b8a6]/10 via-transparent' : 'opacity-0 from-[#14b8a6]/0 via-transparent'
                }`} />

                <div className="relative z-20">
                  <div className={`inline-block px-6 py-1.5 rounded-[1.5rem] font-bold text-sm mb-6 border transition-all duration-500 ${
                    isHovered ? 'bg-[#14b8a6]/10 text-[#2dd4bf] border-[#14b8a6]/30 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : defaultBtnStyle
                  }`}>
                    Step {item.step}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight relative">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 dark:text-white/70 font-medium relative">
                    {item.desc}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="md:hidden mt-8 flex justify-center text-[#14b8a6]/50">
                    <div className={`w-1 h-8 rounded-full transition-all duration-500 bg-gradient-to-b from-[#14b8a6]/50 to-transparent ${
                        hoveredCard !== null && hoveredCard >= index + 1 ? 'opacity-100 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'opacity-30'
                    }`} />
                  </div>
                )}
              </div>

              {/* Desktop Animated Line Connector */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-8 w-8 h-[3px] -translate-y-1/2 z-0 rounded-full bg-slate-200/50 dark:bg-white/5 overflow-hidden">
                  <div className={`w-full h-full transition-all duration-500 origin-left bg-[#14b8a6] ${
                    hoveredCard !== null && hoveredCard >= index + 1
                      ? 'scale-x-100 opacity-100 drop-shadow-[0_0_8px_rgba(20,184,166,0.6)]'
                      : 'scale-x-0 opacity-0'
                  }`} />
                </div>
              )}
            </motion.div>
          )})}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
