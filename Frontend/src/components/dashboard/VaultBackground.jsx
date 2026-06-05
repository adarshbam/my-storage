import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function VaultBackground() {
  const location = useLocation();
  const [activeEnv, setActiveEnv] = useState("emerald");

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/shared")) setActiveEnv("purple");
    else if (path.includes("/recent")) setActiveEnv("cyan");
    else if (path.includes("/starred")) setActiveEnv("gold");
    else if (path.includes("/trash")) setActiveEnv("crimson");
    else if (path.includes("/github")) setActiveEnv("purple");
    else if (path.includes("/google-drive")) setActiveEnv("orange");
    else setActiveEnv("emerald");
  }, [location.pathname]);

  // Environmental color definitions — primary glow + secondary ambient
  const envColors = {
    emerald: {
      primary: "from-vault-emerald/10 via-vault-emerald/5",
      secondary: "bg-vault-emerald-dark/10",
      accent: "bg-[#022c22]/30",
    },
    purple: {
      primary: "from-[#C65CFF]/8 via-[#9B4DFF]/4",
      secondary: "bg-[#C65CFF]/5",
      accent: "bg-[#1a0033]/20",
    },
    cyan: {
      primary: "from-[#00CFFF]/8 via-[#00CFFF]/4",
      secondary: "bg-[#00CFFF]/5",
      accent: "bg-[#001a22]/20",
    },
    gold: {
      primary: "from-[#FFD166]/8 via-[#FFD166]/4",
      secondary: "bg-[#FFD166]/5",
      accent: "bg-[#1a1500]/20",
    },
    crimson: {
      primary: "from-[#FF5A7A]/8 via-[#FF5A7A]/4",
      secondary: "bg-[#FF5A7A]/5",
      accent: "bg-[#1a0008]/20",
    },
    orange: {
      primary: "from-[#FF7A3D]/8 via-[#FF7A3D]/4",
      secondary: "bg-[#FF7A3D]/5",
      accent: "bg-[#1a0e00]/20",
    },
  };

  const env = envColors[activeEnv] || envColors.emerald;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-vault-bg">
      {/* Dynamic Central Glow — shifts color per module */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial ${env.primary} to-transparent rounded-full blur-[100px] transition-all duration-1000 ease-in-out opacity-60`}
      />

      {/* Persistent Emerald Grid — always present (85% emerald base) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)] opacity-80" />

      {/* Subtle Noise Texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* Primary Emerald Ambient Blob — always present */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-vault-emerald-dark/10 rounded-full blur-[120px] animate-pulse-glow" />
      
      {/* Secondary Contextual Ambient Blob — shifts with module */}
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] ${env.accent} rounded-full blur-[140px] animate-float transition-colors duration-1000`} />
      
      {/* Tertiary Accent Bloom — subtle colored light at top-right */}
      <div className={`absolute top-[5%] right-[5%] w-[25vw] h-[25vw] ${env.secondary} rounded-full blur-[100px] transition-colors duration-1000 opacity-40`} />
    </div>
  );
}
