import { motion } from "framer-motion";
import { Smartphone, Image, Mail, FileText, Video, Music } from "lucide-react";
import Card from "../ui/Card";

const Integrations = () => {
  return (
    <section className="py-32 bg-transparent text-white relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#14b8a6]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="lg:w-1/2"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              Deep integration with <br />
              <span className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(20,184,166,0.3)]">your favorite apps.</span>
            </h2>
            <p className="text-white/70 text-lg mb-8 leading-relaxed font-medium">
              Storifyy doesn't just store files; it connects them. Edit Word
              docs, preview Photoshop files, and stream 4K video directly in the
              browser. Work seamlessly with the tools you already love.
            </p>

            <div className="space-y-4">
              {[
                "Native Microsoft Office 365 editing",
                "Adobe Creative Cloud previews",
                "Slack & Teams file sharing",
                "Auto-save to Google Docs",
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-[#022c22] flex items-center justify-center border border-[#14b8a6]/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#14b8a6] shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
                  </div>
                  <span className="text-slate-200 font-medium">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="lg:w-1/2 relative">
            {/* Floating App Icons Grid - Simplified animations for performance */}
            <div className="grid grid-cols-2 gap-6 relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-[#0f463e]/40 border border-[#14b8a6]/30 rounded-2xl p-6 shadow-xl hover:-translate-y-2 hover:bg-[#0f463e]/80 hover:border-[#14b8a6]/60 hover:shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:scale-[1.02] transition-all duration-300 h-full">
                  <div className="w-12 h-12 bg-[#3b82f6]/10 border border-[#3b82f6]/20 shadow-inner rounded-xl flex items-center justify-center text-[#3b82f6] mb-5">
                    <FileText size={22} strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-white text-lg mb-1 tracking-wide">Documents</h4>
                  <p className="text-xs text-white/50 font-medium tracking-wide">Edit Word & Docs</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-12"
              >
                <div className="bg-[#0f463e]/40 border border-[#14b8a6]/30 rounded-2xl p-6 shadow-xl hover:-translate-y-2 hover:bg-[#0f463e]/80 hover:border-[#14b8a6]/60 hover:shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:scale-[1.02] transition-all duration-300 h-full">
                  <div className="w-12 h-12 bg-[#d946ef]/10 border border-[#d946ef]/20 shadow-inner rounded-xl flex items-center justify-center text-[#d946ef] mb-5">
                    <Image size={22} strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-white text-lg mb-1 tracking-wide">Creative</h4>
                  <p className="text-xs text-white/50 font-medium tracking-wide">Preview PSD & AI</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="bg-[#0f463e]/40 border border-[#14b8a6]/30 rounded-2xl p-6 shadow-xl hover:-translate-y-2 hover:bg-[#0f463e]/80 hover:border-[#14b8a6]/60 hover:shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:scale-[1.02] transition-all duration-300 h-full">
                  <div className="w-12 h-12 bg-[#f43f5e]/10 border border-[#f43f5e]/20 shadow-inner rounded-xl flex items-center justify-center text-[#f43f5e] mb-5">
                    <Video size={22} strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-white text-lg mb-1 tracking-wide">Media</h4>
                  <p className="text-xs text-white/50 font-medium tracking-wide">Stream 4K Video</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8"
              >
                <div className="bg-[#0f463e]/40 border border-[#14b8a6]/30 rounded-2xl p-6 shadow-xl hover:-translate-y-2 hover:bg-[#0f463e]/80 hover:border-[#14b8a6]/60 hover:shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:scale-[1.02] transition-all duration-300 h-full">
                  <div className="w-12 h-12 bg-[#14b8a6]/10 border border-[#14b8a6]/20 shadow-inner rounded-xl flex items-center justify-center text-[#14b8a6] mb-5">
                    <Mail size={22} strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-white text-lg mb-1 tracking-wide">Connect</h4>
                  <p className="text-xs text-white/50 font-medium tracking-wide">Share via Email</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Integrations;
