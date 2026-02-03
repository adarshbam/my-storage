import { useParams } from "react-router-dom";
import ItemsList from "./ItemsList"; // Unified component
import { useEffect, useState } from "react";
import "./trashview.css";
import { SERVER_URL } from "./api";

const TrashView = () => {
  const [directoriesList, setDirectoriesList] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [isDirectoryEmpty, setIsDirectoryEmpty] = useState(false);
  const params = useParams();
  const dirId = params["dirId"];

  function getTrash() {
    const fetchData = async () => {
      const folderStructure = await fetch(`${SERVER_URL}/trash`, {
        credentials: "include",
      });

      const data = await folderStructure.json();
      console.log(data);
      setDirectoriesList(
        data?.filter((item) => item.type === "directory") || [],
      );

      setFilesList(data?.filter((item) => item.type === "file") || []);
      setIsDirectoryEmpty(data?.length === 0);
      return data;
    };
    fetchData();
  }

  function restoreDir(dir) {
    const fetchData = async () => {
      const folderStructure = await fetch(
        `${SERVER_URL}/trash/directory/${dir.id}/restore`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      const data = await folderStructure.text();
      console.log(data);
      getTrash();
      return data;
    };
    fetchData();
  }

  function restoreFile(file) {
    const fetchData = async () => {
      const folderStructure = await fetch(
        `${SERVER_URL}/trash/${file.id}/restore`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      const data = await folderStructure.text();
      console.log(data);
      getTrash();
      return data;
    };
    fetchData();
  }

  function deleteDir(dir) {
    const fetchData = async () => {
      const folderStructure = await fetch(
        `${SERVER_URL}/trash/directory/${dir.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await folderStructure.text();
      console.log(data);
      getTrash();
      return data;
    };
    fetchData();
  }

  function deleteFile(file) {
    const fetchData = async () => {
      const folderStructure = await fetch(`${SERVER_URL}/trash/${file.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await folderStructure.text();
      console.log(data);
      getTrash();
      return data;
    };
    fetchData();
  }

  useEffect(() => {
    getTrash();
  }, [dirId]);

  return (
    <div className="directory-container">
      <div className="directory-view trash-view">
        <h1>Trash Files and Folders</h1>

        {directoriesList.length > 0 && (
          <ItemsList
            items={directoriesList}
            type="directory"
            serverUrl={SERVER_URL}
            onRestore={restoreDir}
            onDelete={deleteDir}
          />
        )}

        {filesList.length > 0 && (
          <ItemsList
            items={filesList}
            type="file"
            serverUrl={SERVER_URL}
            onRestore={restoreFile}
            onDelete={deleteFile}
            // No custom download or rename in Trash
          />
        )}

        {isDirectoryEmpty && <p>No files or directories found.</p>}
      </div>
    </div>
  );
};

export default TrashView;
