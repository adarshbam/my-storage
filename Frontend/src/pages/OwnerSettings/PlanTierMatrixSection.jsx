import { Grid, Check, X, ShieldCheck } from "lucide-react";

const tierList = ["Free", "Novice", "Professional", "Ultimate"];

export const tierBadgeColors = {
  Free: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Novice: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  Professional: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Ultimate: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

export default function PlanTierMatrixSection({
  features,
  tierConfigs,
  onToggleTierFeature,
}) {
  return (
    <section className="bg-white dark:bg-vault-surface/85 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-emerald-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
            <Grid size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Plan Tier Permissions Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Configure feature permissions across tiers. Toggle checkboxes to grant or restrict capabilities.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          4 Tiers • {features.length} Capability Rules
        </span>
      </div>

      {/* Permission Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.03]">
              <th className="py-4 px-6 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white/80">
                Platform Capability / Feature
              </th>
              {tierList.map((tier) => (
                <th key={tier} className="py-4 px-6 text-center text-xs font-black">
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${tierBadgeColors[tier]}`}
                  >
                    {tier}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-xs">
            {features.map((feature) => (
              <tr
                key={feature.id}
                className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors duration-150"
              >
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {feature.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-white/40 font-medium">
                      {feature.description}
                    </span>
                  </div>
                </td>

                {tierList.map((tier) => {
                  const isEnabled = (tierConfigs[tier] || []).includes(feature.key);

                  return (
                    <td key={tier} className="py-4 px-6 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => onToggleTierFeature(tier, feature.key)}
                        className={`w-9 h-9 rounded-xl inline-flex items-center justify-center transition-all duration-200 active:scale-95 border ${
                          isEnabled
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            : "bg-slate-200/50 dark:bg-white/5 text-slate-400 dark:text-white/20 border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30"
                        }`}
                        title={`${isEnabled ? "Revoke" : "Grant"} ${feature.title} for ${tier}`}
                      >
                        {isEnabled ? <Check size={18} strokeWidth={2.5} /> : <X size={16} strokeWidth={2} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
