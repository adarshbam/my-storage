import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "./api";
import "./UserMenu.css";
import ProfilePic from "./ProfilePic";
import Toast from "./Toast";

const UserMenu = ({ user, refreshUser }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/user/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        // alert("Logged out successfully");
        navigate("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
      <div className="user-menu-container">
        <div className="user-icon-wrapper">
          <img
            src={
              user?.profilepic ? `${SERVER_URL}/user/profilepic` : "/user.png"
            }
            alt="User"
            className="user-avatar"
            onError={(e) => (e.target.src = "/user.png")}
          />
        </div>
        <div className="dropdown-menu">
          <div className="user-details-wrapper">
            <button
              title="Edit Profile Picture"
              className="edit-profile-btn"
              onClick={() => setIsModalOpen(true)}
            >
              <div className="user-avatar-small-wrapper">
                <img
                  src={
                    user?.profilepic
                      ? `${SERVER_URL}/user/profilepic`
                      : "/user.png"
                  }
                  alt="User"
                  className="user-avatar-small"
                  onError={(e) => (e.target.src = "/user.png")}
                />
                <span className="edit-icon">+</span>
              </div>
            </button>
            <div className="user-details">
              <p className="user-name">{user?.name || "User"}</p>
              <p className="user-email">{user?.email || ""}</p>
            </div>
          </div>
          <div className="menu-divider"></div>
          <button onClick={handleLogout} className="menu-item logout-btn">
            <span className="icon">↳</span> Logout
          </button>
        </div>
      </div>
      <ProfilePic
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        refreshUser={refreshUser}
        showToast={showToast}
      />
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}
    </>
  );
};

export default UserMenu;
