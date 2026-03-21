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
      className="py-32 bg-transparent relative overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Beyond standard storage
          </h2>
          <p className="text-lg text-white/70 font-medium">
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
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-white/70 leading-relaxed font-medium">
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
