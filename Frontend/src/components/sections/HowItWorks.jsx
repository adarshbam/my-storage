import { FolderUp, ScanSearch, Send } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: FolderUp,
    title: "Bring your files in",
    copy: "Drop folders, photos, projects, and media into an organised vault without changing how you already work.",
    label: "Encrypted at entry",
  },
  {
    number: "02",
    icon: ScanSearch,
    title: "Let Vault do the quiet work",
    copy: "Smart indexing and file previews make your library effortless to scan, search, and revisit later.",
    label: "Private intelligence",
  },
  {
    number: "03",
    icon: Send,
    title: "Share with a clear boundary",
    copy: "Send secure links with deliberate permissions, then change your mind whenever the work changes.",
    label: "You stay in control",
  },
];

export default function HowItWorks() {
  return (
    <section id="features" className="vault-section vault-process-section">
      <div className="vault-section-shell">
        <div className="max-w-2xl">
          <p className="vault-eyebrow">A calmer way to store</p>
          <h2 className="vault-section-title">Everything in its place. Nothing in your way.</h2>
          <p className="vault-copy">A practical flow for a personal archive, a creative studio, or a whole team's shared operating space.</p>
        </div>

        <div className="vault-process-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="vault-process-card" key={step.number}>
                <div className="flex items-start justify-between gap-6">
                  <span className="vault-process-number">{step.number}</span>
                  <span className="vault-process-icon"><Icon size={21} /></span>
                </div>
                <div className="mt-12">
                  <p className="vault-eyebrow">{step.label}</p>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
                {index < steps.length - 1 && <span className="vault-process-connector" aria-hidden="true" />}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
