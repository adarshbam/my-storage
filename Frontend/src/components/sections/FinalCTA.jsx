import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="py-20 md:py-28 relative w-full overflow-hidden px-4 sm:px-6">
      <div className="container mx-auto max-w-[1300px] relative">
        <div className="relative w-full rounded-3xl md:rounded-[3rem] bg-white/70 dark:bg-vault-surface/70 border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl flex flex-col items-center text-center py-16 md:py-24 px-6 backdrop-blur-xl">
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,var(--accent-soft)_0%,transparent_70%)] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-20 flex flex-col items-center max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent-border bg-accent-soft text-accent-primary mb-6 shadow-sm">
              <Sparkles size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">
                Ready for total control?
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-5 tracking-tight leading-[1.1]">
              Your files, encrypted. <br />
              <span className="text-accent-primary">Always at your fingertips.</span>
            </h2>

            <p className="text-slate-600 dark:text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-10 font-medium leading-relaxed">
              Create your account in under 30 seconds. No credit card required.
            </p>

            {/* CTA Button */}
            <Link to="/register">
              <button className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-accent-primary text-accent-foreground font-bold text-base tracking-wide shadow-lg shadow-accent-glow/25 hover:opacity-95 transition-all duration-200 group cursor-pointer">
                <span>Start Free Trial</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-accent-primary" />
                <span>Zero-knowledge client encryption</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={16} className="text-accent-primary" />
                <span>1024 MB free storage tier</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
