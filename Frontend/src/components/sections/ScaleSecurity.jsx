import { motion } from "framer-motion";
import {
  ShieldCheck,
  HardDrive,
  Search,
  RefreshCw,
  Share2,
  Image as ImageIcon,
  Smartphone,
} from "lucide-react";
import Card from "../ui/Card";

const ScaleSecurity = () => {
  // Features merged from both sections, omitting those already in Hero (Global Access, Sync Anywhere, Privacy Vault)
  const items = [
    {
      icon: ShieldCheck,
      title: "Enterprise Encryption",
      desc: "AES-256 bit encryption for all your files at rest and in transit.",
      theme: {
        glow: "rgba(16, 185, 129, 0.4)", // emerald
        gradient: "from-emerald-500/20 to-emerald-400/5",
        iconText: "text-emerald-400",
        iconBg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
      },
    },
    {
      icon: Search,
      title: "Intelligent AI Search",
      desc: "Find files fast with AI that recognizes text and objects in images.",
      theme: {
        glow: "rgba(6, 182, 212, 0.4)", // cyan
        gradient: "from-cyan-500/20 to-cyan-400/5",
        iconText: "text-cyan-400",
        iconBg: "bg-cyan-500/10",
        border: "border-cyan-500/30",
      },
    },
    {
      icon: HardDrive,
      title: "Automated Backups",
      desc: "Set and forget. Automatically back up changes, photos, and videos instantly.",
      theme: {
        glow: "rgba(20, 184, 166, 0.4)", // teal
        gradient: "from-teal-500/20 to-teal-400/5",
        iconText: "text-teal-400",
        iconBg: "bg-teal-500/10",
        border: "border-teal-500/30",
      },
    },
    {
      icon: Share2,
      title: "Secure Sharing",
      desc: "Share files seamlessly with expiring links and strict password controls.",
      theme: {
        glow: "rgba(56, 189, 248, 0.4)", // sky
        gradient: "from-sky-500/20 to-sky-400/5",
        iconText: "text-sky-400",
        iconBg: "bg-sky-500/10",
        border: "border-sky-500/30",
      },
    },
    {
      icon: RefreshCw,
      title: "Ransomware Rescue",
      desc: "Turn back time. Recover perfectly clean files up to 30 days post-attack.",
      theme: {
        glow: "rgba(132, 204, 22, 0.4)", // lime
        gradient: "from-lime-500/20 to-lime-400/5",
        iconText: "text-lime-400",
        iconBg: "bg-lime-500/10",
        border: "border-lime-500/30",
      },
    },
    {
      icon: ImageIcon,
      title: "Instant Previews",
      desc: "View heavy 4K videos or RAW photos globally without fully downloading.",
      theme: {
        glow: "rgba(45, 212, 191, 0.4)", // teal secondary
        gradient: "from-[#2dd4bf]/20 to-[#2dd4bf]/5",
        iconText: "text-[#2dd4bf]",
        iconBg: "bg-[#2dd4bf]/10",
        border: "border-[#2dd4bf]/30",
      },
    },
  ];

  return (
    <section
      id="security"
      className="py-32 relative overflow-hidden bg-transparent transition-colors duration-300"
    >
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Dark Glassform Gradient Bg (Local enhancement) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#0f463e]/10 to-transparent blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-[#14b8a6] font-bold tracking-widest text-xs uppercase mb-4 block"
          >
            Why Storifyy?
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-tight"
          >
            Engineered for <br />
            <span className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-transparent bg-clip-text drop-shadow-[0_0_20px_rgba(20,184,166,0.3)]">
              Privacy & Security
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-xl text-slate-600 dark:text-white/70 font-medium max-w-2xl mx-auto"
          >
            Your data is yours alone. We provide the vault, you hold the keys.
          </motion.p>
        </div>

        {/* Unique Custom Cards for this section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="relative group h-full"
            >
              <div
                className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${item.theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none`}
                style={{ boxShadow: `0 0 40px ${item.theme.glow}` }}
              />

              <div className="relative h-full bg-[#020b08]/90 dark:bg-[#020b08]/90 backdrop-blur-3xl border border-white/[0.05] group-hover:border-transparent rounded-[2rem] p-8 overflow-hidden transition-all duration-300">
                {/* Glow ring on hover */}
                <div
                  className={`absolute -inset-px rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${item.theme.gradient} -z-10`}
                />

                <div>
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3
                      ${item.theme.iconBg} ${item.theme.iconText} ${item.theme.border} border
                    `}
                  >
                    <item.icon size={26} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-white/70 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Large Card for Mobile Apps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 relative px-4 sm:px-0"
        >
          <Card
            variant="brand"
            className="text-slate-900 dark:text-white relative overflow-hidden shadow-[0_0_50px_rgba(20,184,166,0.3)] bg-gradient-to-r from-[#020b08] to-[#051a17] p-8 sm:p-12 border border-[#14b8a6]/40"
          >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#14b8a6]/20 rounded-full blur-[80px] -mr-48 -mt-48 pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
              <div className="max-w-xl">
                <div className="w-16 h-16 rounded-[1.5rem] bg-[#14b8a6]/20 flex items-center justify-center mb-8 text-[#2dd4bf] backdrop-blur-md border border-[#14b8a6]/40 shadow-[inset_0_0_20px_rgba(20,184,166,0.4)]">
                  <Smartphone size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-white leading-tight">
                  Files at your fingertips
                </h3>
                <p className="text-white/80 text-lg sm:text-xl font-medium leading-relaxed">
                  Backup photos automatically, access secure documents, and
                  stream high-quality videos offline with the native Storifyy
                  mobile app. Designed for pure speed.
                </p>
              </div>

              <div className="mt-16 md:mt-0 relative flex-shrink-0 w-full sm:w-auto flex justify-center">
                {/* Abstract Phone/App Illustration highlighting the scale */}
                <div className="w-72 sm:w-80 h-48 sm:h-56 bg-[#031411]/80 backdrop-blur-3xl rounded-tl-[2.5rem] rounded-tr-[2.5rem] border border-b-0 border-[#14b8a6]/30 p-6 sm:p-8 shadow-[0_-10px_60px_rgba(20,184,166,0.2)] relative overflow-hidden">
                  {/* Fake screen content elements */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#14b8a6]/10 to-transparent pointer-events-none" />

                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="h-2 w-24 bg-white/20 rounded-full" />
                    <div className="h-8 w-8 rounded-full bg-[#14b8a6]/40 border border-[#14b8a6]/60 shadow-[0_0_15px_rgba(20,184,166,0.5)] animate-pulse" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="h-12 w-full bg-white/10 rounded-2xl border border-white/5" />
                    <div className="h-12 w-full bg-white/10 rounded-2xl border border-white/5" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default ScaleSecurity;
