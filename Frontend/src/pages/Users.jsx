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
  Search,
  Activity,
  HardDrive,
  Monitor,
  UserPlus,
  Radio,
  SlidersHorizontal,
  Lock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Skeleton from "../components/ui/Skeleton";
import UserAvatar from "../components/ui/UserAvatar";
import { formatSize, getProfilePicUrl } from "../lib/utils";

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [userToEditRole, setUserToEditRole] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { user: currentUser, loading: authLoading } = useAuth();
  const profilePicUrl = getProfilePicUrl(currentUser?.profilepic);

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
        if (type === "soft") {
          setUsers(
            users.map((u) =>
              u._id === userToDelete._id
                ? { ...u, status: "Deleted", isLoggedIn: false }
                : u,
            ),
          );
        } else {
          setUsers(
            users.map((u) =>
              u._id === userToDelete._id
                ? { ...u, status: "Terminated", isLoggedIn: false, profilepic: null }
                : u,
            ),
          );
        }
      } else {
        const data = await res.json();
        alert(data.error || data.message || "Failed to terminate user");
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
        setUsers(
          users.map((u) => (u._id === id ? { ...u, status: "Active", isLoggedIn: false } : u)),
        );
      } else {
        const data = await res.json();
        alert(data.error || data.message || "Failed to reactivate user");
      }
    } catch (err) {
      console.error("Failed to reactivate user", err);
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role?.toUpperCase()) {
      case "OWNER":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]";
      case "ADMIN":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
      case "MANAGER":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]";
      case "USER":
      default:
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]";
    }
  };

  const getDisplayStatus = (u) => {
    if (u.status === "Terminated" || u.status === "TERMINATED")
      return "TERMINATED";
    if (u.status === "Deleted" || u.status === "Deactivated" || u.status === "DEACTIVATED")
      return "DEACTIVATED";
    return u.isLoggedIn ? "ONLINE" : "OFFLINE";
  };

  // Metrics computation
  const totalUsers = users.length;
  const onlineCount = users.filter((u) => u.isLoggedIn && u.status !== "Terminated" && u.status !== "Deleted").length;
  const privilegedCount = users.filter((u) => ["OWNER", "ADMIN"].includes(u.role?.toUpperCase()) && u.status !== "Terminated").length;
  const totalAllocated = users.reduce((acc, u) => acc + (u.status === "Terminated" ? 0 : (u.maxStorage ?? 5368709120)), 0);

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === "ALL" || u.role?.toUpperCase() === roleFilter;
    const status = getDisplayStatus(u);
    const matchesStatus =
      statusFilter === "ALL" || status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-vault-bg text-slate-900 dark:text-white p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Subtle Atmospheric Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-accent-primary/15 via-accent-soft/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 -right-48 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* ── TOP HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-3 rounded-2xl bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-sm hover:scale-105 active:scale-95"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2 text-accent-primary text-xs font-mono font-bold uppercase tracking-widest mb-1">
                <UsersIcon size={14} /> Vault System Administration
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                System Users Directory
              </h1>
              <p className="text-slate-500 dark:text-white/50 text-xs sm:text-sm font-medium mt-0.5">
                Audit system access clearances, force terminate rogue sessions, and manage hierarchy permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {currentUser?.role?.toUpperCase() === "OWNER" && (
              <Link
                to="/owner/settings"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-mono font-bold tracking-wider transition-all shadow-sm"
              >
                <ShieldAlert size={14} />
                <span>Owner Settings</span>
              </Link>
            )}

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-vault-surface hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white text-xs font-mono font-bold transition-all shadow-sm"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-accent-primary" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── METRIC STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl p-5 bg-white dark:bg-vault-surface/80 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              <span>Total Accounts</span>
              <UsersIcon size={16} className="text-accent-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalUsers}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-white/40 font-mono">
              Registered Identities
            </div>
          </div>

          <div className="rounded-3xl p-5 bg-white dark:bg-vault-surface/80 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              <span>Active Sessions</span>
              <Radio size={16} className="text-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight flex items-center gap-2">
              <span>{onlineCount}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            </div>
            <div className="text-[11px] text-slate-400 dark:text-white/40 font-mono">
              Live Encrypted Connections
            </div>
          </div>

          <div className="rounded-3xl p-5 bg-white dark:bg-vault-surface/80 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              <span>Admin Nodes</span>
              <Shield size={16} className="text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-300 tracking-tight">
              {privilegedCount}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-white/40 font-mono">
              Elevated Security Clearances
            </div>
          </div>

          <div className="rounded-3xl p-5 bg-white dark:bg-vault-surface/80 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              <span>System Quota</span>
              <HardDrive size={16} className="text-cyan-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight">
              {formatSize(totalAllocated)}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-white/40 font-mono">
              Cumulative Storage Provisioned
            </div>
          </div>
        </div>

        {/* ── CURRENT USER HERO HIGHLIGHT ── */}
        {currentUser && (
          <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-vault-surface/90 border border-slate-200 dark:border-accent-border/40 shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 backdrop-blur-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent-soft/25 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-5 relative z-10 w-full sm:w-auto">
              <UserAvatar
                user={currentUser}
                src={profilePicUrl}
                size="xl"
                glow={true}
                status="ONLINE"
                shape="rounded"
              />

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {currentUser.name}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${getRoleBadgeStyle(
                      currentUser.role
                    )}`}
                  >
                    <Shield size={11} className="mr-1" />
                    {currentUser.role?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-mono text-slate-500 dark:text-white/50 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 dark:border-white/10 pt-4 sm:pt-0">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft border border-accent-border text-accent-primary text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                Active Administrator Session
              </span>
            </div>
          </div>
        )}

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-vault-surface/70 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/30 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
              {["ALL", "OWNER", "ADMIN", "MANAGER", "USER"].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                    roleFilter === role
                      ? "bg-accent-primary text-accent-foreground shadow-sm"
                      : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/30 p-1 rounded-2xl border border-slate-200 dark:border-white/10 flex-wrap">
              {["ALL", "ONLINE", "OFFLINE", "DEACTIVATED", "TERMINATED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                    statusFilter === st
                      ? "bg-accent-soft text-accent-primary border border-accent-border shadow-sm"
                      : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── USERS GRID ── */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 flex items-center gap-2">
              <Activity size={14} className="text-accent-primary" />
              <span>Registered Accounts Directory ({filteredUsers.length} of {totalUsers})</span>
            </h3>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 bg-white dark:bg-vault-surface/60 border border-slate-200 dark:border-white/10 space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton variant="circular" className="w-14 h-14 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded opacity-60" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-3xl p-12 bg-white dark:bg-vault-surface/60 border border-slate-200 dark:border-white/10 text-center space-y-3">
              <UsersIcon size={36} className="mx-auto text-slate-400 dark:text-white/30" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No Users Found</h4>
              <p className="text-xs text-slate-500 dark:text-white/40">
                No registered accounts match your active search and role criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredUsers.map((user) => {
                  const displayStatus = getDisplayStatus(user);
                  const isPermanentlyTerminated =
                    user.status === "Terminated" || user.status === "TERMINATED";
                  const isDeactivated =
                    user.status === "Deleted" ||
                    user.status === "Deactivated" ||
                    user.status === "DEACTIVATED";
                  const isSelf = currentUser?._id === user._id;
                  const canEditRole =
                    !isSelf &&
                    !isPermanentlyTerminated &&
                    user.yourAuthority &&
                    user.yourAuthority.length > 0;

                  return (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`rounded-3xl p-6 bg-white dark:bg-vault-surface/85 border transition-all duration-200 flex flex-col justify-between space-y-5 relative overflow-hidden group shadow-sm hover:shadow-xl ${
                        isPermanentlyTerminated
                          ? "border-rose-500/40 bg-rose-500/[0.03] opacity-85"
                          : isDeactivated
                          ? "border-amber-500/30 bg-amber-500/[0.02] opacity-90"
                          : "border-slate-200 dark:border-white/10 hover:border-accent-border"
                      }`}
                    >
                      {/* Top Section: Avatar, Name, Email, Badges */}
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <UserAvatar
                              user={user}
                              src={user.profilepic}
                              size="lg"
                              status={displayStatus}
                              shape="rounded"
                            />

                            <div className="min-w-0 flex-1">
                              <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                                {user.name || "Operative"}
                              </h4>
                              <p className="text-xs font-mono text-slate-500 dark:text-white/40 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Status Badges Row */}
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {/* Role Badge */}
                          <div className="flex items-center gap-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${getRoleBadgeStyle(
                                user.role
                              )}`}
                            >
                              <Shield size={10} className="mr-1" />
                              {user.role || "USER"}
                            </span>

                            {canEditRole && (
                              <button
                                onClick={() => openEditRoleModal(user)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors"
                                title="Change Role"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${
                              displayStatus === "ONLINE"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                                : displayStatus === "TERMINATED"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                : displayStatus === "DEACTIVATED"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30"
                                : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                displayStatus === "ONLINE"
                                  ? "bg-emerald-500 animate-pulse"
                                  : displayStatus === "TERMINATED"
                                  ? "bg-rose-500"
                                  : displayStatus === "DEACTIVATED"
                                  ? "bg-amber-500"
                                  : "bg-slate-400 dark:bg-white/30"
                              }`}
                            />
                            {displayStatus === "TERMINATED" ? "✕ TERMINATED" : displayStatus}
                          </span>

                          {/* 2FA Indicator */}
                          {user.twoFactorEnabled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-300 border border-teal-500/30">
                              <Lock size={9} /> 2FA
                            </span>
                          )}
                        </div>

                        {/* Quota & Device metrics */}
                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5 text-xs font-mono text-slate-500 dark:text-white/40">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <HardDrive size={12} className="text-accent-primary" /> Max Quota:
                            </span>
                            <div className="flex items-center gap-1.5">
                              {user.planSlug && user.status !== "Terminated" && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-accent-soft text-accent-primary border border-accent-border">
                                  {user.planSlug}
                                </span>
                              )}
                              <span className="font-bold text-slate-700 dark:text-white/70">
                                {user.status === "Terminated"
                                  ? "0 B"
                                  : formatSize(user.maxStorage ?? 5368709120)}
                              </span>
                            </div>
                          </div>
                          {user.devicesCount !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Monitor size={12} className="text-cyan-500" /> Active Devices:
                              </span>
                              <span className="font-bold text-slate-700 dark:text-white/70">
                                {user.devicesCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Section: Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                        {isSelf ? (
                          <div className="w-full py-2.5 rounded-2xl text-center text-xs font-mono font-bold text-accent-primary bg-accent-soft border border-accent-border">
                            Current Operator Profile
                          </div>
                        ) : isPermanentlyTerminated ? (
                          <div className="w-full py-2.5 rounded-2xl text-center text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 flex items-center justify-center gap-2">
                            <X size={14} className="text-rose-500" strokeWidth={3} />
                            <span>Account Permanently Terminated</span>
                          </div>
                        ) : isDeactivated ? (
                          <div className="flex items-center gap-2">
                            {currentUser?.role?.toUpperCase() === "OWNER" ? (
                              <button
                                onClick={() => handleReactivate(user._id)}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <UserCheck size={14} /> Reactivate
                              </button>
                            ) : (
                              <div className="flex-1 py-2.5 rounded-xl text-xs font-mono text-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40">
                                Deactivated Account
                              </div>
                            )}
                            <button
                              onClick={() => openDeleteModal(user)}
                              className="py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 transition-colors shadow-sm flex items-center gap-1"
                              title="Permanently Terminate / Purge"
                            >
                              <AlertTriangle size={14} /> Purge
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {(currentUser?.role?.toUpperCase() === "OWNER" ||
                              currentUser?.role?.toUpperCase() === "ADMIN") &&
                              user.rootDirId && (
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/dashboard/${currentUser?.role?.toLowerCase()}/folder/${user.rootDirId}`
                                    )
                                  }
                                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-colors"
                                  title={`Inspect ${user.name}'s Vault Root`}
                                >
                                  <Eye size={15} />
                                </button>
                              )}

                            <button
                              onClick={() => handleForceLogout(user._id)}
                              disabled={!user.isLoggedIn}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                                user.isLoggedIn
                                  ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-300 shadow-sm"
                                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-white/20 cursor-not-allowed opacity-50"
                              }`}
                            >
                              Force Logout
                            </button>

                            <button
                              onClick={() => openDeleteModal(user)}
                              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 transition-colors shadow-sm"
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
              className="relative w-full max-w-md bg-white dark:bg-vault-surface text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              <button
                onClick={closeDeleteModal}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="text-rose-500" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Terminate User</h3>
                  <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold font-mono">
                    System Permission Action
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-white/80 mb-6 leading-relaxed">
                You are about to terminate account access for{" "}
                <strong className="text-slate-900 dark:text-white font-bold">{userToDelete?.name}</strong>. Select how to apply this deletion.
              </p>

              <div className="space-y-3 mb-8">
                <button
                  onClick={() => handleDelete("soft")}
                  className="w-full text-left p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all group"
                >
                  <div className="text-amber-600 dark:text-amber-300 text-sm font-bold mb-1">
                    Soft Delete (Deactivate)
                  </div>
                  <div className="text-xs text-slate-600 dark:text-amber-300/70">
                    Disables login access while maintaining files and data history.
                  </div>
                </button>

                <button
                  onClick={() => handleDelete("hard")}
                  className="w-full text-left p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all group"
                >
                  <div className="text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} /> Hard Delete (Permanent Termination)
                  </div>
                  <div className="text-xs text-slate-600 dark:text-rose-400/70">
                    Purges all vault files and data permanently, locks the email address as permanently terminated, and permanently blocks future logins.
                  </div>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={closeDeleteModal}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
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
              className="relative w-full max-w-md bg-white dark:bg-vault-surface text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              <button
                onClick={closeEditRoleModal}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Shield className="text-purple-500 dark:text-purple-300" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Change Role</h3>
                  <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold font-mono">
                    Permission Hierarchy
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-white/80 mb-6 leading-relaxed">
                Select a new system permission tier for{" "}
                <strong className="text-slate-900 dark:text-white font-bold">{userToEditRole?.name}</strong>.
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
                          ? "border-accent-border bg-accent-soft text-accent-primary"
                          : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white/80"
                      }`}
                    >
                      <div>
                        <span className="text-sm font-bold tracking-wide uppercase block">
                          {role}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-white/50">
                          {role === "OWNER"
                            ? "Full system control & billing configuration"
                            : role === "ADMIN"
                            ? "User administration & data management"
                            : role === "MANAGER"
                            ? "Workflow management & team oversight"
                            : "Standard vault storage access"}
                        </span>
                      </div>
                      {isCurrentRole && <CheckCircle2 size={18} className="text-accent-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={closeEditRoleModal}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-white/10"
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
}
