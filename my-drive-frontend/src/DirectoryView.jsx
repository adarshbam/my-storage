import { useEffect, useState, useRef } from "react";
import "./directoryview.css";
import ItemsList from "./ItemsList";
import { useParams } from "react-router-dom";
import { SERVER_URL } from "./api";
import { getUser, joinUrl } from "./utils";
import { useNavigate } from "react-router-dom";
import TransferMenu from "./TransferMenu";
import FileUploadModal from "./FileUploadModal";

const DirectoryView = () => {
  const [directoryName, setDirectoryName] = useState("Root");
  const [directoriesList, setDirectoriesList] = useState([]);
  const [parentDirId, setParentDirId] = useState(null);
  const [filesList, setFilesList] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isDirectoryEmpty, setIsDirectoryEmpty] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [user, setUser] = useState();

  // Selection Logic
  const [selectedItems, setSelectedItems] = useState([]);

  function toggleSelection(item) {
    if (selectedItems.some((i) => i.id === item.id)) {
      // Deselect
      setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      // Select
      setSelectedItems((prev) => [...prev, item]);
    }
  }

  const params = useParams();
  const dirId = params["dirId"];
  const navigate = useNavigate();

  const transferRef = useRef(null);

  function getFiles() {
    const fetchData = async () => {
      const folderStructure = await fetch(
        joinUrl(SERVER_URL, "directory", dirId || ""),
        { credentials: "include" },
      );

      if (!folderStructure.ok) {
        navigate("/login");
        return;
      }
      const data = await folderStructure.json();
      console.log(data);

      setDirectoryName(data?.name);
      setDirectoriesList(data?.directories);
      setParentDirId(data?.parentDir);

      setFilesList(data?.files);
      setIsDirectoryEmpty(
        data?.directories?.length === 0 && data?.files?.length === 0,
      );
      return data;
    };
    fetchData();
  }

  useEffect(() => {
    getUser(setUser);
  }, []);

  useEffect(() => {
    getFiles();
    console.log(user);
  }, [dirId]);

  async function handleModalUpload(files) {
    for (const file of files) {
      await transferRef.current.uploadFile(file, dirId);
    }
    getFiles();
  }

  async function createFolder() {
    if (!inputValue) {
      alert("Please enter a folder name");
      return;
    }

    const res = await fetch(SERVER_URL + `/directory/${dirId || ""}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        foldername: inputValue,
      }),
    });
    const data = await res.text();
    console.log(data);
    getFiles();
    setInputValue("");
  }

  function deleteSelectedItems() {
    console.log(selectedItems);
    selectedItems.forEach((item) => {
      handleDelete(item.id, item.type);
    });
    setSelectedItems([]);
    getFiles();
  }

  // --- Unified Handlers ---

  async function handleRename(itemId, type) {
    if (!inputValue) {
      alert("Please enter a new name in the input field.");
      return;
    }
    const endpoint = type === "directory" ? "directory" : "file";
    const bodyKey = type === "directory" ? "newDirName" : "newFileName";

    const res = await fetch(`${SERVER_URL}/${endpoint}/${itemId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [bodyKey]: inputValue }),
    });
    const data = await res.text();
    console.log(data);
    getFiles();
    setInputValue("");
  }

  async function handleDelete(itemId, type) {
    const endpoint = type === "directory" ? "directory" : "file";
    const res = await fetch(`${SERVER_URL}/${endpoint}/${itemId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.text();
    console.log(data);
    getFiles();
  }

  // -------------------------

  function downloadDirectoryHandler(dir) {
    transferRef.current.downloadFile(
      `${SERVER_URL}/directory/${dir.id}?action=download`,
      `${dir.name}.zip`,
    );
  }

  function downloadFileHandler(file) {
    transferRef.current.downloadFile(
      `${SERVER_URL}/file/${file.id}?action=download`,
      file.name,
    );
  }

  // --- Drag and Drop Handlers ---

  function handleDragStart(e, item) {
    e.dataTransfer.setData("draggedData", JSON.stringify(item));
  }

  function handleDragOver(e, itemId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e, targetId) {
    e.preventDefault();
    e.stopPropagation();
    const draggedItem = JSON.parse(e.dataTransfer.getData("draggedData"));
    if (targetId === draggedItem.id) {
      return;
    }
    let draggedItems;
    if (selectedItems.length !== 0) {
      draggedItems = selectedItems;
    } else {
      draggedItems = [draggedItem];
      console.log(draggedItems);
    }
    console.log(draggedItems, targetId);
    const res = await fetch(`${SERVER_URL}/directory/${targetId}/move`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draggedItems),
    });
    const data = await res.json();
    console.log(data);
    if (res.ok) {
      getFiles();
    }
  }

  return (
    <div className="directory-container">
      <div className="directory-view">
        <div className="directory-header">
          <h1 className="directory-title">
            {dirId && (
              <button
                className="back-btn"
                onClick={() =>
                  navigate(parentDirId ? `/directory/${parentDirId}` : "/")
                }
                title="Go Back"
                onDrop={(e) => handleDrop(e, parentDirId)}
                onDragOver={(e) => handleDragOver(e, parentDirId)}
              >
                <img src="/features/return.png" alt="Back" />
              </button>
            )}
            <span
              onDrop={(e) => handleDrop(e, dirId)}
              onDragOver={(e) => handleDragOver(e, dirId)}
            >
              {directoryName}
            </span>
            <button
              className="rename-root-btn"
              onClick={() => handleRename(user.rootDirectoryId, "directory")}
              title="Rename Folder"
            >
              <img src="/features/edit.png" alt="Rename" />
            </button>
          </h1>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <button
              className="create-folder-btn folder-icon-wrapper"
              onClick={deleteSelectedItems}
              title="Delete Selected Items"
            >
              <div style={{ width: "28px", height: "28px" }}>
                <img src="/features/delete.png" alt="Delete" />
              </div>
            </button>
            <button
              className="create-folder-btn folder-icon-wrapper"
              onClick={createFolder}
              title="Create New Folder"
            >
              <img src="/folder.png" alt="Create Folder" />
              <span className="plus-badge">+</span>
            </button>
          </div>
        </div>
        <div className="upload-files">
          <button
            className="upload-trigger"
            onClick={() => setIsUploadModalOpen(true)}
            title="Upload files"
          >
            Upload Files
            <img src="/features/upload.png" alt="Upload" />
          </button>
        </div>
        <input
          type="text"
          id="inputValue"
          onChange={(e) => setInputValue(e.target.value)}
          value={inputValue}
          placeholder="New folder name / Rename value"
        />

        {isDirectoryEmpty && <p>No files or directories found.</p>}

        {directoriesList?.length > 0 && (
          <ItemsList
            items={directoriesList}
            type="directory"
            serverUrl={SERVER_URL}
            selectedItems={selectedItems}
            onToggleSelection={toggleSelection}
            onDownload={downloadDirectoryHandler}
            onRename={(item) => handleRename(item.id, "directory")}
            onDelete={(item) => handleDelete(item.id, "directory")}
            onDragStart={(e, item) => handleDragStart(e, item)}
            onDragOver={(e, item) => handleDragOver(e, item.id)}
            onDrop={(e, item) => handleDrop(e, item.id)}
          />
        )}

        {filesList?.length > 0 && (
          <ItemsList
            items={filesList}
            type="file"
            serverUrl={SERVER_URL}
            selectedItems={selectedItems}
            onToggleSelection={toggleSelection}
            onRename={(item) => handleRename(item.id, "file")}
            onDelete={(item) => handleDelete(item.id, "file")}
            onDownload={downloadFileHandler}
            onDragStart={(e, item) => handleDragStart(e, item)}
            onDragOver={(e, item) => handleDragOver(e, item.id)}
          />
        )}
      </div>
      <TransferMenu ref={transferRef} />
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleModalUpload}
      />
    </div>
  );
};

export default DirectoryView;
