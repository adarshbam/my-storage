import { Outlet } from "react-router-dom";
import VaultBackground from "../components/dashboard/VaultBackground";
import StandaloneNavbar from "../components/navigation/StandaloneNavbar";

export default function StandaloneLayout() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-vault-bg text-white overflow-x-hidden relative font-sans">
      <VaultBackground />
      <StandaloneNavbar />

      <main className="flex-1 min-w-0 w-full relative z-10 p-3 sm:p-6 lg:p-8 custom-scrollbar">
        <div className="mx-auto max-w-7xl min-w-0 w-full h-full flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
