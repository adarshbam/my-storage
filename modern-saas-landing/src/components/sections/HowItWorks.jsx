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
  return (
    <section className="py-24 bg-[#022c22] dark:bg-[#011c16] relative">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-accent-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white">
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
            >
              <div className="bg-[#0D1520] p-8 rounded-[2rem] border border-brand-500/10 shadow-2xl hover:-translate-y-1 hover:border-brand-500/30 transition-all duration-300 text-center group">
                <div className="inline-block px-5 py-1.5 rounded-[1rem] bg-[#14b8a6]/20 text-[#2dd4bf] font-bold text-sm mb-6 border border-[#14b8a6]/30 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                  STEP {item.step}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-400 font-medium">
                  {item.desc}
                </p>
                {index < steps.length - 1 && (
                  <div className="md:hidden mt-8 flex justify-center text-brand-300/50">
                    <ArrowRight size={24} className="rotate-90" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
