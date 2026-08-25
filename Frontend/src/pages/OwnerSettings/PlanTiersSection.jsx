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
      active: true,
    });
    setShowAddForm(false);
  };

  return (
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-rose-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shadow-lg shadow-rose-500/5">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Plan Tiers Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Configure marketing metadata, slugs, titles, badge highlights, and active states for tier levels.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {savedMessage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20 animate-fade-in">
              <Check size={14} /> Tiers Saved
            </span>
          )}

          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
            {planTiers.length} Defined Tiers
          </span>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 hover:bg-rose-600 transition-colors"
          >
            <Plus size={16} /> Add New Tier
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 hover:opacity-95 active:scale-95 transition-all"
          >
            <Check size={14} /> Save Tiers
          </button>
        </div>
      </div>

      {/* Modal / Create Form for new tier */}
      {showAddForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="mb-8 p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-rose-500/30 space-y-4 animate-fade-in shadow-sm"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Plus size={16} className="text-rose-500" /> Create New Plan Tier
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500 text-xs shadow-sm"
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
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500 text-xs shadow-sm"
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
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500 text-xs shadow-sm"
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
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium text-xs focus:outline-none focus:border-rose-500 shadow-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/10 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all"
            >
              Create Tier
            </button>
          </div>
        </form>
      )}

      {/* Plan Tiers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {planTiers.map((tier) => (
          <div
            key={tier.slug}
            className={`rounded-2xl p-5 border transition-all duration-300 space-y-4 shadow-sm ${
              tier.active !== false
                ? "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-rose-500/40"
                : "border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.01] opacity-60"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    tier.active !== false ? "bg-rose-500" : "bg-slate-400"
                  }`}
                />
                <h3 className="text-base font-black text-slate-900 dark:text-white truncate font-mono" title={tier.slug}>
                  {tier.slug}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Active Switch */}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTierDetail(tier.slug, "active", !(tier.active !== false))
                  }
                  className={`w-11 h-6 shrink-0 rounded-full p-1 transition-colors duration-200 flex items-center ${
                    tier.active !== false ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-700"
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
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-rose-500 shadow-sm"
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
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500 text-xs shadow-sm"
              />
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
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500 text-xs shadow-sm"
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
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-xs resize-none focus:outline-none focus:border-rose-500 shadow-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
