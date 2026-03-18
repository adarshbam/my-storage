import { useRef, useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Cloud, Folder, Trash2, LogOut, Search, Settings, Menu, X } from "lucide-react";
import Button from "../components/ui/Button";
import TransferManager from "../components/drive/TransferManager";
import FileUploadModal from "../components/drive/FileUploadModal";

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

    if (currentFolderId) {
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
    ? `${SERVER_URL}/user/profilepic?t=${Date.now()}` // Bust cache
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300 relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-50 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="p-6 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2" onClick={() => setIsSidebarOpen(false)}>
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Cloud className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
              Storifyy
            </span>
          </Link>
          <button
            className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1">
          <Button
            onClick={() => {
              openUploadModal();
              setIsSidebarOpen(false);
            }}
            className="w-full shadow-lg shadow-blue-500/20"
          >
            + New Upload
          </Button>

          <nav className="space-y-1 mt-6">
            <Link
              to="/dashboard"
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Folder size={18} />
              <span>My Drive</span>
            </Link>
            <Link
              to="/dashboard/trash"
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              <span>Trash</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div
              className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold overflow-hidden cursor-pointer relative group border-2 border-white dark:border-slate-800 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              onClick={() => fileInputRef.current?.click()}
            >
              <img
                src={profilePicUrl || "/profile.png"}
                alt="Profile"
                className="w-full h-full object-cover"
                crossOrigin="use-credentials"
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
      <main className="flex-1 md:ml-64 p-4 md:p-8 flex flex-col min-h-screen overflow-x-hidden">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 gap-4">
          <button
            className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="relative flex-1 md:w-96 md:flex-none group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer z-10"
              size={18}
              onClick={() => handleSearch(searchQuery)}
            />
            <input
              type="text"
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (!val) {
                  handleSearch("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(searchQuery);
              }}
              onFocus={() => setShowRecentSearches(true)}
              onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
            />
            {showRecentSearches && recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 overflow-hidden">
                <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                  Recent Searches
                </div>
                {recentSearches.map((term, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                    onClick={() => handleSearch(term)}
                  >
                    <Search size={14} className="text-slate-400" />
                    {term}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        <Outlet
          context={{
            openUploadModal,
            uploadFile: handleUpload,
            downloadFile: handleDownload,
            setCurrentFolderId,
            refreshTrigger,
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
  );
}
