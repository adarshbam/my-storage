import { motion } from "framer-motion";
import {
  HardDrive,
  Users,
  RefreshCw,
  Search,
  Image,
  Shield,
} from "lucide-react";
import Card from "../ui/Card";

const features = [
  {
    icon: HardDrive,
    title: "Auto Backup",
    desc: "Automatically back up photos and videos from your phone.",
    color: "blue",
  },
  {
    icon: Users,
    title: "Seamless Sharing",
    desc: "Share files and folders with anyone, even if they don't have an account.",
    color: "purple",
  },
  {
    icon: RefreshCw,
    title: "Instant Sync",
    desc: "Changes made on one device update everywhere instantly.",
    color: "cyan",
  },
  {
    icon: Search,
    title: "Smart Search",
    desc: "Find files fast with AI that recognizes objects in photos.",
    color: "green",
  },
  {
    icon: Image,
    title: "Media Previews",
    desc: "View high-res photos and stream videos without downloading.",
    color: "orange",
  },
  {
    icon: Shield,
    title: "Ransomware Protection",
    desc: "Recover files for up to 30 days if you're attacked.",
    color: "red",
  },
];

const FeatureHighlights = () => {
  return (
    <section
      id="features"
      className="py-32 relative overflow-hidden bg-slate-50/50 dark:bg-[#05110e]/80 border-y border-slate-200 dark:border-white/[0.05] backdrop-blur-sm"
    >
      {/* Background Decoration with simple pulsing animation */}
      <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-brand-500/10 to-transparent hidden md:block" />
      <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-brand-500/10 to-transparent hidden md:block" />
      
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-3xl pointer-events-none animate-[pulse_5s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-accent-500/10 dark:bg-accent-500/5 rounded-full blur-[100px] pointer-events-none animate-[pulse_7s_ease-in-out_infinite]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
            Beyond standard storage
          </h2>
          <p className="text-lg text-slate-600 dark:text-white/70 font-medium">
            Engineered for speed, built for privacy. Everything you need to manage your digital universe securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index}>
              <Card variant="dark" className="h-full hover:-translate-y-1 transition-transform duration-300">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-brand-500/20 shadow-inner
                    ${["blue", "cyan", "green"].includes(feature.color) ? "bg-brand-500/10 text-[#2dd4bf]" : ""}
                    ${["purple", "orange", "red"].includes(feature.color) ? "bg-accent-500/10 text-accent-400" : ""}
                `}
                >
                  <feature.icon size={26} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-white/70 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlights;
