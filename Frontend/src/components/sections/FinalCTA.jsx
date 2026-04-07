import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="py-32 relative overflow-hidden mt-12 mb-12 lg:mb-24 mx-4 lg:mx-auto max-w-7xl">
      {/* Glow orbs behind the CTA */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#14b8a6]/15 dark:bg-[#14b8a6]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-[10%] w-[300px] h-[300px] bg-[#a855f7]/10 dark:bg-[#a855f7]/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10 text-center py-20 glass-panel rounded-[3rem] shadow-[0_0_60px_rgba(20,184,166,0.15)] dark:shadow-[0_0_60px_rgba(20,184,166,0.2)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight drop-shadow-lg">
            Ready to <span className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-transparent bg-clip-text">organize your life?</span>
          </h2>
          <p className="text-slate-600 dark:text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium">
            Join millions of users who trust Storifyy to keep their files safe,
            secure, and accessible from anywhere.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/register">
              <Button variant="masterclass" className="w-full sm:w-auto px-8 py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]">
                Get Started Free <ArrowRight className="ml-2 inline-block" size={18} />
              </Button>
            </Link>
            <Button
              variant="glass"
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-lg border-slate-300 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white"
            >
              Download App
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
