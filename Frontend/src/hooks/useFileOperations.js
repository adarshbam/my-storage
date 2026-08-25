import { useState, useRef, useEffect } from 'react';
import { renameDirectory, createDirectory, renameFile, deleteFile, deleteDirectory, batchDelete, toggleStar } from '../api/files.api';

export function useFileOperations({ fetchFiles, folderId, specialView, ownerId, data, setData }) {
  const [modalType, setModalType] = useState(null); 
  const [modalItem, setModalItem] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [selectedExt, setSelectedExt] = useState(".txt");
  const [newFileContent, setNewFileContent] = useState("");
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [isCreateFullscreen, setIsCreateFullscreen] = useState(false);
  const createModalRef = useRef(null);

  const toggleCreateFullscreen = () => {
    if (!document.fullscreenElement) {
      createModalRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsCreateFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const handleRenameClick = (item) => {
    setModalItem(item);
    setModalInput(item.name);
    setModalType("rename");
  };

  const handleCreateClick = () => {
    setModalInput("");
    setModalType("create");
  };

  const handleStarred = async (item) => {
    try {
      const type = item.type || (item.extension ? "file" : "directory");
      const provider =
        item.provider ||
        (specialView?.includes("google-drive")
          ? "google_drive"
          : specialView?.includes("github")
          ? "github"
          : "local");
      const metaUrl =
        item.metaUrl ||
        item.webViewLink ||
        item.html_url ||
        item.url ||
        item.download_url ||
        "";

      const rawId = item._id || item.id || item.githubPath;
      const resData = await toggleStar(rawId, {
        itemId: rawId,
        type,
        provider,
        name: item.name,
        size: item.size || 0,
        mimeType: item.mimeType || "",
        metaUrl,
        githubPath: item.githubPath || "",
      });

      setData((prev) => {
        const isStarred = resData.starred;
        if (specialView === "starred" && !isStarred) {
          return {
            directories: prev.directories.filter(
              (i) => i._id !== item._id && i.githubPath !== item.githubPath
            ),
            files: prev.files.filter(
              (i) => i._id !== item._id && i.githubPath !== item.githubPath
            ),
          };
        }
        const updateItem = (i) =>
          i._id === item._id || (i.githubPath && i.githubPath === item.githubPath)
            ? { ...i, isStarred: isStarred, starred: isStarred }
            : i;
        return {
          directories: prev.directories.map(updateItem),
          files: prev.files.map(updateItem),
        };
      });
    } catch (error) {
      console.error(error);
    }
  };

  return {
    modalType, setModalType,
    modalItem, setModalItem,
    modalInput, setModalInput,
    selectedExt, setSelectedExt,
    newFileContent, setNewFileContent,
    isPermanentDelete, setIsPermanentDelete,
    isCreateFullscreen,
    createModalRef,
    toggleCreateFullscreen,
    handleRenameClick,
    handleCreateClick,
    handleStarred
  };
}
