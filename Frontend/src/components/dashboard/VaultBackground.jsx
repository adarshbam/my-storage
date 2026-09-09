import { useLocation } from "react-router-dom";

export default function VaultBackground() {
  const location = useLocation();
  const isTrash = location.pathname.includes("/trash");

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-vault-bg transition-colors duration-500">
      {/* Subtle top radial tint powered by active theme (matches Homepage exactly) */}
      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[85vw] h-[55vh] transition-all duration-700 ease-in-out ${
          isTrash
            ? "bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.14)_0%,rgba(239,68,68,0.035)_50%,transparent_75%)]"
            : "bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-primary-rgb),0.13)_0%,rgba(var(--accent-primary-rgb),0.035)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-primary-rgb),0.10)_0%,rgba(var(--accent-primary-rgb),0.025)_45%,transparent_75%)]"
        }`}
      />

      {/* Dynamic Ambient Glows — upper-center & lower-right (proportional to Homepage Hero) */}
      <div 
        className={`absolute top-[8%] left-1/2 -translate-x-1/2 w-[70vw] h-[45vh] rounded-full blur-[140px] transition-all duration-700 ease-in-out ${
          isTrash ? "bg-red-500/10 opacity-70" : "bg-accent-soft opacity-70"
        }`} 
      />
      
      <div 
        className={`absolute bottom-[-5%] right-[10%] w-[35vw] h-[35vw] rounded-full blur-[130px] transition-all duration-700 ease-in-out ${
          isTrash ? "bg-red-900/20 opacity-25" : "bg-accent-glow opacity-25"
        }`} 
      />
    </div>
  );
}

