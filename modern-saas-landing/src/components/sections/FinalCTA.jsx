import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="py-24 relative overflow-hidden mt-12 mb-12 lg:mb-24 rounded-[3rem] mx-4 lg:mx-auto max-w-7xl">
      <div className="absolute inset-0 bg-[#022c22] dark:bg-[#011c16]">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 to-accent-950 opacity-90" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay" />
        
        {/* Glow Spheres */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-brand-500/30 rounded-full blur-[100px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center py-12 border border-white/5 rounded-[2rem] bg-white/5 backdrop-blur-sm shadow-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-lg">
            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-accent-300">organize your life?</span>
          </h2>
          <p className="text-brand-50/80 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium">
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
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-lg border-white/20 hover:bg-white/10 text-white"
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
