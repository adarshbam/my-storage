import { useState } from "react";
import { Check, FileSearch, History, Link2, ShieldCheck } from "lucide-react";

const features = [
  {
    id: "search",
    icon: FileSearch,
    label: "Find without filing",
    title: "Neural search, with privacy intact.",
    copy: "Search by what is in a file, not just what you named it. Vault keeps the useful context close while access remains entirely in your control.",
    stats: [["Recognition", "On-device"], ["Index state", "Encrypted"]],
  },
  {
    id: "backup",
    icon: History,
    label: "Return to any moment",
    title: "Backups that feel invisible until you need them.",
    copy: "Version history quietly protects your work in the background, so one wrong click, a lost device, or ransomware never has to become permanent.",
    stats: [["History", "Continuous"], ["Recovery", "One click"]],
  },
  {
    id: "share",
    icon: Link2,
    label: "Share on your terms",
    title: "Every link has a boundary.",
    copy: "Send files without handing over your vault. Add expiry, passwords, or view-only rules and take access back the moment a project changes.",
    stats: [["Link rules", "Granular"], ["Revocation", "Instant"]],
  },
];

function SecurityDiagram({ active }) {
  return (
    <div className="vault-security-diagram" aria-hidden="true">
      <div className="vault-security-state">
        <span className="vault-live-dot" /> Guard state: protected
      </div>
      <svg viewBox="0 0 520 380" className="vault-security-svg">
        <circle cx="260" cy="190" r="128" className="vault-security-ring vault-security-ring-outer" />
        <circle cx="260" cy="190" r="87" className="vault-security-ring" />
        <path className="vault-security-route" d="M89 190H183M337 190h94M260 61v42M260 277v42" />
        <path className="vault-security-route vault-security-route-faint" d="M138 114 200 151M382 114 320 151M138 266l62-37M382 266l-62-37" />
        {[[89, 190], [431, 190], [260, 61], [260, 319], [138, 114], [382, 114], [138, 266], [382, 266]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" className="vault-security-node" />
        ))}
        <g className="vault-security-core">
          <path d="M260 112 318 144v70l-58 32-58-32v-70l58-32Z" />
          <path d="m202 144 58 34 58-34M260 178v68" />
          <path d="M260 151a18 18 0 0 1 18 18v11a12 12 0 0 1-5 10v14h-26v-14a12 12 0 0 1-5-10v-11a18 18 0 0 1 18-18Z" />
          <circle cx="260" cy="182" r="4" fill="currentColor" />
        </g>
      </svg>
      <div className="vault-security-datum vault-security-datum-left"><span>01</span>{active.stats[0][1]}</div>
      <div className="vault-security-datum vault-security-datum-right"><span>02</span>{active.stats[1][1]}</div>
      <div className="vault-security-caption">{active.label}</div>
    </div>
  );
}

export default function ScaleSecurity() {
  const [activeId, setActiveId] = useState("search");
  const active = features.find((feature) => feature.id === activeId) ?? features[0];

  return (
    <section id="security" className="vault-section pt-8">
      <div className="vault-section-shell vault-security-shell">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-16 items-start">
          <div>
            <p className="vault-eyebrow">Zero-knowledge architecture</p>
            <h2 className="vault-section-title">Security that stays out of your way.</h2>
            <p className="vault-copy max-w-md">The important parts work quietly: encryption, recovery, search, and sharing are designed as one composed experience instead of a collection of settings.</p>

            <div className="mt-8 space-y-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                const isActive = active.id === feature.id;
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => setActiveId(feature.id)}
                    className={`vault-security-choice ${isActive ? "is-selected" : ""}`}
                  >
                    <span className="vault-security-choice-icon"><Icon size={19} /></span>
                    <span className="text-left">
                      <strong>{feature.label}</strong>
                      <small>{isActive ? feature.copy : "Explore how Vault keeps this simple."}</small>
                    </span>
                    {isActive && <Check size={16} className="ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="vault-security-stage">
            <div className="vault-security-copy">
              <span className="vault-kicker"><ShieldCheck size={14} /> Active safeguard</span>
              <h3>{active.title}</h3>
              <p>{active.copy}</p>
            </div>
            <SecurityDiagram active={active} />
          </div>
        </div>
      </div>
    </section>
  );
}
