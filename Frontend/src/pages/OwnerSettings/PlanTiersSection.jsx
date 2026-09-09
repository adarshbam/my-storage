import { Sliders, Sparkles, Plus, Check, X, ShieldAlert } from "lucide-react";
import { useState } from "react";

export default function PlanTiersSection({
  planTiers,
  onUpdateTierDetail,
  onCreateNewTier,
  onSaveTiers,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const [newTierData, setNewTierData] = useState({
    slug: "",
    type: "",
    title: "",
    description: "",
    badge: "",
    isPopular: false,
    active: true,
  });

  const handleSave = async () => {
    if (onSaveTiers) await onSaveTiers();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newTierData.type || !newTierData.title) return;

    onCreateNewTier({
      ...newTierData,
      slug: newTierData.slug || newTierData.type.toLowerCase().replace(/\s+/g, "-"),
    });

    setNewTierData({
      slug: "",
      type: "",
      title: "",
      description: "",
      badge: "",
      isPopular: false,
      active: true,
    });
    setShowAddForm(false);
  };

  return (
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-3.5 min-[360px]:p-5 sm:p-8 shadow-xl transition-all duration-300 hover:border-accent-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent-soft text-accent-primary border border-accent-border flex items-center justify-center shadow-lg shadow-accent-glow-sm shrink-0">
            <Sparkles size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div>
            <h2 className="text-base min-[360px]:text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Plan Tiers Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Configure marketing metadata, slugs, titles, badge highlights, and active states for tier levels.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {savedMessage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20 animate-fade-in">
              <Check size={14} /> Tiers Saved
            </span>
          )}

          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-accent-soft border border-accent-border text-accent-primary">
            {planTiers.length} Defined Tiers
          </span>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex-1 xs:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold text-xs border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
          >
            <Plus size={16} className="text-accent-primary" /> Add New Tier
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 xs:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary text-accent-foreground text-xs font-bold shadow-lg shadow-accent-glow/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Check size={14} /> Save Tiers
          </button>
        </div>
      </div>

      {/* Modal / Create Form for new tier */}
      {showAddForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="mb-8 p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-accent-border space-y-4 animate-fade-in shadow-sm"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Plus size={16} className="text-accent-primary" /> Create New Plan Tier
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 font-mono">
                Tier Type / Identifier
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Free Trial, Enterprise"
                value={newTierData.type}
                onChange={(e) =>
                  setNewTierData({ ...newTierData, type: e.target.value })
                }
                className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 text-xs shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 font-mono">
                Display Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Enterprise Shield"
                value={newTierData.title}
                onChange={(e) =>
                  setNewTierData({ ...newTierData, title: e.target.value })
                }
                className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 text-xs shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 font-mono">
                Marketing Badge (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Popular, Recommended"
                value={newTierData.badge}
                onChange={(e) =>
                  setNewTierData({ ...newTierData, badge: e.target.value })
                }
                className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 text-xs shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 font-mono">
                Card Description
              </label>
              <input
                type="text"
                placeholder="Short tagline for this plan tier"
                value={newTierData.description}
                onChange={(e) =>
                  setNewTierData({
                    ...newTierData,
                    description: e.target.value,
                  })
                }
                className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-sm"
              />
            </div>
          </div>

          {/* Most Popular Selection */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
            <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  newTierData.isPopular
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30"
                    : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40"
                }`}>
                  <Sparkles size={14} className={newTierData.isPopular ? "fill-current" : ""} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Mark as Most Popular Plan
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-white/50 block">
                    Highlights this tier on pricing and billing views (replaces current popular plan)
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                disabled={Boolean(
                  newTierData.type?.toLowerCase().includes("free") ||
                  newTierData.slug?.toLowerCase().includes("free")
                )}
                checked={Boolean(newTierData.isPopular)}
                onChange={(e) =>
                  setNewTierData({ ...newTierData, isPopular: e.target.checked })
                }
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-white/20 accent-amber-500 cursor-pointer disabled:cursor-not-allowed shrink-0"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/10 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-accent-primary hover:opacity-90 text-accent-foreground font-bold text-xs shadow-md shadow-accent-glow/20 transition-all cursor-pointer"
            >
              Create Tier
            </button>
          </div>
        </form>
      )}

      {/* Plan Tiers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {planTiers.map((tier) => {
          const isFreeTier = Boolean(
            tier.slug?.toLowerCase().includes("free") ||
            tier.type?.toLowerCase().includes("free") ||
            tier.title?.toLowerCase().includes("free")
          );

          return (
            <div
              key={tier.slug}
              className={`rounded-2xl p-5 border transition-all duration-300 space-y-4 shadow-sm ${
                tier.isPopular
                  ? "border-amber-500/50 bg-slate-50 dark:bg-white/[0.02] shadow-md shadow-amber-500/5 ring-1 ring-amber-500/20"
                  : tier.active !== false
                  ? "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] hover:border-accent-border"
                  : "border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.01] opacity-60"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      tier.active !== false ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-slate-400"
                    }`}
                  />
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate font-mono" title={tier.slug}>
                    {tier.slug}
                  </h3>
                  {tier.isPopular && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 uppercase tracking-wider shrink-0">
                      <Sparkles size={10} className="fill-current" /> Popular
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Active Switch */}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTierDetail(tier.slug, "active", !(tier.active !== false))
                    }
                    className={`w-11 h-6 shrink-0 rounded-full p-1 transition-colors duration-200 flex items-center cursor-pointer ${
                      tier.active !== false ? "bg-accent-primary" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                    title={tier.active !== false ? "Disable Tier" : "Enable Tier"}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        tier.active !== false ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                  Slug
                </label>
                <input
                  type="text"
                  value={tier.slug}
                  onChange={(e) =>
                    onUpdateTierDetail(tier.slug, "slug", e.target.value)
                  }
                  className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-sm"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                  Display Title
                </label>
                <input
                  type="text"
                  value={tier.title}
                  onChange={(e) =>
                    onUpdateTierDetail(tier.slug, "title", e.target.value)
                  }
                  className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 text-xs shadow-sm"
                />
              </div>

              {/* Most Popular Plan Checkbox */}
              <div
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  tier.isPopular
                    ? "bg-amber-500/10 border-amber-500/40 shadow-sm ring-1 ring-amber-500/20"
                    : isFreeTier
                    ? "bg-slate-100/60 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 opacity-60"
                    : "bg-white/60 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 hover:border-amber-500/30"
                }`}
              >
                <label
                  className={`flex items-center justify-between gap-2.5 ${
                    isFreeTier ? "cursor-not-allowed" : "cursor-pointer select-none"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        tier.isPopular
                          ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30"
                          : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40"
                      }`}
                    >
                      <Sparkles size={12} className={tier.isPopular ? "fill-current" : ""} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Most Popular Plan
                        </span>
                        {tier.isPopular && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-white/50 truncate">
                        {isFreeTier
                          ? "Free plan cannot be marked popular"
                          : tier.isPopular
                          ? "Highlighted on pricing & billing views"
                          : "Feature as the recommended plan"}
                      </p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    disabled={isFreeTier}
                    checked={Boolean(tier.isPopular)}
                    onChange={(e) =>
                      onUpdateTierDetail(tier.slug, "isPopular", e.target.checked)
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-white/20 accent-amber-500 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  />
                </label>
              </div>

            {/* Marketing Badge */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                Marketing Badge Label
              </label>
              <input
                type="text"
                value={tier.badge}
                onChange={(e) =>
                  onUpdateTierDetail(tier.slug, "badge", e.target.value)
                }
                className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 text-xs shadow-sm"
                placeholder="e.g. Most Popular"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                Public Card Description
              </label>
              <textarea
                rows="3"
                value={tier.description}
                onChange={(e) =>
                  onUpdateTierDetail(tier.slug, "description", e.target.value)
                }
                className="w-full bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-xs resize-none focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-sm"
              />
            </div>
          </div>
        );
      })}
    </div>
  </section>
);
}
