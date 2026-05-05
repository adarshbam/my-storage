import { motion } from "framer-motion";
import {
  HardDrive,
  Users,
  RefreshCw,
  Search,
  Image as ImageIcon,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: HardDrive,
    title: "Continuous Sync",
    desc: "Changes made on one device instantly ripple across your entire ecosystem.",
    colSpan: "md:col-span-2 lg:col-span-8",
    color: "from-blue-500 to-cyan-400",
    shadow: "shadow-blue-500/20",
    iconColor: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "Zero-Knowledge",
    desc: "Military-grade encryption. We physically cannot read your files.",
    colSpan: "md:col-span-1 lg:col-span-4",
    color: "from-emerald-400 to-teal-500",
    shadow: "shadow-emerald-500/20",
    iconColor: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Search,
    title: "Neural Vision",
    desc: "Search by object, color, or text inside images. powered by local AI.",
    colSpan: "md:col-span-1 lg:col-span-4",
    color: "from-fuchsia-500 to-purple-500",
    shadow: "shadow-fuchsia-500/20",
    iconColor: "text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
  },
  {
    icon: Users,
    title: "Secure Portals",
    desc: "Create beautiful, expiring drop zones for clients to upload files to you.",
    colSpan: "md:col-span-2 lg:col-span-8",
    color: "from-orange-500 to-rose-500",
    shadow: "shadow-orange-500/20",
    iconColor: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: ImageIcon,
    title: "RAW & 8K Native",
    desc: "Browser-native previews for heavy production files. No download required.",
    colSpan: "md:col-span-2 lg:col-span-6",
    color: "from-cyan-400 to-blue-500",
    shadow: "shadow-cyan-500/20",
    iconColor: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: RefreshCw,
    title: "Time Travel",
    desc: "Ransomware hit? Instantly roll your entire vault back 30 days.",
    colSpan: "md:col-span-1 lg:col-span-6",
    color: "from-lime-400 to-emerald-500",
    shadow: "shadow-lime-500/20",
    iconColor: "text-lime-400",
    bg: "bg-lime-500/10",
  },
];

const FeatureHighlights = () => {
  return (
    <section
      id="features"
      className="py-32 relative overflow-hidden bg-[#020705]"
    >
      {/* Background topography lines for depth */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, #14b8a6 40px, #14b8a6 41px)",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#14b8a6]/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-[1400px]">
        {/* Massive Offset Typography Header */}
        <div className="mb-24 md:pl-8 border-l-2 border-[#14b8a6]/30 relative">
          <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-[#020705] border-2 border-[#14b8a6] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse" />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="text-[#14b8a6] font-bold tracking-widest text-sm uppercase mb-4 block">
              Architecture
            </span>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight">
              Engineered for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white/40 to-white">
                the impossible.
              </span>
            </h2>
            <p className="text-xl text-white/50 font-medium leading-relaxed max-w-2xl">
              We threw out the old playbook. Storifyy uses a decentralized
              object storage graph to deliver speeds and capabilities legacy
              clouds can't touch.
            </p>
          </motion.div>
        </div>

        {/* Asymmetrical Masonry/Bento Grid - High Contrast Glass */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6 auto-rows-[280px]">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: index * 0.1,
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`relative group rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#030a08] shadow-2xl hover:border-white/15 transition-colors duration-500 ${feature.colSpan}`}
            >
              {/* Glow that follows hover - approximated with a large radial gradient center */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0">
                <div
                  className={`absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br ${feature.color} blur-[80px] opacity-20`}
                />
              </div>

              {/* Grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

              <div className="relative z-10 p-8 md:p-10 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 ${feature.bg} backdrop-blur-md shadow-inner group-hover:scale-110 transition-transform duration-500`}
                  >
                    <feature.icon
                      size={30}
                      strokeWidth={1.5}
                      className={feature.iconColor}
                    />
                  </div>

                  {/* Decorative HUD element */}
                  <div className="text-white/20 font-mono text-xs font-bold tracking-widest">
                    {`SYS_${String(index + 1).padStart(2, "0")}`}
                  </div>
                </div>

                <div>
                  <h3 className="text-3xl font-black text-white mb-3 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/50 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-white/50 text-lg leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlights;
