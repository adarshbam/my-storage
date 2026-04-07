import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

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

  return (
    <section className="py-32 bg-transparent relative">
      {/* Decorative Blur (Subtle local highlight) */}
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-accent-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Simple as 1, 2, 3
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-[40px] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent dark:via-brand-800 -z-0" />

          {steps.map((item, index) => (
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
              <div className={`glass-panel bg-white/40 dark:bg-[#0f463e]/40 p-8 rounded-[2rem] transition-all duration-300 text-center group h-full relative overflow-hidden z-10 ${
                hoveredCard === index ? 'dark:bg-[#0f463e]/80 bg-white/80 -translate-y-2 border-[#14b8a6]/50 shadow-[0_0_40px_rgba(20,184,166,0.3)]' : 'border-[#14b8a6]/20'
              }`}>
                {/* Animated Gradient Background Highlight */}
                <div className={`absolute inset-0 bg-gradient-to-br from-[#14b8a6]/20 via-[#14b8a6]/5 to-transparent transition-opacity duration-500 pointer-events-none ${
                  hoveredCard === index ? 'opacity-100 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : 'opacity-0'
                }`} />

                <div className="relative z-20">
                  <div className={`inline-block px-5 py-1.5 rounded-[1rem] font-bold text-sm mb-6 border transition-colors duration-500 ${
                    hoveredCard === index ? 'bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/50 shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white border-slate-200 dark:border-white/20'
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
                    <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[#14b8a6]/50 to-transparent" />
                  </div>
                )}
              </div>

              {/* Desktop Animated Line Connector */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-8 w-8 h-[3px] -translate-y-1/2 z-0 rounded-full bg-white/5 overflow-hidden">
                  <div className={`w-full h-full bg-gradient-to-r from-[#14b8a6]/20 via-[#14b8a6] to-[#3b82f6] transition-all duration-500 origin-left ${
                    hoveredCard !== null && hoveredCard > index
                      ? 'scale-x-100 opacity-100 drop-shadow-[0_0_12px_rgba(20,184,166,0.9)] animate-pulse'
                      : 'scale-x-0 opacity-0'
                  }`} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
