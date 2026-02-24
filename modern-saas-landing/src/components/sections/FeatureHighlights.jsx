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
      className="py-24 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            More than just storage
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            All the tools you need to keep your digital life safe, organized,
            and accessible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-lg dark:hover:shadow-blue-500/10 transition-all duration-300">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 
                    ${feature.color === "blue" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : ""}
                    ${feature.color === "purple" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" : ""}
                    ${feature.color === "cyan" ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" : ""}
                    ${feature.color === "green" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : ""}
                    ${feature.color === "orange" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" : ""}
                    ${feature.color === "red" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : ""}
                `}
                >
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlights;
