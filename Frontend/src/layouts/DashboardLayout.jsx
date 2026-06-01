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
  Share2,
  Copy,
  Calendar,
  AlertCircle,
  Info,
  AlertTriangle,
  ShieldAlert,
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

  // --- SHARE STATES & FUNCTIONS ---
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLinks, setShareLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState("read");
  const [ownerAgreed, setOwnerAgreed] = useState(false);

  const fetchShareLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await fetch(`${SERVER_URL}/share/links`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setShareLinks(data.links || []);
      }
    } catch (error) {
      console.error("Error fetching share links:", error);
    } finally {
      setLoadingLinks(false);
    }
  };

  const handleCreateShareLink = async () => {
    if (selectedPermission === "owner" && !ownerAgreed) {
      alert("Please accept the risk agreement before generating an Owner link.");
      return;
    }
    setGeneratingLink(true);
    try {
      const res = await fetch(`${SERVER_URL}/share/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresAt: expiryDate || null,
          permission: [selectedPermission],
        }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const fullUrl = `${window.location.origin}/shared-access/${data.token}`;
        setGeneratedLink(fullUrl);
        fetchShareLinks();
      }
    } catch (error) {
      console.error("Error creating share link:", error);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRevokeShareLink = async (linkId) => {
    if (
      !confirm(
        "Are you sure you want to revoke this share link? This will instantly revoke access for everyone who claimed access through this link!",
      )
    )
      return;
    try {
      const res = await fetch(`${SERVER_URL}/share/link/${linkId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        fetchShareLinks();
        if (generatedLink) {
          setGeneratedLink("");
        }
      }
    } catch (error) {
      console.error("Error revoking share link:", error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setTheme(user.theme);
    }
  }, [user?.theme]);

  const connectDrive = useGoogleLogin({
    flow: "auth-code",
    prompt: "consent",
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/drive",
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
          // Update UI state to reflect connected status
          if (user) {
            const newUser = { ...user };
            if (!newUser.integrations) newUser.integrations = {};
            newUser.integrations.googleDrive = { connected: true };
            setUser(newUser);
          }
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

  const disconnectDrive = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/drive/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        console.log("Drive disconnected successfully!");
        if (user) {
          const newUser = { ...user };
          if (newUser.integrations?.googleDrive) {
            newUser.integrations.googleDrive.connected = false;
            setUser(newUser);
          }
        }
      } else {
        console.error("Failed to disconnect Drive");
      }
    } catch (error) {
      console.error("Drive disconnect error:", error);
    }
  };

  const disconnectGithub = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/github/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        console.log("Github disconnected successfully!");
        if (user) {
          const newUser = { ...user };
          if (newUser.integrations?.github) {
            newUser.integrations.github.connected = false;
            setUser(newUser);
          }
        }
      } else {
        console.error("Failed to disconnect Github");
      }
    } catch (error) {
      console.error("Github disconnect error:", error);
    }
  };

  const connectGithub = async () => {
    // TODO: Replace with your actual GitHub Client ID
    const clientId = import.meta.env.VITE_GITHUB_CLIENTID;
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
          } catch {
            console.log("Failed to parse recent searches, using raw string");
          }
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

  // Helper for sidebar active state
  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#f2faf7] via-[#e6f4f1] to-[#eaf7f4] dark:from-[#010a08] dark:via-[#021612] dark:to-[#010806] flex flex-col transition-colors duration-300 overflow-hidden relative">
      {/* Layered Gradient Background — matching premium glow dark-green reference */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        <div className="absolute top-[-25%] left-[-15%] w-[55vw] h-[55vw] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[150px]" />
        <div className="absolute top-[15%] right-[-15%] w-[45vw] h-[45vw] bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-25%] left-[15%] w-[65vw] h-[65vw] bg-[#05493e]/20 dark:bg-[#05493e]/30 rounded-full blur-[160px]" />
      </div>

      {/* Global Top Navbar */}
      <header className="h-20 bg-white/40 dark:bg-[#020b08]/40 backdrop-blur-3xl border-b border-black/5 dark:border-white/[0.08] flex items-center justify-between px-4 sm:px-6 z-50 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
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
              className="w-full pl-11 pr-11 py-2.5 bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-black/5 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#14b8a6]/50 focus:border-[#14b8a6]/50 dark:focus:shadow-[0_0_20px_rgba(20,184,166,0.15)] outline-none transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
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
            onClick={() =>
              user?.integrations?.googleDrive?.connected
                ? disconnectDrive()
                : connectDrive()
            }
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-300 rounded-lg border ${
              user?.integrations?.googleDrive?.connected
                ? "text-red-500 bg-red-50/50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border-red-200 dark:border-red-500/30"
                : "text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.1] hover:border-[#14b8a6]/40 hover:shadow-[0_0_12px_rgba(20,184,166,0.15)] border-black/10 dark:border-white/10"
            }`}
            title={
              user?.integrations?.googleDrive?.connected
                ? "Unlink Google Drive"
                : "Connect Google Drive"
            }
          >
            {/* Google Drive icon — official colors */}
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg"
              alt="Google Drive"
              className={`w-5 h-5 ${user?.integrations?.googleDrive?.connected ? "grayscale" : ""}`}
            />
            <span className="hidden sm:block">
              {user?.integrations?.googleDrive?.connected
                ? "Unlink Drive"
                : "Drive"}
            </span>
          </button>
          <button
            onClick={() =>
              user?.integrations?.github?.connected
                ? disconnectGithub()
                : connectGithub()
            }
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-300 rounded-lg border ${
              user?.integrations?.github?.connected
                ? "text-red-500 bg-red-50/50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border-red-200 dark:border-red-500/30"
                : "text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.1] hover:border-[#14b8a6]/40 hover:shadow-[0_0_12px_rgba(20,184,166,0.15)] border-black/10 dark:border-white/10"
            }`}
            title={
              user?.integrations?.github?.connected
                ? "Unlink Github"
                : "Connect with Github"
            }
          >
            {/* Github icon — official colors */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 98 96"
              className={`text-slate-800 dark:text-white ${user?.integrations?.github?.connected ? "grayscale" : ""}`}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.868 0 48.854 0z"
                fill="currentColor"
              />
            </svg>
            <span className="hidden sm:block">
              {user?.integrations?.github?.connected
                ? "Unlink Github"
                : "Github"}
            </span>
          </button>

          <button
            onClick={() => {
              setIsShareModalOpen(true);
              fetchShareLinks();
              setGeneratedLink("");
              setExpiryDate("");
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-300 rounded-lg border text-emerald-600 dark:text-[#14b8a6] bg-emerald-500/10 dark:bg-[#14b8a6]/10 hover:bg-emerald-500/20 dark:hover:bg-[#14b8a6]/20 border-emerald-500/30 dark:border-[#14b8a6]/30 hover:shadow-[0_0_12px_rgba(20,184,166,0.25)]"
            title="Share Vault with others"
          >
            <Share2 size={18} />
            <span className="hidden sm:block">Share Vault</span>
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
          className={`w-[280px] shrink-0 bg-white/40 dark:bg-[#020b08]/40 backdrop-blur-3xl border-r border-black/5 dark:border-white/[0.08] flex flex-col absolute md:relative inset-y-0 left-0 z-40 transition-all duration-300 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 ${isDesktopSidebarOpen ? "md:ml-0" : "md:-ml-[280px]"}`}
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

          <div className="px-5 pb-6 border-b border-black/5 dark:border-white/[0.06]">
            <Button
              onClick={() => {
                openUploadModal();
                setIsSidebarOpen(false);
              }}
              className="w-full shadow-lg shadow-[#14b8a6]/25 hover:shadow-xl hover:shadow-[#14b8a6]/30 transition-all duration-300 py-3 rounded-xl text-base font-semibold"
            >
              + New Upload
            </Button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <nav className="space-y-1.5">
              <Link
                to="/dashboard"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive("/dashboard", true)
                    ? "bg-gradient-to-r from-[#14b8a6]/10 to-transparent text-[#14b8a6] border border-[#14b8a6]/20 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <HardDrive
                  size={18}
                  className={
                    isActive("/dashboard", true) ? "text-[#14b8a6]" : ""
                  }
                />
                <span>My Drive</span>
              </Link>
              <Link
                to="/dashboard/shared"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive("/dashboard/shared")
                    ? "bg-gradient-to-r from-[#3b82f6]/10 to-transparent text-[#3b82f6] border border-[#3b82f6]/20 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Users
                  size={18}
                  className={
                    isActive("/dashboard/shared") ? "text-[#3b82f6]" : ""
                  }
                />
                <span>Shared with me</span>
              </Link>
              <Link
                to="/dashboard/recent"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive("/dashboard/recent")
                    ? "bg-gradient-to-r from-[#8b5cf6]/10 to-transparent text-[#8b5cf6] border border-[#8b5cf6]/20 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Clock
                  size={18}
                  className={
                    isActive("/dashboard/recent") ? "text-[#8b5cf6]" : ""
                  }
                />
                <span>Recent</span>
              </Link>
              <Link
                to="/dashboard/starred"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive("/dashboard/starred")
                    ? "bg-gradient-to-r from-[#eab308]/10 to-transparent text-[#eab308] border border-[#eab308]/20 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Star
                  size={18}
                  className={
                    isActive("/dashboard/starred") ? "text-[#eab308]" : ""
                  }
                />
                <span>Starred</span>
              </Link>
              <Link
                to="/dashboard/trash"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive("/dashboard/trash")
                    ? "bg-gradient-to-r from-[#ef4444]/10 to-transparent text-[#ef4444] border border-[#ef4444]/20 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Trash2
                  size={18}
                  className={
                    isActive("/dashboard/trash") ? "text-[#ef4444]" : ""
                  }
                />
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

          {/* Share Drive Modal */}
          {isShareModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsShareModalOpen(false)}
              />
              <div className="relative z-10 w-full max-w-2xl bg-white/95 dark:bg-[#040e0b]/95 backdrop-blur-2xl border border-black/10 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>

                <h2 className="text-2xl font-extrabold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-[#14b8a6] to-[#3b82f6]">
                  Share Vault
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Create a link to grant other users read-only access to all
                  your files in this Vault.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  {/* Left Column: Create Link */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
                      Generate Share Link
                    </h3>

                    <div className="space-y-3 p-4 bg-slate-500/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/[0.04] rounded-2xl">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Expiry Date (Optional)
                        </label>
                        <div className="relative">
                          <Calendar
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            size={16}
                          />
                          <input
                            type="date"
                            value={expiryDate}
                            onClick={(e) => {
                              if ('showPicker' in HTMLInputElement.prototype) {
                                e.target.showPicker();
                              }
                            }}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            min={new Date().toLocaleDateString('en-CA')}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-[#14b8a6]/40 focus:border-[#14b8a6] outline-none transition-all duration-300 dark:[&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Permission Level
                        </label>
                        <select
                          value={selectedPermission}
                          onChange={(e) => {
                            setSelectedPermission(e.target.value);
                            setOwnerAgreed(false);
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-[#14b8a6]/40 focus:border-[#14b8a6] outline-none transition-all duration-300 cursor-pointer"
                        >
                          <option value="read" className="bg-white dark:bg-[#040e0b]">Read Only</option>
                          <option value="write" className="bg-white dark:bg-[#040e0b]">Read & Write</option>
                          <option value="owner" className="bg-white dark:bg-[#040e0b]">Owner (Full Control + Integrations)</option>
                        </select>
                      </div>

                      {/* Warning/Info banners based on selectedPermission */}
                      {selectedPermission === "read" && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-xl flex items-start gap-2.5">
                          <Info size={16} className="shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Read Access</span>
                            Guests can browse and view all local files inside this Vault. No external integrations are shared.
                          </div>
                        </div>
                      )}

                      {selectedPermission === "write" && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-xl flex items-start gap-2.5">
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Read & Write Access</span>
                            Guests can browse, view, create, rename, and delete files inside this local Vault.
                          </div>
                        </div>
                      )}

                      {selectedPermission === "owner" && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex flex-col gap-2 animate-pulse">
                          <div className="flex items-start gap-2.5">
                            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-500" />
                            <div>
                              <span className="font-semibold block text-red-500">Owner Access (High Risk)</span>
                              Warning: This grants full write and delete permissions, and shares active Google Drive & GitHub integrations using your active credentials.
                            </div>
                          </div>
                          <label className="flex items-center gap-2 mt-1 cursor-pointer select-none bg-red-500/5 hover:bg-red-500/10 p-2 rounded-lg border border-red-500/10 transition-colors">
                            <input
                              type="checkbox"
                              checked={ownerAgreed}
                              onChange={(e) => setOwnerAgreed(e.target.checked)}
                              className="rounded border-red-500 text-red-600 focus:ring-red-500/30"
                            />
                            <span className="text-[10px] font-medium text-red-700 dark:text-red-300">
                              I understand the risk and agree to share my external integrations
                            </span>
                          </label>
                        </div>
                      )}

                      <Button
                        onClick={handleCreateShareLink}
                        disabled={generatingLink || (selectedPermission === "owner" && !ownerAgreed)}
                        className="w-full py-2.5 text-sm font-semibold rounded-xl"
                      >
                        {generatingLink ? "Generating..." : "Generate Link"}
                      </Button>
                    </div>

                    {generatedLink && (
                      <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/30 rounded-2xl space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Link Generated!
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={generatedLink}
                            className="flex-1 bg-white dark:bg-black/30 border border-emerald-500/20 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
                          />
                          <button
                            onClick={() => copyToClipboard(generatedLink)}
                            className="p-1.5 bg-[#14b8a6] hover:bg-[#14b8a6]/90 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
                            title="Copy to clipboard"
                          >
                            {copiedLink ? (
                              <span className="text-xs px-1 font-semibold text-emerald-600 dark:text-[#14b8a6]">
                                Copied!
                              </span>
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Manage Links */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
                      Active Share Links ({shareLinks.length})
                    </h3>

                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      {loadingLinks ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          Loading active links...
                        </div>
                      ) : shareLinks.length === 0 ? (
                        <div className="text-center py-8 bg-slate-500/5 dark:bg-white/[0.01] border border-dashed border-black/10 dark:border-white/10 rounded-2xl text-slate-400 text-sm">
                          No active share links.
                        </div>
                      ) : (
                        shareLinks.map((link) => (
                          <div
                            key={link._id}
                            className="flex items-center justify-between p-3.5 bg-slate-500/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/[0.04] rounded-2xl hover:border-black/10 dark:hover:border-white/10 transition-colors"
                          >
                            <div className="overflow-hidden pr-2 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                  Expires:{" "}
                                  {link.expiresAt
                                    ? new Date(
                                        link.expiresAt,
                                      ).toLocaleDateString()
                                    : "Never"}
                                </span>
                                {link.permission && link.permission.length > 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${
                                      link.permission.includes("owner")
                                        ? "bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse"
                                        : link.permission.includes("write")
                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                    }`}
                                  >
                                    {link.permission.includes("owner")
                                      ? "Owner"
                                      : link.permission.includes("write")
                                      ? "Write"
                                      : "Read"}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Created:{" "}
                                {new Date(link.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRevokeShareLink(link._id)}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg text-xs font-semibold transition-all shrink-0"
                              title="Revoke access link"
                            >
                              Revoke
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
