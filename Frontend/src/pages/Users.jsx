import React, { useEffect, useState } from "react";
import { SERVER_URL } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  X,
  Edit2,
  Shield,
  Eye,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [userToEditRole, setUserToEditRole] = useState(null);

  const { user: currentUser } = useAuth();
  const profilePicUrl = currentUser?.profilepic
    ? `${SERVER_URL}/user/profilepic?id=${currentUser.profilepic}`
    : null;

  useEffect(() => {
    fetchUsers();
  }, []);
  console.log(users);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/users`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = async (id) => {
    console.log(id);
    try {
      const res = await fetch(`${SERVER_URL}/users/${id}/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        console.log(`Force logged out user ${id}`);
      }
    } catch (err) {
      console.error("Failed to force logout", err);
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const openEditRoleModal = (user) => {
    setUserToEditRole(user);
    setEditRoleModalOpen(true);
  };

  const closeEditRoleModal = () => {
    setEditRoleModalOpen(false);
    setUserToEditRole(null);
  };

  const handleRoleUpdate = async (newRole, userId) => {
    if (!userToEditRole) return;
    try {
      const res = await fetch(
        `${SERVER_URL}/users/${userToEditRole._id}/role`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole, userId }),
        },
      );
      if (res.ok) {
        console.log(`User ${userToEditRole._id} role updated to: ${newRole}`);
        setUsers(
          users.map((u) =>
            u._id === userToEditRole._id ? { ...u, role: newRole } : u,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to update role", err);
    } finally {
      closeEditRoleModal();
    }
  };

  const handleDelete = async (type) => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`${SERVER_URL}/users/${userToDelete._id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteType: type }),
      });
      if (res.ok) {
        console.log(`User ${userToDelete._id} deleted with type: ${type}`);
        if (type === "soft") {
          setUsers(
            users.map((u) =>
              u._id === userToDelete._id ? { ...u, status: "Deleted" } : u,
            ),
          );
        } else {
          setUsers(users.filter((u) => u._id !== userToDelete._id));
        }
      }
    } catch (err) {
      console.error("Failed to delete user", err);
    } finally {
      closeDeleteModal();
    }
  };

  const handleReactivate = async (id) => {
    try {
      const res = await fetch(`${SERVER_URL}/users/${id}/reactivate`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        console.log(`User ${id} reactivated`);
        setUsers(
          users.map((u) => (u._id === id ? { ...u, status: "OFFLINE" } : u)),
        );
      }
    } catch (err) {
      console.error("Failed to reactivate user", err);
    }
  };

  const getRoleStyle = (role) => {
    switch (role) {
      case "OWNER":
        return "text-purple-500 border-purple-500/30 bg-purple-500/10";
      case "ADMIN":
        return "text-pink-500 border-pink-500/30 bg-pink-500/10";
      case "MANAGER":
        return "text-amber-500 border-amber-500/30 bg-amber-500/10";
      case "USER":
        return "text-[#14b8a6] border-[#14b8a6]/30 bg-[#14b8a6]/10";
      default:
        return "text-gray-500 border-gray-500/30 bg-gray-500/10";
    }
  };

  const getStatusStyle = (status) => {
    if (status === "ONLINE")
      return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
    if (status === "TERMINATED" || status === "Deleted")
      return "text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/10";
    return "text-gray-400 border-gray-400/30 bg-gray-400/10";
  };

  const getDisplayStatus = (u) => {
    if (u.status === "TERMINATED" || u.status === "Deleted")
      return "TERMINATED";
    return u.isLoggedIn ? "ONLINE" : "OFFLINE";
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white p-8 relative overflow-hidden font-sans pt-24">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-[#14b8a6]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="text-center mb-16 pt-8">
          <h1 className="text-5xl font-black mb-4 tracking-tight">
            System{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#a855f7]">
              Users
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            Manage user access and system permissions
          </p>

          {currentUser && (
            <div className="max-w-md mx-auto bg-[#101014] border border-[#3b82f6]/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/10 to-transparent opacity-50 pointer-events-none" />

              <div className="flex items-center gap-5 relative z-10">
                <div className="w-20 h-20 rounded-full overflow-hidden shrink-0 bg-[#3b82f6]/20 flex items-center justify-center border border-[#3b82f6]/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  {profilePicUrl ? (
                    <img
                      src={profilePicUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white select-none">
                      {currentUser?.name?.[0]?.toUpperCase() ||
                        currentUser?.email?.[0]?.toUpperCase() ||
                        "A"}
                    </span>
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-white leading-tight">
                      {currentUser.name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-widest ${getRoleStyle(currentUser.role?.toUpperCase())}`}
                    >
                      {currentUser.role?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    {currentUser.email}
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    Current User
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {users.map((user) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-[#101014] border border-white/5 rounded-2xl p-6 shadow-2xl hover:border-white/10 transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-[#3b82f6]/20 flex items-center justify-center border border-[#3b82f6]/30">
                      {user.profilepic ? (
                        <img
                          src={user.profilepic}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-white select-none">
                          {user?.name?.[0]?.toUpperCase() ||
                            user?.email?.[0]?.toUpperCase() ||
                            "A"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">
                        {user.name}
                      </h3>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 mb-8 relative z-10">
                    <button
                      onClick={() =>
                        user.status !== "TERMINATED" &&
                        user.status !== "Deleted" &&
                        openEditRoleModal(user)
                      }
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border tracking-widest flex items-center gap-1.5 transition-all ${
                        user.status === "TERMINATED" ||
                        user.status === "Deleted"
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:brightness-125"
                      } ${getRoleStyle(user.role)}`}
                      title={
                        user.status === "TERMINATED" ||
                        user.status === "Deleted"
                          ? "Cannot change role of terminated user"
                          : "Change Permission"
                      }
                      disabled={
                        user.status === "TERMINATED" ||
                        user.status === "Deleted"
                      }
                    >
                      {user.role} <Edit2 size={10} />
                    </button>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border tracking-widest ${getStatusStyle(getDisplayStatus(user))}`}
                    >
                      {getDisplayStatus(user)}
                    </span>
                  </div>

                  {user.status === "TERMINATED" || user.status === "Deleted" ? (
                    currentUser?.role?.toUpperCase() === "OWNER" ? (
                      <div className="flex relative z-10">
                        <button
                          onClick={() => handleReactivate(user._id)}
                          className="w-full py-2.5 rounded-xl text-[13px] font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        >
                          Reactivate Account
                        </button>
                      </div>
                    ) : null
                  ) : (
                    <div className="flex gap-3 relative z-10">
                      {(currentUser?.role?.toUpperCase() === "OWNER" ||
                        currentUser?.role?.toUpperCase() === "ADMIN") && (
                        <button
                          onClick={() =>
                            navigate(
                              `/dashboard/${currentUser?.role?.toLowerCase()}/folder/${user.rootDirId}`,
                            )
                          }
                          className="px-3 bg-white/5 hover:bg-[#14b8a6]/10 border border-white/5 hover:border-[#14b8a6]/30 text-gray-300 hover:text-[#14b8a6] rounded-xl transition-all flex items-center justify-center shrink-0"
                          title={`View ${user.name}'s Drive`}
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleForceLogout(user._id)}
                        disabled={!user.isLoggedIn}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-all ${
                          user.isLoggedIn
                            ? "bg-white/5 hover:bg-white/10 border-white/5 text-gray-300 hover:text-white"
                            : "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed opacity-50"
                        }`}
                      >
                        Force Logout
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/20 text-[#ef4444] transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                      >
                        Terminate
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={closeDeleteModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#101014] border border-[#ef4444]/20 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-[#ef4444]/10 flex items-center justify-center mb-4 border border-[#ef4444]/20">
                  <ShieldAlert className="text-[#ef4444]" size={24} />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  Terminate User?
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                  You are about to terminate{" "}
                  <span className="text-white font-semibold">
                    {userToDelete?.name}
                  </span>
                  . Choose how you want to proceed with this action.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => handleDelete("soft")}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all group"
                  >
                    <div className="text-left">
                      <div className="text-amber-500 text-sm font-bold mb-1 tracking-wide">
                        Soft Delete
                      </div>
                      <div className="text-xs text-amber-500/70 group-hover:text-amber-500/90">
                        Deactivates account but keeps data intact
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDelete("hard")}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 hover:bg-[#ef4444]/10 transition-all group"
                  >
                    <div className="text-left">
                      <div className="text-[#ef4444] text-sm font-bold flex items-center gap-2 mb-1 tracking-wide">
                        <AlertTriangle size={14} /> Hard Delete
                      </div>
                      <div className="text-xs text-[#ef4444]/70 group-hover:text-[#ef4444]/90">
                        Permanently removes account and all associated data
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-black/20 p-4 flex justify-end">
                <button
                  onClick={closeDeleteModal}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editRoleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={closeEditRoleModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#101014] border border-[#3b82f6]/20 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-[#3b82f6]/10 flex items-center justify-center mb-4 border border-[#3b82f6]/20">
                  <Shield className="text-[#3b82f6]" size={24} />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  Change Permission
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                  Select a new role for{" "}
                  <span className="text-white font-semibold">
                    {userToEditRole?.name}
                  </span>
                  . Hierarchy is: Owner &rarr; Admin &rarr; Manager &rarr; User.
                </p>

                <div className="space-y-3">
                  {(userToEditRole?.yourAuthority || []).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleUpdate(role, userToEditRole._id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group ${
                        userToEditRole?.role === role
                          ? "border-[#3b82f6]/50 bg-[#3b82f6]/10"
                          : "border-white/5 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-left">
                        <div
                          className={`text-sm font-bold tracking-wide flex items-center gap-2 ${userToEditRole?.role === role ? "text-[#3b82f6]" : "text-gray-300 group-hover:text-white"}`}
                        >
                          {role.toUpperCase()}{" "}
                          {userToEditRole?.role === role && "(Current)"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-black/20 p-4 flex justify-end">
                <button
                  onClick={closeEditRoleModal}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
