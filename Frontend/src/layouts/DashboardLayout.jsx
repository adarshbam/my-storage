import { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import { getProfilePicUrl } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { usePlan } from "../context/PlanContext";
import VaultBackground from "../components/dashboard/VaultBackground";
import CommandBar from "../components/dashboard/CommandBar";
import NavigationRail from "../components/dashboard/NavigationRail";
import TransferManager from "../components/drive/TransferManager";
import FileUploadModal from "../components/drive/FileUploadModal";
import ShareVaultModal from "../components/dashboard/ShareVaultModal";
import SubscriptionRequiredModal from "../components/dashboard/SubscriptionRequiredModal";
import { ChamberTransferProvider } from "../context/ChamberTransferContext";

export default function DashboardLayout() {
  const { user, setUser } = useAuth();
  const {
    maxStorage: planMaxStorage,
    isNoPlan,
    isNoSubscription,
    allowUpload,
    canUseFreeTrial,
  } = usePlan();
  const hasNoActivePlan = isNoPlan || isNoSubscription || allowUpload === false;
  const effectiveMaxStorage = planMaxStorage ?? user?.maxStorage ?? 5368709120;
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareItems, setShareItems] = useState([]);
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

  useEffect(() => {
    fetchRecentSearches();
  }, []);

  useEffect(() => {
    const handleVaultRefresh = () => {
      setRefreshTrigger((prev) => prev + 1);
    };
    window.addEventListener("vault:refresh", handleVaultRefresh);
    return () => window.removeEventListener("vault:refresh", handleVaultRefresh);
  }, []);

  useEffect(() => {
    const handleGlobalShortcut = (e) => {
      const { actionId } = e.detail || {};
      if (!actionId) return;

      switch (actionId) {
        case "new_folder":
          document.dispatchEvent(new CustomEvent("createFolderTrigger"));
          break;
        case "new_file":
          document.dispatchEvent(new CustomEvent("createFileTrigger"));
          break;
        case "upload_file":
          if (user && user.usedStorage >= effectiveMaxStorage) {
            alert("Not enough storage");
          } else {
            setShowUploadModal(true);
          }
          break;
        case "share_vault":
          setIsShareModalOpen(true);
          break;
        case "go_chamber":
          navigate("/dashboard");
          break;
        case "go_shared":
          navigate("/dashboard/shared");
          break;
        case "go_recent":
          navigate("/dashboard/recent");
          break;
        case "go_starred":
          navigate("/dashboard/starred");
          break;
        case "go_trash":
          navigate("/dashboard/trash");
          break;
        case "go_drive":
          navigate("/dashboard/google-drive");
          break;
        case "go_github":
          navigate("/dashboard/github");
          break;
        case "go_profile":
          navigate("/profile");
          break;
        case "go_billing":
          navigate("/dashboard/billing");
          break;
        case "go_tutorials":
          navigate("/dashboard/tutorials");
          break;
        case "go_owner_settings":
          navigate("/owner/settings");
          break;
        case "go_user_management":
          navigate("/users");
          break;
        default:
          break;
      }
    };

    window.addEventListener("vault:shortcut", handleGlobalShortcut);
    return () => window.removeEventListener("vault:shortcut", handleGlobalShortcut);
  }, [user, effectiveMaxStorage, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const q = searchParams.get("q") || searchParams.get("search") || "";
    setGlobalSearchQuery(q);
  }, [location.pathname, location.search]);

  const handleSearch = async (term, filters = {}) => {
    const { scope = "current", ext = "", size = "" } = filters;
    const filterQuery = `${ext ? `&ext=${encodeURIComponent(ext)}` : ""}${size ? `&size=${encodeURIComponent(size)}` : ""}`;

    const path = location.pathname;
    const isTrashPage = path.startsWith("/dashboard/trash");

    const isDriveOrGithub =
      path.startsWith("/dashboard/google-drive") ||
      path.startsWith("/dashboard/github");

    if (!term.trim() && !ext && !size) {
      setGlobalSearchQuery("");
      setShowRecentSearches(false);
      if (isTrashPage) {
        navigate("/dashboard/trash");
      } else if (isDriveOrGithub) {
        const currentParams = new URLSearchParams(location.search);
        currentParams.delete("q");
        currentParams.delete("search");
        currentParams.delete("ext");
        currentParams.delete("size");
        const remainingQuery = currentParams.toString();
        navigate(`${location.pathname}${remainingQuery ? `?${remainingQuery}` : ""}`);
      } else if (currentFolderId) {
        navigate(`/dashboard/folder/${currentFolderId}`);
      } else {
        navigate("/dashboard");
      }
      return;
    }

    setGlobalSearchQuery(term);
    setShowRecentSearches(false);

    if (scope === "global") {
      navigate(`/dashboard/search?q=${encodeURIComponent(term)}${filterQuery}`);
    } else {
      if (isTrashPage) {
        navigate(
          `/dashboard/trash?q=${encodeURIComponent(term)}${filterQuery}`,
        );
      } else if (isDriveOrGithub) {
        const currentParams = new URLSearchParams(location.search);
        currentParams.set("q", term);
        if (ext) currentParams.set("ext", ext); else currentParams.delete("ext");
        if (size) currentParams.set("size", size); else currentParams.delete("size");
        navigate(`${path}?${currentParams.toString()}`);
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

  useEffect(() => {
    const handlePrompt = () => setShowSubscriptionModal(true);
    window.addEventListener("subscription:prompt", handlePrompt);
    return () => window.removeEventListener("subscription:prompt", handlePrompt);
  }, []);

  const handleUpload = (files, targetId) => {
    if (hasNoActivePlan) {
      setShowSubscriptionModal(true);
      return;
    }
    if (user && user.usedStorage >= effectiveMaxStorage) {
      alert("Not enough storage");
      return;
    }
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
        headers: { filename: encodeURIComponent(file.name) },
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
          window.dispatchEvent(new CustomEvent("auth:refresh"));
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error("Failed to upload profile picture:", errData);
      }
    } catch (err) {
      console.error("Error uploading profile pic", err);
    }
  };

  const profilePicUrl = getProfilePicUrl(user?.profilepic);

  const contextValue = {
    openUploadModal: () => {
      if (hasNoActivePlan) {
        setShowSubscriptionModal(true);
        return;
      }
      if (user && user.usedStorage >= effectiveMaxStorage) {
        alert("Not enough storage");
        return;
      }
      setShowUploadModal(true);
    },
    openShareModal: (items = []) => {
      setShareItems(items ? (Array.isArray(items) ? items : [items]) : []);
      setIsShareModalOpen(true);
    },
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
    <ChamberTransferProvider user={user} effectiveMaxStorage={effectiveMaxStorage}>
      <div
        className="h-[100dvh] flex flex-col bg-vault-bg text-white overflow-hidden relative font-sans"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <VaultBackground />

        <CommandBar
          globalSearchQuery={globalSearchQuery}
          setGlobalSearchQuery={setGlobalSearchQuery}
          handleSearchSubmit={(term, filters) => handleSearch(term, filters)}
          openUploadModal={() => {
            if (user && user.usedStorage >= effectiveMaxStorage) {
              alert("Not enough storage");
              return;
            }
            setShowUploadModal(true);
          }}
          openShareModal={() => setIsShareModalOpen(true)}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          handleCreateClick={() => {
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

          <main className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden relative p-3 sm:p-6 lg:p-8 custom-scrollbar">
            <div className="mx-auto max-w-7xl min-w-0 w-full min-h-full flex flex-col">
              <Outlet context={contextValue} />
            </div>
            <ShareVaultModal
              isOpen={isShareModalOpen}
              onClose={() => {
                setIsShareModalOpen(false);
                setShareItems([]);
              }}
              items={shareItems}
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

        <SubscriptionRequiredModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />

        <TransferManager ref={transferRef} onUploadComplete={() => setRefreshTrigger(prev => prev + 1)} />
      </div>
    </ChamberTransferProvider>
  );
}
