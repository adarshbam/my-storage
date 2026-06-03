import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SERVER_URL } from "../../lib/api";
import { NeuralSearchIcon, VaultLogo, EncryptionBadgeIcon, SystemCoreIcon, VaultDriveIcon, VaultGitIcon } from "../ui/VaultIcons";
import ProfileMenu from "../ui/ProfileMenu";
import { Search, Bell, Upload, FolderPlus, FilePlus, Menu, PanelLeft, MoreVertical, Share2, X } from "lucide-react";

export default function CommandBar({
  globalSearchQuery,
  setGlobalSearchQuery,
  handleSearchSubmit,
  handleCreateClick,
  handleCreateFileClick,
  handleProfilePicUpload,
  profilePicUrl,
  openUploadModal,
  openShareModal,
  isMobileOpen,
  setIsMobileOpen
}) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchScope, setSearchScope] = useState("current");
  const [searchExt, setSearchExt] = useState("");
  const [searchSize, setSearchSize] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const handleLogout = async () => {
    try {
      await fetch(`${SERVER_URL}/user/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      navigate("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await fetch(`${SERVER_URL}/user/logout-all`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      navigate("/");
    } catch (err) {
      console.error("Logout all devices failed", err);
    }
  };

  const onSearchExecute = (e) => {
    if (e.key === "Enter" && (globalSearchQuery.trim() || searchExt || searchSize)) {
      handleSearchSubmit(globalSearchQuery, { scope: searchScope, ext: searchExt, size: searchSize });
      setShowRecentSearches(false);
      setShowFilters(false);
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="h-[64px] shrink-0 vault-glass border-b border-vault-emerald/10 z-50 flex items-center justify-between px-3 sm:px-6 sticky top-0">
      
      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-0 bg-vault-black/95 backdrop-blur-xl z-[60] flex items-center px-4 gap-3 border-b border-vault-emerald/20 sm:hidden">
          <button onClick={() => setMobileSearchOpen(false)} className="text-white/50 hover:text-white p-1">
            <X size={24} />
          </button>
          <div className="flex-1 relative">
            <input
              ref={(el) => { if (el && mobileSearchOpen) el.focus() }}
              type="text"
              placeholder="Search classified assets..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit(globalSearchQuery, { scope: searchScope, ext: searchExt, size: searchSize });
                  setMobileSearchOpen(false);
                }
              }}
              className="w-full bg-transparent border-none outline-none text-white px-2 placeholder:text-white/30 text-lg"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg ${showFilters ? 'bg-vault-emerald/20 text-vault-emerald' : 'text-white/50'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          </button>
        </div>
      )}

      {/* Filter Dropdown (Mobile position adjusted if needed, but handled globally later) */}

      {/* LEFT: System Identity */}
      <div className="flex items-center gap-2 sm:gap-3 w-auto sm:w-[240px] shrink-0">
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`md:hidden p-1.5 -ml-1 mr-1 rounded-xl border transition-all shadow-[inset_0_0_10px_rgba(0,212,165,0.05)] flex items-center justify-center
            ${isMobileOpen 
              ? 'bg-vault-emerald/10 border-vault-emerald/40 text-vault-emerald' 
              : 'bg-vault-emerald/5 border-vault-emerald/20 text-vault-emerald/70 hover:bg-vault-emerald/10 hover:text-vault-emerald hover:border-vault-emerald/40'
            }`}
          title="Toggle Vault Navigation"
        >
          <PanelLeft size={20} />
        </button>
        <div className="bg-[#01140f] border border-vault-emerald/30 p-1 sm:p-1.5 rounded-xl shadow-glow-green relative group-hover:border-vault-emerald transition-colors">
          <VaultLogo className="text-vault-emerald" size={18} />
        </div>
        <span className="text-base sm:text-lg font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 uppercase">
          Vault OS
        </span>
      </div>

      {/* CENTER: Neural Search */}
      <div className="flex-1 max-w-2xl mx-4 hidden sm:flex justify-center">
        <div className="relative w-full max-w-lg group">
          <div className="absolute inset-0 bg-vault-emerald/5 rounded-2xl blur-md group-hover:bg-vault-emerald/10 transition-colors" />
          <div className="relative flex items-center bg-vault-black/80 border border-white/10 rounded-2xl px-4 py-2 hover:border-vault-emerald/30 focus-within:border-vault-emerald/50 focus-within:shadow-[0_0_20px_rgba(0,212,165,0.15)] transition-all">
            <NeuralSearchIcon size={18} className="text-vault-emerald/70 group-focus-within:text-vault-emerald transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search classified assets..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onKeyDown={onSearchExecute}
              onFocus={() => setShowRecentSearches(true)}
              onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
              className="w-full bg-transparent border-none outline-none text-sm text-white px-3 placeholder:text-white/30 font-medium"
            />
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors ${showFilters ? 'bg-vault-emerald/20 text-vault-emerald' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            </button>
            <div className="flex items-center gap-1 opacity-50 ml-2">
              <kbd className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/20">⌘</kbd>
              <kbd className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/20">K</kbd>
            </div>
          </div>
          
          {/* Filter Dropdown */}
          {showFilters && (
            <div className="absolute top-full sm:top-[calc(100%+8px)] left-0 mt-2 sm:mt-0 w-[100vw] sm:w-full -ml-4 sm:ml-0 bg-[#01140f]/95 backdrop-blur-xl border-y sm:border border-vault-emerald/30 sm:rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 p-4">
              <h3 className="text-xs font-bold tracking-widest text-vault-emerald uppercase mb-4 border-b border-vault-emerald/20 pb-2">Advanced Search</h3>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-xs text-white/50 w-20">Scope</label>
                  <div className="flex gap-2 flex-1 w-full">
                    <button onClick={() => setSearchScope("current")} className={`flex-1 text-xs py-1.5 rounded-md border transition-all ${searchScope === "current" ? "bg-vault-emerald/10 border-vault-emerald text-vault-emerald" : "bg-black/40 border-white/10 text-white/50 hover:text-white"}`}>Current Context</button>
                    <button onClick={() => setSearchScope("global")} className={`flex-1 text-xs py-1.5 rounded-md border transition-all ${searchScope === "global" ? "bg-vault-emerald/10 border-vault-emerald text-vault-emerald" : "bg-black/40 border-white/10 text-white/50 hover:text-white"}`}>Global Vault</button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-xs text-white/50 w-20">Type (Ext)</label>
                  <input type="text" placeholder="e.g. pdf, txt" value={searchExt} onChange={e => setSearchExt(e.target.value)} className="w-full sm:flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-vault-emerald/50" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-xs text-white/50 w-20">Max Size</label>
                  <select value={searchSize} onChange={e => setSearchSize(e.target.value)} className="w-full sm:flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-vault-emerald/50 [&>option]:bg-vault-black">
                    <option value="">Any Size</option>
                    <option value="1">Under 1 MB</option>
                    <option value="10">Under 10 MB</option>
                    <option value="100">Under 100 MB</option>
                    <option value="1000">Under 1 GB</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Quick Actions & Status */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Quick Create Actions */}
        <div className="hidden lg:flex items-center gap-1 border-r border-white/10 pr-3 mr-1">
          <button onClick={openShareModal} className="p-2 text-white/50 hover:text-vault-emerald hover:bg-vault-emerald/10 rounded-xl transition-all" title="Share Vault">
            <Share2 size={18} />
          </button>
          <button onClick={openUploadModal} className="p-2 text-white/50 hover:text-vault-emerald hover:bg-vault-emerald/10 rounded-xl transition-all" title="Secure Transfer (Upload)">
            <Upload size={18} />
          </button>
          <button onClick={handleCreateClick} className="p-2 text-white/50 hover:text-vault-emerald hover:bg-vault-emerald/10 rounded-xl transition-all" title="New Chamber (Folder)">
            <FolderPlus size={18} />
          </button>
          <button onClick={handleCreateFileClick} className="p-2 text-white/50 hover:text-vault-emerald hover:bg-vault-emerald/10 rounded-xl transition-all" title="New Asset (File)">
            <FilePlus size={18} />
          </button>
        </div>

        {/* Mobile Actions Menu Toggle */}
        <div className="lg:hidden relative">
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-1.5 sm:p-2 text-white/50 hover:text-white transition-colors rounded-xl hover:bg-white/5"
          >
            <MoreVertical size={20} />
          </button>
          
          {showMobileMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#01140f]/95 backdrop-blur-xl border border-vault-emerald/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 py-2 flex flex-col">
              <button onClick={() => { setShowMobileMenu(false); setMobileSearchOpen(true); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 sm:hidden border-b border-white/5">
                <Search size={16} /> Search Vault
              </button>
              <button onClick={() => { setShowMobileMenu(false); openShareModal(); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5">
                <Share2 size={16} /> Share Vault
              </button>
              <button onClick={() => { setShowMobileMenu(false); openUploadModal(); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 border-b border-white/5">
                <Upload size={16} /> Upload Asset
              </button>
              <button onClick={() => { setShowMobileMenu(false); handleCreateClick(); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5">
                <FolderPlus size={16} /> New Chamber
              </button>
              <button onClick={() => { setShowMobileMenu(false); handleCreateFileClick(); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5">
                <FilePlus size={16} /> New Asset
              </button>
            </div>
          )}
        </div>

        {/* Integration Status */}
        <div className="hidden md:flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
          {user?.integrations?.googleDrive?.connected && (
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-document-accent/10 border border-document-accent/20" title="Google Drive Connected">
               <VaultDriveIcon size={14} className="text-document-accent" />
             </div>
          )}
          {user?.integrations?.github?.connected && (
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-creative-accent/10 border border-creative-accent/20" title="GitHub Connected">
               <VaultGitIcon size={14} className="text-creative-accent" />
             </div>
          )}
        </div>

        {/* System Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-vault-emerald/10 border border-vault-emerald/30 rounded-full shadow-[inset_0_0_10px_rgba(0,212,165,0.1)]">
          <div className="w-2 h-2 rounded-full bg-vault-emerald animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest text-vault-emerald uppercase">Vault Active</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-white/50 hover:text-white transition-colors">
          <Bell size={20} />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger-accent border-2 border-vault-surface rounded-full" />
        </button>

        {/* Profile */}
        <ProfileMenu
          user={user}
          profilePicUrl={profilePicUrl}
          onLogout={handleLogout}
          onLogoutAll={handleLogoutAll}
          onProfilePicUpload={handleProfilePicUpload}
        />
      </div>
    </header>
  );
}
