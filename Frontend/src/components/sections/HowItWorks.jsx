import { motion } from "framer-motion";
import { Upload, FolderOpen, Share2 } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Secure Upload",
    desc: "Drag files into your vault. They are encrypted client-side using AES-256 before any byte touches the network.",
  },
  {
    step: "02",
    icon: FolderOpen,
    title: "Neural Organization",
    desc: "Intelligent indexing organizes and links your storage with Google Drive and GitHub repos without data duplication.",
  },
  {
    step: "03",
    icon: Share2,
    title: "Zero-Trust Sharing",
    desc: "Generate password-protected, auto-expiring capsules. Revoke access with a single click at any time.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 relative overflow-hidden bg-vault-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-[1300px]">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft border border-accent-border text-accent-primary font-bold tracking-wider text-xs uppercase mb-4">
            Pipeline
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-5">
            How Vault works.
          </h2>
          <p className="text-slate-600 dark:text-white/60 text-base sm:text-lg font-medium">
            Three simple steps to take full control of your cloud storage.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                className="relative rounded-3xl p-6 sm:p-8 bg-white/70 dark:bg-vault-surface/70 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-accent-soft text-accent-primary border border-accent-border">
                      <Icon size={22} />
                    </div>
                    <span className="text-4xl font-black text-slate-300 dark:text-white/10 font-mono">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2.5 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
