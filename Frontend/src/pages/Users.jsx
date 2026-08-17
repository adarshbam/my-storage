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
  Users as UsersIcon,
  RefreshCw,
  Zap,
  CheckCircle2,
  ArrowLeft,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Skeleton from "../components/ui/Skeleton";

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [userToEditRole, setUserToEditRole] = useState(null);

  const { user: currentUser, loading: authLoading } = useAuth();
  const profilePicUrl = currentUser?.profilepic
    ? `${SERVER_URL}/user/profilepic?id=${currentUser.profilepic}`
    : null;

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        navigate("/login");
      } else if (currentUser.role?.toUpperCase() === "USER") {
        navigate("/dashboard");
      } else {
        fetchUsers();
      }
    }
  }, [currentUser, authLoading, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
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
    try {
      const res = await fetch(`${SERVER_URL}/users/${id}/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        console.log(`Force logged out user ${id}`);
        setUsers(
          users.map((u) => (u._id === id ? { ...u, isLoggedIn: false } : u))
        );
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

  const getRoleBadgeStyle = (role) => {
    switch (role?.toUpperCase()) {
      case "OWNER":
        return "bg-purple-500/10 text-purple-300 border-purple-500/30";
      case "ADMIN":
        return "bg-rose-500/10 text-rose-300 border-rose-500/30";
      case "MANAGER":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "USER":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-white/5 text-white/50 border-white/10";
    }
  };

  const getStatusBadgeStyle = (status) => {
    if (status === "ONLINE")
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (status === "TERMINATED" || status === "Deleted")
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    return "bg-white/5 text-white/50 border-white/10";
  };

  const getDisplayStatus = (u) => {
    if (u.status === "TERMINATED" || u.status === "Deleted")
      return "TERMINATED";
    return u.isLoggedIn ? "ONLINE" : "OFFLINE";
  };

  return (
    <div className="min-h-screen bg-vault-bg text-slate-900 dark:text-white p-6 sm:p-8 relative overflow-hidden font-sans pt-20 pb-24">
      {/* Subtle Atmospheric Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-accent-primary/10 via-accent-soft/5 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 -right-48 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        {/* Navigation Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
              title="Return to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">
                <UsersIcon size={14} /> Vault System Administration
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                System Users
              </h1>
              <p className="text-white/50 text-sm font-medium mt-1">
                Manage user access, role permissions, and active session controls.
              </p>
            </div>
          </div>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh List</span>
          </button>
        </div>

        {/* ── CURRENT USER / OWNER HIGHLIGHT CARD ── */}
        {currentUser && (
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-vault-surface via-slate-900 to-slate-950 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)] relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-5 relative z-10 w-full sm:w-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt={currentUser.name || "Profile"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 select-none">
                    {currentUser?.name?.[0]?.toUpperCase() ||
                      currentUser?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {currentUser.name}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeStyle(
                      currentUser.role
                    )}`}
                  >
                    {currentUser.role?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white/50 font-medium">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 border-white/10 pt-4 sm:pt-0">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Current User
              </span>
            </div>
          </div>
        )}

        {/* ── USERS GRID ── */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
              Registered Accounts ({users.length})
            </h3>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 bg-vault-surface/60 border border-white/10 space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton variant="circular" className="w-14 h-14 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded opacity-60" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {users.map((user) => {
                  const displayStatus = getDisplayStatus(user);
                  const isTerminated =
                    user.status === "TERMINATED" || user.status === "Deleted";
                  const userAvatarUrl = user.profilepic
                    ? `${SERVER_URL}/user/profilepic?id=${user.profilepic}`
                    : null;

                  return (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="rounded-3xl p-6 bg-vault-surface/80 border border-white/10 backdrop-blur-xl hover:border-emerald-500/30 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden group"
                    >
                      {/* Top Row: User Avatar & Basic Info */}
                      <div>
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/40 transition-colors">
                            {userAvatarUrl ? (
                              <img
                                src={userAvatarUrl}
                                alt={user.name || "User Avatar"}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <span className="text-lg font-bold text-white/80 select-none">
                                {user?.name?.[0]?.toUpperCase() ||
                                  user?.email?.[0]?.toUpperCase() ||
                                  "U"}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-white truncate tracking-tight">
                              {user.name}
                            </h4>
                            <p className="text-xs text-white/40 truncate font-medium mt-0.5">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {/* Badges Row */}
                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
                          <button
                            onClick={() => !isTerminated && openEditRoleModal(user)}
                            disabled={isTerminated}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider transition-all ${getRoleBadgeStyle(
                              user.role
                            )} ${
                              isTerminated
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:brightness-125"
                            }`}
                            title={
                              isTerminated
                                ? "Cannot change role of terminated user"
                                : "Click to edit role permission"
                            }
                          >
                            <span>{user.role}</span>
                            {!isTerminated && <Edit2 size={10} />}
                          </button>

                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeStyle(
                              displayStatus
                            )}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                displayStatus === "ONLINE"
                                  ? "bg-emerald-400 animate-pulse"
                                  : displayStatus === "TERMINATED"
                                  ? "bg-rose-500"
                                  : "bg-white/30"
                              }`}
                            />
                            {displayStatus}
                          </span>
                        </div>
                      </div>

                      {/* Action Controls Row */}
                      <div className="pt-4 border-t border-white/10">
                        {isTerminated ? (
                          currentUser?.role?.toUpperCase() === "OWNER" ? (
                            <button
                              onClick={() => handleReactivate(user._id)}
                              className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors"
                            >
                              Reactivate Account
                            </button>
                          ) : (
                            <div className="text-center text-xs text-white/30 font-semibold py-2">
                              Account Terminated
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            {(currentUser?.role?.toUpperCase() === "OWNER" ||
                              currentUser?.role?.toUpperCase() === "ADMIN") && (
                              <button
                                onClick={() =>
                                  navigate(
                                    `/dashboard/${currentUser?.role?.toLowerCase()}/folder/${user.rootDirId}`
                                  )
                                }
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors"
                                title={`View ${user.name}'s Drive`}
                              >
                                <Eye size={16} />
                              </button>
                            )}

                            <button
                              onClick={() => handleForceLogout(user._id)}
                              disabled={!user.isLoggedIn}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                                user.isLoggedIn
                                  ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300"
                                  : "bg-white/5 border-white/5 text-white/30 cursor-not-allowed opacity-50"
                              }`}
                            >
                              Force Logout
                            </button>

                            <button
                              onClick={() => openDeleteModal(user)}
                              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors"
                            >
                              Terminate
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── TERMINATE / DELETE USER MODAL ── */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={closeDeleteModal}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-vault-surface border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              <button
                onClick={closeDeleteModal}
                className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="text-rose-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Terminate User</h3>
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                    System Permission Action
                  </p>
                </div>
              </div>

              <p className="text-sm text-white/80 mb-6 leading-relaxed">
                You are about to terminate account access for{" "}
                <span className="text-white font-bold">{userToDelete?.name}</span>. Select how to apply this deletion.
              </p>

              <div className="space-y-3 mb-8">
                <button
                  onClick={() => handleDelete("soft")}
                  className="w-full text-left p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all group"
                >
                  <div className="text-amber-300 text-sm font-bold mb-1">
                    Soft Delete (Deactivate)
                  </div>
                  <div className="text-xs text-amber-300/70">
                    Disables login access while maintaining files and data history.
                  </div>
                </button>

                <button
                  onClick={() => handleDelete("hard")}
                  className="w-full text-left p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all group"
                >
                  <div className="text-rose-400 text-sm font-bold flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} /> Hard Delete (Purge)
                  </div>
                  <div className="text-xs text-rose-400/70">
                    Permanently deletes user account, permissions, and all associated vault data.
                  </div>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={closeDeleteModal}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT ROLE PERMISSIONS MODAL ── */}
      <AnimatePresence>
        {editRoleModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={closeEditRoleModal}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-vault-surface border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              <button
                onClick={closeEditRoleModal}
                className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Shield className="text-purple-300" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Change Role</h3>
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                    Permission Hierarchy
                  </p>
                </div>
              </div>

              <p className="text-sm text-white/80 mb-6 leading-relaxed">
                Select a new system permission tier for{" "}
                <span className="text-white font-bold">{userToEditRole?.name}</span>.
              </p>

              <div className="space-y-3 mb-8">
                {(userToEditRole?.yourAuthority || []).map((role) => {
                  const isCurrentRole = userToEditRole?.role === role;
                  return (
                    <button
                      key={role}
                      onClick={() => handleRoleUpdate(role, userToEditRole._id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                        isCurrentRole
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                      }`}
                    >
                      <div>
                        <span className="text-sm font-bold tracking-wide uppercase block">
                          {role}
                        </span>
                        <span className="text-xs text-white/50">
                          {role === "OWNER"
                            ? "Full system control & billing configuration"
                            : role === "ADMIN"
                            ? "User administration & data management"
                            : role === "MANAGER"
                            ? "Workflow management & team oversight"
                            : "Standard vault storage access"}
                        </span>
                      </div>
                      {isCurrentRole && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={closeEditRoleModal}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
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

