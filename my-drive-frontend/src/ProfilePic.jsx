import { useState, useRef } from "react";
import { SERVER_URL } from "./api";
import "./ProfilePic.css";

const ProfilePic = ({ isOpen, onClose, refreshUser, showToast }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const inputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const response = await fetch(`${SERVER_URL}/user/profilepic`, {
        method: "POST",
        headers: {
          filename: file.name,
        },
        credentials: "include",
        body: file, // streaming binary
      });

      if (response.ok) {
        // Success
        setFile(null);
        refreshUser(); // Update navbar user state
        onClose();
        if (showToast)
          showToast("Profile picture updated successfully", "success");
      } else {
        if (showToast) showToast("Failed to upload profile picture", "error");
      }
    } catch (error) {
      console.error("Error uploading profile pic:", error);
      if (showToast) showToast("Error uploading profile picture", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Profile Picture</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div
          className={`drop-zone ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="file-input"
            onChange={handleChange}
            accept="image/*"
            hidden
          />
          {file ? (
            <div className="file-preview">
              <p>Selected: {file.name}</p>
              <button
                className="remove-file-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="upload-placeholder">
              <span className="upload-icon">☁️</span>
              <p>
                Drag & Drop your image here or <span>Browse</span>
              </p>
              <p className="upload-hint">Supports: JPG, PNG, WEBP</p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            className="upload-submit-btn"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePic;
