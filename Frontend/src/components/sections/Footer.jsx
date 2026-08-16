import { Github, Linkedin, Twitter } from "lucide-react";
import { VaultLogo } from "../ui/VaultIcons";

const footerGroups = [
  { title: "Product", links: [["Features", "#features"], ["Security", "#security"], ["Media Engine", "#ecosystem"], ["Pricing", "#pricing"]] },
  { title: "Resources", links: [["Help center", "#"], ["Documentation", "#"], ["System status", "#"], ["Contact", "#"]] },
  { title: "Company", links: [["Privacy", "#"], ["Terms", "#"], ["Security practices", "#"], ["Accessibility", "#"]] },
];

export default function Footer() {
  return (
    <footer className="vault-footer">
      <div className="vault-section-shell">
        <div className="grid gap-12 md:grid-cols-[1.25fr_repeat(3,.65fr)]">
          <div>
            <a href="#top" className="vault-brand">
              <span className="vault-brand-mark"><VaultLogo size={23} /></span>
              <span>Vault</span>
            </a>
            <p className="vault-footer-copy">A composed home for the files that power your work and the memories that make it yours.</p>
            <div className="flex gap-2 mt-6">
              {[Twitter, Github, Linkedin].map((Icon) => <a className="vault-footer-social" href="#" aria-label="Vault social profile" key={Icon.displayName || Icon.name}><Icon size={16} /></a>)}
            </div>
          </div>
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="vault-footer-heading">{group.title}</h3>
              <ul className="space-y-3.5">
                {group.links.map(([label, href]) => <li key={label}><a href={href} className="vault-footer-link">{label}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="vault-footer-bottom">
          <span>© 2026 Vault. All rights reserved.</span>
          <span className="flex items-center gap-2"><i className="vault-live-dot" /> All systems operational</span>
        </div>
      </div>
    </footer>
  );
}
