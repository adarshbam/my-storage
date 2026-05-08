import { useRef, useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Cloud,
  Folder,
  Trash2,
  LogOut,
  Search,
  Settings,
  Menu,
  X,
  SlidersHorizontal,
  PanelLeft,
  Sun,
  Moon,
  Users,
  Clock,
  Star,
  HardDrive,
  ChevronRight,
  Box,
} from "lucide-react";
import Button from "../components/ui/Button";
import ProfileMenu from "../components/ui/ProfileMenu";
import TransferManager from "../components/drive/TransferManager";
import FileUploadModal from "../components/drive/FileUploadModal";
import { useGoogleLogin } from "@react-oauth/google";
import { useTheme } from "../components/ui/ThemeProvider";

export default function DashboardLayout() {
  // Layout for the dashboard
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const transferRef = useRef(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showGlobalFilters, setShowGlobalFilters] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setTheme(user.theme);
    }
  }, [user?.theme]);

  const connectDrive = useGoogleLogin({
    flow: "auth-code",
    prompt: "consent",
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/drive.readonly",
    onSuccess: async (codeResponse) => {
      try {
        console.log(codeResponse);
        const res = await fetch(`${SERVER_URL}/drive/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code }),
          credentials: "include",
        });

        if (res.ok) {
          console.log("Drive connected successfully!");
          // Optional: You could update UI state here to reflect connected status
        } else {
          console.error("Failed to connect Drive");
        }
      } catch (error) {
        console.error("Drive connection error:", error);
      }
    },
    onError: (errorResponse) =>
      console.log("Google Login Failed:", errorResponse),
  });

  const connectGithub = async () => {
    // TODO: Replace with your actual GitHub Client ID
    const clientId = `Ov23lizS9BOqZ4r4jQPZ`;
    const redirectUri = `${SERVER_URL}/user/auth/github`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email,repo&state=connect`;
  };

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    try {
      await fetch(`${SERVER_URL}/user/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
        credentials: "include",
      });
      if (user) {
        setUser({ ...user, theme: newTheme });
      }
    } catch (err) {
      console.error("Failed to save theme to backend", err);
    }
  };

  useEffect(() => {
    fetchRecentSearches();
  }, []);

  const fetchRecentSearches = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/user/searchedItems`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        // Backend returns stringified JSON? "json(JSON.stringify(...))" in route.
        // Let's handle both just in case, but route said `.json(JSON.stringify(...))` which is double encoded if using .json().
        // Route: `res.status(200).json(JSON.stringify(...))` -> Content-Type: application/json, Body: "[\"term\"]" (string)
        // Client `res.json()` will parse the outer JSON to get the string "[\"term\"]".
        // Then we need to JSON.parse THAT string.
        // Or better, fix backend to just return the object.
        // I'll assume backend returns array or string.

        // Wait, I can't fix backend easily if I don't want to double context switch.
        // existing route: `res.status(200).json(JSON.stringify(usersDB[userIndex].recentlySearchedItems));`
        // express .json() converts arg to JSON string.
        // so response body is `"[...]"`.
        // fetch .json() parses it -> `[...]` (array).
        // Wait, `JSON.stringify` produces a string. `res.json(string)` sends that string as the body (quoted?).
        // If I pass a string to `res.json()`, Express sends it as JSON string.
        // Example: `res.json("foo")` -> `"foo"`.
        // `res.json(JSON.stringify([1]))` -> `"[1]"`.
        // Client `await res.json()` -> `"[1]"` (string).
        // So I need to parse it again.

        let parsed = data;
        if (typeof data === "string") {
          try {
            parsed = JSON.parse(data);
          } catch {}
        }
        setRecentSearches(parsed || []);
      }
    } catch (err) {
      console.error("Failed to fetch recent searches", err);
    }
  };

  const location = useLocation();

  const handleSearch = async (term) => {
    if (!term.trim()) {
      setSearchQuery("");
      setShowRecentSearches(false);

      if (currentFolderId) {
        navigate(`/dashboard/folder/${currentFolderId}`);
      } else {
        navigate("/dashboard");
      }
      return;
    }

    setSearchQuery(term);
    setShowRecentSearches(false);

    // If the user is inside a Drive or GitHub view, stay on the current path
    // and append ?q= so the correct specialView + search endpoint is used.
    const path = location.pathname;
    const isDriveOrGithub =
      path.startsWith("/dashboard/google-drive") ||
      path.startsWith("/dashboard/github");

    if (isDriveOrGithub) {
      // Stay on the current route — FileBrowser will pick up ?q= via useSearchParams
      navigate(`${path}?q=${encodeURIComponent(term)}`);
    } else if (currentFolderId) {
      navigate(
        `/dashboard/folder/${currentFolderId}?search=${encodeURIComponent(term)}`,
      );
    } else {
      navigate(`/dashboard/search?q=${encodeURIComponent(term)}`);
    }

    // Optimistic update with limit 5 and recency update
    setRecentSearches((prev) => {
      const filtered = prev.filter((t) => t !== term);
      const updated = [...filtered, term];
      return updated.slice(-5); // Keep last 5
    });

    try {
      await fetch(`${SERVER_URL}/user/searchedItems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchItem: term }),
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to save search history", err);
    }
  };

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

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await fetch(`${SERVER_URL}/user/profilepic`, {
        method: "POST",
        headers: {
          filename: file.name,
        },
        body: file,
        credentials: "include",
      });

      if (response.ok) {
        // optimistically update user or fetch user again
        // Ideally backend should return new user object or url
        // For now let's just fetch user again to be safe
        const userRes = await fetch(`${SERVER_URL}/user`, {
          credentials: "include",
        });
        if (userRes.ok) {
          const newUser = await userRes.json();
          setUser(newUser);
        }
      } else {
        console.error("Profile pic upload failed");
      }
    } catch (err) {
      console.error("Error uploading profile pic", err);
    }
  };

  const profilePicUrl = user?.profilepic
    ? `${SERVER_URL}/user/profilepic?id=${user.profilepic}` // Bust cache only when ID changes
    : null;

  const handleUpload = (files, targetId) => {
    const destination = targetId || currentFolderId;
    if (transferRef.current) {
      // Convert to array if it's a FileList or single file
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      transferRef.current.uploadFiles(fileArray, destination);
    }
  };

  const handleDownload = (url, name) => {
    if (transferRef.current) {
      transferRef.current.downloadFile(url, name);
    }
  };

  const openUploadModal = () => setShowUploadModal(true);

  return (
    <div className="h-screen bg-[#faf5f7] dark:bg-[#020b08] flex flex-col transition-colors duration-300 overflow-hidden relative">
      {/* Layered Gradient Background — matching landing page */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#14b8a6]/8 dark:bg-[#14b8a6]/6 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[35vw] h-[35vw] bg-[#3b82f6]/8 dark:bg-[#3b82f6]/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-[#a855f7]/6 dark:bg-[#a855f7]/4 rounded-full blur-[120px]" />
      </div>

      {/* Global Top Navbar */}
      <header className="h-16 bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl border-b border-black/5 dark:border-white/[0.06] flex items-center justify-between px-4 sm:px-6 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setIsSidebarOpen((prev) => !prev);
              setIsDesktopSidebarOpen((prev) => !prev);
            }}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <PanelLeft size={20} />
          </button>
          <Link
            to="/"
            className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-500 transition-colors hidden sm:flex"
          >
            <span>Home</span>
            <ChevronRight size={16} className="text-slate-400 mt-0.5" />
          </Link>
        </div>

        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search files globally..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && globalSearchQuery.trim()) {
                  navigate(
                    `/dashboard/search?q=${encodeURIComponent(globalSearchQuery.trim())}`,
                  );
                }
              }}
              className="w-full pl-10 pr-10 py-2 bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/30 dark:focus:shadow-[0_0_12px_rgba(20,184,166,0.15)] outline-none transition-all duration-300"
            />
            <button
              onClick={() => setShowGlobalFilters(!showGlobalFilters)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Toggle Filters"
            >
              <SlidersHorizontal size={16} />
            </button>
            {showGlobalFilters && (
              <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 w-72 bg-white/80 dark:bg-white/[0.05] backdrop-blur-2xl border border-black/10 dark:border-white/[0.08] rounded-xl shadow-2xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-20 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Filters
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Refine your search results.
                  </p>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                      Extensions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. pdf, png, docx"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                      Size
                    </label>
                    <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-slate-900 dark:text-slate-200">
                      <option>Any Size</option>
                      <option>&lt; 1MB</option>
                      <option>1MB - 10MB</option>
                      <option>10MB - 100MB</option>
                      <option>&gt; 100MB</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Starred Only
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-500 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={() => connectDrive()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.1] hover:border-[#14b8a6]/40 hover:shadow-[0_0_12px_rgba(20,184,166,0.15)] border border-black/10 dark:border-white/10 rounded-lg transition-all duration-300"
            title="Connect Google Drive"
          >
            {/* Google Drive icon — official colors */}
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg"
              alt="Google Drive"
              className="w-5 h-5"
            />
            <span className="hidden sm:block">Drive</span>
          </button>
          <button
            onClick={() => connectGithub()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.1] hover:border-[#14b8a6]/40 hover:shadow-[0_0_12px_rgba(20,184,166,0.15)] border border-black/10 dark:border-white/10 rounded-lg transition-all duration-300"
            title="Connect with Github"
          >
            {/* Github icon — official colors */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 98 96"
              className="text-slate-800 dark:text-white"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.868 0 48.854 0z"
                fill="currentColor"
              />
            </svg>
            <span className="hidden sm:block">Github</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <ProfileMenu
            user={user}
            profilePicUrl={profilePicUrl}
            onLogout={handleLogout}
            onLogoutAll={handleLogoutAll}
            onProfilePicUpload={handleProfilePicUpload}
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`w-64 shrink-0 bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl border-r border-black/5 dark:border-white/[0.06] flex flex-col absolute md:relative inset-y-0 left-0 z-40 transition-all duration-300 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 ${isDesktopSidebarOpen ? "md:ml-0" : "md:-ml-64"}`}
        >
          <div className="p-6 pb-4 flex items-center justify-between gap-2">
            <Link
              to="/"
              className="flex items-center gap-2"
              onClick={() => setIsSidebarOpen(false)}
            >
              <div className="bg-[#01140f] border border-teal-500/30 p-2 rounded-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.8),0_0_15px_rgba(20,184,166,0.3)] transition-all duration-300 relative group-hover:border-teal-400 group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.8),0_0_25px_rgba(20,184,166,0.6)]">
                <Box className="text-[#14b8a6] relative z-10" size={20} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#14b8a6] to-[#3b82f6]">
                Vault
              </span>
            </Link>
            <button
              className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-6 pb-6 border-b border-black/5 dark:border-white/[0.06]">
            <Button
              onClick={() => {
                openUploadModal();
                setIsSidebarOpen(false);
              }}
              className="w-full shadow-lg shadow-[#14b8a6]/20"
            >
              + New Upload
            </Button>
          </div>

          <div className="p-4 flex-1">
            <nav className="space-y-1">
              <Link
                to="/dashboard"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.06] rounded-xl transition-all duration-300"
              >
                <HardDrive size={18} />
                <span>My Drive</span>
              </Link>
              <Link
                to="/dashboard/shared"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.06] rounded-xl transition-all duration-300"
              >
                <Users size={18} />
                <span>Shared with me</span>
              </Link>
              <Link
                to="/dashboard/recent"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.06] rounded-xl transition-all duration-300"
              >
                <Clock size={18} />
                <span>Recent</span>
              </Link>
              <Link
                to="/dashboard/starred"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.06] rounded-xl transition-all duration-300"
              >
                <Star size={18} />
                <span>Starred</span>
              </Link>
              <Link
                to="/dashboard/trash"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.06] rounded-xl transition-all duration-300"
              >
                <Trash2 size={18} />
                <span>Trash</span>
              </Link>
            </nav>
          </div>

          <div className="p-4 border-t border-black/5 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div
                className="w-9 h-9 rounded-full bg-[#14b8a6]/10 flex items-center justify-center text-[#14b8a6] font-bold overflow-hidden cursor-pointer relative group border-2 border-white/50 dark:border-white/10 shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={profilePicUrl || "/profile.png"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <Settings className="text-white w-4 h-4" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleProfilePicUpload}
              />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors text-sm"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col relative bg-transparent">
          <Outlet
            context={{
              openUploadModal,
              uploadFile: handleUpload,
              downloadFile: handleDownload,
              setCurrentFolderId,
              refreshTrigger,
              searchQuery,
              setSearchQuery,
              handleSearch,
              recentSearches,
              showRecentSearches,
              setShowRecentSearches,
              showFilters,
              setShowFilters,
            }}
          />
          <TransferManager
            ref={transferRef}
            onUploadComplete={() => setRefreshTrigger((prev) => prev + 1)}
          />
          <FileUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUpload={handleUpload}
          />
        </main>
      </div>
    </div>
  );
}
