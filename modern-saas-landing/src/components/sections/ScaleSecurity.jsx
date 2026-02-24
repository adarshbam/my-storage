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
      className="py-24 relative overflow-hidden bg-white dark:bg-slate-950"
    >
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Soft Radial Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-pink-500/5 to-transparent blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-pink-500 font-bold tracking-widest text-xs uppercase mb-4 block"
          >
            Why Storifyy?
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6"
          >
            Engineered for <span className="text-pink-500">Privacy</span> &{" "}
            <span className="text-pink-500">Security</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
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
                variant={item.variant}
                className="h-full flex flex-col justify-between overflow-hidden relative"
              >
                {/* Rotating Rings Animation for global access card */}
                {index === 3 && (
                  <div className="absolute top-1/2 right-[-20%] -translate-y-1/2 w-48 h-48 opacity-50 pointer-events-none">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 20,
                        ease: "linear",
                      }}
                      className="absolute inset-0 border-[12px] border-blue-500/20 rounded-full border-t-blue-500/60"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 15,
                        ease: "linear",
                      }}
                      className="absolute inset-4 border-[12px] border-blue-400/20 rounded-full border-b-blue-400/60"
                    />
                  </div>
                )}

                <div>
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 
                                        ${item.variant === "green" ? "bg-green-500 text-white" : ""}
                                        ${item.variant === "blue" ? "bg-blue-500 text-white" : ""}
                                        ${item.variant === "purple" ? "bg-purple-500 text-white" : ""}
                                        ${item.variant === "orange" ? "bg-slate-800 text-green-400" : ""} 
                                    `}
                  >
                    <item.icon size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {/* Custom dark card style for "Privacy Vault" */}
                {item.title === "Privacy Vault" && (
                  <div className="mt-8 bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 relative overflow-hidden border border-slate-800">
                    <div className="flex gap-1 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                    <p>unlock_vault(password)</p>
                    <p className="text-emerald-500">Verified. Decrypting...</p>
                    <motion.div
                      className="h-1 bg-green-500 mt-2 rounded-full"
                      initial={{ width: "0%" }}
                      whileInView={{ width: "100%" }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                    />
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
            variant="blue"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none text-white relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
              <div className="max-w-xl">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-6 text-white backdrop-blur-sm">
                  <Smartphone size={24} />
                </div>
                <h3 className="text-3xl font-bold mb-4">
                  Files at your fingertips
                </h3>
                <p className="text-blue-100 text-lg opacity-90">
                  Backup photos, access docs, and play videos offline with the
                  Storifyy mobile app. Rated 4.9 stars on App Store.
                </p>
              </div>
              <div className="mt-8 md:mt-0 relative">
                {/* Abstract Phone/App Illustration */}
                <div className="w-64 h-32 bg-white/10 backdrop-blur-md rounded-tl-2xl rounded-tr-2xl border-t border-l border-r border-white/20 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-2 w-20 bg-white/20 rounded-full" />
                    <div className="h-6 w-6 rounded-full bg-white/20" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-12 w-full bg-white/10 rounded-lg" />
                    <div className="h-12 w-full bg-white/10 rounded-lg" />
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
