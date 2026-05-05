import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-40 pb-20 overflow-hidden bg-[#011a14] perspective-[2000px] -mt-[80px]">
      
      {/* 
        THE 3D VAULT CUBE
        A pure CSS 3D cube that rotates continuously. Truly observable in 3D.
      */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden perspective-[1000px]">
        {/* Ambient Dark Green & Teal glows */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#022c22]/80 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#14b8a6]/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />

        {/* Responsive wrapper for the 3D cube */}
        <div className="relative w-[300px] h-[300px] md:w-[500px] md:h-[500px] scale-75 md:scale-100 opacity-60">
            <motion.div 
                animate={{ rotateX: [20, 40, 20], rotateY: [0, 360] }}
                transition={{ rotateY: { duration: 20, repeat: Infinity, ease: "linear" }, rotateX: { duration: 15, repeat: Infinity, ease: "easeInOut" } }}
                className="relative w-full h-full transform-style-3d"
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* 
                   Cube Faces 
                   Size: 500x500 on desktop. translateZ is 250px. 
                   Using Tailwind classes where possible, inline styles for absolute 3D math.
                */}
                {/* Front */}
                <div className="absolute inset-0 border-[4px] border-[#14b8a6]/40 bg-[#022c22]/30 backdrop-blur-md shadow-[inset_0_0_100px_rgba(20,184,166,0.2)] flex items-center justify-center" style={{ transform: "translateZ(150px) md:translateZ(250px)" }}>
                    <div className="w-1/2 h-1/2 border border-[#14b8a6]/50 rounded-full animate-ping opacity-20" />
                </div>
                {/* Back */}
                <div className="absolute inset-0 border-[4px] border-[#14b8a6]/20 bg-[#022c22]/20 backdrop-blur-sm shadow-[inset_0_0_100px_rgba(20,184,166,0.1)] flex items-center justify-center" style={{ transform: "rotateY(180deg) translateZ(150px) md:translateZ(250px)" }}>
                    <ShieldCheck className="text-[#14b8a6]/30 w-32 h-32" />
                </div>
                {/* Left */}
                <div className="absolute inset-0 border-[4px] border-[#14b8a6]/30 bg-[#022c22]/20 backdrop-blur-sm" style={{ transform: "rotateY(-90deg) translateZ(150px) md:translateZ(250px)" }}>
                     {/* Decorative lines */}
                     <div className="absolute top-10 left-10 right-10 h-2 bg-[#14b8a6]/20" />
                     <div className="absolute bottom-10 left-10 right-10 h-2 bg-[#14b8a6]/20" />
                </div>
                {/* Right */}
                <div className="absolute inset-0 border-[4px] border-[#14b8a6]/30 bg-[#022c22]/20 backdrop-blur-sm" style={{ transform: "rotateY(90deg) translateZ(150px) md:translateZ(250px)" }}>
                     <div className="absolute inset-10 border-2 border-dashed border-[#14b8a6]/20 rounded-full animate-[spin_10s_linear_infinite]" />
                </div>
                {/* Top */}
                <div className="absolute inset-0 border-[4px] border-[#14b8a6]/50 bg-[#14b8a6]/10 backdrop-blur-md shadow-[0_0_100px_rgba(20,184,166,0.5)]" style={{ transform: "rotateX(90deg) translateZ(150px) md:translateZ(250px)" }}>
                     <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.8)_0%,transparent_50%)] animate-pulse" />
                </div>
                {/* Bottom */}
                <div className="absolute inset-0 border-[4px] border-[#14b8a6]/10 bg-[#022c22]/40 backdrop-blur-sm shadow-[0_100px_200px_rgba(0,0,0,0.8)]" style={{ transform: "rotateX(-90deg) translateZ(150px) md:translateZ(250px)" }}>
                </div>
            </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 relative z-20 text-center mt-auto md:mt-24 mb-12">
        <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} 
            className="max-w-5xl mx-auto"
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-3 p-1.5 pr-5 mb-10 rounded-full bg-[#01140f] border-t border-teal-500/30 border-b border-black/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-teal-400/60 transition-all duration-300">
            <span className="bg-gradient-to-b from-[#14b8a6] to-[#0f766e] text-white text-[10px] md:text-xs font-black px-3.5 py-1.5 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_15px_rgba(20,184,166,0.4)] relative z-10 tracking-widest uppercase border-t border-teal-300/50 border-b border-black/30">
              System Online
            </span>
            <span className="flex items-center text-[12px] md:text-sm font-bold text-white/80 gap-2 relative z-10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              1024 MB Free Vault Ready
            </span>
          </div>

          {/* Holographic Headline */}
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white mb-8 leading-[1.05] drop-shadow-2xl">
            The Ultimate <br />
            <span className="relative inline-block">
                <span className="absolute inset-0 bg-gradient-to-r from-[#14b8a6] via-[#10b981] to-[#14b8a6] blur-2xl opacity-40 animate-pulse" />
                <span className="relative bg-gradient-to-b from-white via-white to-[#14b8a6]/70 bg-clip-text text-transparent">
                    Digital Vault.
                </span>
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-teal-100/60 max-w-2xl mx-auto mb-14 font-medium leading-relaxed drop-shadow-md">
            High-performance cloud. Zero-knowledge encryption. Global access. Drop your files into the most secure architecture ever built.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/register" className="w-full sm:w-auto">
                <button className="relative w-full sm:w-auto px-10 py-5 rounded-full text-lg font-bold tracking-wide transition-all duration-300 bg-gradient-to-b from-[#14b8a6] to-[#0f766e] text-white border-t border-teal-300/50 border-b border-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_30px_rgba(20,184,166,0.4)] flex items-center justify-center gap-3 overflow-hidden hover:scale-105 active:scale-95 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_15px_40px_rgba(20,184,166,0.6)] group">
                    <Zap className="text-white drop-shadow-md" size={20} fill="currentColor" />
                    Open Your Vault
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </button>
            </Link>
            
            <a href="#features" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-10 py-5 text-lg rounded-full font-bold text-white bg-[#01140f] border-t border-teal-500/30 border-b border-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.5)] hover:bg-[#021f17] hover:border-teal-400/50 transition-all duration-300 flex items-center justify-center gap-3 group hover:-translate-y-0.5 active:translate-y-0.5">
                <ShieldCheck size={20} className="text-teal-500 group-hover:text-emerald-400 transition-colors drop-shadow-md" />
                Explore Architecture
              </button>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Tailwind arbitrary values injection for responsive translateZ since CSS vars inside transform are tricky with TW */}
      <style>{`
        @media (max-width: 768px) {
            .transform-style-3d > div:nth-child(1) { transform: translateZ(150px); }
            .transform-style-3d > div:nth-child(2) { transform: rotateY(180deg) translateZ(150px); }
            .transform-style-3d > div:nth-child(3) { transform: rotateY(-90deg) translateZ(150px); }
            .transform-style-3d > div:nth-child(4) { transform: rotateY(90deg) translateZ(150px); }
            .transform-style-3d > div:nth-child(5) { transform: rotateX(90deg) translateZ(150px); }
            .transform-style-3d > div:nth-child(6) { transform: rotateX(-90deg) translateZ(150px); }
        }
        @media (min-width: 769px) {
            .transform-style-3d > div:nth-child(1) { transform: translateZ(250px); }
            .transform-style-3d > div:nth-child(2) { transform: rotateY(180deg) translateZ(250px); }
            .transform-style-3d > div:nth-child(3) { transform: rotateY(-90deg) translateZ(250px); }
            .transform-style-3d > div:nth-child(4) { transform: rotateY(90deg) translateZ(250px); }
            .transform-style-3d > div:nth-child(5) { transform: rotateX(90deg) translateZ(250px); }
            .transform-style-3d > div:nth-child(6) { transform: rotateX(-90deg) translateZ(250px); }
        }
      `}</style>
    </section>
  );
};

export default Hero;
