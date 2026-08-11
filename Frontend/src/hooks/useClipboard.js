import { useState, useEffect } from 'react';
import { copyItems, moveItems } from '../api/files.api';

export function useClipboard({ folderId, fetchFiles, specialView, ownerId, isReadOnly, selectedItems, setSelectedItems }) {
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
          _id: item._id,
          name: item.name,
          type: item.type || (item.extension ? "file" : "directory"),
          provider: item.provider || "local",
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
          _id: item._id,
          name: item.name,
          type: item.type || (item.extension ? "file" : "directory"),
          provider: item.provider || "local",
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
        _id: item._id,
        name: item.name,
        type: item.type || (item.extension ? "file" : "directory"),
        provider: item.provider || "local",
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
        _id: item._id,
        name: item.name,
        type: item.type || (item.extension ? "file" : "directory"),
        provider: item.provider || "local",
      })),
    };
    updateClipboard(prepared);
    setSelectedItems([]);
  };

  const handlePaste = async () => {
    if (isReadOnly || !clipboard || clipboard.items.length === 0) return;

    const targetFolderId = folderId || ""; 
    const ownerParam = ownerId ? `ownerId=${ownerId}` : "";

    const targetProvider =
      specialView === "google-drive" || specialView === "google-drive-folder"
        ? "google_drive"
        : specialView === "github" || specialView === "github-repo"
          ? "github"
          : "local";

    if (targetProvider !== "local") {
      alert("Copy/Paste is only supported in the local Vault.");
      return;
    }

    try {
      const requestBody = clipboard.items.map((item) => ({
        id: item._id,
        type: item.type,
      }));

      // In original code this was done directly to /directory/:targetFolderId/move or copy. We can use the api services.
      // Move/copy logic using API Client
      if (clipboard.action === "cut") {
        await moveItems(`${targetFolderId}${ownerParam ? '?' + ownerParam : ''}`, requestBody);
      } else {
        await copyItems(`${targetFolderId}${ownerParam ? '?' + ownerParam : ''}`, requestBody);
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
  }, [selectedItems, clipboard, folderId, specialView, ownerId, handleCopySelected, handleCutSelected, handlePaste]);

  return {
    clipboard,
    updateClipboard,
    handleCopyItem,
    handleCutItem,
    handleCopySelected,
    handleCutSelected,
    handlePaste
  };
}
