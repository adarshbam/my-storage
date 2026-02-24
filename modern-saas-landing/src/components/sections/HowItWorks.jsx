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
    <section className="py-24 bg-slate-50 dark:bg-slate-800/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            Simple as 1, 2, 3
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 dark:from-slate-700 dark:via-blue-900 dark:to-slate-700 -z-0" />

          {steps.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative z-10"
            >
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-shadow duration-300 text-center group">
                <div className="inline-block px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold text-sm mb-6 group-hover:scale-110 transition-transform">
                  STEP {item.step}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {item.desc}
                </p>
                {index < steps.length - 1 && (
                  <div className="md:hidden mt-8 flex justify-center text-slate-300">
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
