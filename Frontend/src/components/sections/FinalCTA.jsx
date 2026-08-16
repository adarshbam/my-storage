import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="vault-section pt-8">
      <div className="vault-section-shell">
        <div className="vault-final-cta">
          <div className="vault-final-cta-glow" aria-hidden="true" />
          <div className="relative z-10 max-w-2xl">
            <div className="vault-kicker"><Sparkles size={14} /> Your next vault is ready</div>
            <h2>Keep your files close. Keep worry further away.</h2>
            <p>Open a private space for the work, memories, and media you want to keep within reach for years.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link className="vault-button px-5 py-3.5 text-sm" to="/register">Create your vault <ArrowRight size={17} /></Link>
              <a className="vault-button-secondary px-5 py-3.5 text-sm" href="#pricing">Compare plans</a>
            </div>
          </div>
          <div className="vault-final-assurances relative z-10">
            <span><ShieldCheck size={17} /> No card needed to start</span>
            <span><ShieldCheck size={17} /> Leave whenever you want</span>
          </div>
        </div>
      </div>
    </section>
  );
}
