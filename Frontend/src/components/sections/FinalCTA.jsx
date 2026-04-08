import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, ShieldCheck } from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="py-24 relative w-full overflow-hidden mt-6 mb-16 lg:mb-24 px-4 sm:px-6">
      {/* Wider green glow backdrop to avoid being cut off horizontally */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1400px] h-[600px] bg-gradient-to-r from-[#14b8a6]/0 via-[#10b981]/10 to-[#14b8a6]/0 dark:from-[#14b8a6]/0 dark:via-[#10b981]/15 dark:to-[#14b8a6]/0 blur-[130px] md:blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#14b8a6]/5 to-transparent pointer-events-none mix-blend-overlay" />
      
      <div className="container mx-auto max-w-7xl relative z-10 text-center py-20 lg:py-24 glass-panel bg-white/40 dark:bg-[#020b08]/85 border border-[#14b8a6]/30 hover:border-[#14b8a6]/50 transition-colors duration-500 rounded-[3rem] shadow-[0_0_50px_rgba(20,184,166,0.1)] dark:shadow-[0_0_60px_rgba(20,184,166,0.15)] overflow-hidden backdrop-blur-2xl">
        {/* Ambient interior glow to match the green glassmorphism */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[300px] bg-gradient-to-b from-[#14b8a6]/10 to-transparent blur-[100px] pointer-events-none -z-10" />
        
        {/* Subtle inner top highlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-[#14b8a6]/60 to-transparent" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-20"
        >
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#14b8a6]/30 bg-[#14b8a6]/10 text-[#14b8a6] backdrop-blur-md">
              <Sparkles size={16} />
              <span className="text-sm font-bold uppercase tracking-wider">Start Your Journey</span>
            </div>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight drop-shadow-lg">
            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14b8a6] to-[#10b981] drop-shadow-[0_0_20px_rgba(20,184,166,0.25)]">organize your life?</span>
          </h2>
          <p className="text-slate-600 dark:text-white/80 text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            Join millions of users who trust Storifyy to keep their files safe,
            secure, and instantly accessible from absolutely anywhere.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4">
            <Link to="/register">
              <button className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 font-bold transition-all duration-300 rounded-2xl bg-gradient-to-r from-[#0f463e] to-[#0a2e29] border border-[#14b8a6]/50 shadow-[0_0_30px_rgba(20,184,166,0.2)] hover:shadow-[0_0_50px_rgba(20,184,166,0.35)] hover:-translate-y-1 overflow-hidden">
                {/* Hover background fill */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#14b8a6] to-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-0" />
                
                <Zap className="relative z-10 text-[#2dd4bf] group-hover:text-white group-hover:scale-110 transition-all" size={24} fill="currentColor" />
                <span className="relative z-10 text-xl tracking-wide group-hover:text-white text-[#2dd4bf] transition-colors">Start Free Trial Now</span>
                <ArrowRight className="relative z-10 text-[#2dd4bf] group-hover:translate-x-1 group-hover:text-white transition-all" size={24} />
              </button>
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 mt-6 text-sm font-medium text-slate-500 dark:text-[#14b8a6]/70">
              <div className="flex items-center gap-2"><ShieldCheck size={16} /> No credit card required</div>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-[#14b8a6]/30" />
              <div className="flex items-center gap-2"><Sparkles size={16} /> 10GB forever free storage</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
