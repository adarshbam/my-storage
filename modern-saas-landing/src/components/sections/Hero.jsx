import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { ArrowRight, Cloud, Lock, Smartphone } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none bg-slate-50 dark:bg-brand-950 transition-colors duration-500">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-brand-500/20 dark:bg-brand-500/10 rounded-[100%] blur-[120px]" />
        
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-400/20 dark:bg-accent-500/10 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-400/20 dark:bg-brand-400/10 rounded-full blur-[100px]"
        />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          {/* Beginner / Pro Toggle */}
          <div className="inline-flex items-center justify-center p-1.5 mb-10 rounded-[2rem] bg-[#022c22]/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <button className="px-6 py-2 rounded-[1.5rem] text-[15px] font-bold tracking-wide transition-all duration-300 bg-transparent text-[#E76F51] hover:bg-[#E76F51]/10 hover:shadow-[0_0_20px_rgba(231,111,81,0.15)]">
              Beginner
            </button>
            <button className="px-6 py-2 rounded-[1.5rem] text-[15px] font-bold tracking-wide transition-all duration-300 bg-[#0d9488]/30 text-[#2dd4bf] border border-[#14b8a6]/40 shadow-[0_0_25px_rgba(20,184,166,0.4)]">
              PRO
            </button>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white mb-6 leading-tight">
            Next-Gen <br />
            <span className="bg-gradient-to-r from-brand-600 via-brand-400 to-accent-500 bg-clip-text text-transparent animate-gradient-x drop-shadow-sm">
              Storage Vault.
            </span>
          </h1>

          <p className="text-xl text-slate-600 dark:text-brand-100/70 max-w-xl mx-auto mb-12 font-medium">
            High-performance cloud. Zero-knowledge encryption. Global access.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24">
            <Link to="/register" className="w-full sm:w-auto">
              <Button variant="masterclass" className="w-full sm:w-auto px-8 py-4 text-base rounded-2xl group">
                Access Vault <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button variant="glass" className="w-full sm:w-auto px-8 py-4 text-base rounded-2xl font-semibold">
                Explore Features
              </Button>
            </a>
          </div>
        </motion.div>

        {/* Feature Cards Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            {
              icon: Cloud,
              title: "Global Access",
              desc: "Low-latency access to your files from any region.",
              variant: "dark",
            },
            {
              icon: Lock,
              title: "Privacy Vault",
              desc: "A special folder for your most sensitive documents.",
              variant: "dark",
              snippet: true,
            },
            {
              icon: Smartphone,
              title: "Sync Anywhere",
              desc: "Instant sync across all your devices.",
              variant: "dark",
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.7, ease: "easeOut" }}
            >
              <Card
                variant={item.variant}
                className="h-full text-left relative overflow-hidden group p-8 rounded-[2rem] border-white/10 dark:border-white/5 bg-white/50 dark:bg-[#0b111a]/80 backdrop-blur-2xl"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-500/20 group-hover:text-brand-500 transition-all duration-500 border border-brand-500/20">
                    <item.icon size={28} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                  
                  {item.snippet && (
                    <div className="mt-6 p-4 rounded-xl bg-slate-950 dark:bg-black/60 border border-brand-500/20 font-mono text-xs shadow-inner">
                      <div className="flex gap-1.5 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-500/80"></div>
                      </div>
                      <div className="text-brand-400/70">unlock_vault(password)</div>
                      <div className="text-brand-400 animate-pulse mt-1 glow-text">Verified. Decrypting...</div>
                      <div className="h-1 w-full bg-brand-900/50 rounded mt-2 overflow-hidden">
                        <motion.div 
                          className="h-full bg-brand-500 rounded"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
