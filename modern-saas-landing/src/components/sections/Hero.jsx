import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { ArrowRight, Cloud, Lock, Smartphone } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/20 rounded-[100%] blur-[100px] opacity-50 dark:opacity-20"
        />
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-400/20 rounded-full blur-[80px]"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]"
        />
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Storifyy v2.0 is live
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
            Organize your <br />
            <span className="bg-gradient-to-r from-blue-600 via-cyan-400 to-purple-500 bg-clip-text text-transparent animate-gradient-x">
              digital universe.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Store, share, and collaborate on files from any device. Secure cloud
            storage designed for your personal and professional life.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link to="/register">
              <Button className="w-full sm:w-auto gap-2">
                Get 15GB Free <ArrowRight size={18} />
              </Button>
            </Link>
            <a href="#pricing">
              <Button variant="secondary" className="w-full sm:w-auto">
                See Plans
              </Button>
            </a>
          </div>
        </motion.div>

        {/* Floating Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Cloud,
              title: "Smart Storage",
              desc: "Automatically organizes your photos and docs with AI.",
              variant: "blue",
            },
            {
              icon: Lock,
              title: "Vault Security",
              desc: "Zero-knowledge encryption for your most sensitive files.",
              variant: "purple", // Purple for vault/private feel
            },
            {
              icon: Smartphone,
              title: "Sync Everywhere",
              desc: "Access your files on iOS, Android, Mac, and Windows.",
              variant: "green",
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
            >
              <Card
                variant={item.variant}
                className="h-full text-left relative overflow-hidden group"
              >
                <div className="relative z-10">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300
                    ${item.variant === "blue" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : ""}
                    ${item.variant === "green" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : ""}
                    ${item.variant === "purple" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" : ""}
                  `}
                  >
                    <item.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {item.desc}
                  </p>
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
