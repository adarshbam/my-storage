import { Layers, Power, HardDrive, Share2, Shield, Cpu, Zap, Headphones, Sparkles, FolderUp, Lock, Clock, Eye, Video, FileText, Check } from "lucide-react";
import { useState } from "react";

const categoryIcons = {
  Storage: HardDrive,
  Sharing: Share2,
  Integrations: Layers,
  Security: Shield,
  Performance: Zap,
  Support: Headphones,
  AI: Sparkles,
};

const categoryBadgeColors = {
  Storage: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Sharing: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Integrations: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Security: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Performance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Support: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  AI: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
};

export default function FeatureCatalogueSection({
  features,
  onToggleFeatureEnabled,
  onSaveFeatures,
}) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = async () => {
    if (onSaveFeatures) await onSaveFeatures();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const categories = ["ALL", "Storage", "Sharing", "Integrations", "Security", "Performance", "Support", "AI"];

  const filteredFeatures =
    selectedCategoryFilter === "ALL"
      ? features
      : features.filter((f) => f.category === selectedCategoryFilter);

  return (
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-blue-500/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/5">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Platform Feature Catalogue
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Global feature flags database schema definitions. Toggle features on/off across the platform.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {savedMessage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20 animate-fade-in">
              <Check size={14} /> Features Saved
            </span>
          )}

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  selectedCategoryFilter === cat
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 hover:opacity-95 active:scale-95 transition-all"
          >
            <Check size={14} /> Save Features
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFeatures.map((feature) => {
          const IconComp = categoryIcons[feature.category] || Layers;
          const badgeClass = categoryBadgeColors[feature.category] || "bg-slate-500/10 text-slate-400 border-slate-500/20";

          return (
            <div
              key={feature._id || feature.key || feature.id}
              className={`rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${
                feature.enabled
                  ? "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-blue-500/40 shadow-sm"
                  : "bg-slate-100/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 opacity-60 hover:opacity-90"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <IconComp size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                        {feature.title}
                      </h3>
                      <code className="text-[10px] font-mono text-slate-400 dark:text-white/40">
                        {feature.key}
                      </code>
                    </div>
                  </div>

                  {/* Switch */}
                  <button
                    type="button"
                    onClick={() => onToggleFeatureEnabled(feature._id)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 flex items-center shrink-0 ${
                      feature.enabled ? "bg-blue-500" : "bg-slate-700"
                    }`}
                    title={feature.enabled ? "Disable Feature" : "Enable Feature"}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        feature.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-white/60 font-medium mb-4">
                  {feature.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${badgeClass}`}>
                  {feature.category}
                </span>

                <span className="text-[10px] font-bold text-slate-400 dark:text-white/30">
                  ID: {feature._id}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
