import { motion } from "framer-motion";
import { Smartphone, Image, Mail, FileText, Video, Music } from "lucide-react";
import Card from "../ui/Card";

const Integrations = () => {
  return (
    <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-slate-900 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="lg:w-1/2"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Deep integration with <br />
              <span className="text-blue-400">your favorite apps.</span>
            </h2>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
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
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <span className="text-slate-200">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="lg:w-1/2 relative">
            {/* Floating App Icons Grid */}
            <div className="grid grid-cols-2 gap-6 relative">
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Card className="bg-slate-800 border-slate-700 p-6">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mb-4">
                    <FileText size={24} />
                  </div>
                  <h4 className="font-bold text-lg mb-1">Documents</h4>
                  <p className="text-sm text-slate-400">Edit Word & Docs</p>
                </Card>
              </motion.div>

              <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="mt-12"
              >
                <Card className="bg-slate-800 border-slate-700 p-6">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 mb-4">
                    <Image size={24} />
                  </div>
                  <h4 className="font-bold text-lg mb-1">Creative</h4>
                  <p className="text-sm text-slate-400">Preview PSD & AI</p>
                </Card>
              </motion.div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              >
                <Card className="bg-slate-800 border-slate-700 p-6">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 mb-4">
                    <Video size={24} />
                  </div>
                  <h4 className="font-bold text-lg mb-1">Media</h4>
                  <p className="text-sm text-slate-400">Stream 4K Video</p>
                </Card>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.5,
                }}
                className="mt-8"
              >
                <Card className="bg-slate-800 border-slate-700 p-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 mb-4">
                    <Mail size={24} />
                  </div>
                  <h4 className="font-bold text-lg mb-1">Connect</h4>
                  <p className="text-sm text-slate-400">Share via Email</p>
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
