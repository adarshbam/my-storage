import { Grid, Check, X, ShieldCheck, Layers, Sliders, ToggleLeft, Hash, HardDrive, Clock } from "lucide-react";
import { useState } from "react";

export const tierBadgeColors = {
  "free-trial": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  novice: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  professional: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ultimate: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

export default function PlanTierConfigurationSection({
  features,
  planTiers,
  tierFeatureConfigs,
  tierRuleConfigs,
  onToggleTierFeature,
  onUpdateTierRule,
  onSaveConfigurations,
}) {
  const [activeTab, setActiveTab] = useState("features"); // 'features' | 'rules'
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = async () => {
    if (onSaveConfigurations) await onSaveConfigurations();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const tierList = planTiers.map((t) => t.slug);

  const rulesList = [
    {
      key: "allowUpload",
      label: "Allow File Upload",
      type: "boolean",
      description: "Permission for users to upload files in this tier.",
    },
    {
      key: "allowDownload",
      label: "Allow File Download",
      type: "boolean",
      description: "Permission for users to download files.",
    },
    {
      key: "allowSharing",
      label: "Allow Link Sharing",
      type: "boolean",
      description: "Permission for users to generate public share links.",
    },
    {
      key: "maxConnectedDevices",
      label: "Max Connected Devices",
      type: "number",
      description: "Maximum active logged-in device sessions.",
    },
    {
      key: "maxUploadSize",
      label: "Max Upload Size",
      type: "size",
      description: "Maximum file size limit per single upload.",
    },
    {
      key: "uploadSpeedMultiplier",
      label: "Upload Speed Multiplier",
      type: "text",
      description: "Bandwidth upload pipe multiplier (e.g. 1x, 5x, 10x, 20x).",
    },
    {
      key: "deleteFilesAfterExpiry",
      label: "Delete Files After Expiry",
      type: "text",
      description: "Auto file deletion policy after share expiration (e.g. 60 days, Never).",
    },
    {
      key: "versionHistoryDays",
      label: "Version History Retention",
      type: "text",
      description: "Days of file version history retained (e.g. 30, 90, 365, Unlimited).",
    },
  ];

  const getRuleValue = (tierConfig, ruleKey) => {
    if (!tierConfig) return undefined;
    if (tierConfig[ruleKey] !== undefined) return tierConfig[ruleKey];
    if (tierConfig.permissions && tierConfig.permissions[ruleKey] !== undefined)
      return tierConfig.permissions[ruleKey];
    if (tierConfig.limits && tierConfig.limits[ruleKey] !== undefined)
      return tierConfig.limits[ruleKey];
    if (tierConfig.settings && tierConfig.settings[ruleKey] !== undefined)
      return tierConfig.settings[ruleKey];
    return undefined;
  };

  return (
    <section className="bg-slate-900/60 dark:bg-[#071310]/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 hover:border-emerald-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
            <Grid size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Plan Tier Configuration
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Configure feature permissions and operational rules matrices per plan tier.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {savedMessage && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20 animate-fade-in">
              <Check size={14} /> Configurations Saved
            </span>
          )}

          {/* Tab 1 (Features) / Tab 2 (Rules) Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.04] p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("features")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "features"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "text-slate-600 dark:text-white/60 hover:text-white"
              }`}
            >
              <Layers size={14} /> Features Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "rules"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "text-slate-600 dark:text-white/60 hover:text-white"
              }`}
            >
              <Sliders size={14} /> Operational Rules
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 hover:opacity-95 active:scale-95 transition-all"
          >
            <Check size={14} /> Save Configurations
          </button>
        </div>
      </div>

      {/* TAB 1: FEATURES MATRIX */}
      {activeTab === "features" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-800/20 dark:bg-black/20 animate-fade-in">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.03]">
                <th className="py-4 px-6 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white/80">
                  Feature / Capability
                </th>
                {tierList.map((tier) => (
                  <th key={tier} className="py-4 px-6 text-center text-xs font-black">
                    <span
                      className={`inline-block px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                        tierBadgeColors[tier] ||
                        "bg-slate-500/10 text-slate-300 border-slate-500/20"
                      }`}
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
                  key={feature._id}
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
                    const isEnabled = (tierFeatureConfigs?.[tier] || []).includes(
                      feature.key
                    );

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
                          {isEnabled ? (
                            <Check size={18} strokeWidth={2.5} />
                          ) : (
                            <X size={16} strokeWidth={2} />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: RULES MATRIX */}
      {activeTab === "rules" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-800/20 dark:bg-black/20 animate-fade-in">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.03]">
                <th className="py-4 px-6 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white/80">
                  Operational Rule
                </th>
                {tierList.map((tier) => (
                  <th key={tier} className="py-4 px-6 text-center text-xs font-black min-w-[140px]">
                    <span
                      className={`inline-block px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                        tierBadgeColors[tier] ||
                        "bg-slate-500/10 text-slate-300 border-slate-500/20"
                      }`}
                    >
                      {tier}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-xs">
              {rulesList.map((rule) => (
                <tr
                  key={rule.key}
                  className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors duration-150"
                >
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {rule.label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-white/40 font-medium">
                        {rule.description}
                      </span>
                    </div>
                  </td>

                  {tierList.map((tier) => {
                    const currentRuleVal = getRuleValue(
                      tierRuleConfigs?.[tier],
                      rule.key
                    );

                    return (
                      <td key={tier} className="py-4 px-6 text-center align-middle">
                        {/* Control type: Boolean switch */}
                        {rule.type === "boolean" && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateTierRule(tier, rule.key, !currentRuleVal)
                            }
                            className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 inline-flex items-center ${
                              currentRuleVal ? "bg-emerald-500" : "bg-slate-700"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                                currentRuleVal ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        )}

                        {/* Control type: Number */}
                        {rule.type === "number" && (
                          <input
                            type="number"
                            min="1"
                            value={currentRuleVal ?? 1}
                            onChange={(e) =>
                              onUpdateTierRule(
                                tier,
                                rule.key,
                                Number(e.target.value)
                              )
                            }
                            className="w-20 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-center text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500/50"
                          />
                        )}

                        {/* Control type: Size (input + unit) */}
                        {rule.type === "size" && (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={
                                (tierRuleConfigs[tier] || {}).maxUploadSizeVal ?? 5
                              }
                              onChange={(e) =>
                                onUpdateTierRule(
                                  tier,
                                  "maxUploadSizeVal",
                                  Number(e.target.value)
                                )
                              }
                              className="w-14 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-center text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500/50"
                            />
                            <select
                              value={
                                (tierRuleConfigs[tier] || {}).maxUploadSizeUnit ?? "GB"
                              }
                              onChange={(e) =>
                                onUpdateTierRule(
                                  tier,
                                  "maxUploadSizeUnit",
                                  e.target.value
                                )
                              }
                              className="bg-slate-100 dark:bg-[#0c1613] border border-slate-200 dark:border-white/10 rounded-xl px-1.5 py-1.5 text-slate-900 dark:text-white font-bold text-[11px] focus:outline-none focus:border-emerald-500/50"
                            >
                              <option value="MB">MB</option>
                              <option value="GB">GB</option>
                              <option value="TB">TB</option>
                            </select>
                          </div>
                        )}

                        {/* Control type: Text */}
                        {rule.type === "text" && (
                          <input
                            type="text"
                            value={currentRuleVal ?? ""}
                            onChange={(e) =>
                              onUpdateTierRule(tier, rule.key, e.target.value)
                            }
                            className="w-24 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-center text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-emerald-500/50"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
