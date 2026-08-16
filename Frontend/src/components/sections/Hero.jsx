import { Link } from "react-router-dom";
import { ArrowRight, LockKeyhole, Play, ShieldCheck, Sparkles } from "lucide-react";
import { VaultLogo } from "../ui/VaultIcons";

const trustPoints = ["Encrypted before upload", "Free 10 GB vault", "No credit card"];

function VaultSignal() {
  const showArchitecture = () => {
    document.getElementById("security")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <button
      type="button"
      className="vault-hero-visual group"
      onClick={showArchitecture}
      aria-label="Explore Vault security architecture"
    >
      <span className="vault-visual-topline">
        <span className="vault-live-dot" /> Live architecture
        <span className="ml-auto vault-muted normal-case tracking-normal font-medium">Tap to explore</span>
      </span>

      <svg viewBox="0 0 600 420" role="img" aria-label="Illustrated encrypted vault network" className="vault-signal-svg">
        <defs>
          <linearGradient id="vault-beam" x1="0" x2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="0.5" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="vault-core">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.34" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="vault-signal-grid" opacity="0.28">
          {[80, 150, 220, 290, 360, 430, 500].map((x) => <line key={`v-${x}`} x1={x} y1="42" x2={x} y2="380" />)}
          {[74, 142, 210, 278, 346].map((y) => <line key={`h-${y}`} x1="44" y1={y} x2="556" y2={y} />)}
        </g>
        <circle className="vault-signal-aura" cx="300" cy="210" r="162" fill="url(#vault-core)" />
        <path className="vault-signal-connection" d="M120 292 205 243 300 286 394 218 488 266" />
        <path className="vault-signal-connection vault-signal-connection-soft" d="M122 134 204 183 300 138 397 190 486 130" />
        <path className="vault-signal-beam" d="M67 211H532" stroke="url(#vault-beam)" />
        {[
          [120, 292], [205, 243], [394, 218], [488, 266], [122, 134], [204, 183], [397, 190], [486, 130],
        ].map(([cx, cy], index) => (
          <g key={`${cx}-${cy}`} className="vault-signal-node" style={{ animationDelay: `${index * 90}ms` }}>
            <circle cx={cx} cy={cy} r="15" />
            <circle cx={cx} cy={cy} r="4" fill="currentColor" />
          </g>
        ))}
        <g className="vault-signal-core">
          <path d="M300 114 372 154v112l-72 40-72-40V154l72-40Z" />
          <path d="m228 154 72 42 72-42M300 196v110" />
          <path d="M300 168a25 25 0 0 1 25 25v13a16 16 0 0 1-8 14v18h-34v-18a16 16 0 0 1-8-14v-13a25 25 0 0 1 25-25Z" />
          <circle cx="300" cy="208" r="5" fill="currentColor" />
        </g>
      </svg>

      <span className="vault-visual-footer">
        <span className="flex items-center gap-2"><ShieldCheck size={15} /> Zero-knowledge relay</span>
        <span>Node 01 / Secure</span>
      </span>
    </button>
  );
}

export default function Hero() {
  return (
    <section className="vault-section vault-grid pt-36 md:pt-44 overflow-hidden">
      <div className="vault-section-shell grid items-center gap-12 lg:grid-cols-[1.02fr_.98fr]">
        <div className="relative z-10 max-w-2xl">
          <div className="vault-kicker"><span className="vault-kicker-dot" /> Built for the files that matter</div>
          <h1 className="vault-title">
            Your digital life,<br />
            <span className="vault-title-accent">held with care.</span>
          </h1>
          <p className="vault-copy max-w-xl">
            Vault brings files, media, backups, and private sharing into one encrypted place that feels calm, fast, and entirely yours.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/register" className="vault-button px-5 py-3.5 text-sm">
              Start your free vault <ArrowRight size={17} />
            </Link>
            <a href="#features" className="vault-button-secondary px-5 py-3.5 text-sm">
              <Play size={16} fill="currentColor" /> See how it works
            </a>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3">
            {trustPoints.map((point) => (
              <span className="flex items-center gap-2 text-sm vault-muted" key={point}>
                <LockKeyhole size={14} className="vault-accent-text" /> {point}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[35rem] lg:max-w-none">
          <VaultSignal />
          <div className="vault-hero-float-card vault-hero-float-left">
            <VaultLogo size={22} className="vault-accent-text" />
            <span><strong>Private by default</strong><small>Keys stay with you</small></span>
          </div>
          <div className="vault-hero-float-card vault-hero-float-right">
            <Sparkles size={17} className="vault-accent-text" />
            <span><strong>1,024 MB ready</strong><small>Free encrypted storage</small></span>
          </div>
        </div>
      </div>
    </section>
  );
}
