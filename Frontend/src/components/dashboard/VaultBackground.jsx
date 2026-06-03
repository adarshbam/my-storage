import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function VaultBackground() {
  const location = useLocation();
  const [activeEnv, setActiveEnv] = useState("emerald");

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/shared")) setActiveEnv("teal");
    else if (path.includes("/recent")) setActiveEnv("azure");
    else if (path.includes("/starred")) setActiveEnv("gold");
    else if (path.includes("/trash")) setActiveEnv("rose");
    else if (path.includes("/github")) setActiveEnv("purple");
    else if (path.includes("/google-drive")) setActiveEnv("azure");
    else setActiveEnv("emerald");
  }, [location.pathname]);

  const envColors = {
    emerald: "from-vault-emerald/10 via-vault-emerald/5",
    teal: "from-team-accent/10 via-team-accent/5",
    azure: "from-document-accent/10 via-document-accent/5",
    purple: "from-creative-accent/10 via-creative-accent/5",
    orange: "from-media-accent/10 via-media-accent/5",
    gold: "from-analytics-accent/10 via-analytics-accent/5",
    rose: "from-danger-accent/10 via-danger-accent/5",
  };

  const activeColor = envColors[activeEnv] || envColors.emerald;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-vault-bg">
      {/* Dynamic Central Glow */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial ${activeColor} to-transparent rounded-full blur-[100px] transition-all duration-1000 ease-in-out opacity-60`}
      />
      
      {/* Teal Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)] opacity-80" />

      {/* Subtle Noise Texture (using SVG data URI for simplicity) */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* Secondary Ambient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-vault-emerald-dark/10 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#022c22]/30 rounded-full blur-[140px] animate-float" />
    </div>
  );
}
