import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Globe2,
  FileCheck,
  Share2,
  Smartphone,
} from "lucide-react";
import Card from "../ui/Card";

const ScaleSecurity = () => {
  const items = [
    {
      icon: ShieldCheck,
      title: "Enterprise Encryption",
      desc: "AES-256 bit encryption for all your files at rest and in transit.",
      variant: "green",
    },
    {
      icon: FileCheck,
      title: "Intelligent Organization",
      desc: "Auto-tagging and smart folders keep your files sorted.",
      variant: "blue",
    },
    {
      icon: Share2,
      title: "Secure Sharing",
      desc: "Password protected links and expiring access controls.",
      variant: "purple",
    },
    {
      icon: Globe2,
      title: "Global Access",
      desc: "Low-latency access to your files from any region.",
      variant: "blue",
    },
    {
      icon: Lock,
      title: "Privacy Vault",
      desc: "A special folder for your most sensitive documents.",
      variant: "orange",
    },
    {
      icon: Smartphone,
      title: "Cross-Platform",
      desc: "Native apps for iOS, Android, and desktop.",
      variant: "purple",
    },
  ];

  return (
    <section
      id="security"
      className="py-32 relative overflow-hidden bg-transparent transition-colors duration-300"
    >
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Dark Glassform Gradient Bg (Local enhancement) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#0f463e]/10 to-transparent blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-[#14b8a6] font-bold tracking-widest text-xs uppercase mb-4 block"
          >
            Why Storifyy?
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
          >
            Engineered for <br/>
            <span className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-transparent bg-clip-text drop-shadow-[0_0_20px_rgba(20,184,166,0.3)]">Privacy & Security</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-xl text-white/70 font-medium max-w-2xl mx-auto"
          >
            Your data is yours alone. We provide the vault, you hold the keys.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={
                index === 3 || index === 4 || index === 5 ? "md:col-span-1" : ""
              }
            >
              <Card
                variant="dark"
                className="h-full flex flex-col justify-between overflow-hidden relative"
              >
                {/* Rotating Rings Animation for global access card Removed for Performance/Speed */}
                
                <div>
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-brand-500/20
                      ${item.variant === "green" ? "bg-brand-500/10 text-brand-400" : ""}
                      ${item.variant === "blue" ? "bg-accent-500/10 text-accent-400" : ""}
                      ${item.variant === "purple" ? "bg-fuchsia-500/10 text-fuchsia-400" : ""}
                      ${item.variant === "orange" ? "bg-brand-900/50 text-[#E76F51] border-brand-500/30" : ""} 
                    `}
                  >
                    <item.icon size={28} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-white/70 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {/* Custom dark card style for "Privacy Vault" */}
                {item.title === "Privacy Vault" && (
                  <div className="mt-8 bg-slate-950 dark:bg-black/80 rounded-xl p-4 font-mono text-xs text-brand-400/80 relative overflow-hidden border border-brand-500/20 shadow-inner">
                    <div className="flex gap-1.5 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-500/80" />
                    </div>
                    <p>unlock_vault(password)</p>
                    <p className="text-brand-400 animate-pulse mt-1 glow-text">Verified. Decrypting...</p>
                    <div className="h-1 bg-brand-900/50 mt-2 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-brand-500 rounded-full"
                        initial={{ width: "0%" }}
                        whileInView={{ width: "100%" }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 1,
                        }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Large Card for Mobile Apps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8"
        >
          <Card
            variant="brand"
            className="text-white relative overflow-hidden shadow-[0_0_40px_rgba(20,184,166,0.2)]"
          >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#14b8a6]/20 rounded-full blur-[80px] -mr-48 -mt-48 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
              <div className="max-w-xl">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6 text-white backdrop-blur-md border border-white/30 shadow-inner">
                  <Smartphone size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                  Files at your fingertips
                </h3>
                <p className="text-white/90 text-lg opacity-90 font-medium">
                  Backup photos, access docs, and play videos offline with the
                  Storifyy mobile app. Designed for speed.
                </p>
              </div>
              <div className="mt-12 md:mt-0 relative">
                {/* Abstract Phone/App Illustration */}
                <div className="w-64 h-40 bg-white/10 backdrop-blur-xl rounded-tl-[2rem] rounded-tr-[2rem] border-t border-l border-r border-white/20 p-5 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <div className="h-2 w-20 bg-white/30 rounded-full" />
                    <div className="h-6 w-6 rounded-full bg-brand-400/40 border border-white/20" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-10 w-full bg-white/10 rounded-xl" />
                    <div className="h-10 w-full bg-white/10 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default ScaleSecurity;
