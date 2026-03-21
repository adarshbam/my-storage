import { motion } from "framer-motion";
import { Smartphone, Image, Mail, FileText, Video, Music } from "lucide-react";
import Card from "../ui/Card";

const Integrations = () => {
  return (
    <section className="py-24 bg-[#022c22] text-white relative overflow-hidden dark:bg-[#011c16]">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 to-black pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="lg:w-1/2"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              Deep integration with <br />
              <span className="text-brand-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">your favorite apps.</span>
            </h2>
            <p className="text-brand-100/70 text-lg mb-8 leading-relaxed font-medium">
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
                  <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                    <div className="w-2 h-2 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
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
                <Card variant="dark" className="p-6 hover:-translate-y-1">
                  <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 shadow-inner rounded-xl flex items-center justify-center text-blue-400 mb-5">
                    <FileText size={26} strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-lg mb-1 tracking-wide">Documents</h4>
                  <p className="text-sm text-slate-400 font-medium">Edit Word & Docs</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-12"
              >
                <Card variant="dark" className="p-6 hover:-translate-y-1">
                  <div className="w-14 h-14 bg-fuchsia-500/10 border border-fuchsia-500/20 shadow-inner rounded-xl flex items-center justify-center text-fuchsia-400 mb-5">
                    <Image size={26} strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-lg mb-1 tracking-wide">Creative</h4>
                  <p className="text-sm text-slate-400 font-medium">Preview PSD & AI</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card variant="dark" className="p-6 hover:-translate-y-1">
                  <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 shadow-inner rounded-xl flex items-center justify-center text-rose-400 mb-5">
                    <Video size={26} strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-lg mb-1 tracking-wide">Media</h4>
                  <p className="text-sm text-slate-400 font-medium">Stream 4K Video</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8"
              >
                <Card variant="dark" className="p-6 hover:-translate-y-1">
                  <div className="w-14 h-14 bg-brand-500/10 border border-brand-500/20 shadow-inner rounded-xl flex items-center justify-center text-brand-400 mb-5">
                    <Mail size={26} strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-lg mb-1 tracking-wide">Connect</h4>
                  <p className="text-sm text-slate-400 font-medium">Share via Email</p>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Integrations;
