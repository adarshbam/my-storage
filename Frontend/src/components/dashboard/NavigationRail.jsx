import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SERVER_URL } from "../../lib/api";
import {
  VaultChamberIcon,
  SecureRelayIcon,
  ActivityPulseIcon,
  PriorityBeaconIcon,
  RecycleVaultIcon,
  SystemCoreIcon,
  VaultDriveIcon,
  VaultGitIcon,
} from "../ui/VaultIcons";
import { useGoogleLogin } from "@react-oauth/google";

export default function NavigationRail({ isMobileOpen, setIsMobileOpen }) {
  const location = useLocation();
  const { user, setUser } = useAuth();

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const connectDrive = useGoogleLogin({
    flow: "auth-code",
    prompt: "consent",
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/drive",
    onSuccess: async (codeResponse) => {
      try {
        const res = await fetch(`${SERVER_URL}/drive/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code }),
          credentials: "include",
        });
        if (res.ok && user) {
          const newUser = { ...user };
          if (!newUser.integrations) newUser.integrations = {};
          newUser.integrations.googleDrive = { connected: true };
          setUser(newUser);
        }
      } catch (error) {
        console.error("Drive connection error:", error);
      }
    },
  });

  const disconnectDrive = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/drive/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok && user) {
        const newUser = { ...user };
        if (newUser.integrations?.googleDrive) {
          newUser.integrations.googleDrive.connected = false;
          setUser(newUser);
        }
      }
    } catch (error) {
      console.error("Drive disconnect error:", error);
    }
  };

  const connectGithub = async () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENTID;
    const redirectUri = `${SERVER_URL}/user/auth/github`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email,repo&state=connect`;
  };

  const disconnectGithub = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/github/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok && user) {
        const newUser = { ...user };
        if (newUser.integrations?.github) {
          newUser.integrations.github.connected = false;
          setUser(newUser);
        }
      }
    } catch (error) {
      console.error("Github disconnect error:", error);
    }
  };

  const navItems = [
    {
      name: "Vault Chamber",
      path: "/dashboard",
      exact: true,
      icon: VaultChamberIcon,
      accentClass: "text-vault-emerald",
      bgClass: "bg-vault-emerald/10",
      borderClass: "border-vault-emerald",
      shadowClass: "shadow-[inset_0_0_15px_rgba(0,212,165,0.2)]",
    },
    {
      name: "Secure Relay",
      path: "/dashboard/shared",
      exact: false,
      icon: SecureRelayIcon,
      accentClass: "text-team-accent",
      bgClass: "bg-team-accent/10",
      borderClass: "border-team-accent",
      shadowClass: "shadow-[inset_0_0_15px_rgba(32,229,192,0.2)]",
    },
    {
      name: "Activity Pulse",
      path: "/dashboard/recent",
      exact: false,
      icon: ActivityPulseIcon,
      accentClass: "text-document-accent",
      bgClass: "bg-document-accent/10",
      borderClass: "border-document-accent",
      shadowClass: "shadow-[inset_0_0_15px_rgba(77,166,255,0.2)]",
    },
    {
      name: "Priority Beacon",
      path: "/dashboard/starred",
      exact: false,
      icon: PriorityBeaconIcon,
      accentClass: "text-analytics-accent",
      bgClass: "bg-analytics-accent/10",
      borderClass: "border-analytics-accent",
      shadowClass: "shadow-[inset_0_0_15px_rgba(255,209,102,0.2)]",
    },
    {
      name: "Recycle Vault",
      path: "/dashboard/trash",
      exact: false,
      icon: RecycleVaultIcon,
      accentClass: "text-danger-accent",
      bgClass: "bg-danger-accent/10",
      borderClass: "border-danger-accent",
      shadowClass: "shadow-[inset_0_0_15px_rgba(255,90,122,0.2)]",
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Navigation Rail */}
      <aside className={`
        fixed md:sticky top-[64px] left-0 h-[calc(100vh-64px)] z-40
        w-[72px] md:hover:w-[240px] group transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        bg-vault-black/95 backdrop-blur-3xl border-r border-white/5
        flex flex-col overflow-hidden shrink-0
        ${isMobileOpen ? 'translate-x-0 !w-[240px]' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Main Nav Items */}
        <div className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto overflow-x-hidden scrollbar-none">
          {navItems.map((item) => {
            const active = isActive(item.path, item.exact);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  relative flex items-center h-12 rounded-xl transition-all duration-300 overflow-hidden
                  ${active ? `${item.bgClass} ${item.shadowClass}` : 'hover:bg-white/5'}
                `}
              >
                {/* Active Indicator Line */}
                {active && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-current ${item.accentClass} shadow-[0_0_10px_currentColor]`} />
                )}
                
                <div className={`w-12 shrink-0 flex items-center justify-center ${active ? item.accentClass : 'text-white/50 group-hover:text-white/80'}`}>
                  <Icon size={22} className="transition-transform duration-300 group-hover:scale-110" />
                </div>
                
                <span className={`whitespace-nowrap font-semibold text-sm tracking-wide transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} ${active ? 'text-white' : 'text-white/50 group-hover:text-white/90'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          <div className="my-4 h-px bg-white/5 mx-4 shrink-0" />
          <div className={`px-4 mb-2 text-[10px] font-bold tracking-widest text-white/30 uppercase transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
            Integrations
          </div>

          {/* Integrations */}
          <button
            onClick={() => user?.integrations?.googleDrive?.connected ? disconnectDrive() : connectDrive()}
            className="relative flex items-center h-12 rounded-xl hover:bg-white/5 transition-all duration-300 overflow-hidden text-left"
          >
            <div className={`w-12 shrink-0 flex items-center justify-center ${user?.integrations?.googleDrive?.connected ? 'text-document-accent' : 'text-white/40'}`}>
              <VaultDriveIcon size={20} />
            </div>
            <span className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} text-white/70`}>
              {user?.integrations?.googleDrive?.connected ? 'Drive (Linked)' : 'Link Drive'}
            </span>
          </button>

          <button
            onClick={() => user?.integrations?.github?.connected ? disconnectGithub() : connectGithub()}
            className="relative flex items-center h-12 rounded-xl hover:bg-white/5 transition-all duration-300 overflow-hidden text-left"
          >
            <div className={`w-12 shrink-0 flex items-center justify-center ${user?.integrations?.github?.connected ? 'text-creative-accent' : 'text-white/40'}`}>
              <VaultGitIcon size={20} />
            </div>
            <span className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} text-white/70`}>
              {user?.integrations?.github?.connected ? 'GitHub (Linked)' : 'Link GitHub'}
            </span>
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-white/5 mt-auto bg-vault-black/50 backdrop-blur-xl">
          <Link
            to="/profile"
            onClick={() => setIsMobileOpen(false)}
            className="relative flex items-center h-12 rounded-xl hover:bg-white/5 transition-all duration-300 overflow-hidden"
          >
            <div className="w-12 shrink-0 flex items-center justify-center text-white/50 group-hover:text-white/90">
              <SystemCoreIcon size={20} />
            </div>
            <span className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} text-white/70 group-hover:text-white`}>
              System Core
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
