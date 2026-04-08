import { motion } from "framer-motion";
import { Smartphone, Image, Mail, FileText, Video, Music } from "lucide-react";
import Card from "../ui/Card";

const Integrations = () => {
  return (
    <section className="py-32 bg-transparent text-slate-900 dark:text-white relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#14b8a6]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="lg:w-1/2"
          >
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
              Deep integration with <br />
              <span className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(20,184,166,0.3)]">your favorite apps.</span>
            </h2>
            <p className="text-slate-600 dark:text-white/70 text-lg mb-8 leading-relaxed font-medium">
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
                  <div className="w-5 h-5 rounded-full bg-[#14b8a6]/10 dark:bg-[#022c22] flex items-center justify-center border border-[#14b8a6]/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#14b8a6] shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="lg:w-1/2 relative">
            {/* Static App Icons Grid - matching exact design requested, no hover effects */}
            <div className="grid grid-cols-2 gap-6 relative">
              
              <div className="bg-slate-50 dark:bg-[#071915] border border-slate-200 dark:border-[#0f3d35] rounded-[16px] p-6 shadow-sm h-full flex flex-col justify-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-6">
                  <FileText size={20} strokeWidth={1.5} />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-[17px] mb-1.5 tracking-wide">Documents</h4>
                <p className="text-[13px] text-slate-500 dark:text-[#7d9b93] font-medium tracking-wide">Edit Word & Docs</p>
              </div>

              <div className="mt-8 bg-slate-50 dark:bg-[#071915] border border-slate-200 dark:border-[#0f3d35] rounded-[16px] p-6 shadow-sm h-full flex flex-col justify-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-6">
                  <Image size={20} strokeWidth={1.5} />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-[17px] mb-1.5 tracking-wide">Creative</h4>
                <p className="text-[13px] text-slate-500 dark:text-[#7d9b93] font-medium tracking-wide">Preview PSD & AI</p>
              </div>

              <div className="bg-slate-50 dark:bg-[#071915] border border-slate-200 dark:border-[#0f3d35] rounded-[16px] p-6 shadow-sm h-full flex flex-col justify-center">
                <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 mb-6">
                  <Video size={20} strokeWidth={1.5} />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-[17px] mb-1.5 tracking-wide">Media</h4>
                <p className="text-[13px] text-slate-500 dark:text-[#7d9b93] font-medium tracking-wide">Stream 4K Video</p>
              </div>

              <div className="mt-8 bg-slate-50 dark:bg-[#071915] border border-slate-200 dark:border-[#0f3d35] rounded-[16px] p-6 shadow-sm h-full flex flex-col justify-center">
                <div className="w-12 h-12 bg-[#14b8a6]/10 rounded-xl flex items-center justify-center text-[#14b8a6] mb-6">
                  <Mail size={20} strokeWidth={1.5} />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-[17px] mb-1.5 tracking-wide">Connect</h4>
                <p className="text-[13px] text-slate-500 dark:text-[#7d9b93] font-medium tracking-wide">Share via Email</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Integrations;
