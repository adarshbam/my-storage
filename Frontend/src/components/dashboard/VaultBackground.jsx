import { useLocation } from "react-router-dom";

export default function VaultBackground() {
  const location = useLocation();
  const isTrash = location.pathname.includes("/trash");

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-vault-bg transition-colors duration-500">
      {/* Dynamic Central Glow — Theme Accent or Trash Crimson */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[110px] transition-all duration-700 ease-in-out ${
          isTrash
            ? "bg-[radial-gradient(circle,rgba(239,68,68,0.14)_0%,rgba(239,68,68,0.04)_50%,transparent_70%)] opacity-80"
            : "bg-[radial-gradient(circle,rgba(var(--accent-primary-rgb),0.12)_0%,rgba(var(--accent-primary-rgb),0.04)_50%,transparent_70%)] opacity-75"
        }`}
      />

      {/* Dynamic Theme Grid — perfectly aligned with active accent */}
      <div 
        className={`absolute inset-0 bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)] transition-all duration-700 ${
          isTrash
            ? "bg-[linear-gradient(rgba(239,68,68,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.04)_1px,transparent_1px)] opacity-90"
            : "bg-[linear-gradient(rgba(var(--accent-primary-rgb),0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-primary-rgb),0.035)_1px,transparent_1px)] opacity-85"
        }`} 
      />

      {/* Subtle Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.015]" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* Primary Ambient Blob — top-left */}
      <div 
        className={`absolute top-[-10%] left-[-10%] w-[42vw] h-[42vw] rounded-full blur-[130px] animate-pulse-glow transition-all duration-700 ${
          isTrash ? "bg-red-500/10" : "bg-accent-soft/50"
        }`} 
      />
      
      {/* Secondary Contextual Ambient Blob — bottom-right */}
      <div 
        className={`absolute bottom-[-10%] right-[-10%] w-[48vw] h-[48vw] rounded-full blur-[150px] animate-float transition-all duration-700 ${
          isTrash ? "bg-red-900/20" : "bg-accent-glow/20"
        }`} 
      />
      
      {/* Tertiary Accent Bloom — top-right corner */}
      <div 
        className={`absolute top-[5%] right-[5%] w-[28vw] h-[28vw] rounded-full blur-[110px] transition-all duration-700 ${
          isTrash ? "bg-rose-500/10 opacity-50" : "bg-accent-soft/40 opacity-50"
        }`} 
      />
    </div>
  );
}
