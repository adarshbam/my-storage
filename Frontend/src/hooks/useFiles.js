import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDirectoryContents, searchFiles, getStarredItems, getRecentItems } from '../api/files.api';
import { getSharedDrives } from '../api/share.api';
import { getUser } from '../lib/utils';

export function useFiles({ folderId, specialView, isSearch, searchQuery, searchExt, searchSize, ownerId, refreshTrigger, githubPath, driveFolderId, selectedBranch }) {
  const { user, setUser } = useAuth();
  const [data, setData] = useState({ directories: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dirName, setDirName] = useState("Home");
  const [dirPath, setDirPath] = useState("Vault");

  const fetchFiles = async () => {
    // If it's a drive or github view, we'll let useDriveFiles or useGithubFiles handle it,
    // or we can handle it here if it's centralized. 
    // The requirement says extract useFiles for local vault files, search, starred, recent.
    if (specialView === "google-drive" || specialView === "google-drive-folder" || specialView === "github" || specialView === "github-repo") {
      return; // Handled by other hooks
    }

    setLoading(true);
    setError(null);
    try {
      await getUser(setUser);

      let responseData;
      
      const queryParams = {
        ...(ownerId && { ownerId })
      };

      if (specialView === "shared") {
        if (!folderId) {
          const result = await getSharedDrives(queryParams);
          // Simplified logic from original, but original is required. 
          // Recreating EXACT logic for shared drives mapping
          const dirs = [];
          const files = [];

          (result.sharedAccesses || []).forEach((access) => {
            const owner = access.userId;
            if (!owner) return;
            if (!access.items || access.items.length === 0) {
              dirs.push({
                _id: owner.rootDirId,
                name: `${owner.name}'s Drive`,
                type: "directory",
                ownerEmail: owner.email,
                provider: "shared_drive",
                userId: owner._id,
                itemCount: access.itemCount ?? 0,
                items: access.itemCount ?? access.items ?? 0,
                filesCount: access.filesCount ?? 0,
                directoriesCount: access.directoriesCount ?? 0,
                size: access.size ?? 0,
              });
            } else {
              access.items.forEach((item) => {
                const mapped = {
                  _id: item.id,
                  name: item.name,
                  type: item.type,
                  userId: owner._id,
                  provider: item.provider || "local",
                  isShared: true,
                  ownerEmail: owner.email,
                  size: item.size ?? 0,
                  itemCount: item.itemCount ?? 0,
                  items: item.itemCount ?? item.items ?? 0,
                  filesCount: item.filesCount ?? 0,
                  directoriesCount: item.directoriesCount ?? 0,
                  hasThumbnail: item.hasThumbnail,
                  extension: item.extension,
                };
                if (item.type === "directory") {
                  dirs.push(mapped);
                } else {
                  files.push(mapped);
                }
              });
            }
          });
          setData({ directories: dirs, files, parentDir: null, parentId: null });
          setDirName("Shared with me");
          setLoading(false);
          return;
        } else {
          responseData = await getDirectoryContents(folderId, queryParams);
        }
      } else if (specialView === "recent") {
        responseData = await getRecentItems(queryParams);
      } else if (specialView === "starred") {
        responseData = await getStarredItems(queryParams);
      } else if (isSearch) {
        if (!searchQuery && !searchExt && !searchSize) {
          setLoading(false);
          setData({ directories: [], files: [] });
          setDirName("Search");
          return;
        }
        const searchParams = {
          q: searchQuery || "",
          ...(folderId && { parentId: folderId }),
          ...(searchExt && { ext: searchExt }),
          ...(searchSize && { size: searchSize }),
          ...queryParams
        };
        responseData = await searchFiles(searchParams);
      } else {
        responseData = await getDirectoryContents(folderId || "", queryParams);
      }

      let directories = [];
      let files = [];
      if (Array.isArray(responseData)) {
        directories = responseData.filter((item) => item.type === "directory");
        files = responseData.filter((item) => item.type !== "directory");
      } else {
        directories = responseData.directories || [];
        files = responseData.files || [];
      }

      if (specialView === "admin" || specialView === "owner") {
        directories = directories.filter(
          (dir) =>
            dir.provider !== "google_drive" &&
            dir.provider !== "github" &&
            dir.name !== "Google Drive" &&
            dir.name !== "GitHub",
        );
      }

      setData({
        directories,
        files,
        parentDir: responseData.parentDir,
        parentId: responseData.parentId ?? null,
        ownerName: responseData.ownerName || null,
        ownerEmail: responseData.ownerEmail || null,
        userId: responseData.userId || null,
      });

      try {
        const cached = JSON.parse(sessionStorage.getItem("folder_paths") || "{}");
        if (folderId && responseData.name) {
          cached[folderId] = { name: responseData.name, parentId: responseData.parentId || null };
        }
        directories.forEach((d) => {
          cached[d._id] = { name: d.name, parentId: d.parentDir || folderId || null };
        });
        sessionStorage.setItem("folder_paths", JSON.stringify(cached));
      } catch (e) {
        console.error("Path cache error:", e);
      }
      
      setDirPath(responseData.path);
      const isOtherVault =
        specialView === "owner" ||
        specialView === "admin" ||
        (responseData.userId && user?._id && responseData.userId.toString() !== user._id.toString()) ||
        Boolean(ownerId);

      let resolvedName = responseData.name;
      if (
        responseData.name === "Vault" &&
        isOtherVault &&
        responseData.ownerName
      ) {
        resolvedName = `${responseData.ownerName}'s Vault`;
      } else if (!resolvedName) {
        resolvedName =
          (isSearch
            ? `Search: ${searchQuery}`
            : specialView === "shared"
              ? "Secure Relay"
              : specialView === "admin"
                ? "Admin View"
                : specialView === "recent"
                  ? "Activity Pulse"
                  : specialView === "starred"
                    ? "Priority Beacon"
                    : "Home");
      }
      setDirName(resolvedName);
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [folderId, refreshTrigger, isSearch, searchQuery, specialView, ownerId]);

  return { data, setData, loading, error, dirName, dirPath, fetchFiles };
}
