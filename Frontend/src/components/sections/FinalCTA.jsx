import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="py-24 md:py-32 relative w-full overflow-hidden mt-12 mb-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-[1400px] relative">
        {/* The Massive Dark Infinity Portal Container */}
        <div className="relative w-full rounded-[3rem] md:rounded-[4rem] bg-[#010504] border border-[#14b8a6]/20 overflow-hidden shadow-[0_30px_100px_rgba(20,184,166,0.15)] flex flex-col items-center text-center py-24 md:py-32 lg:py-40">
          {/* Ambient Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.15)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[300px] md:h-[500px] bg-gradient-to-t from-[#14b8a6]/20 to-transparent blur-[100px] rounded-full pointer-events-none" />

          {/* Grid Pattern with depth mask */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.07)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-20 flex flex-col items-center px-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#14b8a6]/40 bg-[#14b8a6]/10 text-[#14b8a6] backdrop-blur-md mb-8 shadow-[0_0_20px_rgba(20,184,166,0.2)]">
              <Sparkles size={16} />
              <span className="text-xs md:text-sm font-bold uppercase tracking-widest">
                Start Your Journey
              </span>
            </div>

            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tight leading-[1.05]">
              Your digital life, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14b8a6] via-cyan-400 to-[#3b82f6] drop-shadow-[0_0_30px_rgba(20,184,166,0.4)]">
                finally secure.
              </span>
            </h2>

            <p className="text-white/60 text-lg md:text-2xl max-w-2xl mx-auto mb-16 font-medium leading-relaxed">
              Join millions of users who trust Storifyy to keep their files
              safe, secure, and instantly accessible from absolutely anywhere.
            </p>

            {/* The Giant Action Button */}
            <Link to="/register" className="relative group block">
              {/* Intense Outer Glow */}
              <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] opacity-50 blur-xl group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500 animate-pulse" />

              <button className="relative flex items-center gap-4 px-8 py-5 md:px-12 md:py-6 bg-[#020a08] border border-[#14b8a6]/50 rounded-[2.5rem] overflow-hidden group-hover:bg-[#030f0c] transition-colors shadow-[inset_0_0_20px_rgba(20,184,166,0.2)]">
                {/* Inner hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#14b8a6]/20 to-[#3b82f6]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <span className="text-white text-xl md:text-2xl font-bold tracking-wide relative z-10">
                  Start Free Trial Now
                </span>

                <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-tr from-[#14b8a6] to-cyan-400 flex items-center justify-center text-white relative z-10 group-hover:translate-x-2 transition-transform duration-300 shadow-[0_0_15px_rgba(20,184,166,0.8)]">
                  <ArrowRight size={24} strokeWidth={2.5} />
                </div>
              </button>
            </Link>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 mt-16 text-sm font-bold text-white/50 tracking-wide uppercase">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#14b8a6]" /> No credit
                card required
              </div>
              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" /> 10GB forever
                free storage
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
