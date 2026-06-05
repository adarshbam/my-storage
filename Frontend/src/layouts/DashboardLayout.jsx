import { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import VaultBackground from "../components/dashboard/VaultBackground";
import CommandBar from "../components/dashboard/CommandBar";
import NavigationRail from "../components/dashboard/NavigationRail";
import TransferManager from "../components/drive/TransferManager";
import FileUploadModal from "../components/drive/FileUploadModal";
import ShareVaultModal from "../components/dashboard/ShareVaultModal";

export default function DashboardLayout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // File actions context
  const transferRef = useRef(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;
    const isLeftSwipe = distance > minSwipeDistance;

    // Swipe from left edge (x < 50) to right
    if (isRightSwipe && touchStart < 50 && !isMobileOpen) {
      setIsMobileOpen(true);
    }

    // Swipe from right to left to close
    if (isLeftSwipe && isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  useEffect(() => {
    fetchRecentSearches();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const q = searchParams.get("q") || searchParams.get("search") || "";
    setGlobalSearchQuery(q);
  }, [location.pathname, location.search]);

  const fetchRecentSearches = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/user/searchedItems`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
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

  const handleSearch = async (term, filters = {}) => {
    const { scope = "current", ext = "", size = "" } = filters;
    const filterQuery = `${ext ? `&ext=${encodeURIComponent(ext)}` : ""}${size ? `&size=${encodeURIComponent(size)}` : ""}`;

    const path = location.pathname;
    const isTrashPage = path.startsWith("/dashboard/trash");

    if (!term.trim() && !ext && !size) {
      setGlobalSearchQuery("");
      setShowRecentSearches(false);
      if (isTrashPage) {
        navigate("/dashboard/trash");
      } else if (currentFolderId) {
        navigate(`/dashboard/folder/${currentFolderId}`);
      } else {
        navigate("/dashboard");
      }
      return;
    }

    setGlobalSearchQuery(term);
    setShowRecentSearches(false);

    const isDriveOrGithub =
      path.startsWith("/dashboard/google-drive") ||
      path.startsWith("/dashboard/github");

    if (scope === "global") {
      navigate(`/dashboard/search?q=${encodeURIComponent(term)}${filterQuery}`);
    } else {
      if (isTrashPage) {
        navigate(
          `/dashboard/trash?q=${encodeURIComponent(term)}${filterQuery}`,
        );
      } else if (isDriveOrGithub) {
        navigate(`${path}?q=${encodeURIComponent(term)}${filterQuery}`);
      } else if (currentFolderId) {
        navigate(
          `/dashboard/folder/${currentFolderId}?search=${encodeURIComponent(term)}${filterQuery}`,
        );
      } else {
        navigate(
          `/dashboard/search?q=${encodeURIComponent(term)}${filterQuery}`,
        );
      }
    }

    setRecentSearches((prev) => {
      const filtered = prev.filter((t) => t !== term);
      const updated = [...filtered, term];
      return updated.slice(-5);
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

  const handleUpload = (files, targetId) => {
    const destination = targetId || currentFolderId;
    if (transferRef.current) {
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      transferRef.current.uploadFiles(fileArray, destination);
    }
  };

  const handleDownload = (url, name) => {
    if (transferRef.current) {
      transferRef.current.downloadFile(url, name);
    }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await fetch(`${SERVER_URL}/user/profilepic`, {
        method: "POST",
        headers: { filename: file.name },
        body: file,
        credentials: "include",
      });

      if (response.ok) {
        const userRes = await fetch(`${SERVER_URL}/user`, {
          credentials: "include",
        });
        if (userRes.ok) {
          const newUser = await userRes.json();
          setUser(newUser);
        }
      }
    } catch (err) {
      console.error("Error uploading profile pic", err);
    }
  };

  const profilePicUrl = user?.profilepic
    ? `${SERVER_URL}/user/profilepic?id=${user.profilepic}`
    : null;

  const contextValue = {
    openUploadModal: () => setShowUploadModal(true),
    openShareModal: () => setIsShareModalOpen(true),
    uploadFile: handleUpload,
    downloadFile: handleDownload,
    currentFolderId,
    setCurrentFolderId,
    refreshTrigger,
    setRefreshTrigger: () => setRefreshTrigger((prev) => prev + 1),
    searchQuery: globalSearchQuery,
    setSearchQuery: setGlobalSearchQuery,
    handleSearch,
    recentSearches,
    showRecentSearches,
    setShowRecentSearches,
    showFilters,
    setShowFilters,
  };

  return (
    <div
      className="h-screen flex flex-col bg-vault-bg text-white overflow-hidden relative font-sans"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
    >
      <VaultBackground />

      <CommandBar
        globalSearchQuery={globalSearchQuery}
        setGlobalSearchQuery={setGlobalSearchQuery}
        handleSearchSubmit={(term, filters) => handleSearch(term, filters)}
        openUploadModal={() => setShowUploadModal(true)}
        openShareModal={() => setIsShareModalOpen(true)}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        handleCreateClick={() => {
          // This should be handled inside VaultViewport if needed,
          // or we emit an event. For now, rely on FileBrowser internal methods.
          // In original DashboardLayout, it was handled in FileBrowser directly
          // but there was a button in DashboardLayout too. Let's just pass a trigger if needed.
          document.dispatchEvent(new CustomEvent("createFolderTrigger"));
        }}
        handleCreateFileClick={() => {
          document.dispatchEvent(new CustomEvent("createFileTrigger"));
        }}
        handleProfilePicUpload={handleProfilePicUpload}
        profilePicUrl={profilePicUrl}
      />

      <div className="flex flex-1 overflow-hidden relative z-10">
        <NavigationRail
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="mx-auto max-w-7xl h-full flex flex-col">
            <Outlet context={contextValue} />
          </div>
          <ShareVaultModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
          />
        </main>
      </div>

      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={(files) => {
          handleUpload(files, currentFolderId);
          setShowUploadModal(false);
        }}
        onFilesSelected={(files) => {
          handleUpload(files, currentFolderId);
          setShowUploadModal(false);
        }}
      />

      <TransferManager ref={transferRef} />
    </div>
  );
}
