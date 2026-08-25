import { Outlet } from "react-router-dom";
import VaultBackground from "../components/dashboard/VaultBackground";
import StandaloneNavbar from "../components/navigation/StandaloneNavbar";
import WallGuideOverlay from "../components/guide/WallGuideOverlay";
import WallLauncher from "../components/guide/WallLauncher";

export default function StandaloneLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-vault-bg text-white overflow-x-hidden relative font-sans">
      <VaultBackground />
      <StandaloneNavbar />

      <main className="flex-1 relative z-10 p-4 sm:p-6 lg:p-8 custom-scrollbar">
        <div className="mx-auto max-w-7xl h-full flex flex-col">
          <Outlet />
        </div>
      </main>

      {/* Interactive Onboarding Guide & Launcher */}
      <WallGuideOverlay />
      <WallLauncher />
    </div>
  );
}
