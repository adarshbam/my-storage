import { Sliders, Sparkles, Plus, Check, X, ShieldAlert } from "lucide-react";
import { useState } from "react";

const accentOptions = [
  { value: "purple", label: "Fuchsia Purple", class: "bg-purple-500" },
  { value: "rose", label: "Rose Pink / Sunset Orange", class: "bg-rose-500" },
  { value: "sky", label: "Sky Blue / Ocean", class: "bg-sky-500" },
  { value: "emerald", label: "Emerald Green", class: "bg-emerald-500" },
  { value: "amber", label: "Amber Gold", class: "bg-amber-500" },
  { value: "indigo", label: "Deep Indigo", class: "bg-indigo-500" },
  { value: "cyan", label: "Electric Cyan", class: "bg-cyan-500" },
  { value: "pink", label: "Neon Pink", class: "bg-pink-500" },
  { value: "violet", label: "Radiant Violet", class: "bg-violet-500" },
];

export default function PlanTiersSection({
  planTiers,
  onUpdateTierDetail,
  onCreateNewTier,
  onSaveTiers,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = async () => {
    if (onSaveTiers) await onSaveTiers();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };
  const [newTierData, setNewTierData] = useState({
    slug: "",
    type: "",
    title: "",
    description: "",
    badge: "",
    accentColor: "emerald",
    active: true,
  });

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
      accentColor: "emerald",
      active: true,
    });
    setShowAddForm(false);
  };

  return (
    <section className="bg-slate-900/60 dark:bg-[#071310]/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-rose-500/30">
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
          className="mb-8 p-6 rounded-2xl bg-slate-800/60 dark:bg-white/[0.03] border border-rose-500/30 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Plus size={16} className="text-rose-400" /> Create New Plan Tier
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Tier Type / Identifier
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Free Trial, Enterprise"
                value={newTierData.type}
                onChange={(e) =>
                  setNewTierData({
                    ...newTierData,
                    type: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Slug
              </label>
              <input
                type="text"
                placeholder="e.g. free-trial"
                value={newTierData.slug}
                onChange={(e) =>
                  setNewTierData({ ...newTierData, slug: e.target.value })
                }
                className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Display Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Free Trial Vault"
                value={newTierData.title}
                onChange={(e) =>
                  setNewTierData({ ...newTierData, title: e.target.value })
                }
                className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Badge Label
              </label>
              <input
                type="text"
                placeholder="e.g. 30 Days Free"
                value={newTierData.badge}
                onChange={(e) =>
                  setNewTierData({ ...newTierData, badge: e.target.value })
                }
                className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Highlight Accent Color
              </label>
              <select
                value={newTierData.accentColor}
                onChange={(e) =>
                  setNewTierData({ ...newTierData, accentColor: e.target.value })
                }
                className="w-full bg-slate-100 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
              >
                {accentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Description
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Designed for creators and power users."
              value={newTierData.description}
              onChange={(e) =>
                setNewTierData({ ...newTierData, description: e.target.value })
              }
              className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-white resize-none focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-700 text-white font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20"
            >
              Save Tier
            </button>
          </div>
        </form>
      )}

      {/* Plan Tiers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {planTiers.map((tier) => (
          <div
            key={tier.slug}
            className={`rounded-2xl p-5 border transition-all duration-300 space-y-4 shadow-lg ${
              tier.active !== false
                ? "border-slate-200/80 dark:border-white/10 bg-slate-800/40 dark:bg-white/[0.02] hover:border-rose-500/40"
                : "border-slate-300/40 dark:border-white/5 bg-slate-800/20 dark:bg-white/[0.01] opacity-60"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    tier.active !== false ? "bg-rose-500" : "bg-slate-500"
                  }`}
                />
                <h3 className="text-base font-black text-slate-900 dark:text-white truncate" title={tier.slug}>
                  {tier.slug}
                </h3>
              </div>

              {/* Active Switch */}
              <button
                type="button"
                onClick={() =>
                  onUpdateTierDetail(tier.slug, "active", !(tier.active !== false))
                }
                className={`w-11 h-6 shrink-0 rounded-full p-1 transition-colors duration-200 flex items-center ${
                  tier.active !== false ? "bg-rose-500" : "bg-slate-700"
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

            {/* Slug */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={tier.slug}
                onChange={(e) =>
                  onUpdateTierDetail(tier.slug, "slug", e.target.value)
                }
                className="w-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-rose-500/50"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                Display Title
              </label>
              <input
                type="text"
                value={tier.title}
                onChange={(e) =>
                  onUpdateTierDetail(tier.slug, "title", e.target.value)
                }
                className="w-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500/50 text-xs"
              />
            </div>

            {/* Marketing Badge */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                Marketing Badge Label
              </label>
              <input
                type="text"
                value={tier.badge}
                onChange={(e) =>
                  onUpdateTierDetail(tier.slug, "badge", e.target.value)
                }
                className="w-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500/50 text-xs"
                placeholder="e.g. Most Popular"
              />
            </div>

            {/* Highlight Accent Color */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                Highlight Accent Color
              </label>
              <select
                value={tier.accentColor}
                onChange={(e) =>
                  onUpdateTierDetail(tier.slug, "accentColor", e.target.value)
                }
                className="w-full bg-slate-100 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500/50 text-xs"
              >
                {accentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                Public Card Description
              </label>
              <textarea
                rows="3"
                value={tier.description}
                onChange={(e) =>
                  onUpdateTierDetail(tier.slug, "description", e.target.value)
                }
                className="w-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-xs resize-none focus:outline-none focus:border-rose-500/50"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
