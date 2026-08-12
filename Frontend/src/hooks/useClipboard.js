import { useState, useEffect } from 'react';
import { copyItems, moveItems, batchDelete } from '../api/files.api';
import { SERVER_URL } from '../lib/api';

export function useClipboard({
  folderId,
  fetchFiles,
  specialView,
  ownerId,
  isReadOnly,
  selectedItems,
  setSelectedItems,
  driveFolderId,
  githubPath,
  user,
}) {
  const [clipboard, setClipboard] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("vault_clipboard")) || null;
    } catch {
      return null;
    }
  });

  const updateClipboard = (data) => {
    if (data) {
      sessionStorage.setItem("vault_clipboard", JSON.stringify(data));
    } else {
      sessionStorage.removeItem("vault_clipboard");
    }
    setClipboard(data);
  };

  const handleCopyItem = (item) => {
    if (isReadOnly) return;
    const prepared = {
      action: "copy",
      items: [
        {
          _id: item._id || item.id,
          name: item.name,
          type: item.type || (item.extension ? "file" : "directory"),
          provider: item.provider || "local",
          extension: item.extension || "",
          size: item.size || 0,
          mimeType: item.mimeType || "",
          githubPath: item.githubPath || "",
        },
      ],
    };
    updateClipboard(prepared);
  };

  const handleCutItem = (item) => {
    if (isReadOnly) return;
    const prepared = {
      action: "cut",
      items: [
        {
          _id: item._id || item.id,
          name: item.name,
          type: item.type || (item.extension ? "file" : "directory"),
          provider: item.provider || "local",
          extension: item.extension || "",
          size: item.size || 0,
          mimeType: item.mimeType || "",
          githubPath: item.githubPath || "",
        },
      ],
    };
    updateClipboard(prepared);
  };

  const handleCopySelected = () => {
    if (isReadOnly || selectedItems.length === 0) return;
    const prepared = {
      action: "copy",
      items: selectedItems.map((item) => ({
        _id: item._id || item.id,
        name: item.name,
        type: item.type || (item.extension ? "file" : "directory"),
        provider: item.provider || "local",
        extension: item.extension || "",
        size: item.size || 0,
        mimeType: item.mimeType || "",
        githubPath: item.githubPath || "",
      })),
    };
    updateClipboard(prepared);
    setSelectedItems([]);
  };

  const handleCutSelected = () => {
    if (isReadOnly || selectedItems.length === 0) return;
    const prepared = {
      action: "cut",
      items: selectedItems.map((item) => ({
        _id: item._id || item.id,
        name: item.name,
        type: item.type || (item.extension ? "file" : "directory"),
        provider: item.provider || "local",
        extension: item.extension || "",
        size: item.size || 0,
        mimeType: item.mimeType || "",
        githubPath: item.githubPath || "",
      })),
    };
    updateClipboard(prepared);
    setSelectedItems([]);
  };

  const handlePaste = async () => {
    if (isReadOnly || !clipboard || !clipboard.items || clipboard.items.length === 0) return;

    const targetFolderId = folderId || ""; 
    const ownerParam = ownerId ? `ownerId=${ownerId}` : "";
    const query = ownerParam ? `?${ownerParam}` : "";

    const targetProvider =
      specialView === "google-drive" || specialView === "google-drive-folder"
        ? "google_drive"
        : specialView === "github" || specialView === "github-repo"
          ? "github"
          : "local";

    const sourceProviders = new Set(
      clipboard.items.map((i) => i.provider || "local")
    );

    const requestBody = clipboard.items.map((item) => ({
      _id: item._id,
      name: item.name,
      type: item.type,
      extension: item.extension,
      size: item.size,
    }));

    try {
      // 1. Target is Local Vault
      if (targetProvider === "local") {
        if (sourceProviders.size === 1 && sourceProviders.has("local")) {
          // Local -> Local
          const params = ownerId ? { ownerId } : {};
          if (clipboard.action === "cut") {
            await moveItems(targetFolderId, requestBody, params);
          } else {
            await copyItems(targetFolderId, requestBody, params);
          }
        } else if (sourceProviders.has("google_drive")) {
          // Drive -> Vault
          const destId = targetFolderId || user?.rootDirId;
          const driveItems = clipboard.items.filter((i) => i.provider === "google_drive");
          const res = await fetch(`${SERVER_URL}/drive/transfer-to-vault${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: driveItems.map((i) => ({
                _id: i._id,
                name: i.name,
                mimeType: i.mimeType || "application/octet-stream",
                type: i.type,
              })),
              targetFolderId: destId,
            }),
            credentials: "include",
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || "Failed to transfer from Drive to Vault");
          }

          // If action was cut, delete source items from Google Drive
          if (clipboard.action === "cut") {
            for (const item of driveItems) {
              await fetch(`${SERVER_URL}/drive/file/${item._id}${query}`, {
                method: "DELETE",
                credentials: "include",
              }).catch(() => {});
            }
          }
        }
      }
      // 2. Target is Google Drive
      else if (targetProvider === "google_drive") {
        const destDriveId =
          specialView === "google-drive-folder" && driveFolderId ? driveFolderId : "root";
        if (sourceProviders.size === 1 && sourceProviders.has("google_drive")) {
          // Drive -> Drive
          const res = await fetch(`${SERVER_URL}/drive/move${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: clipboard.items.map((i) => i._id),
              targetId: destDriveId,
            }),
            credentials: "include",
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || "Failed to move Drive items");
          }
        } else {
          // Vault -> Drive
          const localItems = clipboard.items.filter((i) => !i.provider || i.provider === "local");
          const res = await fetch(`${SERVER_URL}/drive/transfer-from-vault${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: localItems.map((i) => ({
                _id: i._id,
                name: i.name,
                extension: i.extension,
                size: i.size,
                type: i.type,
              })),
              targetDriveFolderId: destDriveId,
            }),
            credentials: "include",
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || "Failed to transfer to Google Drive");
          }

          // If action was cut, delete source items from local Vault
          if (clipboard.action === "cut" && localItems.length > 0) {
            await batchDelete(
              localItems.map((i) => ({
                _id: i._id,
                type: i.type || (i.extension ? "file" : "directory"),
              }))
            ).catch((err) => console.error("Failed to delete cut source items:", err));
          }
        }
      }
      // 3. Target is GitHub
      else if (targetProvider === "github") {
        if (!githubPath || specialView !== "github-repo") {
          alert("Please open a GitHub repository and folder before pasting files.");
          return;
        }
        if (sourceProviders.size === 1 && sourceProviders.has("github")) {
          // GitHub -> GitHub
          const res = await fetch(`${SERVER_URL}/github/move${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: clipboard.items,
              targetPath: githubPath,
            }),
            credentials: "include",
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || "Failed to move GitHub items");
          }
        } else {
          // Vault -> GitHub
          const localItems = clipboard.items.filter((i) => !i.provider || i.provider === "local");
          const res = await fetch(`${SERVER_URL}/github/transfer-from-vault${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: localItems.map((i) => ({
                _id: i._id,
                name: i.name,
                extension: i.extension,
                size: i.size,
                type: i.type,
              })),
              targetPath: githubPath,
            }),
            credentials: "include",
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || "Failed to transfer to GitHub");
          }

          // If action was cut, delete source items from local Vault
          if (clipboard.action === "cut" && localItems.length > 0) {
            await batchDelete(
              localItems.map((i) => ({
                _id: i._id,
                type: i.type || (i.extension ? "file" : "directory"),
              }))
            ).catch((err) => console.error("Failed to delete cut source items:", err));
          }
        }
      }

      fetchFiles();

      if (clipboard.action === "cut") {
        updateClipboard(null);
      }

      setSelectedItems([]);
    } catch (err) {
      console.error("Paste failed:", err);
      alert(err.message || "Failed to paste items");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (selectedItems.length > 0) {
          e.preventDefault();
          handleCopySelected();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        if (selectedItems.length > 0) {
          e.preventDefault();
          handleCutSelected();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (clipboard) {
          e.preventDefault();
          handlePaste();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedItems,
    clipboard,
    folderId,
    specialView,
    ownerId,
    driveFolderId,
    githubPath,
    handleCopySelected,
    handleCutSelected,
    handlePaste,
  ]);

  return {
    clipboard,
    updateClipboard,
    handleCopyItem,
    handleCutItem,
    handleCopySelected,
    handleCutSelected,
    handlePaste,
  };
}
