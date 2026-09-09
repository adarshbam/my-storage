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
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-3.5 min-[360px]:p-5 sm:p-8 shadow-xl transition-all duration-300 hover:border-accent-border">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent-soft text-accent-primary border border-accent-border flex items-center justify-center shadow-lg shadow-accent-glow-sm shrink-0">
            <Layers size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div>
            <h2 className="text-base min-[360px]:text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
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
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? "bg-accent-primary text-accent-foreground shadow-md shadow-accent-glow/25"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10 border border-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary text-accent-foreground text-xs font-bold shadow-lg shadow-accent-glow/25 hover:opacity-95 active:scale-95 transition-all w-full xs:w-auto cursor-pointer"
          >
            <Check size={14} /> Save Features
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredFeatures.map((feature) => {
          const IconComp = categoryIcons[feature.category] || Layers;

          return (
            <div
              key={feature._id || feature.key || feature.id}
              className={`rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${
                feature.enabled
                  ? "bg-slate-50/70 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-accent-border shadow-sm"
                  : "bg-slate-100/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5 opacity-60 hover:opacity-90"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent-primary border border-accent-border flex items-center justify-center shrink-0">
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
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 flex items-center shrink-0 cursor-pointer ${
                      feature.enabled ? "bg-accent-primary" : "bg-slate-300 dark:bg-slate-700"
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
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border uppercase tracking-wider bg-accent-soft/70 text-accent-primary border-accent-border/50">
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
