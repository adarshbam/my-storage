import { Sliders, Sparkles } from "lucide-react";

export default function PlanTierDetailsSection({
  planTiers,
  onUpdateTierDetail,
}) {
  return (
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-rose-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shadow-lg shadow-rose-500/5">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Pricing Landing Page Marketing Tier Details
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Customize tier titles, marketing badges, and public landing page descriptions.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          Marketing Tiers
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {planTiers.map((tier) => (
          <div
            key={tier.type || tier.slug}
            className="rounded-2xl p-5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-rose-500/40 transition-all duration-300 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {tier.title || tier.type} Tier
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-white/40 uppercase">
                {tier.slug || tier.type}
              </span>
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
                  onUpdateTierDetail(tier.slug || tier.type, "title", e.target.value)
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
                value={tier.badge || ""}
                onChange={(e) =>
                  onUpdateTierDetail(tier.slug || tier.type, "badge", e.target.value)
                }
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-rose-500 text-xs shadow-sm"
                placeholder="e.g. Most Popular"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-1 font-mono">
                Public Card Subtitle
              </label>
              <textarea
                rows="3"
                value={tier.description || ""}
                onChange={(e) =>
                  onUpdateTierDetail(tier.slug || tier.type, "description", e.target.value)
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
